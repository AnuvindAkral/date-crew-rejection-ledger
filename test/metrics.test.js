"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { computeMetricA, computeArcr, computeSessionMetrics } = require("../src/lib/metrics");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

function fresh() {
  return createStore(buildSeed(NOW));
}

test("Metric A counts rejections whose reason was already a recorded preference", () => {
  const store = fresh();
  const a = computeMetricA(store, "c1");
  assert.equal(a.coded, 4);
  assert.equal(a.uncoded, 1);
  assert.equal(a.conflicts, 3);
  assert.equal(a.dealbreaker, 0);
  assert.equal(a.preference, 3);
  assert.equal(a.rate, 0.75);
});

test("Metric A flags a confirmed dealbreaker violation", () => {
  const store = fresh();
  const a = computeMetricA(store, "c2");
  assert.equal(a.coded, 1);
  assert.equal(a.conflicts, 1);
  assert.equal(a.dealbreaker, 1);
  assert.equal(a.rate, 1);
});

test("ARCR counts recurrence only, using evidence available before each share", () => {
  const store = fresh();
  const b = computeArcr(store, "c1");
  assert.equal(b.eligible, 5);
  assert.equal(b.numerator, 2);
  assert.equal(b.hard, 0);
  assert.equal(b.contradiction, 0);
  assert.equal(b.plain, 2);
  assert.equal(b.rate, 0.4);
});

test("ARCR classifies a repeat as contradiction when an acceptance precedes the share", () => {
  const store = fresh();
  // Priya accepted cand4 (location). Share and reject a new location candidate after that.
  store.share({ clientId: "c1", candidateId: "cand6", actor: "aisha" });
  store.reject({
    clientId: "c1",
    candidateId: "cand6",
    dimension: "location_city_tier",
    severity: "preference",
    freeText: "relocation again",
    actor: "aisha",
  });
  const b = computeArcr(store, "c1");
  assert.equal(b.contradiction, 1);
});

test("ARCR treats an uncoded rejection as not a numerator event", () => {
  const store = fresh();
  // cand12 was rejected uncoded (r5). It must not count as a repeat.
  const b = computeArcr(store, "c1");
  assert.equal(b.numerator, 2);
});

test("session metrics count coded and uncoded rejections separately", () => {
  const store = fresh();
  const s = computeSessionMetrics(store);
  assert.equal(s.rejections, 6);
  assert.equal(s.codedRejections, 5);
  assert.equal(s.uncodedRejections, 1);
});

// A minimal single-client store with location-tagged candidates, for testing the
// classification edge cases that the seed does not exercise.
function customStore({ preferences = [], rejections = [], acceptances = [], shares = [] } = {}) {
  const base = {
    meta: { synthetic: true, matchmaker: "Aisha V." },
    clients: [{ id: "c1", name: "X", city: "Y", journey: "ongoing", arm: "intervention" }],
    candidates: [
      { id: "p1", name: "A", city: "", profession: "", source: "", dimensions: ["location_city_tier"] },
      { id: "p2", name: "B", city: "", profession: "", source: "", dimensions: ["location_city_tier"] },
      { id: "p3", name: "C", city: "", profession: "", source: "", dimensions: ["location_city_tier"] },
    ],
    preferences,
    rejections,
    acceptances,
    confirmations: [],
    resolutions: [],
    audit: [],
    queues: { c1: [] },
  };
  return createStore({ ...base, shares });
}

test("acceptance before the prior rejection is plain, not contradiction", () => {
  const store = customStore({
    rejections: [
      { id: "r0", clientId: "c1", candidateId: "p1", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-03T00:00:00Z", capturedBy: "aisha" },
      { id: "r1", clientId: "c1", candidateId: "p3", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-06T00:00:00Z", capturedBy: "aisha" },
    ],
    acceptances: [{ id: "a0", clientId: "c1", candidateId: "p2", dimension: "location_city_tier", acceptedAt: "2026-01-02T00:00:00Z" }],
    shares: [
      { id: "s0", clientId: "c1", candidateId: "p1", sharedAt: "2026-01-01T00:00:00Z", actor: "aisha" },
      { id: "s1", clientId: "c1", candidateId: "p3", sharedAt: "2026-01-05T00:00:00Z", actor: "aisha" },
    ],
  });
  const b = computeArcr(store, "c1");
  assert.equal(b.contradiction, 0);
  assert.equal(b.plain, 1);
});

test("hard sub-rate uses confirmedAt, not recordedAt", () => {
  const store = customStore({
    preferences: [{ id: "p", clientId: "c1", dimension: "location_city_tier", kind: "confirmed_dealbreaker", confirmed: true, status: "active", recordedAt: "2026-01-01T00:00:00Z", confirmedAt: "2026-01-10T00:00:00Z" }],
    rejections: [
      { id: "r0", clientId: "c1", candidateId: "p1", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-03T00:00:00Z", capturedBy: "aisha" },
      { id: "r1", clientId: "c1", candidateId: "p3", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-06T00:00:00Z", capturedBy: "aisha" },
    ],
    shares: [
      { id: "s0", clientId: "c1", candidateId: "p1", sharedAt: "2026-01-01T00:00:00Z", actor: "aisha" },
      { id: "s1", clientId: "c1", candidateId: "p3", sharedAt: "2026-01-05T00:00:00Z", actor: "aisha" },
    ],
  });
  const b = computeArcr(store, "c1");
  assert.equal(b.hard, 0);
  assert.equal(b.plain, 1);
});

test("a recurrence on a confirmed-preference dimension is settled, not plain", () => {
  const store = customStore({
    preferences: [{ id: "p", clientId: "c1", dimension: "location_city_tier", kind: "stated_preference", confirmed: true, status: "active", recordedAt: "2026-01-02T00:00:00Z", confirmedAt: "2026-01-02T00:00:00Z" }],
    rejections: [
      { id: "r0", clientId: "c1", candidateId: "p1", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-03T00:00:00Z", capturedBy: "aisha" },
      { id: "r1", clientId: "c1", candidateId: "p3", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-06T00:00:00Z", capturedBy: "aisha" },
    ],
    shares: [
      { id: "s0", clientId: "c1", candidateId: "p1", sharedAt: "2026-01-01T00:00:00Z", actor: "aisha" },
      { id: "s1", clientId: "c1", candidateId: "p3", sharedAt: "2026-01-05T00:00:00Z", actor: "aisha" },
    ],
  });
  const b = computeArcr(store, "c1");
  assert.equal(b.settled, 1);
  assert.equal(b.plain, 0);
});

test("Metric A adjudicates against the share time, not the rejection time", () => {
  const store = customStore({
    preferences: [{ id: "p", clientId: "c1", dimension: "location_city_tier", kind: "stated_preference", confirmed: false, status: "active", recordedAt: "2026-01-06T00:00:00Z" }],
    rejections: [
      { id: "r1", clientId: "c1", candidateId: "p3", dimension: "location_city_tier", severity: "preference", freeText: "", recordedAt: "2026-01-07T00:00:00Z", capturedBy: "aisha" },
    ],
    shares: [
      { id: "s1", clientId: "c1", candidateId: "p3", sharedAt: "2026-01-05T00:00:00Z", actor: "aisha" },
    ],
  });
  const a = computeMetricA(store, "c1");
  assert.equal(a.conflicts, 0);
});
