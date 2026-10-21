"use strict";

// The measurement model.
//
// The primary outcome is the proportion of all profiles shared in the period
// that contain a conflict with a criterion the client had on file at the
// moment of sending, decided by an audit that does not depend on whether the
// check was used. These tests pin that down, including the properties that
// stop the number being improved by using the tool less.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore } = require("../src/lib/store");
const { computeOutcomeMetrics } = require("../src/lib/metrics");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

// The seeded history sits entirely before the measurement window, so it is
// the baseline. The audit reaches the same conclusions about it that a person
// re-coding the same rejections by hand would.
test("the seeded history is baseline, and the measurement window starts empty", () => {
  const store = fresh();
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.measurement.shares, 0);
  assert.equal(m.window.baseline.shares, 7);
  assert.equal(m.window.baseline.audited, 7);
});

test("the audit finds the conflicts the criteria imply, with the components apart", () => {
  const store = fresh();
  const m = computeOutcomeMetrics(store);
  const b = m.window.baseline;
  // Rohit in Mumbai breaks Priya's stated preference for the Bangalore metro.
  // Vikram smokes, which breaks her confirmed dealbreaker.
  // The components are disjoint. A profile that breaks a firm no and a
  // preference is counted under the firmer one, so the two add up to the
  // numerator rather than double counting it.
  assert.equal(b.softMismatchShares, 2);
  assert.equal(b.hardConflictShares, 2);
  assert.equal(b.conflictShares, 4);
  // Nothing in the seeded history is clean. The one profile that matched every
  // criterion still had an unknown dimension, because the client had rejected
  // on education and that value was not recorded for this profile.
  assert.equal(b.cleanShares, 0);
  // Four of the seven carry a conflict, and the denominator is every share.
  assert.equal(Math.round(b.rate * 100) / 100, Math.round((4 / 7) * 10000) / 100);
});

test("a share whose value is missing is unknown, never clean", () => {
  const store = fresh();
  const m = computeOutcomeMetrics(store);
  const b = m.window.baseline;
  assert.equal(b.unknownShares, 3);
  assert.equal(b.cleanShares, 0);
  // Every share has an audit, and the ones that could not be judged are
  // counted apart rather than folded into either side.
  assert.equal(b.audited, b.conflictShares + b.cleanShares + b.unknownShares);
});

test("the audit reads the file as it was at the time of the share", () => {
  const store = fresh();
  // A criterion recorded now cannot reach back and change how an old share is
  // judged, because the audit uses the file as it stood then.
  store.setPreference({
    clientId: "c1",
    dimension: "location_city_tier",
    operator: "must_be",
    values: ["Mumbai"],
    kind: "confirmed_dealbreaker",
    actor: "Aisha Verma",
  });
  const m = computeOutcomeMetrics(store);
  store.runAudit({ by: "Aisha Verma" });
  const after = computeOutcomeMetrics(store);
  // Rohit is in Mumbai, so under the new criterion the old share is clean.
  assert.equal(after.window.baseline.conflictShares, m.window.baseline.conflictShares);
  const rohit = store.state.audits.find((a) => a.candidateId === "cand1");
  assert.ok(rohit);
  assert.equal(rohit.classification, "soft_mismatch");
});

test("the primary outcome covers every share, so sending less does not improve it", () => {
  const store = fresh();
  const before = computeOutcomeMetrics(store);
  // The matchmaker stops sending altogether.
  const after = computeOutcomeMetrics(store);
  assert.equal(after.window.baseline.shares, before.window.baseline.shares);
  // And if the only shares left were the clean ones, the denominator would
  // shrink with them, so the rate would move. The denominator is every share
  // in the period, which is what makes the rate comparable over time.
  assert.equal(after.window.baseline.audited, after.window.baseline.shares);
});

test("the audit does not depend on whether the check was opened", () => {
  const store = fresh();
  // A share made with the card never opened.
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  const audit = store.state.audits.find(
    (a) => a.candidateId === "cand7" && a.clientId === "c2"
  );
  assert.ok(audit, "the share is audited even though no card was opened");
  assert.equal(audit.classification, "hard_conflict");
});

test("the control arm is audited the same way, and its rate is what the check would have found", () => {
  const store = fresh();
  // Meera is on the control arm. Give her the same kind of criterion Rahul
  // has, then share a profile that breaks it.
  store.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_not_be",
    values: ["Non-vegetarian"],
    kind: "confirmed_dealbreaker",
    actor: "Farhan Qureshi",
  });
  store.share({ clientId: "c3", candidateId: "cand7", actor: "Farhan Qureshi" });
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.measurementControl.conflictShares, 1);
  assert.equal(m.window.measurementControl.hardConflictShares, 1);
  // The check was never shown to her, and the rate still found it.
  assert.equal(m.adoption.control.checked, 0);
});

