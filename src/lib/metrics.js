"use strict";

const { candidateDimensions } = require("./rules");

// Measurement for the pilot.
//
// The problem with a metric computed over the profiles a matchmaker chose to
// check is that it improves when they stop checking. So the primary outcome is
// not a rate over checked profiles. It is:
//
//   the proportion of ALL profiles shared in the measurement window that
//   contain a conflict with a criterion the client had on file at the time,
//   determined by re-applying the same rules to every share after the fact.
//
// Every share is audited, whatever arm the client is on and whether or not the
// card was ever shown. The audit reads the client's file as it stood at the
// moment of the share, so a criterion that was changed later is judged by what
// it was then. The denominator is every share, so a matchmaker who sends less
// cannot improve the number, and a matchmaker who stops using the card cannot
// either.
//
// The adoption guardrail is reported separately, because that is the thing
// that can move on its own. A primary rate that falls while adoption falls
// is not a result, and the two are shown side by side so that is visible.

const PERIOD_BASELINE = "baseline";
const PERIOD_MEASUREMENT = "measurement";

function emptyBucket() {
  return {
    shares: 0,
    audited: 0,
    unaudited: 0,
    conflictShares: 0,
    hardConflictShares: 0,
    softMismatchShares: 0,
    // Could not be judged at all: a criterion existed and the candidate's value
    // was not recorded.
    unknownShares: 0,
    // The client had nothing on file, so there was nothing to compare against.
    // This is not a clean result.
    noCriteriaShares: 0,
    cleanShares: 0,
    // At least one attribute was missing, whether or not there was also a
    // conflict. Kept apart so partial information stays visible.
    withMissingInformation: 0,
    confirmedAudits: 0,
    confirmedConflictShares: 0,
    historyFindings: 0,
  };
}

function finalise(b) {
  return {
    ...b,
    // The primary outcome. Denominator is every share in the period.
    rate: b.shares ? (b.conflictShares / b.shares) * 100 : null,
    hardRate: b.shares ? (b.hardConflictShares / b.shares) * 100 : null,
    softRate: b.shares ? (b.softMismatchShares / b.shares) * 100 : null,
    // How much of the period could be judged at all.
    auditCoverage: b.shares ? (b.audited / b.shares) * 100 : null,
    // How much of it was judged by a person as well as by the rules.
    humanConfirmedRate: b.confirmedAudits
      ? (b.confirmedConflictShares / b.confirmedAudits) * 100
      : null,
    unknownRate: b.shares ? (b.unknownShares / b.shares) * 100 : null,
  };
}

function periodOf(store, share) {
  const pilotStart = new Date(store.state.meta.pilotStart || 0).getTime();
  return new Date(share.sharedAt).getTime() >= pilotStart ? PERIOD_MEASUREMENT : PERIOD_BASELINE;
}

// Did the matchmaker open the card, with the check on it, before this profile
// went out? The card view is the evidence.
function wasCheckedBeforeSending(store, share) {
  const sharedAt = new Date(share.sharedAt).getTime();
  return store.state.cardViews.some(
    (v) =>
      v.clientId === share.clientId &&
      v.candidateId === share.candidateId &&
      v.surfaced === true &&
      new Date(v.at).getTime() <= sharedAt
  );
}

