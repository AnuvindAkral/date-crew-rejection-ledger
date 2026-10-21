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

const { dimensionLabel, dimensionNoun, valuePhrase, displayValue } = require("./dimensions");

// The order a card leads with. A conflict is a firm no, an incomplete record is
// the least useful thing to say, and missing information is not a clean result.
const SEVERITY_RANK = {
  conflict: 0,
  contradiction: 1,
  repeat: 2,
  preference_mismatch: 3,
  incomplete: 4,
};

// What each finding is called, in the words a matchmaker would use.
const FINDING_HEADLINE = {
  conflict: "Dealbreaker",
  preference_mismatch: "Preference mismatch",
  contradiction: "Their file disagrees with itself",
  repeat: "You have rejected on this before",
  incomplete: "Missing information",
};

// What each level of firmness is called, for a matchmaker.
const KIND_HEADLINE = {
  confirmed_dealbreaker: "Dealbreaker",
  confirmed_preference: "Confirmed preference",
  stated_preference: "Stated preference",
  observation: "An observation to check",
};

// The tiers of evidence, which are not the same thing as the kinds.
//
//   confirmed   the client has answered or confirmed this
//   stated      recorded at intake from what the client said
//   observation a matchmaker has noticed a pattern. It is a hypothesis, and it
//               is never used to exclude a candidate until the client confirms it
const OBSERVATION = "observation";

function isObservation(criterion) {
  return !!criterion && criterion.kind === OBSERVATION;
}

function isConfirmed(criterion) {
  if (!criterion) return false;
  return (
    criterion.kind === "confirmed_dealbreaker" ||
    criterion.kind === "confirmed_preference" ||
    criterion.source === "client_answer"
  );
}

// What tier of evidence a criterion rests on, for the interface.
function criterionTier(criterion) {
  if (!criterion) return "none";
  if (isObservation(criterion)) return "observation";
  if (isConfirmed(criterion)) return "confirmed";
  return "stated";
}

