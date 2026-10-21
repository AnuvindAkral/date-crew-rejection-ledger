"use strict";

// The measurement edge cases, kept in one file so they are easy to find and
// easy to check against the brief.
//
// The rule behind all of them: a profile is only a clean result if it was
// actually compared against criteria that applied, and everything was
// recorded. Anything less is its own category, and nothing is quietly dropped.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { computeOutcomeMetrics } = require("../src/lib/metrics");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

function shareTo(store, clientId, candidateId, actor) {
  const rec = store.share({ clientId, candidateId, actor: actor || "Aisha Verma" });
  return store.state.audits.find((a) => a.shareId === rec.id);
}

test("a profile sent to a client with no applicable criteria is not a clean result", () => {
  const store = fresh();
  // Meera has no criteria and no rejections at all.
  const audit = shareTo(store, "c3", "cand10");
  assert.equal(audit.classification, "no_criteria");
  assert.notEqual(audit.classification, "clean");

  const m = computeOutcomeMetrics(store);
  const bucket = m.window.measurementControl;
  assert.equal(bucket.noCriteriaShares, 1);
  assert.equal(bucket.cleanShares, 0, "nothing to compare against is not the same as no conflicts found");
  assert.equal(bucket.unknownShares, 0);
});

test("a missing candidate attribute is unknown, never a clean result", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c1",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  note: "The client said so",
  });
  // The profile says nothing at all, so nothing about it can be checked.
  const audit = shareTo(store, "c1", "cand9");
  assert.equal(audit.classification, "unknown");
  assert.ok(audit.unknown >= 1, "at least one criterion went unchecked");

  const m = computeOutcomeMetrics(store);
  // The measure counts profiles, so one profile is one, however many criteria
  // went unchecked.
  assert.equal(m.window.measurement.unknownShares, 1);
  assert.equal(m.window.measurement.cleanShares, 0);
});

test("a profile with both a conflict and missing information shows both", () => {
  const store = fresh();
  // Rahul has a dealbreaker on diet and a preference on education.
  // Nikhil breaks the first and says nothing about the second.
  const audit = shareTo(store, "c2", "cand7");
  assert.equal(audit.classification, "hard_conflict");
  assert.equal(audit.hard, 1);
  assert.equal(audit.unknown, 1, "the missing part is still recorded on the profile");

  const m = computeOutcomeMetrics(store);
  const bucket = m.window.measurement;
  assert.equal(bucket.hardConflictShares, 1, "it counts as a conflict");
  assert.equal(bucket.withMissingInformation, 1, "and the gap is still visible");
  assert.equal(bucket.unknownShares, 0, "it was not wholly unjudgeable");
});

test("the missing-information measure counts profiles, not criteria", () => {
  const store = fresh();
  shareTo(store, "c2", "cand7"); // one conflict and one missing attribute
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.measurement.withMissingInformation, 1);
  assert.equal(m.window.measurement.audited, 1);
  // Its denominator is the profiles sent, which the headline states.
  assert.equal(m.window.measurement.shares, 1);
});

test("the denominator is every profile sent, checked or not", () => {
  const store = fresh();
  // Three shares, and the card was never opened for any of them.
  shareTo(store, "c2", "cand7");
  shareTo(store, "c2", "cand8");
  shareTo(store, "c2", "cand9");
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.measurement.shares, 3);
  assert.equal(m.window.measurement.audited, 3);
  assert.equal(m.adoption.intervention.checked, 0);
  assert.equal(m.adoption.intervention.eligible, 3);
});

test("the rate cannot be improved by using the tool less", () => {
  const without = fresh();
  without.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  without.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });

  const used = fresh();
  used.recordCardView({ clientId: "c2", candidateId: "cand7", surfaced: true, actor: "Aisha Verma" });
  used.recordCardView({ clientId: "c2", candidateId: "cand8", surfaced: true, actor: "Aisha Verma" });
  used.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  used.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });

  const a = computeOutcomeMetrics(without);
  const b = computeOutcomeMetrics(used);
  assert.equal(a.window.measurement.rate, b.window.measurement.rate);
  assert.equal(a.window.measurement.conflictShares, b.window.measurement.conflictShares);
  // What does change is whether the tool was used, and that is reported apart.
  assert.equal(a.adoption.intervention.checked, 0);
  assert.equal(b.adoption.intervention.checked, 2);
});

test("a criterion changed later does not rewrite an earlier profile", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_be",
    values: ["Non-smoker"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  const share = store.share({ clientId: "c3", candidateId: "cand10", actor: "Aisha Verma" });
  const before = store.state.audits.find((a) => a.shareId === share.id);
  assert.equal(before.classification, "clean");

  store.setPreference({
    clientId: "c3",
    dimension: "smoking_habit",
    operator: "must_not_be",
    values: ["Regular smoker"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  note: "The client said so",
  });
  store.runAudit({ by: "Aisha Verma" });
  const after = store.state.audits.find((a) => a.shareId === share.id);
  assert.equal(after.classification, "clean");
});

test("the baseline and the window are measured the same way", () => {
  const store = fresh();
  const m = computeOutcomeMetrics(store);
  // Seven seeded profiles before the window, none after it.
  assert.equal(m.window.baseline.shares, 7);
  assert.equal(m.window.baseline.audited, 7);
  assert.equal(m.window.measurement.shares, 0);
  // And the baseline is not a clean sweep either.
  assert.equal(m.window.baseline.cleanShares, 0);
  assert.equal(m.window.baseline.noCriteriaShares, 0);
  assert.equal(m.window.baseline.withMissingInformation, 6);
});

test("the pooled figure is descriptive and is kept apart from the arms", () => {
  const store = fresh();
  const m = computeOutcomeMetrics(store);
  assert.ok(m.window.overall, "the pooled figure exists");
  assert.equal(m.window.overall.shares, 7);
  // It is not one of the arms, so it cannot be read as the result of either.
  assert.notEqual(m.window.overall, m.window.measurement);
  assert.notEqual(m.window.overall, m.window.baseline);
});

test("a profile already sent, with no answer yet, is not sent twice", () => {
  const store = fresh();
  // Dev has not been sent to Rahul and has no answer on file.
  const first = store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  assert.equal(first.duplicate, undefined);
  const second = store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  assert.equal(second.duplicate, true, "the second attempt is recognised as the same introduction");
  assert.equal(second.id, first.id);
  assert.equal(store.shares("c2").filter((s) => s.candidateId === "cand8").length, 1);
  // And it is counted once in the measurement.
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.measurement.shares, 1);
});

test("a profile the client already rejected can be sent again", () => {
  const store = fresh();
  store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  store.reject({
    clientId: "c2",
    candidateId: "cand8",
    dimension: "diet_lifestyle",
    severity: "likely_dealbreaker",
    freeText: "no",
    actor: "Aisha Verma",
  });
  const again = store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  assert.equal(again.duplicate, undefined, "a fresh attempt after an answer is allowed");
  assert.equal(store.shares("c2").filter((s) => s.candidateId === "cand8").length, 2);
});
