"use strict";

// The rule this whole product rests on:
//
//   A client's explicit answer establishes their preference.
//   Historical behaviour provides context, not proof of preference.
//   A matchmaker's inference is a hypothesis, not a confirmed rule.
//
// These tests go through the real store and the real action layer, so an
// alternate code path cannot quietly bypass the rule.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore, InputError } = require("../src/lib/store");
const { evaluateSend, isConfirmed, criterionTier } = require("../src/lib/rules");
const { applyAction } = require("../src/server");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));
const withAttr = (a) => ({ id: "x", dimensions: Object.keys(a), attributes: a });

// ── history never becomes a rule ──

test("accepting a profile creates no preference", () => {
  const store = fresh();
  const before = store.preferences("c1").length;
  store.accept({
    clientId: "c1",
    candidateId: "cand6",
    dimensions: ["location_city_tier"],
    surprise: "Warmed to him",
    actor: "Aisha Verma",
  });
  assert.equal(store.preferences("c1").length, before, "an acceptance is a decision, not a criterion");
});

test("rejecting a profile creates no preference", () => {
  const store = fresh();
  const before = store.preferences("c1").length;
  store.reject({
    clientId: "c1",
    candidateId: "cand6",
    dimension: "location_city_tier",
    severity: "likely_dealbreaker",
    freeText: "Not for her",
    actor: "Aisha Verma",
  });
  assert.equal(store.preferences("c1").length, before, "a rejection is a decision, not a criterion");
});

test("an acceptance does not change what another candidate is checked against", () => {
  const store = fresh();
  const candidate = withAttr({ location_city_tier: "Pune" });
  const before = evaluateSend(store, "c1", candidate);
  store.accept({
    clientId: "c1",
    candidateId: "cand6",
    dimensions: ["location_city_tier"],
    surprise: "",
    actor: "Aisha Verma",
  });
  const after = evaluateSend(store, "c1", candidate);
  assert.equal(before.state, after.state);
  assert.deepEqual(
    before.findings.map((f) => f.type).sort(),
    after.findings.map((f) => f.type).sort()
  );
});

test("a rejection does not change what another candidate is checked against", () => {
  const store = fresh();
  const candidate = withAttr({ location_city_tier: "Pune" });
  const before = evaluateSend(store, "c1", candidate);
  store.reject({
    clientId: "c1",
    candidateId: "cand6",
    dimension: "location_city_tier",
    severity: "likely_dealbreaker",
    freeText: "Not for her",
    actor: "Aisha Verma",
  });
  const after = evaluateSend(store, "c1", candidate);
  assert.equal(before.state, after.state);
});

// ── a matchmaker hypothesis stays a hypothesis ──

test("an observation is never a rule and never excludes a candidate", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "observation",
    note: "She mentioned a cousin who smokes. Worth checking.",
    actor: "Aisha Verma",
  });
  const crit = store.activeCriteria("c3").find((c) => c.dimension === "smoking_habit");
  assert.equal(crit.kind, "observation");
  assert.equal(crit.confirmed, false);
  assert.equal(isConfirmed(crit), false);
  assert.equal(criterionTier(crit), "observation");

  // A candidate who is a regular smoker is not excluded by the hypothesis.
  const result = evaluateSend(store, "c3", withAttr({ smoking_habit: "Regular smoker" }));
  assert.ok(!result.findings.some((f) => f.type === "conflict" || f.type === "preference_mismatch"));
  // It is surfaced as something to check, and not as a rule.
  assert.ok(result.observations.some((o) => o.dimension === "smoking_habit"));
});

test("a confirmed criterion without the client's words is refused", () => {
  const store = fresh();
  assert.throws(
    () =>
      store.setPreference({
        clientId: "c3",
        dimension: "smoking_habit",
        operator: "must_not_be",
        values: ["Regular smoker"],
        kind: "confirmed_dealbreaker",
        note: "",
        actor: "Aisha Verma",
      }),
    (err) => err instanceof InputError && /own words/i.test(err.message)
  );
  // Nothing was written.
  assert.equal(store.activeCriteria("c3").filter((c) => c.dimension === "smoking_habit").length, 0);
});

test("an observation is allowed without the client's words, because it is not a rule", () => {
  const store = fresh();
  const rec = store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "observation",
    note: "",
    actor: "Aisha Verma",
  });
  assert.equal(rec.kind, "observation");
});

// ── an explicit client answer does become a rule ──