function computeOutcomeMetrics(store) {
  const buckets = {
    [PERIOD_BASELINE]: { intervention: emptyBucket(), control: emptyBucket() },
    [PERIOD_MEASUREMENT]: { intervention: emptyBucket(), control: emptyBucket() },
  };
  const all = emptyBucket();
  const byMatchmaker = new Map();
  const byClient = new Map();
  const overrides = [];

  const auditByShare = new Map(store.state.audits.map((a) => [a.shareId, a]));

  for (const share of store.state.shares) {
    const clientRec = store.client(share.clientId);
    const arm = clientRec && clientRec.arm === "control" ? "control" : "intervention";
    const period = periodOf(store, share);
    const audit = auditByShare.get(share.id);

    const targets = [buckets[period][arm], all];
    const mmKey = share.actor || "unknown";
    if (!byMatchmaker.has(mmKey)) byMatchmaker.set(mmKey, emptyBucket());
    targets.push(byMatchmaker.get(mmKey));
    if (!byClient.has(share.clientId)) byClient.set(share.clientId, emptyBucket());
    targets.push(byClient.get(share.clientId));

    for (const b of targets) {
      b.shares += 1;
      if (!audit) {
        b.unaudited += 1;
        continue;
      }
      b.audited += 1;
      if (audit.classification === "hard_conflict") {
        b.conflictShares += 1;
        b.hardConflictShares += 1;
      } else if (audit.classification === "soft_mismatch") {
        b.conflictShares += 1;
        b.softMismatchShares += 1;
      } else if (audit.classification === "unknown") {
        b.unknownShares += 1;
      } else if (audit.classification === "no_criteria") {
        b.noCriteriaShares += 1;
      } else {
        b.cleanShares += 1;
      }
      // Missing information is counted on its own, so a profile that had both a
      // conflict and an unrecorded attribute still shows the gap.
      if ((audit.unknown || 0) > 0) b.withMissingInformation += 1;
      if (audit.humanConfirmed === true) {
        b.confirmedAudits += 1;
        if (audit.classification === "hard_conflict" || audit.classification === "soft_mismatch") {
          b.confirmedConflictShares += 1;
        }
      }
      b.historyFindings += audit.history || 0;
    }
  }

  // The adoption guardrail. Only the intervention arm could have had the
  // check consulted; the control arm is reported at zero by design.
  const adoption = { intervention: emptyAdoption(), control: emptyAdoption() };
  for (const share of store.state.shares) {
    if (periodOf(store, share) !== PERIOD_MEASUREMENT) continue;
    const clientRec = store.client(share.clientId);
    const arm = clientRec && clientRec.arm === "control" ? "control" : "intervention";
    adoption[arm].eligible += 1;
    if (wasCheckedBeforeSending(store, share)) adoption[arm].checked += 1;
  }

  // Overrides: a warning was on the card and the profile went anyway. The
  // level says how firm the warning was, because an override of a firm no is
  // a different thing from an override of a pattern.
  for (const res of store.state.resolutions) {
    if (res.action !== "proceed") continue;
    if (periodOf(store, { sharedAt: res.resolvedAt }) !== PERIOD_MEASUREMENT) continue;
    const chk = res.check;
    if (!chk || !chk.flagged) continue;
    let level = "advisory";
    if (chk.dealbreakerConflicts > 0) level = "dealbreaker";
    else if (chk.confirmedPreferenceMismatches > 0 || chk.state === "contradiction") {
      level = "preference";
    }
    overrides.push({
      clientId: res.clientId,
      candidateId: res.candidateId,
      level,
      reason: res.rationale || "",
      at: res.resolvedAt,
    });
  }
  const overridesWithReason = overrides.filter((o) => o.reason && o.reason.trim()).length;

  // The numbers the dashboard shows, in the words the dashboard uses them in.
  // The same underlying figures, named for a matchmaker rather than a
  // measurement team.
  const plain = (b) => ({
    sent: b.shares,
    issues: b.conflictShares,
    dealbreakers: b.hardConflictShares,
    mismatches: b.softMismatchShares,
    missingInformation: b.withMissingInformation,
    noConflicts: b.cleanShares,
    nothingToCompare: b.noCriteriaShares,
    couldNotJudge: b.unknownShares,
  });

  return {
    window: {
      pilotStart: store.state.meta.pilotStart,
      baseline: finalise(buckets[PERIOD_BASELINE].intervention),
      baselineControl: finalise(buckets[PERIOD_BASELINE].control),
      measurement: finalise(buckets[PERIOD_MEASUREMENT].intervention),
      measurementControl: finalise(buckets[PERIOD_MEASUREMENT].control),
      overall: finalise(all),
    },
    headline: {
      current: plain(buckets[PERIOD_MEASUREMENT].intervention),
      before: plain(buckets[PERIOD_BASELINE].intervention),
      checkedBeforeSending: adoption.intervention.checked,
      eligibleToCheck: adoption.intervention.eligible,
    },
    adoption: {
      intervention: {
        eligible: adoption.intervention.eligible,
        checked: adoption.intervention.checked,
        rate: adoption.intervention.eligible
          ? (adoption.intervention.checked / adoption.intervention.eligible) * 100
          : null,
      },
      control: {
        eligible: adoption.control.eligible,
        checked: adoption.control.checked,
        rate: adoption.control.eligible ? (adoption.control.checked / adoption.control.eligible) * 100 : null,
      },
    },
    overrides: {
      count: overrides.length,
      dealbreaker: overrides.filter((o) => o.level === "dealbreaker").length,
      preference: overrides.filter((o) => o.level === "preference").length,
      advisory: overrides.filter((o) => o.level === "advisory").length,
      withReason: overridesWithReason,
      detail: overrides,
    },
    byMatchmaker: Array.from(byMatchmaker.entries()).map(([name, b]) => ({ name, ...finalise(b) })),
    byClient: Array.from(byClient.entries()).map(([id, b]) => {
      const c = store.client(id);
      return { clientId: id, name: c ? c.name : id, ...finalise(b) };
    }),
  };
}

