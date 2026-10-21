"use strict";

const { DIMENSIONS, SEVERITIES, dimensionLabel } = require("./dimensions");
const {
  evaluateSend,
  acceptanceAfter,
  acceptanceDimensions,
  candidateDimensions,
  criteriaAt,
  criterionSummary,
  criterionTier,
  decisionsAgainstCriterion,
  KIND_HEADLINE,
  TIER_HEADLINE,
} = require("./rules");
const { computeMetricA, computeArcr, computeSessionMetrics } = require("./metrics");

function buildLedger(store, clientId) {
  const rejections = store.rejections(clientId);

  const byDim = {};
  for (const r of rejections) {
    if (!r.dimension) continue;
    if (!byDim[r.dimension]) {
      byDim[r.dimension] = { dimension: r.dimension, rejectionList: [], acceptedCount: 0, confirmedRule: null, confirmedValue: null };
    }
    byDim[r.dimension].rejectionList.push(r);
  }

  // Counted on the dimensions the acceptance actually spoke for, using the
  // same helper the send review uses, so the ledger and the card cannot
  // disagree about what an acceptance means.
  for (const a of store.acceptances(clientId)) {
    for (const d of acceptanceDimensions(store, a)) {
      if (byDim[d]) byDim[d].acceptedCount += 1;
    }
  }

  const confirmed = new Map();
  const confirmedValues = new Map();
  for (const c of store.confirmations(clientId)) {
    confirmed.set(c.dimension, c.answer);
    if (c.value) confirmedValues.set(c.dimension, c.value);
  }
  for (const p of store.preferences(clientId)) {
    if (p.confirmed) {
      confirmed.set(p.dimension, p.kind === "confirmed_dealbreaker" ? "dealbreaker" : "preference");
      if (p.value) confirmedValues.set(p.dimension, p.value);
    }
  }

  const rows = Object.values(byDim).map((row) => {
    const list = row.rejectionList.slice().sort(
      (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
    );
    const earliest = list[0];
    // A contradiction is a decision that disagrees with a criterion the client
    // has on file. It is not simply that they once accepted one profile and
    // rejected another.
    const criterionInForce = criteriaAt(store, clientId, earliest.recordedAt).get(row.dimension);
    const contradiction =
      !!criterionInForce &&
      criterionInForce.kind !== "observation" &&
      decisionsAgainstCriterion(store, clientId, row.dimension, criterionInForce).length > 0;
    return {
      dimension: row.dimension,
      label: dimensionLabel(row.dimension),
      rejectedCount: list.length,
      latestSeverity: list[list.length - 1].severity,
      latestDate: list[list.length - 1].recordedAt,
      acceptedCount: row.acceptedCount,
      confirmedRule: confirmed.get(row.dimension) || null,
      confirmedValue: confirmedValues.get(row.dimension) || null,
      contradiction,
      earliestRejection: earliest,
      rejections: list,
    };
  });

  const uncoded = rejections.filter((r) => !r.dimension).length;
  const total = rejections.length;

  return {
    rows,
    uncoded,
    codedCount: total - uncoded,
    total,
    confirmedRules: Object.fromEntries(confirmed),
  };
}

function buildBootstrap(store) {
  const clients = store.state.clients.map((c) => {
    const queue = store.queue(c.id);
    const mm = store.matchmaker(c.matchmakerId);
    return {
      id: c.id,
      name: c.name,
      city: c.city,
      journey: c.journey,
      arm: c.arm,
      matchmakerId: c.matchmakerId,
      matchmakerName: mm ? mm.name : null,
      preferences: store.activeCriteria(c.id).map((p) => ({
        ...p,
        // The plain wording, worked out once on the server so the interface
        // does not have to phrase the same criterion in two places.
        summary: criterionSummary(p),
        firmness: KIND_HEADLINE[p.kind] || "criterion",
        tier: criterionTier(p),
        tierLabel: TIER_HEADLINE[criterionTier(p)],
        sourceLabel:
          p.source === "client_answer" ? "Confirmed by the client" : "From the onboarding call",
      })),
      criterionHistory: store.criterionHistory(c.id),
      preferenceEvents: store.preferenceEvents(c.id),
      confirmations: store.confirmations(c.id),
      rejections: store.rejections(c.id),
      acceptances: store.acceptances(c.id).map((a) => ({
        ...a,
        candidateName: store.candidate(a.candidateId) ? store.candidate(a.candidateId).name : null,
      })),
      insights: store.insights(c.id).map((i) => ({
        ...i,
        candidateName: store.candidate(i.candidateId) ? store.candidate(i.candidateId).name : null,
      })),
      ledger: buildLedger(store, c.id),
      metricA: computeMetricA(store, c.id),
      arcr: computeArcr(store, c.id),
      audits: store.auditsFor(c.id),
      contradictions: store.clientContradictions(c.id),
      // The profiles this client has been sent, with what came back. The
      // outcome is recorded here so the matchmaker can capture it from the
      // same place they sent the profile, rather than from a separate ledger.
      sent: store
        .shares(c.id)
        .slice()
        .sort((a, b) => new Date(b.sharedAt) - new Date(a.sharedAt))
        .map((s) => {
          const rejections = store.rejections(c.id).filter((r) => r.candidateId === s.candidateId);
          const acceptances = store.acceptances(c.id).filter((a) => a.candidateId === s.candidateId);
          const cand = store.candidate(s.candidateId);
          return {
            id: s.id,
            candidateId: s.candidateId,
            candidateName: cand ? cand.name : s.candidateId,
            candidateCity: cand ? cand.city : null,
            sharedAt: s.sharedAt,
            actor: s.actor,
            outcome: rejections.length ? "rejected" : acceptances.length ? "accepted" : "pending",
            rejection: rejections.length
              ? {
                  dimension: rejections[rejections.length - 1].dimension,
                  severity: rejections[rejections.length - 1].severity,
                  freeText: rejections[rejections.length - 1].freeText,
                  recordedAt: rejections[rejections.length - 1].recordedAt,
                }
              : null,
            acceptance: acceptances.length ? { acceptedAt: acceptances[0].acceptedAt } : null,
          };
        }),
      queue: queue.map((cand) => ({
        ...cand,
        dimensions: candidateDimensions(cand),
        review: {
          ...evaluateSend(store, c.id, cand),
          surface: c.arm === "intervention",
        },
      })),
      resolutions: store.state.resolutions.filter((r) => r.clientId === c.id),
    };
  });

  return {
    meta: store.state.meta,
    dimensions: DIMENSIONS,
    severities: SEVERITIES,
    matchmakers: store.matchmakers(),
    session: computeSessionMetrics(store),
    audits: store.state.audits,
    // Candidates carry a dimensions list derived from their attributes, so the
    // interface and the server agree on what a candidate says something about.
    candidates: store.state.candidates.map((c) => ({ ...c, dimensions: candidateDimensions(c) })),
    clients,
  };
}

module.exports = { buildBootstrap, buildLedger };