test("a confirmed client answer creates the rule with the right value and direction", () => {
  const store = fresh();
  store.recordClientAnswer({
    clientId: "c3",
    dimension: "diet_lifestyle",
    answer: "dealbreaker",
    operator: "must_not_be",
    values: ["Non-vegetarian"],
    kind: "confirmed_dealbreaker",
    verbatim: "Non-vegetarian is a definite no",
    actor: "Aisha Verma",
  });
  const crit = store.activeCriteria("c3").find((c) => c.dimension === "diet_lifestyle");
  assert.equal(crit.operator, "must_not_be");
  assert.deepEqual(crit.values, ["Non-vegetarian"]);
  assert.equal(crit.kind, "confirmed_dealbreaker");
  assert.equal(crit.source, "client_answer");
  assert.equal(isConfirmed(crit), true);
  assert.equal(criterionTier(crit), "confirmed");

  // And it is used as a firm no.
  const result = evaluateSend(store, "c3", withAttr({ diet_lifestyle: "Non-vegetarian" }));
  assert.equal(result.state, "conflict");
});

test("a dealbreaker and a flexible preference are different things", () => {
  const firm = fresh();
  firm.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_not_be",
    values: ["Non-vegetarian"],
    kind: "confirmed_dealbreaker",
    note: "A definite no",
    actor: "Aisha Verma",
  });
  const soft = fresh();
  soft.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_not_be",
    values: ["Non-vegetarian"],
    kind: "stated_preference",
    note: "Not keen on it",
    actor: "Aisha Verma",
  });
  const candidate = withAttr({ diet_lifestyle: "Non-vegetarian" });
  assert.equal(evaluateSend(firm, "c3", candidate).state, "conflict");
  assert.equal(evaluateSend(soft, "c3", candidate).state, "preference_mismatch");
});

test("positive and negative directions work in both ways", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_be",
    values: ["Vegetarian"],
    kind: "stated_preference",
    note: "She would prefer a vegetarian",
    actor: "Aisha Verma",
  });
  assert.equal(evaluateSend(store, "c3", withAttr({ diet_lifestyle: "Vegetarian" })).state, "clean");
  assert.equal(
    evaluateSend(store, "c3", withAttr({ diet_lifestyle: "Non-vegetarian" })).state,
    "preference_mismatch"
  );
});

test("missing data stays unknown and is never a clean result", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_be",
    values: ["Vegetarian"],
    kind: "stated_preference",
    note: "She would prefer a vegetarian",
    actor: "Aisha Verma",
  });
  const result = evaluateSend(store, "c3", withAttr({ location_city_tier: "Pune" }));
  assert.equal(result.state, "incomplete");
  assert.notEqual(result.state, "clean");
});

// ── a contradiction is evidence, not a conclusion ──

test("a contradiction shows both pieces of evidence and decides nothing", () => {
  const store = fresh();
  // Priya confirmed no smokers, and accepted a regular smoker.
  const result = evaluateSend(store, "c1", store.candidate("cand6"));
  const contradiction = result.findings.find((f) => f.type === "contradiction");
  assert.ok(contradiction);
  // The criterion is still in force. It is not silently dropped.
  assert.equal(store.activeCriteria("c1").filter((c) => c.dimension === "smoking_habit").length, 1);
  // Both sides are named.
  assert.ok(contradiction.sentence.includes("will not accept"));
  assert.ok(contradiction.sentence.includes("Arjun T."));
  // And the acceptance is not offered as evidence in the client's favour.
  const positive = evaluateSend(store, "c1", withAttr({ smoking_habit: "Non-smoker" })).positive;
  assert.ok(!positive.some((p) => p.dimension === "smoking_habit" && p.source === "observed_acceptance"));
});

test("a decision made before the criterion existed cannot contradict it", () => {
  const store = fresh();
  const crit = store.activeCriteria("c1").find((c) => c.dimension === "location_city_tier");
  // The rejections on location are older than the criterion, so they are where
  // the criterion came from, and they are not held against it.
  assert.ok(new Date(crit.recordedAt) < new Date(store.rejections("c1")[0].recordedAt));
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(!result.findings.some((f) => f.type === "contradiction" && f.dimension === "location_city_tier"));
});

// ── a change is explicit, and history is kept ──

test("a confirmed change keeps the old version and does not rewrite an earlier share", () => {
  const store = fresh();
  const share = store.share({ clientId: "c1", candidateId: "cand5", actor: "Aisha Verma" });
  const auditBefore = store.state.audits.find((a) => a.shareId === share.id);
  const classificationBefore = auditBefore.classification;

  store.recordClientAnswer({
    clientId: "c1",
    dimension: "smoking_habit",
    answer: "preference",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "confirmed_preference",
    verbatim: "She has changed her mind about smoking",
    actor: "Aisha Verma",
  });

  store.runAudit({ by: "Aisha Verma" });
  const auditAfter = store.state.audits.find((a) => a.shareId === share.id);
  assert.equal(auditAfter.classification, classificationBefore, "the earlier share is judged as it was");

  const history = store.criterionHistory("c1").filter((c) => c.dimension === "smoking_habit");
  assert.equal(history.length, 2);
  assert.equal(history[0].status, "superseded");
  assert.equal(history[1].status, "active");
});

