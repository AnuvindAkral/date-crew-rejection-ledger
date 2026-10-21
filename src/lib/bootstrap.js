"use strict";

const { DIMENSIONS, SEVERITIES, dimensionLabel } = require("./dimensions");
const { evaluateSend } = require("./rules");
const { computeMetricA, computeArcr, computeSessionMetrics } = require("./metrics");

function acceptanceAfter(store, clientId, dimension, afterTime) {
  const after = new Date(afterTime);
  return store.acceptances(clientId).some((a) => {
    const cand = store.candidate(a.candidateId);
    if (!cand || !cand.dimensions.includes(dimension)) return false;
    return new Date(a.acceptedAt) > after;
  });
}

function buildLedger(store, clientId) {
  const rejections = store.rejections(clientId);

  const byDim = {};
  for (const r of rejections) {
    if (!r.dimension) continue;
    if (!byDim[r.dimension]) {
      byDim[r.dimension] = { dimension: r.dimension, rejectionList: [], acceptedCount: 0, confirmedRule: null };
    }
    byDim[r.dimension].rejectionList.push(r);
  }

  for (const a of store.acceptances(clientId)) {
    const cand = store.candidate(a.candidateId);
    if (!cand) continue;
    for (const d of cand.dimensions) {
      if (byDim[d]) byDim[d].acceptedCount += 1;
    }
  }

  const confirmed = new Map();
  for (const c of store.confirmations(clientId)) {
    confirmed.set(c.dimension, c.answer);
  }
  for (const p of store.preferences(clientId)) {
    if (p.confirmed) {
      confirmed.set(p.dimension, p.kind === "confirmed_dealbreaker" ? "dealbreaker" : "preference");
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
    return {
      id: c.id,
      name: c.name,
      city: c.city,
      journey: c.journey,
      arm: c.arm,
      preferences: store.preferences(c.id),
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
    session: computeSessionMetrics(store),
    candidates: store.state.candidates,
    clients,
  };
}

module.exports = { buildBootstrap, buildLedger, acceptanceAfter };
