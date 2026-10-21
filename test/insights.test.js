"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { computeInsightConsultation } = require("../src/lib/metrics");
const { buildBootstrap } = require("../src/lib/bootstrap");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

test("accept with a debrief records an acceptance insight", () => {
  const store = fresh();
  const before = store.state.insights.length;
  store.accept({
    clientId: "c3",
    candidateId: "cand10",
    dimensions: ["values_intent"],
    surprise: "She connected on values, not paper",
    actor: "aisha",
  });
  assert.equal(store.state.insights.length, before + 1);
  const ins = store.insights("c3").find((i) => i.candidateId === "cand10");
  assert.ok(ins);
  assert.deepEqual(ins.dimensions, ["values_intent"]);
  assert.equal(ins.surprise, "She connected on values, not paper");
});

test("accept with no debrief records the acceptance but does not invent an insight", () => {
  const store = fresh();
  const before = store.state.insights.length;
  store.accept({ clientId: "c3", candidateId: "cand10", actor: "aisha" });
  assert.equal(store.state.insights.length, before);
  assert.equal(store.acceptances("c3").length, 1);
});

test("ambiguous acceptance: surprise with no dimensions still records the insight", () => {
  const store = fresh();
  store.accept({
    clientId: "c3",
    candidateId: "cand10",
    dimensions: [],
    surprise: "Not sure what worked yet",
    actor: "aisha",
  });
  const ins = store.insights("c3").find((i) => i.candidateId === "cand10");
  assert.ok(ins);
  assert.deepEqual(ins.dimensions, []);
  assert.equal(ins.surprise, "Not sure what worked yet");
});

test("an insight never consulted in a later recommendation is not counted as consulted", () => {
  const store = fresh(); // seed has one insight (i1); no share consults it
  const m = computeInsightConsultation(store);
  assert.equal(m.total, 1);
  assert.equal(m.consulted, 0);
  assert.equal(m.rate, 0);
});

test("consulting an insight in a later share is counted", () => {
  const store = fresh();
  store.share({ clientId: "c1", candidateId: "cand5", consultedInsightIds: ["i1"], actor: "aisha" });
  const m = computeInsightConsultation(store);
  assert.equal(m.total, 1);
  assert.equal(m.consulted, 1);
  assert.equal(m.rate, 1);
});

test("the insight should not change a recommendation it does not relate to", () => {
  const store = fresh();
  // The matchmaker sends a candidate and does NOT consult the insight, because
  // it does not bear on this candidate. That is a correct non-consultation, and
  // it must not be counted as a consulted insight.
  store.share({ clientId: "c1", candidateId: "cand6", consultedInsightIds: [], actor: "aisha" });
  const m = computeInsightConsultation(store);
  assert.equal(m.consulted, 0);
  // The share still happened and the insight is still recorded.
  assert.equal(store.shares("c1").filter((s) => s.candidateId === "cand6").length, 1);
});

test("consultation counts only real insight ids, not arbitrary ones", () => {
  const store = fresh();
  store.share({ clientId: "c1", candidateId: "cand5", consultedInsightIds: ["nonexistent"], actor: "aisha" });
  const m = computeInsightConsultation(store);
  assert.equal(m.total, 1);
  assert.equal(m.consulted, 0);
});

test("bootstrap surfaces acceptance insights with the candidate name", () => {
  const store = fresh();
  const b = buildBootstrap(store);
  const priya = b.clients.find((c) => c.id === "c1");
  assert.ok(Array.isArray(priya.insights));
  assert.equal(priya.insights.length, 1);
  assert.equal(priya.insights[0].candidateName, "Arjun T.");
  assert.ok(Array.isArray(priya.insights[0].dimensions));
});
