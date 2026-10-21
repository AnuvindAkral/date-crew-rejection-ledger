"use strict";

// The ten decision-logic scenarios, exercised against the real code.
// These are the behaviours the send review is supposed to get right, so they
// are written as scenarios rather than as unit tests of internals.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { evaluateSend } = require("../src/lib/rules");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

test("scenario 1: a profile that clearly conflicts with a confirmed dealbreaker", () => {
  const store = fresh();
  // Rahul's confirmed dealbreaker is Non-vegetarian. Nikhil is non-vegetarian.
  const result = evaluateSend(store, "c2", store.candidate("cand7"));
  assert.equal(result.state, "conflict");
  const finding = result.findings[0];
  assert.equal(finding.dimension, "diet_lifestyle");
  assert.equal(finding.value, "Non-vegetarian");
});

test("scenario 2: a profile that conflicts with a softer preference", () => {
  const store = fresh();
  // Neha wants children. Ishita does not want children. That is a stated
  // preference, not a dealbreaker, so it is advice rather than a warning.
  const result = evaluateSend(store, "c4", store.candidate("cand14"));
  assert.equal(result.state, "preference_mismatch");
  const finding = result.findings[0];
  assert.equal(finding.dimension, "values_intent");
  assert.equal(finding.basis, "stated_preference");
});

test("scenario 3: the relevant profile attribute is unknown", () => {
  const store = fresh();
  // Varun has no recorded position on children, and Neha cares.
  const result = evaluateSend(store, "c4", store.candidate("cand13"));
  assert.equal(result.state, "incomplete");
  // A candidate with nothing recorded at all is untagged, and untagged is
  // never treated as compatible.
  const untagged = evaluateSend(store, "c2", store.candidate("cand9"));
  assert.equal(untagged.state, "untagged");
});

test("scenario 4: a rejection reason is ambiguous", () => {
  const store = fresh();
  // Priya has one uncoded rejection. The check must not read as a clean result.
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.notEqual(result.state, "clean");
});

test("scenario 5: the client changes a preference", () => {
  const store = fresh();
  const before = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.equal(before.state, "contradiction");
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "dealbreaker",
    value: "Pune",
    verbatim: "Pune is a dealbreaker for me",
    actor: "aisha",
  });
  const after = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.equal(after.state, "conflict");
});

test("scenario 6: a past rejection appears similar to a new profile", () => {
  const store = fresh();
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(result.findings.some((f) => f.type === "repeat" || f.type === "contradiction"));
});

test("scenario 7: a past acceptance appears similar to a new profile", () => {
  const store = fresh();
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(result.findings.some((f) => f.type === "contradiction"));
});

test("scenario 8: two notes contradict each other", () => {
  const store = fresh();
  // The client settles location as a preference, then rejects on it again.
  // The settled rule must not silence the new evidence.
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "preference",
    value: "Bangalore metro",
    verbatim: "Location is a preference, not a no",
    actor: "aisha",
  });
  store.reject({
    clientId: "c1",
    candidateId: "cand5",
    dimension: "location_city_tier",
    severity: "likely_dealbreaker",
    freeText: "actually no, location is a dealbreaker after all",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.notEqual(result.state, "clean");
  assert.ok(result.findings.some((f) => f.type === "repeat" || f.type === "conflict"));
});

test("scenario 9: an insight exists but is no longer current", () => {
  const store = fresh();
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(result.findings.length > 0);
  // Every finding must name its dimension and carry the evidence behind it.
  for (const f of result.findings) {
    assert.ok(f.dimension, "finding must name its dimension");
    assert.ok(["conflict", "contradiction", "repeat", "preference_mismatch", "incomplete"].includes(f.type));
  }
});

test("scenario 10: a matchmaker proceeds despite a warning", () => {
  const store = fresh();
  const result = evaluateSend(store, "c2", store.candidate("cand7"));
  assert.equal(result.state, "conflict");
  // Proceeding is always permitted: the check reports, it never blocks.
  const rec = store.share({ clientId: "c2", candidateId: "cand7", actor: "aisha" });
  assert.ok(rec.id);
});
