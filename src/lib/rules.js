"use strict";

// Deterministic send-review logic. No model, no heuristics beyond the field
// comparisons written here. The order of checks encodes the data model's rules.

const PRIORITY = { conflict: 0, contradiction: 1, repeat: 2 };

function byTime(a, b) {
  return new Date(a.recordedAt || a.acceptedAt) - new Date(b.recordedAt || b.acceptedAt);
}

function acceptedDimensions(store, clientId) {
  const dims = new Set();
  for (const a of store.acceptances(clientId)) {
    const cand = store.candidate(a.candidateId);
    const ds = a.dimension ? [a.dimension] : cand ? cand.dimensions : [];
    for (const d of ds) dims.add(d);
  }
  return dims;
}

function acceptanceAfter(store, clientId, dimension, afterTime) {
  const after = new Date(afterTime);
  return store.acceptances(clientId).some((a) => {
    const cand = store.candidate(a.candidateId);
    const ds = a.dimension ? [a.dimension] : cand ? cand.dimensions : [];
    if (!ds.includes(dimension)) return false;
    return new Date(a.acceptedAt) > after;
  });
}

// Positive evidence for a candidate against a client: what supports sending,
// source-labelled, kept distinct from observed acceptance history. A confirmed
// dealbreaker is never positive. Nothing here invents behaviour.
function positiveEvidence(store, clientId, candidateDims) {
  const prefs = store.preferences(clientId).filter((p) => p.status === "active");
  const statedPrefs = prefs.filter((p) => p.kind === "stated_preference");
  const confirmedDealbreakers = new Set(
    prefs.filter((p) => p.kind === "confirmed_dealbreaker" && p.confirmed).map((p) => p.dimension)
  );
  const acceptances = store.acceptances(clientId);

  const out = [];
  for (const d of candidateDims) {
    if (confirmedDealbreakers.has(d)) continue;
    const sp = statedPrefs.find((p) => p.dimension === d);
    if (sp) {
      out.push({
        dimension: d,
        source: "stated_preference",
        detail: sp.note || null,
        confirmed: !!sp.confirmed,
      });
    }
    const acc = acceptances
      .filter((a) => {
        if (a.dimension) return a.dimension === d;
        const cand = store.candidate(a.candidateId);
        return cand ? cand.dimensions.includes(d) : false;
      })
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
  const confirmedDealbreakers = prefs
    .filter((p) => p.kind === "confirmed_dealbreaker" && p.confirmed)
    .map((p) => p.dimension);
  const confirmedPreferences = prefs
    .filter((p) => p.kind === "stated_preference" && p.confirmed)
    .map((p) => p.dimension);

  const rejections = store.rejections(clientId);
  const candidateDims = candidate && Array.isArray(candidate.dimensions) ? candidate.dimensions : [];
  const positive = positiveEvidence(store, clientId, candidateDims);

  if (candidateDims.length === 0) {
    return { state: "untagged", findings: [], positive };
  }
  if (rejections.length === 0 && prefs.length === 0) {
    return { state: "no_history", findings: [], positive };
  }
  if (rejections.length > 0 && !rejections.some((r) => r.dimension) && prefs.length === 0) {
    return { state: "uncoded_only", findings: [], positive };
  }

  const findings = [];

  for (const dim of candidateDims) {
    if (confirmedDealbreakers.includes(dim)) {
      findings.push({ type: "conflict", dimension: dim });
      continue;
    }
    if (confirmedPreferences.includes(dim)) {
      // A client-confirmed preference settles the dimension. No prompt.
      continue;
    }

    const rejs = rejections.filter((r) => r.dimension === dim).sort(byTime);
    if (rejs.length === 0) continue;

    const hasLaterAcceptance = acceptanceAfter(store, clientId, dim, rejs[0].recordedAt);

    if (hasLaterAcceptance) {
      findings.push({ type: "contradiction", dimension: dim, rejections: rejs });
    } else {
      const latest = rejs[rejs.length - 1];
      findings.push({ type: "repeat", dimension: dim, severity: latest.severity, rejections: rejs });
    }
  }

  if (findings.length === 0) {
    return { state: "clean", findings: [], positive };
  }

  findings.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
  return { state: findings[0].type, findings, positive };
}

module.exports = { evaluateSend, PRIORITY, acceptedDimensions, positiveEvidence };