const TIER_HEADLINE = {
  confirmed: "Confirmed by the client",
  stated: "Recorded at intake",
  observation: "An observation to check, not a rule",
  none: "",
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

// A criterion as a short line, the way a matchmaker would say it out loud.
// "Wants a partner who is a non-smoker", or "Will not accept any of: occasional
// smoker, regular smoker".
function criterionSummary(criterion) {
  if (!criterion) return "";
  const values = criterionValues(criterion);
  const forbids = criterionOperator(criterion) === "must_not_be";
  if (values.length > 1) {
    const list = values.map((v) => displayValue(criterion.dimension, v)).join(", ");
    return forbids ? `Will not accept any of: ${list}` : `Wants one of: ${list}`;
  }
  const phrase = valuePhrase(criterion.dimension, values[0]);
  return forbids ? `Will not accept ${phrase}` : `Wants ${phrase}`;
}

// The same thing as a full sentence.
function criterionSentence(criterion) {
  const summary = criterionSummary(criterion);
  if (!summary) return "";
  return summary.startsWith("Will not")
    ? `The client ${summary.charAt(0).toLowerCase() + summary.slice(1)}.`
    : `The client ${summary.charAt(0).toLowerCase() + summary.slice(1)}.`;
}

// The plain-English reason a finding appeared. It names the client's criterion,
// the direction it runs in, the candidate's value, and where each came from, so
// nothing on the card has to be taken on trust.
function findingSentence(f) {
  const label = dimensionLabel(f.dimension);
  const noun = dimensionNoun(f.dimension);

  if (f.type === "contradiction") {
    // A decision that does not agree with what the client has on file. Both
    // are stated, and nothing here decides what they really meant.
    const decisions = f.decisions || [];
    const first = decisions[0];
    if (!first) return `What the client has on file about ${noun} does not agree with a decision they made.`;
    const when = new Date(first.at).toISOString().slice(0, 10);
    const what = first.kind === "accepted" ? "accepted" : "turned down";
    return `${criterionSentence(f.criterion)} They ${what} ${first.candidateName} on ${when}, whose profile listed: ${first.value}. Those two do not agree, and only the client can say which is right.`;
  }
  if (f.type === "repeat") {
    const n = f.rejections ? f.rejections.length : 0;
    return `The client has turned down ${n} profile${n === 1 ? "" : "s"} over ${noun}. That is a record of what happened, not proof of why.${f.note ? " " + f.note + "." : ""}`;
  }

  const criterion = f.criterion || null;
  const values = criterion ? criterionValues(criterion) : [];
  const kind = criterion ? KIND_LABEL[criterion.kind] : "criterion";

  if (f.value === null || f.value === undefined) {
    if (f.reason === "history") {
      return `The client has rejected profiles because of ${noun} before, and this candidate's profile does not say. It could not be checked.`;
    }
    return `The client has a ${kind} about ${noun}. This candidate's profile does not say, so it could not be checked.`;
  }
  return `${criterionSentence(criterion)} This candidate's profile lists: ${f.value}.`;
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

// The decisions the client has made on a dimension, with the value the profile
// carried at the time. An acceptance or a rejection is evidence that it
// happened, not evidence of why.
function historicalDecisions(store, clientId, dimension) {
  const out = [];
  for (const a of store.acceptances(clientId)) {
    if (!acceptanceDimensions(store, a).includes(dimension)) continue;
    const cand = store.candidate(a.candidateId);
    out.push({
      kind: "accepted",
      candidateId: a.candidateId,
      candidateName: cand ? cand.name : a.candidateId,
      value: candidateValue(cand, dimension),
      at: a.acceptedAt,
    });
  }
  for (const r of store.rejections(clientId)) {
    if (r.dimension !== dimension) continue;
    const cand = store.candidate(r.candidateId);
    out.push({
      kind: "rejected",
      candidateId: r.candidateId,
      candidateName: cand ? cand.name : r.candidateId,
      value: candidateValue(cand, dimension),
      at: r.recordedAt,
      severity: r.severity,
    });
  }
  return out;
}

// The decisions that do not agree with a criterion the client has on file.
//
// Two conditions, both needed.
//
// The decision has to come after the criterion. A decision made before the
// client said anything cannot contradict it, because the criterion was often
// formed out of those very decisions.
//
// And the decision has to be about the same thing. An acceptance breaks the
// criterion if the profile does not meet it. A rejection breaks it only if the
// matchmaker wrote down that dimension as the reason, and the profile met the
// criterion anyway: they turned down someone who did meet their own rule.
//
// Either way the file and the behaviour do not line up, and only the client can
// say which is right.
function decisionsAgainstCriterion(store, clientId, dimension, criterion) {
  const since = new Date(criterion.recordedAt || criterion.confirmedAt || 0).getTime();
  const out = [];

  for (const a of store.acceptances(clientId)) {
    if (new Date(a.acceptedAt).getTime() < since) continue;
    const cand = store.candidate(a.candidateId);
    const value = candidateValue(cand, dimension);
    if (value === null || value === undefined) continue;
    if (criterionVerdict(criterion, value) !== "violated") continue;
    out.push({
      kind: "accepted",
      candidateId: a.candidateId,
      candidateName: cand ? cand.name : a.candidateId,
      value,
      at: a.acceptedAt,
    });
  }

  for (const r of store.rejections(clientId)) {
    if (r.dimension !== dimension) continue;
    if (new Date(r.recordedAt).getTime() < since) continue;
    const cand = store.candidate(r.candidateId);
    const value = candidateValue(cand, dimension);
    if (value === null || value === undefined) continue;
    if (criterionVerdict(criterion, value) !== "satisfied") continue;
    out.push({
      kind: "rejected",
      candidateId: r.candidateId,
      candidateName: cand ? cand.name : r.candidateId,
      value,
      at: r.recordedAt,
      severity: r.severity,
    });
  }

  return out;
}

// Evidence from earlier acceptances on the same dimension. This is a pattern,
// not a match, so it is labelled as such.
function acceptanceEvidence(store, clientId, candidate, criteria) {
  const candidateDims = candidateDimensions(candidate);
  const onFile = criteria || new Map();
  const out = [];
  for (const d of candidateDims) {
    const acc = store
      .acceptances(clientId)
      .filter((a) => acceptanceDimensions(store, a).includes(d))
      .sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt))[0];
    if (acc) {
      const cand = store.candidate(acc.candidateId);
      // An acceptance is only evidence in the client's favour if it does not
      // disagree with what they have on file. If it does, it is a contradiction
      // to look into, and it is shown as that.
      const against = onFile.get(d);
      const value = candidateValue(cand, d);
      const conflicts =
        against && value !== null && criterionVerdict(against, value) === "violated";
      if (!conflicts) {
        out.push({
          dimension: d,
          source: "observed_acceptance",
          detail: cand ? cand.name : null,
          value: candidateValue(cand, d),
          acceptedAt: acc.acceptedAt,
        });
      }
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

  // An observation is a hypothesis. It is not something a profile can be
  // checked against, so it never makes a client count as having criteria.
  const observationsOnFile = Array.from(criteria.values()).filter((c) => c.kind === "observation");
  const applicableCriteria = Array.from(criteria.values()).filter(
    (c) => c.kind !== "observation"
  );

  if (candidateDims.length === 0) {
    return { state: "untagged", findings: [], positive: [], observations: [] };
  }
  if (rejections.length === 0 && applicableCriteria.length === 0) {
    // Nothing to compare against. A file holding only observations is in the
    // same position as an empty one, and neither is a clean result.
    return observationsOnFile.length
      ? { state: "no_criteria", findings: [], positive: [], observations: observationsOnFile }
      : { state: "no_history", findings: [], positive: [], observations: [] };
  }
  if (rejections.length > 0 && codedRejections.length === 0 && applicableCriteria.length === 0) {
    return { state: "uncoded_only", findings: [], positive: [], observations: observationsOnFile };
  }

  const findings = [];
  const positive = [];
  const observations = [];
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
    //
    //    An observation is a matchmaker's hypothesis. It is shown as context
    //    and it can be put to the client, but it never excludes a candidate,
    //    because the client has not said it.
    if (criterion && isObservation(criterion)) {
      observations.push(Object.assign({}, criterion, { summary: criterionSummary(criterion) }));
    } else if (criterion) {
      const op = operatorFor(criterion);
      const verdict = criterionVerdict(criterion, value);

      if (verdict === "unknown") {
        // The criterion travels with the finding, so the sentence can name what
        // could not be checked.
        findings.push(
          Object.assign({}, missingAgainstCriterion, {
            criterion,
            tier: criterionTier(criterion),
            tierLabel: TIER_HEADLINE[criterionTier(criterion)],
          })
        );
      } else if (verdict === "violated") {
        // How firm the criterion is decides how the finding is reported, not
        // which way the comparison runs.
        const hard = criterion.kind === "confirmed_dealbreaker";
        findings.push({
          type: hard ? "conflict" : "preference_mismatch",
          basis: criterion.kind,
          tier: criterionTier(criterion),
          tierLabel: TIER_HEADLINE[criterionTier(criterion)],
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

    // 2. A decision that does not agree with what the client has on file.
    //
    //    This is the only kind of contradiction worth raising. Accepting someone
    //    once and rejecting someone else once is not a contradiction, because
    //    either decision could have been about something else entirely. A
    //    contradiction is a decision that breaks, or ignores, a criterion the
    //    client has actually stated.
    if (criterion && !isObservation(criterion)) {
      const inconsistent = decisionsAgainstCriterion(store, clientId, dim, criterion);
      if (inconsistent.length) {
        findings.push({
          type: "contradiction",
          basis: "history",
          tier: criterionTier(criterion),
          tierLabel: TIER_HEADLINE[criterionTier(criterion)],
          dimension: dim,
          value,
          criterion,
          decisions: inconsistent,
        });
      }
    }

    // 3. Rejection history on this dimension.
    //
    //    Where the client has a criterion, the criterion is their stated
    //    position and this history does not fire against it. It is still worth
    //    showing on a dimension with nothing on file, and where the client has
    //    confirmed a preference and then rejected on it anyway, because that is
    //    new evidence against a rule they have just confirmed.
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
          value,
          severity: postSettlement[postSettlement.length - 1].severity,
          rejections: postSettlement,
          note: "The client turned this down again after confirming it",
        });
      } else if (!settled && !criterion) {
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
            value,
            severity: rejs[rejs.length - 1].severity,
            rejections: rejs,
          });
        }
      }
    }
  }

  const positiveEvidenceList = positive.concat(
    acceptanceEvidence(store, clientId, candidate, criteria)
  );

  // Every finding carries the sentence that explains it, so the interface
  // never has to reconstruct the reasoning.
  for (const f of findings) {
    if (!f.sentence) f.sentence = findingSentence(f);
  }

  if (findings.length === 0) {
    return { state: "clean", findings: [], positive: positiveEvidenceList, observations };
  }

  findings.sort((a, b) => SEVERITY_RANK[a.type] - SEVERITY_RANK[b.type]);
  return {
    state: findings[0].type,
    findings,
    positive: positiveEvidenceList,
    observations,
  };
}

module.exports = {
  evaluateSend,
  criteriaAt,
  isObservation,
  isConfirmed,
  criterionTier,
  TIER_HEADLINE,
  historicalDecisions,
  decisionsAgainstCriterion,
  criterionValues,
  criterionOperator,
  criterionVerdict,
  criterionExplanation,
  criterionSummary,
  criterionSentence,
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
  FINDING_HEADLINE,
  KIND_HEADLINE,
};
