"use strict";

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
    if (!cand || cand.dimensions.length === 0) continue; // untagged, not eligible

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

    const hardAtShare = prefs.some(
      (p) =>
        p.kind === "confirmed_dealbreaker" &&
        p.confirmed &&
        p.dimension === dim &&
        new Date(p.confirmedAt || p.recordedAt) < shareTime
    );
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
  };
}

// The learning-loop metric: of the acceptance insights the matchmaker captured,
// how many were explicitly consulted in a later recommendation. This measures
// whether the loop is used, not whether it improves matching.
function computeInsightConsultation(store) {
  const insights = store.state.insights || [];
  const consulted = new Set();
  for (const s of store.state.shares || []) {
    for (const id of s.consultedInsightIds || []) consulted.add(id);
  }
  const consultedCount = insights.filter((i) => consulted.has(i.id)).length;
  return {
    total: insights.length,
    consulted: consultedCount,
    rate: insights.length ? consultedCount / insights.length : null,
  };
}

module.exports = { computeMetricA, computeArcr, computeSessionMetrics, computeInsightConsultation };