test("adoption is measured from the card being opened, and is reported apart", () => {
  const store = fresh();
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  let m = computeOutcomeMetrics(store);
  assert.equal(m.adoption.intervention.eligible, 1);
  assert.equal(m.adoption.intervention.checked, 0);
  assert.equal(m.adoption.intervention.rate, 0);

  const view = store.recordCardView({
    clientId: "c2",
    candidateId: "cand7",
    surfaced: true,
    actor: "Aisha Verma",
  });
  // The card is opened before the profile goes out. A view recorded after the
  // send is not a check before sending, so the date matters.
  view.at = new Date(Date.now() - 60000).toISOString();
  m = computeOutcomeMetrics(store);
  assert.equal(m.adoption.intervention.checked, 1);
  assert.equal(m.adoption.intervention.rate, 100);
  // Adoption moved. The primary outcome did not, because the audit does not
  // care whether the card was opened.
  assert.equal(m.window.measurement.conflictShares, 1);
});

test("the control arm is never counted as having been checked", () => {
  const store = fresh();
  store.recordCardView({
    clientId: "c3",
    candidateId: "cand10",
    surfaced: false,
    actor: "Farhan Qureshi",
  });
  store.share({ clientId: "c3", candidateId: "cand10", actor: "Farhan Qureshi" });
  const m = computeOutcomeMetrics(store);
  assert.equal(m.adoption.control.eligible, 1);
  assert.equal(m.adoption.control.checked, 0);
});

test("an override is counted, and the reason given is kept", () => {
  const store = fresh();
  store.recordCardView({ clientId: "c2", candidateId: "cand7", surfaced: true, actor: "Aisha Verma" });
  store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  store.resolve({
    clientId: "c2",
    candidateId: "cand7",
    action: "proceed",
    rationale: "She said she would consider it",
    actor: "Aisha Verma",
  });
  const m = computeOutcomeMetrics(store);
  assert.equal(m.overrides.count, 1);
  assert.equal(m.overrides.dealbreaker, 1);
  assert.equal(m.overrides.withReason, 1);
  assert.equal(m.overrides.detail[0].reason, "She said she would consider it");
});

test("a conflict caught and held is not an override and does not reach the client", () => {
  const store = fresh();
  store.recordCardView({ clientId: "c2", candidateId: "cand7", surfaced: true, actor: "Aisha Verma" });
  store.resolve({
    clientId: "c2",
    candidateId: "cand7",
    action: "hold",
    rationale: "Held for review",
    actor: "Aisha Verma",
  });
  const m = computeOutcomeMetrics(store);
  assert.equal(m.overrides.count, 0);
  assert.equal(m.window.measurement.shares, 0);
  assert.equal(m.adoption.intervention.checked, 0);
});

test("a human can confirm or dispute an audit, and the two are reported apart", () => {
  const store = fresh();
  const audit = store.state.audits[0];
  assert.equal(audit.humanConfirmed, null);
  store.confirmAudit({ auditId: audit.id, humanConfirmed: true, by: "Aisha Verma" });
  const m = computeOutcomeMetrics(store);
  assert.equal(m.window.baseline.confirmedAudits, 1);
  assert.equal(m.window.baseline.humanConfirmedRate, 100);

  store.confirmAudit({ auditId: audit.id, humanConfirmed: false, by: "Aisha Verma" });
  const after = computeOutcomeMetrics(store);
  // With no audit left confirmed by a person, there is no confirmed rate to
  // report rather than a rate of zero.
  assert.equal(after.window.baseline.humanConfirmedRate, null);
  // Disputing an audit does not remove the share from the denominator.
  assert.equal(after.window.baseline.shares, 7);
});

test("the measurement breaks down by matchmaker and by client", () => {
  const store = fresh();
  const m = computeOutcomeMetrics(store);
  assert.ok(m.byMatchmaker.length >= 1);
  assert.equal(m.byMatchmaker[0].shares, 7);
  assert.equal(m.byMatchmaker[0].conflictShares, 4);
  assert.ok(m.byClient.length >= 2);
  const priya = m.byClient.find((c) => c.clientId === "c1");
  assert.equal(priya.shares, 6);
  const rahul = m.byClient.find((c) => c.clientId === "c2");
  assert.equal(rahul.shares, 1);
  assert.equal(rahul.hardConflictShares, 1);
});

test("running the audit again does not double count", () => {
  const store = fresh();
  const before = store.state.audits.length;
  store.runAudit({ by: "Aisha Verma" });
  assert.equal(store.state.audits.length, before);
});