function emptyAdoption() {
  return { eligible: 0, checked: 0 };
}

// ---- earlier diagnostics, kept because they answer different questions ----

function activePrefs(store, clientId) {
  return store.preferences(clientId).filter((p) => p.status === "active");
}

function earliestShareFor(store, clientId, candidateId, beforeTime) {
  const shares = store
    .shares(clientId)
    .filter((s) => s.candidateId === candidateId && new Date(s.sharedAt) <= new Date(beforeTime));
  if (shares.length === 0) return null;
  shares.sort((a, b) => new Date(a.sharedAt) - new Date(b.sharedAt));
  return shares[0];
}

function acceptanceDims(store, a) {
  if (a.dimension) return [a.dimension];
  const cand = store.candidate(a.candidateId);
  return cand ? candidateDimensions(cand) : [];
}

// The value a candidate carried on a dimension, or null when it is not known.
function rejectedCandidateValue(store, candidateId, dimension) {
  const cand = store.candidate(candidateId);
  if (!cand || !cand.attributes) return null;
  const v = cand.attributes[dimension];
  return v === undefined || v === null ? null : v;
}

// The post-hoc version of the brief's 35% figure: rejections whose reason was
// already in the client's recorded preferences at rejection time. The
// denominator is rejections, not shares, and it is a diagnostic rather than
// the primary outcome.
function computeMetricA(store, clientId) {
  const rejections = store.rejections(clientId);
  const prefs = activePrefs(store, clientId);
  const coded = rejections.filter((r) => r.dimension);

  let conflicts = 0;
  let dealbreaker = 0;

  for (const r of coded) {
    const share = earliestShareFor(store, clientId, r.candidateId, r.recordedAt);
    const at = share ? share.sharedAt : r.recordedAt;
    const matching = prefs.filter(
      (p) => p.dimension === r.dimension && new Date(p.recordedAt) < new Date(at)
    );
    if (matching.length > 0) {
      conflicts += 1;
      if (matching.some((p) => p.kind === "confirmed_dealbreaker" && p.confirmed)) dealbreaker += 1;
    }
  }

  return {
    coded: coded.length,
    uncoded: rejections.length - coded.length,
    conflicts,
    dealbreaker,
    preference: conflicts - dealbreaker,
    rate: coded.length ? conflicts / coded.length : null,
  };
}

