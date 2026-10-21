"use strict";

// Deterministic send-review logic. No model, and no heuristics beyond the
// field comparisons written here.
//
// A criterion says two things at once, and they are independent:
//
//   the direction  must_be | must_not_be, and the values it applies to
//   the firmness   confirmed_dealbreaker | confirmed_preference | stated_preference
//
// Keeping them separate is the point. "I only want a vegetarian partner" and
// "I do not want a vegetarian partner" are opposite criteria, and a model that
// stores only a dimension and a value cannot tell them apart. A confirmed
// dealbreaker on "Vegetarian" means the partner must be vegetarian; the same
// value recorded as a stated preference means the partner must not be
// vegetarian. The direction is recorded, not inferred.
//
// A candidate attribute and a criterion are compared as values, not as
// categories. Where the candidate's value is not known, the finding is that
// the information is missing, never that there is no conflict.

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

const OPERATORS = {
  must_be: {
    label: "must be",
    violated: (value, values) => values.indexOf(value) === -1,
    explain: (values) => `must be ${readable(values)}`,
    satisfiedIsSupport: true,
  },
  must_not_be: {
    label: "must not be",
    violated: (value, values) => values.indexOf(value) !== -1,
    explain: (values) => `must not be ${readable(values)}`,
    satisfiedIsSupport: false,
  },
};

const KIND_LABEL = {
  confirmed_dealbreaker: "confirmed dealbreaker",
  confirmed_preference: "confirmed preference",
  stated_preference: "stated preference",
};

function readable(values) {
  if (!values || values.length === 0) return "nothing recorded";
  if (values.length === 1) return values[0];
  return values.slice(0, -1).join(", ") + " or " + values[values.length - 1];
}

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

// The values a criterion applies to. Older records carried a single value.
function criterionValues(criterion) {
  if (!criterion) return [];
  if (Array.isArray(criterion.values)) return criterion.values;
  if (criterion.value) return [criterion.value];
  return [];
}

// The direction of a criterion. Older records did not carry one, and the
// direction is derived from what the criterion meant at the time: a dealbreaker
// on a value forbade it, and a preference for a value required it.
function criterionOperator(criterion) {
  if (criterion && OPERATORS[criterion.operator]) return criterion.operator;
  if (criterion && criterion.kind === "confirmed_dealbreaker") return "must_not_be";
  return "must_be";
}

function operatorFor(criterion) {
  return OPERATORS[criterionOperator(criterion)];
}

// Does the candidate satisfy the criterion?
//   violated  the candidate breaks it
//   satisfied the candidate meets it
//   unknown   we do not have the candidate's value, so we cannot say
function criterionVerdict(criterion, value) {
  if (value === null || value === undefined) return "unknown";
  const op = operatorFor(criterion);
  return op.violated(value, criterionValues(criterion)) ? "violated" : "satisfied";
}

// A sentence a matchmaker can read, naming the direction and the values.
function criterionExplanation(criterion) {
  const op = operatorFor(criterion);
  const kind = KIND_LABEL[criterion.kind] || "criterion";
  return `${dimensionLabel(criterion.dimension)} ${op.explain(criterionValues(criterion))} (${kind})`;
}