test("every share stays in the denominator, whatever happened to it", () => {
  const store = fresh();
  store.share({ clientId: "c1", candidateId: "cand5", actor: "Aisha Verma" });
  store.reject({
    clientId: "c1",
    candidateId: "cand6",
    dimension: "location_city_tier",
    severity: "preference",
    freeText: "",
    actor: "Aisha Verma",
  });
  store.accept({
    clientId: "c1",
    candidateId: "cand7",
    dimensions: ["diet_lifestyle"],
    surprise: "",
    actor: "Aisha Verma",
  });
  const { computeOutcomeMetrics } = require("../src/lib/metrics");
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.measurement.shares, 3);
  assert.equal(m.window.measurement.audited, 3);
});

// ── the real action layer ──

test("the action layer writes the criterion the matchmaker confirmed", () => {
  applyAction({ type: "reset", payload: {} });
  const res = applyAction({
    type: "record_client_answer",
    payload: {
      clientId: "c3",
      dimension: "diet_lifestyle",
      answer: "dealbreaker",
      operator: "must_not_be",
      values: ["Non-vegetarian"],
      kind: "confirmed_dealbreaker",
      verbatim: "Non-vegetarian is a definite no",
      matchmakerId: "m1",
    },
  });
  assert.ok(res.ok);
  const store = require("../src/server").store;
  const crit = store.activeCriteria("c3").find((c) => c.dimension === "diet_lifestyle");
  assert.equal(crit.operator, "must_not_be");
  assert.deepEqual(crit.values, ["Non-vegetarian"]);
  assert.equal(crit.kind, "confirmed_dealbreaker");
  assert.equal(crit.source, "client_answer");
});

test("the action layer refuses a confirmed criterion with no client words", () => {
  applyAction({ type: "reset", payload: {} });
  const res = applyAction({
    type: "set_preference",
    payload: {
      clientId: "c3",
      dimension: "diet_lifestyle",
      operator: "must_not_be",
      values: ["Non-vegetarian"],
      kind: "confirmed_dealbreaker",
      note: "",
      matchmakerId: "m1",
    },
  });
  assert.ok(res.error, "the write is refused");
  assert.match(res.message, /own words/i);
  const store = require("../src/server").store;
  assert.equal(store.activeCriteria("c3").filter((c) => c.dimension === "diet_lifestyle").length, 0);
});

test("the action layer records an observation without treating it as a rule", () => {
  applyAction({ type: "reset", payload: {} });
  const res = applyAction({
    type: "set_preference",
    payload: {
      clientId: "c3",
      dimension: "diet_lifestyle",
      operator: "must_not_be",
      values: ["Non-vegetarian"],
      kind: "observation",
      note: "She mentioned it in passing",
      matchmakerId: "m1",
    },
  });
  assert.ok(res.ok);
  const store = require("../src/server").store;
  const crit = store.activeCriteria("c3").find((c) => c.dimension === "diet_lifestyle");
  assert.equal(crit.kind, "observation");
  assert.equal(crit.confirmed, false);
});

// ── an observation is never a finding, and never a clean result either ──

test("an observation-only client is not counted as clean", () => {
  const store = fresh();
  // Meera J. has nothing on file, so the check cannot be made.
  const result = evaluateSend(store, "c3", withAttr({ location_city_tier: "Pune" }));
  assert.notEqual(result.state, "clean");

  // Give her only an observation, which is a hypothesis and not a rule.
  store.setPreference({
    clientId: "c3",
    dimension: "personality_temperament",
    operator: "must_be",
    values: ["Calm"],
    kind: "observation",
    note: "He seems to prefer someone calm",
    actor: "Aisha Verma",
  });
  const after = evaluateSend(store, "c3", withAttr({ location_city_tier: "Pune" }));
  assert.notEqual(after.state, "clean", "an observation is not something to check against");
  assert.ok(after.observations.some((o) => o.dimension === "personality_temperament"));

  // And it does not become a clean audit either.
  const share = store.share({ clientId: "c3", candidateId: "cand5", actor: "Aisha Verma" });
  const audit = store.state.audits.find((a) => a.shareId === share.id);
  assert.equal(audit.classification, "no_criteria");
});

test("an observation never excludes a candidate the client's own rule allows", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c1",
    dimension: "personality_temperament",
    operator: "must_be",
    values: ["Calm", "Reserved"],
    kind: "observation",
    note: "She has twice said she likes someone calm and steady",
    actor: "Aisha Verma",
  });
  // Aarav M. is Outgoing. As a rule that would be a mismatch.
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(
    !result.findings.some((f) => f.dimension === "personality_temperament"),
    "the hypothesis does not create a finding"
  );
  assert.ok(result.observations.some((o) => o.dimension === "personality_temperament"));
});
