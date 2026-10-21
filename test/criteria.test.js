"use strict";

// What a criterion means, and how the check reads it.
//
// A criterion has two independent parts: the direction it runs in, and how
// firm the client made it. These tests cover the cases where confusing them
// would give the matchmaker the wrong answer.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore, InputError } = require("../src/lib/store");
const { evaluateSend, criterionVerdict, criterionValues } = require("../src/lib/rules");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

const withAttr = (attrs) => ({
  id: "x",
  dimensions: Object.keys(attrs),
  attributes: attrs,
});

test("a requirement and a prohibition are opposite criteria, not the same one", () => {
  const store = fresh();
  // "I only want a vegetarian partner."
  store.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_be",
    values: ["Vegetarian"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  const veg = withAttr({ diet_lifestyle: "Vegetarian" });
  const nonVeg = withAttr({ diet_lifestyle: "Non-vegetarian" });
  const good = evaluateSend(store, "c3", veg);
  const bad = evaluateSend(store, "c3", nonVeg);
  assert.notEqual(good.state, "conflict", "a vegetarian candidate meets the requirement");
  assert.equal(bad.state, "conflict", "a non-vegetarian candidate breaks it");
});

test("a prohibition and a requirement on the same value read opposite ways", () => {
  const store = fresh();
  // "I do not want a vegetarian partner."
  store.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_not_be",
    values: ["Vegetarian"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  const veg = withAttr({ diet_lifestyle: "Vegetarian" });
  const nonVeg = withAttr({ diet_lifestyle: "Non-vegetarian" });
  assert.equal(evaluateSend(store, "c3", veg).state, "conflict");
  assert.notEqual(evaluateSend(store, "c3", nonVeg).state, "conflict");
});

test("a smoking dealbreaker and a smoking preference are not equivalent", () => {
  const store = fresh();
  // A dealbreaker against smokers.
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Occasional smoker", "Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  const smoker = withAttr({ smoking_habit: "Regular smoker" });
  const result = evaluateSend(store, "c3", smoker);
  assert.equal(result.state, "conflict", "a firm no");
  assert.equal(result.findings[0].basis, "confirmed_dealbreaker");
  assert.ok(result.findings[0].sentence.includes("must not be"));
  assert.ok(result.findings[0].sentence.includes("Regular smoker"));
});

test("a smoking preference is advice, not a firm no", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  const smoker = withAttr({ smoking_habit: "Regular smoker" });
  const result = evaluateSend(store, "c3", smoker);
  assert.equal(result.state, "preference_mismatch");
  assert.equal(result.findings[0].basis, "stated_preference");
  // It does not block a send.
  assert.ok(!result.findings.some((f) => f.type === "conflict"));
});

test("a confirmed preference is firmer than a stated one, and still not a no", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "confirmed_preference",
    actor: "Aisha Verma",
  });
  const result = evaluateSend(store, "c3", withAttr({ smoking_habit: "Regular smoker" }));
  assert.equal(result.state, "preference_mismatch");
  assert.equal(result.findings[0].basis, "confirmed_preference");
  assert.notEqual(result.state, "conflict");
});

test("a forbidden set covers more than one value", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Occasional smoker", "Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  assert.equal(evaluateSend(store, "c3", withAttr({ smoking_habit: "Occasional smoker" })).state, "conflict");
  assert.equal(evaluateSend(store, "c3", withAttr({ smoking_habit: "Regular smoker" })).state, "conflict");
  assert.notEqual(evaluateSend(store, "c3", withAttr({ smoking_habit: "Non-smoker" })).state, "conflict");
});

test("a missing value is unknown, never a match and never a conflict", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  const result = evaluateSend(store, "c3", withAttr({ location_city_tier: "Pune" }));
  assert.equal(result.state, "incomplete");
  assert.equal(result.findings[0].basis, "unknown");
  assert.ok(result.findings[0].sentence.includes("not recorded"));
});

test("a value outside the vocabulary is refused", () => {
  const store = fresh();
  assert.throws(
    () =>
      store.setPreference({
        clientId: "c3",
        dimension: "smoking_habit",
        operator: "must_be",
        values: ["Vapes occasionally"],
        kind: "stated_preference",
        actor: "Aisha Verma",
      }),
    (err) => err instanceof InputError && /not a recorded value/i.test(err.message)
  );
});

