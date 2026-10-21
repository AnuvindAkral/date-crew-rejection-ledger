"use strict";

// Deterministic send-review logic. No model, and no heuristics beyond the
// field comparisons written here. The order of checks encodes the data model's
// rules, and the severity order decides which finding the card leads with.
//
// A candidate attribute and a client preference are compared as values, not as
// categories. "Non-vegetarian" against a "Vegetarian" candidate is not a
// conflict. Where the candidate's value is not known, the finding is that the
// information is missing, never that there is no conflict.

const { dimensionLabel } = require("./dimensions");

// The order a card leads with. A conflict is a firm no, an incomplete record is
// the least useful thing to say, and missing information is not a clean result.
const SEVERITY_RANK = {
  conflict: 0,
  contradiction: 1,
  repeat: 2,
  preference_mismatch: 3,
  incomplete: 4,
};

function byTime(a, b) {
  return new Date(a.recordedAt || a.acceptedAt) - new Date(b.recordedAt || b.acceptedAt);
}

// The dimensions a candidate says something about. A candidate carries
// attributes (a value per dimension); this is the list of those dimensions.
function candidateDimensions(candidate) {
  if (!candidate) return [];
  if (Array.isArray(candidate.dimensions)) return candidate.dimensions;
  if (candidate.attributes) return Object.keys(candidate.attributes);
  return [];
}

// The value a candidate carries on a dimension, or null when it is not known.
function candidateValue(candidate, dimension) {
  if (!candidate || !candidate.attributes) return null;
  const v = candidate.attributes[dimension];
  return v === undefined || v === null ? null : v;
}

// The dimensions an acceptance spoke for. An acceptance may name one dimension
// explicitly; otherwise the candidate's own attributes are used.
function acceptanceDimensions(store, acceptance) {
  if (acceptance.dimension) return [acceptance.dimension];
  const cand = store.candidate(acceptance.candidateId);
  return candidateDimensions(cand);
}

function acceptanceAfter(store, clientId, dimension, afterTime) {
  const after = new Date(afterTime);
  return store.acceptances(clientId).some((a) => {
    if (!acceptanceDimensions(store, a).includes(dimension)) return false;
    return new Date(a.acceptedAt) > after;
  });
}

// The most recent active preference for a dimension, if there is one.
function latestPreference(prefs, dimension) {
  const list = prefs
    .filter((p) => p.dimension === dimension)
    .sort((a, b) => new Date(a.recordedAt || a.confirmedAt || 0) - new Date(b.recordedAt || b.confirmedAt || 0));
  return list.length ? list[list.length - 1] : null;
}

// Evidence from earlier acceptances on the same dimension. This is a pattern,
// not a match, so it is labelled as such.
function acceptanceEvidence(store, clientId, candidate) {
  const candidateDims = candidateDimensions(candidate);
  const out = [];
  for (const d of candidateDims) {
    const acc = store
      .acceptances(clientId)
      .filter((a) => acceptanceDimensions(store, a).includes(d))
      .sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt))[0];
    if (acc) {
      const cand = store.candidate(acc.candidateId);
      out.push({
        dimension: d,
        source: "observed_acceptance",
        detail: cand ? cand.name : null,
        acceptedAt: acc.acceptedAt,
      });
    }
  }
  return out;
}

