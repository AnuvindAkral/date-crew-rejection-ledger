"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { evaluateSend } = require("../src/lib/rules");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

function fresh() {
  return createStore(buildSeed(NOW));
}

test("contradiction fires when a dimension was rejected then later accepted", () => {
  const store = fresh();
  const cand = store.candidate("cand5"); // location_city_tier
  const result = evaluateSend(store, "c1", cand);
  assert.equal(result.state, "contradiction");
  assert.ok(
    result.findings.some((f) => f.type === "contradiction" && f.dimension === "location_city_tier")
  );
});

test("confirmed dealbreaker fires a hard conflict", () => {
  const store = fresh();
  const cand = store.candidate("cand7"); // diet_lifestyle
  const result = evaluateSend(store, "c2", cand);
  assert.equal(result.state, "conflict");
  assert.ok(
    result.findings.some((f) => f.type === "conflict" && f.dimension === "diet_lifestyle")
  );
});

test("no history returns no_history, not clean", () => {
  const store = fresh();
  const cand = store.candidate("cand10");
  const result = evaluateSend(store, "c3", cand);
  assert.equal(result.state, "no_history");
});

test("clean send when no recorded dimension conflicts", () => {
  const store = fresh();
  const cand = store.candidate("cand8"); // values_intent, profession_seniority
  const result = evaluateSend(store, "c2", cand);
  assert.equal(result.state, "clean");
});

test("untagged candidate is untagged, never treated as compatible", () => {
  const store = fresh();
  const cand = store.candidate("cand9"); // []
  const result = evaluateSend(store, "c2", cand);
  assert.equal(result.state, "untagged");
});

test("a prior rejection without acceptance is a repeat, not a contradiction", () => {
  const store = fresh();
  const cand = store.candidate("cand11"); // education, rejected once, no acceptance
  const result = evaluateSend(store, "c1", cand);
  assert.equal(result.state, "repeat");
});

test("a likely_dealbreaker rejection alone never becomes a hard conflict", () => {
  const store = fresh();
  store.reject({
    clientId: "c3",
    candidateId: "cand10",
    dimension: "values_intent",
    severity: "likely_dealbreaker",
    freeText: "misaligned values",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c3", { id: "x", dimensions: ["values_intent"] });
  assert.equal(result.state, "repeat");
});

test("client clarification to preference resolves a contradiction to clean", () => {
  const store = fresh();
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "preference",
    verbatim: "Location is a preference, not a dealbreaker",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c1", store.candidate("cand6"));
  assert.equal(result.state, "clean");
});

test("client clarification to dealbreaker turns a contradiction into a conflict", () => {
  const store = fresh();
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "dealbreaker",
    verbatim: "Location is a dealbreaker for me",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c1", store.candidate("cand6"));
  assert.equal(result.state, "conflict");
});

test("an uncertain clarification changes no preference and keeps the contradiction", () => {
  const store = fresh();
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "uncertain",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c1", store.candidate("cand6"));
  assert.equal(result.state, "contradiction");
  const confirmed = store
    .preferences("c1")
    .filter((p) => p.dimension === "location_city_tier" && p.confirmed);
  assert.equal(confirmed.length, 0);
});

test("positive evidence labels stated preferences and observed acceptances separately", () => {
  const store = fresh();
  const cand = store.candidate("cand5"); // location_city_tier, personality_temperament
  const result = evaluateSend(store, "c1", cand);
  const loc = result.positive.filter((p) => p.dimension === "location_city_tier");
  assert.ok(loc.some((p) => p.source === "stated_preference"));
  assert.ok(loc.some((p) => p.source === "observed_acceptance"));
  assert.ok(!result.positive.some((p) => p.dimension === "personality_temperament"));
});
