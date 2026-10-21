"use strict";

const { DIMENSIONS, SEVERITIES, dimensionLabel } = require("./dimensions");
const { evaluateSend, acceptanceAfter, acceptanceDimensions, candidateDimensions } = require("./rules");
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
    const contradiction =
      list.length > 0 &&
      row.acceptedCount > 0 &&
      acceptanceAfter(store, clientId, row.dimension, earliest.recordedAt);
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
      preferences: store.preferences(c.id),
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
    // Candidates carry a dimensions list derived from their attributes, so the
    // interface and the server agree on what a candidate says something about.
    candidates: store.state.candidates.map((c) => ({ ...c, dimensions: candidateDimensions(c) })),
    clients,
  };
}

module.exports = { buildBootstrap, buildLedger };
