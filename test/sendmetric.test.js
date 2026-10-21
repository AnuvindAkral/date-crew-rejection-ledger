"use strict";

// The primary metric, measured at send time. The server recomputes the check
// when a profile is shared, so these numbers are facts about the sends.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { computeSendTimeMetrics } = require("../src/lib/metrics");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

test("the metric separates the arms and starts empty", () => {
  const store = fresh();
  const m = computeSendTimeMetrics(store);
  // The seed carries seven historical shares, from before the check existed.
  assert.equal(m.intervention.shared, 7);
  assert.equal(m.intervention.checked, 0);
  assert.equal(m.intervention.notChecked, 7);
  assert.equal(m.intervention.rate, null);
  assert.equal(m.control.shared, 0);
});

test("a share with a confirmed dealbreaker conflict is counted in the numerator", () => {
  const store = fresh();
  // Nikhil is non-vegetarian, which is Rahul's confirmed dealbreaker.
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.shared, 8);
  assert.equal(m.intervention.checked, 1);
  assert.equal(m.intervention.conflictShares, 1);
  assert.equal(m.intervention.dealbreakerConflictShares, 1);
  assert.equal(m.intervention.rate, 100);
});

test("a clean share is counted in the denominator and not the numerator", () => {
  const store = fresh();
  // Dev is vegetarian, so there is no conflict.
  store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.checked, 1);
  assert.equal(m.intervention.conflictShares, 0);
  assert.equal(m.intervention.cleanShares, 1);
  assert.equal(m.intervention.rate, 0);
});

test("a share that could not be checked is never counted as clean", () => {
  const store = fresh();
  // Varun has no recorded position on children and Neha cares about it.
  store.share({ clientId: "c4", candidateId: "cand13", actor: "Farhan Qureshi" });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.checked, 1);
  assert.equal(m.intervention.cleanShares, 0);
  assert.equal(m.intervention.unknownShares, 1);
  // Unknown is not clean, and it is not a conflict either.
  assert.equal(m.intervention.rate, 0);
});

test("an ordinary stated preference is not in the numerator", () => {
  const store = fresh();
  // Ishita does not want children, which is an ordinary stated preference.
  store.share({ clientId: "c4", candidateId: "cand14", actor: "Farhan Qureshi" });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.conflictShares, 0);
  assert.equal(m.intervention.preferenceConflictShares, 0);
});

test("a control-arm share is counted separately and still measured", () => {
  const store = fresh();
  store.share({ clientId: "c3", candidateId: "cand10", actor: "Farhan Qureshi" });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.control.shared, 1);
  assert.equal(m.control.checked, 1);
  assert.equal(m.intervention.checked, 0);
});

test("a conflict the matchmaker sent anyway counts as an override", () => {
  const store = fresh();
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  store.resolve({
    clientId: "c2",
    candidateId: "cand7",
    action: "proceed",
    rationale: "Sent anyway",
    actor: "Aisha Verma",
  });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.detectedPairs, 1);
  assert.equal(m.intervention.sharedConflictPairs, 1);
  assert.equal(m.intervention.overrideRate, 100);
});

test("a conflict caught and held is detected but did not reach the client", () => {
  const store = fresh();
  store.resolve({
    clientId: "c2",
    candidateId: "cand7",
    action: "hold",
    rationale: "Held",
    actor: "Aisha Verma",
  });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.detectedPairs, 1);
  assert.equal(m.intervention.sharedConflictPairs, 0);
  assert.equal(m.intervention.checked, 0);
  assert.equal(m.intervention.overrideRate, 0);
});

test("the rate is per client as well as per arm", () => {
  const store = fresh();
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  const m = computeSendTimeMetrics(store);
  const row = m.perClient.find((c) => c.clientId === "c2");
  assert.equal(row.shared, 3); // one seeded, two new
  assert.equal(row.checked, 2);
  assert.equal(row.conflictShares, 1);
  assert.equal(row.rate, 50);
});

test("coverage reports how much of what was shared was checked", () => {
  const store = fresh();
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  const m = computeSendTimeMetrics(store);
  assert.equal(m.intervention.coverage, Math.round((1 / 8) * 1000) / 10);
});