// The plain-English reason a finding appeared. It names the client's criterion,
// the direction it runs in, and the candidate's value, so nothing on the card
// has to be taken on trust.
function findingSentence(f) {
  const label = dimensionLabel(f.dimension);

  if (f.type === "contradiction") {
    return `The client rejected on ${label} before and accepted someone with it afterwards, so the file disagrees with itself.`;
  }
  if (f.type === "repeat") {
    const n = f.rejections ? f.rejections.length : 0;
    return `The client has rejected on ${label} ${n} time${n === 1 ? "" : "s"} before.${f.note ? " " + f.note + "." : ""} This is a pattern, not a rule.`;
  }

  const criterion = f.criterion || null;
  const values = criterion ? criterionValues(criterion) : [];
  const op = criterion ? operatorFor(criterion) : OPERATORS.must_be;
  const kind = criterion ? KIND_LABEL[criterion.kind] : "criterion";
  const what = `${label} ${op.explain(values)}`;

  if (f.value === null || f.value === undefined) {
    if (f.reason === "history") {
      return `The client has rejected on ${label} before, and this candidate's ${label.toLowerCase()} is not recorded, so it could not be checked.`;
    }
    return `The client has a ${kind}: ${what}. This candidate's ${label.toLowerCase()} is not recorded, so it could not be checked.`;
  }
  if (f.basis === "confirmed_dealbreaker") {
    return `The client confirmed a dealbreaker: ${what}. This candidate is ${f.value}.`;
  }
  if (f.basis === "confirmed_preference") {
    return `The client confirmed a preference: ${what}. This candidate is ${f.value}.`;
  }
  if (f.basis === "stated_preference") {
    return `The client has a stated preference: ${what}. This candidate is ${f.value}.`;
  }
  return `On ${label}, this candidate is ${f.value}.`;
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

// The criteria that were in force for a client at a point in time. A criterion
// that was later changed or withdrawn was still in force when it was written,
// and the audit needs to see the file as it was, not as it is now.
function criteriaAt(store, clientId, at) {
  const when = at ? new Date(at).getTime() : Date.now();
  const byDimension = new Map();
  for (const c of store.preferences(clientId)) {
    const recorded = new Date(c.recordedAt || c.confirmedAt || 0).getTime();
    if (recorded > when) continue;
    if (c.removedAt && new Date(c.removedAt).getTime() <= when) continue;
    const current = byDimension.get(c.dimension);
    if (!current || recorded >= new Date(current.recordedAt || 0).getTime()) {
      byDimension.set(c.dimension, c);
    }
  }
  return byDimension;
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

// Positive evidence for a candidate against a client: what supports sending,
// source-labelled. Only a requirement the candidate actually meets is support.
// A forbidden value the candidate does not carry is merely the absence of a
// problem, which is not the same thing.
function positiveEvidence(store, clientId, candidate, criteria) {
  const out = [];
  for (const [dimension, criterion] of criteria) {
    if (criterion.kind === "confirmed_dealbreaker") continue;
    const op = operatorFor(criterion);
    if (!op.satisfiedIsSupport) continue;
    const value = candidateValue(candidate, dimension);
    if (value === null) continue;
    if (criterionVerdict(criterion, value) !== "satisfied") continue;
    out.push({
      dimension,
      source: "criterion",
      detail: criterion.note || criterionExplanation(criterion),
      confirmed: criterion.kind === "confirmed_preference",
    });
  }
  return out;
}

// Evaluate what happens when a matchmaker is about to share `candidate` with
// `clientId`. Returns a state, the findings that produced it, and the positive
// evidence that supports the send.
//
// `at` evaluates the client's file as it stood at that moment, which is what
// the audit of a past share needs.
function evaluateSend(store, clientId, candidate, at) {
  const criteria = criteriaAt(store, clientId, at);
  // When a point in time is given, only the history that existed by then is
  // visible. An audit of a past share must not see the rejection that came
  // after it, which is the outcome rather than the context.
  const when = at ? new Date(at).getTime() : Infinity;
  const rejections = store
    .rejections(clientId)
    .filter((r) => new Date(r.recordedAt).getTime() <= when);
  const codedRejections = rejections.filter((r) => r.dimension);
  const candidateDims = candidateDimensions(candidate);

  if (candidateDims.length === 0) {
    return { state: "untagged", findings: [], positive: [] };
  }
  if (rejections.length === 0 && criteria.size === 0) {
    return { state: "no_history", findings: [], positive: [] };
  }
  if (rejections.length > 0 && codedRejections.length === 0 && criteria.size === 0) {
    return { state: "uncoded_only", findings: [], positive: [] };
  }

  const findings = [];
  const positive = [];
  // A criterion with no values carries no constraint. It is skipped rather
  // than treated as a violation, so a malformed record cannot invent findings.
  const usable = new Map(
    Array.from(criteria.entries()).filter(([, c]) => criterionValues(c).length > 0)
  );
  const dims = new Set([...usable.keys(), ...codedRejections.map((r) => r.dimension)]);

  for (const dim of dims) {
    const criterion = usable.get(dim) || null;
    const rejs = codedRejections.filter((r) => r.dimension === dim).sort(byTime);
    const value = candidateValue(candidate, dim);
    const hasValue = value !== null;
    const label = dimensionLabel(dim);
    // Two different reasons a value can be missing, and they read differently.
    const missingAgainstCriterion = {
      type: "incomplete",
      basis: "unknown",
      reason: "criterion",
      dimension: dim,
      detail: `We do not have this candidate's ${label.toLowerCase()}`,
    };
    const missingAgainstHistory = {
      type: "incomplete",
      basis: "unknown",
      reason: "history",
      dimension: dim,
      detail: `We do not have this candidate's ${label.toLowerCase()}`,
    };

    // 1. A criterion the client has on file.
    if (criterion) {
      const op = operatorFor(criterion);
      const verdict = criterionVerdict(criterion, value);

      if (verdict === "unknown") {
        // The criterion travels with the finding, so the sentence can name what
        // could not be checked.
        findings.push(Object.assign({}, missingAgainstCriterion, { criterion }));
        positive.push(...positiveEvidence(store, clientId, candidate, new Map([[dim, criterion]])));
      } else if (verdict === "violated") {
        // How firm the criterion is decides how the finding is reported, not
        // which way the comparison runs.
        const hard = criterion.kind === "confirmed_dealbreaker";
        findings.push({
          type: hard ? "conflict" : "preference_mismatch",
          basis: criterion.kind,
          dimension: dim,
          value,
          criterion,
          requirement: criterionExplanation(criterion),
          direction: op.label,
        });
      } else {
        positive.push(...positiveEvidence(store, clientId, candidate, new Map([[dim, criterion]])));
      }
    }

    // 2. Rejection history on this dimension.
    //
    //    A criterion governs the dimension it is on, so plain prior-rejection
    //    history does not fire there. Two things still do: a client who
    //    rejected after settling the dimension, which is new evidence against
    //    a rule they have just confirmed; and a file that disagrees with
    //    itself, having rejected on a dimension and then accepted on it.
    //    History only fires where the candidate carries a value, because a
    //    candidate with nothing recorded on a dimension cannot conflict on it.
    if (rejs.length > 0) {
      const settled = criterion && criterion.kind === "confirmed_preference";
      const settledAt = settled ? new Date(criterion.confirmedAt || criterion.recordedAt) : null;
      const postSettlement = settled
        ? rejs.filter((r) => new Date(r.recordedAt) >= settledAt)
        : [];

      if (postSettlement.length > 0 && hasValue) {
        findings.push({
          type: "repeat",
          basis: "history",
          dimension: dim,
          severity: postSettlement[postSettlement.length - 1].severity,
          rejections: postSettlement,
          note: "The client rejected this again after settling it",
        });
      } else if (!settled) {
        const laterAcceptance = hasValue
          ? acceptanceAfter(store, clientId, dim, rejs[0].recordedAt)
          : false;
        if (laterAcceptance) {
          findings.push({ type: "contradiction", basis: "history", dimension: dim, rejections: rejs });
        } else if (!criterion) {
          if (!hasValue) {
            // The client rejected on this dimension before, and we cannot check
            // this candidate against it, because we do not know its value.
            if (!findings.some((f) => f.type === "incomplete" && f.dimension === dim)) {
              findings.push(missingAgainstHistory);
            }
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
    }
  }

  const positiveEvidenceList = positive.concat(acceptanceEvidence(store, clientId, candidate));

  // Every finding carries the sentence that explains it, so the interface
  // never has to reconstruct the reasoning.
  for (const f of findings) {
    if (!f.sentence) f.sentence = findingSentence(f);
  }

  if (findings.length === 0) {
    return { state: "clean", findings: [], positive: positiveEvidenceList };
  }

  findings.sort((a, b) => SEVERITY_RANK[a.type] - SEVERITY_RANK[b.type]);
  return { state: findings[0].type, findings, positive: positiveEvidenceList };
}

module.exports = {
  evaluateSend,
  criteriaAt,
  criterionValues,
  criterionOperator,
  criterionVerdict,
  criterionExplanation,
  findingSentence,
  candidateDimensions,
  candidateValue,
  acceptanceDimensions,
  acceptanceAfter,
  positiveEvidence,
  acceptanceEvidence,
  SEVERITY_RANK,
  OPERATORS,
  KIND_LABEL,
};