// Evaluate what happens when a matchmaker is about to share `candidate` with
// `clientId`. Returns a state, the findings that produced it, and the positive
// evidence that supports the send.
function evaluateSend(store, clientId, candidate) {
  const prefs = store.preferences(clientId).filter((p) => p.status === "active");
  const rejections = store.rejections(clientId);
  const codedRejections = rejections.filter((r) => r.dimension);
  const candidateDims = candidateDimensions(candidate);

  if (candidateDims.length === 0) {
    return { state: "untagged", findings: [], positive: [] };
  }
  if (rejections.length === 0 && prefs.length === 0) {
    return { state: "no_history", findings: [], positive: [] };
  }
  if (rejections.length > 0 && codedRejections.length === 0 && prefs.length === 0) {
    return { state: "uncoded_only", findings: [], positive: [] };
  }

  const findings = [];
  const positive = [];
  const dims = new Set([...prefs.map((p) => p.dimension), ...codedRejections.map((r) => r.dimension)]);

  for (const dim of dims) {
    const pref = latestPreference(prefs, dim);
    const rejs = codedRejections.filter((r) => r.dimension === dim).sort(byTime);
    const value = candidateValue(candidate, dim);
    const hasValue = value !== null;
    const label = dimensionLabel(dim);
    const missing = {
      type: "incomplete",
      basis: "unknown",
      dimension: dim,
      detail: `We do not have this candidate's ${label.toLowerCase()}`,
    };

    // 1. A confirmed dealbreaker governs the dimension. The comparison is on the
    //    value, so a different value on the same dimension is not a conflict.
    if (pref && pref.kind === "confirmed_dealbreaker" && pref.confirmed) {
      if (!hasValue) {
        findings.push(missing);
      } else if (value === pref.value) {
        findings.push({
          type: "conflict",
          basis: "confirmed_dealbreaker",
          dimension: dim,
          value,
          preference: pref,
        });
      }
      continue;
    }

    // 2. A client-confirmed preference settles the dimension. It does not
    //    silence the dimension forever: if the client rejects on it again
    //    afterwards, that is new evidence and it is surfaced.
    if (pref && pref.kind === "stated_preference" && pref.confirmed) {
      const confirmedAt = new Date(pref.confirmedAt || pref.recordedAt);
      // A rejection recorded at the same moment as the settlement still counts
      // as new evidence, so the comparison is not strictly after.
      const later = rejs.filter((r) => new Date(r.recordedAt) >= confirmedAt);
      if (later.length > 0) {
        findings.push({
          type: "repeat",
          basis: "history",
          dimension: dim,
          severity: later[later.length - 1].severity,
          rejections: later,
          note: "The client rejected this again after settling it",
        });
      } else if (!hasValue) {
        findings.push(missing);
      } else if (value !== pref.value) {
        findings.push({
          type: "preference_mismatch",
          basis: "confirmed_preference",
          dimension: dim,
          value,
          preference: pref,
        });
      } else {
        positive.push({
          dimension: dim,
          source: "stated_preference",
          detail: pref.note || pref.value,
          confirmed: true,
        });
      }
      continue;
    }

    // 3. An unconfirmed stated preference is advisory in both directions.
    let missingPushed = false;
    if (pref && pref.kind === "stated_preference") {
      if (!hasValue) {
        findings.push(missing);
        missingPushed = true;
      } else if (value !== pref.value) {
        findings.push({
          type: "preference_mismatch",
          basis: "stated_preference",
          dimension: dim,
          value,
          preference: pref,
          advisory: true,
        });
      } else {
        positive.push({
          dimension: dim,
          source: "stated_preference",
          detail: pref.note || pref.value,
          confirmed: false,
        });
      }
    }

    // 4. Rejection history on a dimension with no rule governing it. This only
    //    applies where the candidate's value is known, because otherwise there
    //    is nothing to compare and the finding would be about the wrong person.
    if (rejs.length > 0 && !(pref && pref.kind === "stated_preference" && pref.confirmed)) {
      if (!hasValue) {
        if (!missingPushed) findings.push(missing);
      } else if (acceptanceAfter(store, clientId, dim, rejs[0].recordedAt)) {
        findings.push({ type: "contradiction", basis: "history", dimension: dim, rejections: rejs });
      } else {
        findings.push({
          type: "repeat",
          basis: "history",
          dimension: dim,
          severity: rejs[rejs.length - 1].severity,
          rejections: rejs,
        });
      }
    }
  }

  // Stated-preference matches and earlier acceptances are both positive, and
  // both are kept. They are different kinds of evidence.
  const positiveEvidenceList = positive.concat(acceptanceEvidence(store, clientId, candidate));

  if (findings.length === 0) {
    return { state: "clean", findings: [], positive: positiveEvidenceList };
  }

  findings.sort((a, b) => SEVERITY_RANK[a.type] - SEVERITY_RANK[b.type]);
  return { state: findings[0].type, findings, positive: positiveEvidenceList };
}

module.exports = {
  evaluateSend,
  candidateDimensions,
  SEVERITY_RANK,
  acceptanceDimensions,
  acceptanceAfter,
  candidateValue,
  acceptanceEvidence,
};