test("a criterion with no values is refused", () => {
  const store = fresh();
  assert.throws(
    () =>
      store.setPreference({
        clientId: "c3",
        dimension: "smoking_habit",
        operator: "must_be",
        values: [],
        kind: "stated_preference",
        actor: "Aisha Verma",
      }),
    (err) => err instanceof InputError && /at least one value/i.test(err.message)
  );
});

test("changing a criterion keeps the old one, with the date it was in force", () => {
  const store = fresh();
  const first = store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  const second = store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Occasional smoker"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  assert.equal(first.status, "superseded");
  assert.equal(second.status, "active");
  assert.equal(second.supersedes, first.id);
  // The history keeps both, so what the client believed then is still legible.
  const history = store.criterionHistory("c3").filter((c) => c.dimension === "smoking_habit");
  assert.equal(history.length, 2);
  assert.deepEqual(criterionValues(history[0]), ["Non-smoker"]);
  assert.deepEqual(criterionValues(history[1]), ["Occasional smoker"]);
});

test("a criterion that was changed does not reach back to change an old share", () => {
  const store = fresh();
  const share = store.share({ clientId: "c3", candidateId: "cand10", actor: "Aisha Verma" });
  const auditBefore = store.state.audits.find((a) => a.shareId === share.id);
  assert.equal(auditBefore.classification, "clean");

  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  store.runAudit({ by: "Aisha Verma" });
  const auditAfter = store.state.audits.find((a) => a.shareId === share.id);
  // The share is judged against the file as it was, so it is still clean.
  assert.equal(auditAfter.classification, "clean");
});

test("repeated evidence is not silenced by a settled criterion", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "confirmed_preference",
    actor: "Aisha Verma",
  });
  // The client settles it, then rejects someone on the same dimension.
  const settled = store.activeCriteria("c3").find((c) => c.dimension === "smoking_habit");
  store.reject({
    clientId: "c3",
    candidateId: "cand10",
    dimension: "smoking_habit",
    severity: "likely_dealbreaker",
    freeText: "He smokes",
    actor: "Aisha Verma",
  });
  const result = evaluateSend(store, "c3", withAttr({ smoking_habit: "Regular smoker" }));
  assert.ok(
    result.findings.some((f) => f.type === "repeat" && f.basis === "history"),
    "the new rejection is surfaced, not swallowed by the settled rule"
  );
  assert.ok(result.findings.some((f) => f.sentence.includes("after settling it")));
  assert.ok(settled);
});

test("an old rejection does not keep firing once the criterion is settled", () => {
  const store = fresh();
  const old = store.reject({
    clientId: "c3",
    candidateId: "cand10",
    dimension: "smoking_habit",
    severity: "preference",
    freeText: "Not keen on smokers",
    actor: "Aisha Verma",
  });
  // The rejection is dated a minute earlier, so the order is unambiguous.
  old.recordedAt = new Date(Date.now() - 60000).toISOString();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "confirmed_preference",
    actor: "Aisha Verma",
  });
  const result = evaluateSend(store, "c3", withAttr({ smoking_habit: "Non-smoker" }));
  assert.ok(!result.findings.some((f) => f.type === "repeat"));
  assert.ok(!result.findings.some((f) => f.type === "contradiction"));
});

test("a withdrawn criterion stops applying, and the history says so", () => {
  const store = fresh();
  const crit = store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  assert.equal(
    evaluateSend(store, "c3", withAttr({ smoking_habit: "Regular smoker" })).state,
    "conflict"
  );
  store.removePreference({ clientId: "c3", preferenceId: crit.id, actor: "Aisha Verma" });
  const result = evaluateSend(store, "c3", withAttr({ smoking_habit: "Regular smoker" }));
  assert.notEqual(result.state, "conflict");
  const events = store.preferenceEvents("c3");
  assert.equal(events[events.length - 1].after, null);
});

test("the verdict is decided by the direction, not by the kind", () => {
  const crit = { dimension: "diet_lifestyle", operator: "must_be", values: ["Vegetarian"], kind: "confirmed_dealbreaker" };
  assert.equal(criterionVerdict(crit, "Vegetarian"), "satisfied");
  assert.equal(criterionVerdict(crit, "Non-vegetarian"), "violated");
  assert.equal(criterionVerdict(crit, null), "unknown");

  const forbid = { dimension: "diet_lifestyle", operator: "must_not_be", values: ["Vegetarian"], kind: "confirmed_dealbreaker" };
  assert.equal(criterionVerdict(forbid, "Vegetarian"), "violated");
  assert.equal(criterionVerdict(forbid, "Non-vegetarian"), "satisfied");
});