// Recurrence, not avoidability. Reported with the evidence that was available
// at share time.
function computeArcr(store, clientId) {
  const shares = store.shares(clientId);
  const rejections = store.rejections(clientId);
  const acceptances = store.acceptances(clientId);
  const prefs = activePrefs(store, clientId);

  let eligible = 0;
  const numerator = { hard: 0, contradiction: 0, plain: 0, settled: 0, total: 0 };

  for (const s of shares) {
    const cand = store.candidate(s.candidateId);
    if (!cand || candidateDimensions(cand).length === 0) continue; // untagged, not eligible

    const shareTime = new Date(s.sharedAt);
    const priorAny = rejections.filter((r) => r.dimension && new Date(r.recordedAt) < shareTime);
    if (priorAny.length === 0) continue; // no coded history yet, not eligible

    eligible += 1;

    const rej = rejections.find((r) => r.candidateId === s.candidateId);
    if (!rej || !rej.dimension) continue; // not rejected, or rejection uncoded

    const dim = rej.dimension;
    const priorOnDim = rejections.filter(
      (r) => r.dimension === dim && new Date(r.recordedAt) < shareTime
    );
    if (priorOnDim.length === 0) continue; // first rejection on this dimension

    numerator.total += 1;

    // A hard conflict is one that a confirmed dealbreaker would have caught.
    // Where both sides carry a value, the comparison is on the value.
    const rejectedValue = rejectedCandidateValue(store, rej.candidateId, dim);
    const hardAtShare = prefs.some((p) => {
      if (p.kind !== "confirmed_dealbreaker" || !p.confirmed) return false;
      if (new Date(p.confirmedAt || p.recordedAt) >= shareTime) return false;
      if (rejectedValue && p.values && p.values.length) {
        return p.values.indexOf(rejectedValue) !== -1;
      }
      return true;
    });
    if (hardAtShare) {
      numerator.hard += 1;
      continue;
    }

    const settledAtShare = prefs.some(
      (p) =>
        p.kind === "confirmed_preference" &&
        p.confirmed &&
        p.dimension === dim &&
        new Date(p.confirmedAt || p.recordedAt) < shareTime
    );
    if (settledAtShare) {
      numerator.settled += 1;
      continue;
    }

    const earliestPrior = priorOnDim
      .slice()
      .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt))[0];
    const acceptedBetween = acceptances.some((a) => {
      const dims = acceptanceDims(store, a);
      return (
        dims.includes(dim) &&
        new Date(a.acceptedAt) > new Date(earliestPrior.recordedAt) &&
        new Date(a.acceptedAt) < shareTime
      );
    });
    if (acceptedBetween) numerator.contradiction += 1;
    else numerator.plain += 1;
  }

  return {
    eligible,
    numerator: numerator.total,
    hard: numerator.hard,
    contradiction: numerator.contradiction,
    plain: numerator.plain,
    settled: numerator.settled,
    attributable: numerator.hard + numerator.contradiction + numerator.plain,
    rate: eligible ? numerator.total / eligible : null,
  };
}

function computeSessionMetrics(store) {
  const rejections = store.state.rejections;
  const latencies = rejections
    .map((r) => r.latencyMs)
    .filter((v) => typeof v === "number" && v >= 0);
  const median = latencies.length
    ? latencies.slice().sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
    : null;
  return {
    shares: store.state.shares.length,
    rejections: rejections.length,
    codedRejections: rejections.filter((r) => r.dimension).length,
    uncodedRejections: rejections.filter((r) => !r.dimension).length,
    acceptances: store.state.acceptances.length,
    insights: store.state.insights.length,
    confirmations: store.state.confirmations.length,
    resolutions: store.state.resolutions.length,
    cardViews: store.state.cardViews.length,
    audits: store.state.audits.length,
    auditEvents: store.state.audit.length,
    medianCaptureLatencyMs: median,
    insightConsultation: computeInsightConsultation(store),
    outcome: computeOutcomeMetrics(store),
  };
}

// The learning-loop metric: of the acceptance insights the matchmaker captured,
// how many were explicitly consulted in a later recommendation. Only insights
// that had a subsequent recommendation opportunity count in the denominator; an
// insight captured with no share after it is not counted as unconsulted.
function computeInsightConsultation(store) {
  const insights = store.state.insights || [];
  const shares = store.state.shares || [];
  let eligible = 0;
  let consulted = 0;
  let noOpportunity = 0;
  for (const ins of insights) {
    const after = new Date(ins.recordedAt);
    const subsequent = shares.filter(
      (s) => s.clientId === ins.clientId && new Date(s.sharedAt) > after
    );
    if (subsequent.length === 0) {
      noOpportunity += 1;
      continue;
    }
    eligible += 1;
    if (subsequent.some((s) => (s.consultedInsightIds || []).includes(ins.id))) {
      consulted += 1;
    }
  }
  return {
    total: insights.length,
    eligible,
    noOpportunity,
    consulted,
    rate: eligible ? consulted / eligible : null,
  };
}

module.exports = {
  computeMetricA,
  computeArcr,
  computeSessionMetrics,
  computeInsightConsultation,
  computeOutcomeMetrics,
  PERIOD_BASELINE,
  PERIOD_MEASUREMENT,
};
