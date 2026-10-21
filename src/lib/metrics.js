"use strict";

const { candidateDimensions } = require("./rules");

// Metric computations for the measurement view and the test suite. These mirror
// GATE_B_METRICS.md. ARCR measures recurrence, not avoidability. The sub-rates
// are mutually exclusive and follow the same precedence as the send-review card:
// hard (confirmed dealbreaker) > settled (confirmed preference) > contradiction
// (prior rejection then later acceptance) > plain (prior rejection only).

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
  return cand ? cand.dimensions : [];
}

// The value a candidate carried on a dimension, or null when it is not known.
function rejectedCandidateValue(store, candidateId, dimension) {
  const cand = store.candidate(candidateId);
  if (!cand || !cand.attributes) return null;
  const v = cand.attributes[dimension];
  return v === undefined || v === null ? null : v;
}

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
      if (rejectedValue && p.value) return rejectedValue === p.value;
      return true;
    });
    if (hardAtShare) {
      numerator.hard += 1;
      continue;
    }

    const settledAtShare = prefs.some(
      (p) =>
        p.kind === "stated_preference" &&
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

// The primary metric, measured at the moment of sending.
//
// Confirmed-criterion conflict rate at send time =
//   (profiles shared where the send-time check reported a conflict against a
//    client-confirmed criterion) / (profiles shared and checked) x 100
//
// The check is recomputed by the server at share time, so this is a fact about
// the send rather than a claim by the interface. The two components are kept
// apart: a conflict against a confirmed dealbreaker, and a mismatch against a
// confirmed preference. Ordinary stated preferences and prior-rejection
// history are advisory and are not in the numerator.
//
// The denominator is the profiles that were checked. A share with no check has
// an unknown conflict status, so it is reported as its own count rather than
// folded in, and coverage is reported alongside. Counting unchecked shares in
// the denominator would make the rate look better the less the tool was used.
//
// A share where the check could not be made (a missing candidate attribute) is
// not counted as clean. It is reported as its own bucket so the rate is never
// flattered by missing data.
function emptySendBucket() {
  return {
    shared: 0,
    checked: 0,
    notChecked: 0,
    conflictShares: 0,
    dealbreakerConflictShares: 0,
    preferenceConflictShares: 0,
    unknownShares: 0,
    advisoryShares: 0,
    cleanShares: 0,
    detectedPairs: 0,
    sharedConflictPairs: 0,
  };
}

function finaliseSendBucket(b) {
  return {
    ...b,
    rate: b.checked ? (b.conflictShares / b.checked) * 100 : null,
    dealbreakerRate: b.checked ? (b.dealbreakerConflictShares / b.checked) * 100 : null,
    preferenceRate: b.checked ? (b.preferenceConflictShares / b.checked) * 100 : null,
    // How much of what was shared was actually checked.
    coverage: b.shared ? (b.checked / b.shared) * 100 : null,
    // Of the conflicts the tool put in front of the matchmaker, how many still
    // went to the client.
    overrideRate: b.detectedPairs ? (b.sharedConflictPairs / b.detectedPairs) * 100 : null,
  };
}

function computeSendTimeMetrics(store) {
  const buckets = { intervention: emptySendBucket(), control: emptySendBucket() };
  const perClient = [];

  for (const client of store.state.clients) {
    const arm = client.arm === "control" ? "control" : "intervention";
    const b = buckets[arm];
    const clientBucket = emptySendBucket();
    const detectedPairs = new Set();
    const sharedConflictPairs = new Set();

    for (const s of store.state.shares) {
      if (s.clientId !== client.id) continue;
      b.shared += 1;
      clientBucket.shared += 1;
      if (!s.check) {
        b.notChecked += 1;
        clientBucket.notChecked += 1;
        continue;
      }
      b.checked += 1;
      clientBucket.checked += 1;
      if (s.check.confirmedConflicts > 0) {
        b.conflictShares += 1;
        clientBucket.conflictShares += 1;
        if (s.check.dealbreakerConflicts > 0) {
          b.dealbreakerConflictShares += 1;
          clientBucket.dealbreakerConflictShares += 1;
        }
        if (s.check.confirmedPreferenceMismatches > 0) {
          b.preferenceConflictShares += 1;
          clientBucket.preferenceConflictShares += 1;
        }
        sharedConflictPairs.add(s.candidateId);
      } else if (s.check.state === "incomplete") {
        b.unknownShares += 1;
        clientBucket.unknownShares += 1;
      } else if (s.check.state === "clean") {
        b.cleanShares += 1;
        clientBucket.cleanShares += 1;
      } else {
        b.advisoryShares += 1;
        clientBucket.advisoryShares += 1;
      }
    }

    // Cards the matchmaker closed. A confirmed conflict on a card is a conflict
    // the tool detected before the profile could go out.
    for (const r of store.state.resolutions) {
      if (r.clientId !== client.id) continue;
      if (r.check && r.check.confirmedConflicts > 0) detectedPairs.add(r.candidateId);
    }

    b.detectedPairs += detectedPairs.size;
    b.sharedConflictPairs += sharedConflictPairs.size;
    clientBucket.detectedPairs = detectedPairs.size;
    clientBucket.sharedConflictPairs = sharedConflictPairs.size;

    perClient.push({
      clientId: client.id,
      name: client.name,
      arm,
      ...finaliseSendBucket(clientBucket),
    });
  }

  return {
    intervention: finaliseSendBucket(buckets.intervention),
    control: finaliseSendBucket(buckets.control),
    perClient,
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
    auditEvents: store.state.audit.length,
    medianCaptureLatencyMs: median,
    insightConsultation: computeInsightConsultation(store),
    sendTime: computeSendTimeMetrics(store),
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
  computeSendTimeMetrics,
};
