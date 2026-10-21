"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore, load } = require("../src/lib/store");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

test("reject removes the candidate from the queue and logs an audit event", () => {
  const store = createStore(buildSeed(NOW));
  const before = store.queue("c1").length;
  store.reject({
    clientId: "c1",
    candidateId: "cand5",
    dimension: "location_city_tier",
    severity: "preference",
    freeText: "relocation again",
    actor: "aisha",
  });
  assert.equal(store.queue("c1").length, before - 1);
  assert.ok(store.allAudit().some((e) => e.type === "rejection_logged"));
});

test("a rejection can be recorded uncoded, and the original text is preserved", () => {
  const store = createStore(buildSeed(NOW));
  const rec = store.reject({
    clientId: "c2",
    candidateId: "cand8",
    dimension: null,
    severity: "uncertain",
    freeText: "need to unpack this one",
    actor: "aisha",
  });
  assert.equal(rec.dimension, null);
  assert.equal(rec.freeText, "need to unpack this one");
});

test("recordClientAnswer with preference confirms a stated preference", () => {
  const store = createStore(buildSeed(NOW));
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "preference",
    value: "Bangalore metro",
    verbatim: "Location is a preference, not a dealbreaker",
    actor: "aisha",
  });
  const p = store
    .activeCriteria("c1")
    .find((x) => x.dimension === "location_city_tier");
  assert.equal(p.confirmed, true);
  assert.equal(p.kind, "confirmed_preference");
  assert.equal(p.operator, "must_be");
  assert.deepEqual(p.values, ["Bangalore metro"]);
});

test("recordClientAnswer with dealbreaker writes a confirmed_dealbreaker", () => {
  const store = createStore(buildSeed(NOW));
  store.recordClientAnswer({
    clientId: "c3",
    dimension: "marital_history",
    answer: "dealbreaker",
    value: "Divorced",
    verbatim: "Marital history is a dealbreaker for me",
    actor: "aisha",
  });
  const p = store
    .activeCriteria("c3")
    .find((x) => x.dimension === "marital_history");
  assert.equal(p.kind, "confirmed_dealbreaker");
  assert.equal(p.operator, "must_not_be");
  assert.deepEqual(p.values, ["Divorced"]);
  assert.equal(p.confirmed, true);
});

test("recordClientAnswer without the client's words writes no rule", () => {
  const store = createStore(buildSeed(NOW));
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "dealbreaker",
    value: "Pune",
    verbatim: "",
    actor: "aisha",
  });
  const p = store.preferences("c1").find((x) => x.dimension === "location_city_tier");
  assert.equal(p.confirmed, false);
});

test("recordClientAnswer with uncertain writes no preference", () => {
  const store = createStore(buildSeed(NOW));
  store.recordClientAnswer({
    clientId: "c3",
    dimension: "diet_lifestyle",
    answer: "uncertain",
    actor: "aisha",
  });
  assert.equal(store.preferences("c3").length, 0);
});

test("recordClientAnswer does not write a rule without the client's words", () => {
  const store = createStore(buildSeed(NOW));
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "preference",
    verbatim: "",
    actor: "aisha",
  });
  const p = store.preferences("c1").find((x) => x.dimension === "location_city_tier");
  assert.equal(p.confirmed, false);
});

test("load falls back to the seed when no store file exists", () => {
  const store = load("/nonexistent/date-crew/state.json", NOW);
  assert.ok(store.state.clients.length >= 3);
  assert.ok(store.state.meta.synthetic);
});
