"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { evaluateSend } = require("../src/lib/rules");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

function fresh() {
  return createStore(buildSeed(NOW));
}

test("a contradiction fires when a decision disagrees with a criterion on file", () => {
  const store = fresh();
  // Priya confirmed she will not accept a smoker, and she later accepted Arjun
  // T., whose profile lists him as a regular smoker. The two do not agree.
  const result = evaluateSend(store, "c1", store.candidate("cand6"));
  const contradiction = result.findings.find((f) => f.type === "contradiction");
  assert.ok(contradiction, "the contradiction is raised");
  assert.equal(contradiction.dimension, "smoking_habit");
  assert.equal(contradiction.decisions[0].candidateName, "Arjun T.");
  assert.equal(contradiction.decisions[0].kind, "accepted");
  // Both pieces of evidence are shown, and neither is treated as the answer.
  assert.ok(contradiction.sentence.includes("Arjun T."));
  assert.ok(contradiction.sentence.includes("only the client can say which is right"));
});

test("accepting one profile and rejecting another is not a contradiction by itself", () => {
  const store = fresh();
  // Priya rejected three profiles over location and accepted a fourth. That is a
  // record of what happened, and on its own it proves nothing about what she
  // wants, so it is not a contradiction.
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(!result.findings.some((f) => f.type === "contradiction" && f.dimension === "location_city_tier"));
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

test("a prior rejection with nothing on file is a note about history, not a conflict", () => {
  const store = fresh();
  // Manav was rejected over education, and Priya has no criterion on education.
  // There is nothing to compare against, so it is reported as what happened.
  const cand = store.candidate("cand11");
  const result = evaluateSend(store, "c1", cand);
  assert.ok(result.findings.some((f) => f.type === "repeat" && f.dimension === "education"));
  // His location and smoking are not recorded, and Priya has criteria on both,
  // so those are missing information rather than a clean result.
  assert.ok(result.findings.some((f) => f.type === "incomplete" && f.dimension === "location_city_tier"));
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
  const result = evaluateSend(store, "c3", {
    id: "x",
    dimensions: ["values_intent"],
    attributes: { values_intent: "Unsure about children" },
  });
  assert.equal(result.state, "repeat");
  assert.ok(!result.findings.some((f) => f.type === "conflict"));
});

test("a confirmed dealbreaker only fires when the candidate's value matches it", () => {
  const store = fresh();
  // Rahul's confirmed dealbreaker is Non-vegetarian.
  const vegetarian = evaluateSend(store, "c2", {
    id: "v",
    dimensions: ["diet_lifestyle"],
    attributes: { diet_lifestyle: "Vegetarian" },
  });
  assert.notEqual(vegetarian.state, "conflict");
  const nonVeg = evaluateSend(store, "c2", {
    id: "nv",
    dimensions: ["diet_lifestyle"],
    attributes: { diet_lifestyle: "Non-vegetarian" },
  });
  assert.equal(nonVeg.state, "conflict");
});

test("client clarification settles the contradiction on that dimension", () => {
  const store = fresh();
  const before = evaluateSend(store, "c1", store.candidate("cand6"));
  assert.ok(before.findings.some((f) => f.type === "contradiction"));
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "smoking_habit",
    answer: "preference",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "confirmed_preference",
    verbatim: "She has changed her mind about smoking",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c1", store.candidate("cand6"));
  // The acceptance of Arjun now agrees with the criterion, so the contradiction
  // has gone. The criterion it replaced is still on the record.
  assert.ok(!result.findings.some((f) => f.type === "contradiction" && f.dimension === "smoking_habit"));
  const history = store.criterionHistory("c1").filter((c) => c.dimension === "smoking_habit");
  assert.equal(history.length, 2);
  assert.equal(history[0].status, "superseded");
});

test("client clarification to dealbreaker turns a contradiction into a conflict", () => {
  const store = fresh();
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "dealbreaker",
    value: "Pune",
    verbatim: "Pune is a dealbreaker for me",
    actor: "aisha",
  });
  // Aarav is in Pune, and Pune is now a confirmed dealbreaker.
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.equal(result.state, "conflict");
});

test("an uncertain clarification changes no preference and keeps the contradiction", () => {
  const store = fresh();
  store.recordClientAnswer({
    clientId: "c1",
    dimension: "location_city_tier",
    answer: "uncertain",
    value: null,
    verbatim: "",
    actor: "aisha",
  });
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.equal(result.state, "contradiction");
  const confirmed = store
    .preferences("c1")
    .filter((p) => p.dimension === "location_city_tier" && p.confirmed);
  assert.equal(confirmed.length, 0);
});

test("positive evidence labels stated preferences and observed acceptances separately", () => {
  const store = fresh();
  // Karan is in the Bangalore metro, which is what Priya stated, and she has
  // accepted someone on that dimension before.
  const cand = store.candidate("cand6");
  const result = evaluateSend(store, "c1", cand);
  const loc = result.positive.filter((p) => p.dimension === "location_city_tier");
  assert.ok(loc.some((p) => p.source === "criterion"));
  assert.ok(loc.some((p) => p.source === "observed_acceptance"));
});

test("a candidate that does not match a stated preference is not positive evidence", () => {
  const store = fresh();
  // Aarav is in Pune. Priya stated Bangalore metro, so this is not support.
  const result = evaluateSend(store, "c1", store.candidate("cand5"));
  assert.ok(!result.positive.some((p) => p.source === "criterion"));
  assert.ok(result.findings.some((f) => f.type === "preference_mismatch"));
});
