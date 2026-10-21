"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { buildBootstrap } = require("../src/lib/bootstrap");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

test("bootstrap exposes candidates, dimensions and per-client review states", () => {
  const store = createStore(buildSeed(NOW));
  const b = buildBootstrap(store);

  assert.ok(Array.isArray(b.candidates));
  assert.ok(b.candidates.length > 0);
  assert.ok(Array.isArray(b.dimensions));
  assert.equal(b.dimensions.length, 13);

  const priya = b.clients.find((c) => c.id === "c1");
  assert.ok(priya.queue.every((q) => typeof q.review === "object" && q.review.state));
  assert.ok(priya.ledger.rows.some((r) => r.dimension === "location_city_tier" && r.contradiction));
  assert.equal(priya.arcr.rate, 0.4);
});

test("every queue candidate review state is one of the known states", () => {
  const store = createStore(buildSeed(NOW));
  const b = buildBootstrap(store);
  const allowed = new Set(["conflict", "contradiction", "repeat", "preference_mismatch", "incomplete", "clean", "untagged", "no_history", "uncoded_only"]);
  for (const c of b.clients) {
    for (const q of c.queue) {
      assert.ok(allowed.has(q.review.state), `unexpected state ${q.review.state}`);
    }
  }
});

test("control-arm clients compute warnings but do not surface them", () => {
  const store = createStore(buildSeed(NOW));
  // Give the control client (c3) history that would fire a contradiction.
  store.state.preferences.push({
    id: "p-ctrl",
    clientId: "c3",
    dimension: "values_intent",
    kind: "stated_preference",
    confirmed: false,
    status: "active",
    recordedAt: "2026-01-01T00:00:00Z",
  });
  store.state.rejections.push({
    id: "r-ctrl",
    clientId: "c3",
    candidateId: "cand10",
    dimension: "values_intent",
    severity: "preference",
    freeText: "",
    recordedAt: "2026-01-02T00:00:00Z",
    capturedBy: "aisha",
  });
  store.state.acceptances.push({
    id: "a-ctrl",
    clientId: "c3",
    candidateId: "cand8",
    dimension: "values_intent",
    acceptedAt: "2026-01-03T00:00:00Z",
  });

  const b = buildBootstrap(store);
  const meera = b.clients.find((c) => c.id === "c3");
  const sam = meera.queue.find((q) => q.id === "cand10");
  assert.equal(sam.review.state, "contradiction");
  assert.equal(sam.review.surface, false);
});

test("queue candidates carry a dimensions list derived from their attributes", () => {
  const store = createStore(buildSeed(NOW));
  const b = buildBootstrap(store);
  for (const c of b.clients) {
    for (const q of c.queue) {
      assert.ok(Array.isArray(q.dimensions), `queue candidate ${q.id} must expose dimensions`);
      if (q.attributes) {
        assert.deepEqual(
          q.dimensions.slice().sort(),
          Object.keys(q.attributes).sort(),
          `queue candidate ${q.id} dimensions must match its attributes`
        );
      }
    }
  }
});

test("the top level candidate list also exposes derived dimensions", () => {
  const store = createStore(buildSeed(NOW));
  const b = buildBootstrap(store);
  for (const cand of b.candidates) {
    assert.ok(Array.isArray(cand.dimensions));
  }
});
