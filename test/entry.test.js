"use strict";

// The data-entry workflow. A reviewer must be able to create the records the
// check depends on without editing source code, and the records must be
// validated rather than accepted blindly.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildSeed, createStore, InputError } = require("../src/lib/store");
const { evaluateSend } = require("../src/lib/rules");

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const fresh = () => createStore(buildSeed(NOW));

test("the seed has matchmaker records, and every client belongs to one", () => {
  const store = fresh();
  assert.ok(store.matchmakers().length >= 2);
  for (const c of store.state.clients) {
    const mm = store.matchmaker(c.matchmakerId);
    assert.ok(mm, `client ${c.id} must point at a matchmaker record`);
    assert.ok(mm.name.length > 0);
  }
});

test("a matchmaker can be created and is then a usable record", () => {
  const store = fresh();
  const before = store.matchmakers().length;
  const mm = store.createMatchmaker({ name: "Neha Iyer" });
  assert.equal(store.matchmakers().length, before + 1);
  assert.equal(store.matchmaker(mm.id).name, "Neha Iyer");
  assert.equal(mm.initials, "NI");
});

test("a duplicate matchmaker name is refused", () => {
  const store = fresh();
  assert.throws(() => store.createMatchmaker({ name: "Aisha Verma" }), InputError);
});

test("a client can be created and is owned by a real matchmaker", () => {
  const store = fresh();
  const rec = store.createClient({
    name: "Ananya Rao",
    city: "Bengaluru",
    journey: "new",
    matchmakerId: "m1",
  });
  assert.equal(store.client(rec.id).name, "Ananya Rao");
  assert.equal(store.client(rec.id).matchmakerId, "m1");
  assert.equal(store.client(rec.id).arm, "intervention", "a new client gets the check by default");
  assert.deepEqual(store.queue(rec.id), []);
});

test("a client without a matchmaker is refused with a message for the form", () => {
  const store = fresh();
  assert.throws(
    () => store.createClient({ name: "No Owner", city: "Delhi", matchmakerId: "nope" }),
    (err) => err instanceof InputError && /matchmaker/i.test(err.message)
  );
});

test("a client without a name is refused", () => {
  const store = fresh();
  assert.throws(
    () => store.createClient({ name: "   ", city: "Delhi", matchmakerId: "m1" }),
    (err) => err instanceof InputError && /name is required/i.test(err.message)
  );
});

test("a candidate can be created with known attributes", () => {
  const store = fresh();
  const rec = store.createCandidate({
    name: "Meera S.",
    city: "Pune",
    profession: "Architect",
    source: "referral",
    attributes: [{ dimension: "location_city_tier", value: "Pune" }],
  });
  const cand = store.candidate(rec.id);
  assert.equal(cand.attributes.location_city_tier, "Pune");
});

test("a candidate with an unknown dimension or value is refused", () => {
  const store = fresh();
  assert.throws(
    () => store.createCandidate({ name: "X", city: "Y", profession: "Z", attributes: [{ dimension: "vibes", value: "good" }] }),
    (err) => err instanceof InputError && /not a known dimension/i.test(err.message)
  );
  assert.throws(
    () =>
      store.createCandidate({
        name: "X",
        city: "Y",
        profession: "Z",
        attributes: [{ dimension: "location_city_tier", value: "Atlantis" }],
      }),
    (err) => err instanceof InputError && /not a recorded value/i.test(err.message)
  );
});

test("a preference can be recorded and is then used by the check", () => {
  const store = fresh();
  const rec = store.setPreference({
    clientId: "c3",
    dimension: "diet_lifestyle",
    operator: "must_not_be",
    values: ["Vegetarian"],
    kind: "confirmed_dealbreaker",
    note: "Vegetarian only",
    actor: "Aisha Verma",
  });
  assert.equal(rec.kind, "confirmed_dealbreaker");
  assert.equal(rec.confirmed, true);
  assert.equal(rec.operator, "must_not_be");
  // A candidate who is vegetarian now conflicts for this client.
  const result = evaluateSend(store, "c3", {
    id: "v",
    dimensions: ["diet_lifestyle"],
    attributes: { diet_lifestyle: "Vegetarian" },
  });
  assert.equal(result.state, "conflict");
});

test("an ordinary preference is advisory, not a rule", () => {
  const store = fresh();
  const rec = store.setPreference({
    clientId: "c3",
    dimension: "location_city_tier",
    operator: "must_be",
    values: ["Bangalore metro"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  assert.equal(rec.confirmed, false);
  const result = evaluateSend(store, "c3", {
    id: "p",
    dimensions: ["location_city_tier"],
    attributes: { location_city_tier: "Pune" },
  });
  assert.equal(result.state, "preference_mismatch");
  assert.equal(result.findings[0].basis, "stated_preference");
});

test("changing a criterion is recorded with what it replaced", () => {
  const store = fresh();
  store.setPreference({
    clientId: "c1",
    dimension: "location_city_tier",
    operator: "must_be",
    values: ["Mumbai"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  store.setPreference({
    clientId: "c1",
    dimension: "location_city_tier",
    operator: "must_be",
    values: ["Bangalore metro"],
    kind: "stated_preference",
    actor: "Aisha Verma",
  });
  const events = store.preferenceEvents("c1");
  // Two writes, two events. The first one supersedes the criterion already on
  // file, so the change from the original is on the record too.
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].before.values, ["Bangalore metro"]);
  assert.deepEqual(events[0].after.values, ["Mumbai"]);
  assert.deepEqual(events[1].before.values, ["Mumbai"]);
  assert.deepEqual(events[1].after.values, ["Bangalore metro"]);
  // Only the newest criterion is in force. The old one is kept with the date
  // it was in force, so a past share can be audited against the file as it was.
  const active = store.activeCriteria("c1").filter((p) => p.dimension === "location_city_tier");
  assert.equal(active.length, 1);
  assert.deepEqual(active[0].values, ["Bangalore metro"]);
  const history = store.criterionHistory("c1").filter((p) => p.dimension === "location_city_tier");
  assert.equal(history.length, 3);
  assert.equal(history[0].status, "superseded");
  assert.equal(history[2].status, "active");
});

test("withdrawing a criterion keeps the history and stops it applying", () => {
  const store = fresh();
  const pref = store.activeCriteria("c1").find((p) => p.dimension === "location_city_tier");
  store.removePreference({ clientId: "c1", preferenceId: pref.id, actor: "Aisha Verma" });
  assert.equal(pref.status, "removed");
  assert.ok(pref.removedAt);
  assert.equal(store.activeCriteria("c1").filter((p) => p.dimension === "location_city_tier").length, 0);
  const events = store.preferenceEvents("c1");
  assert.equal(events[events.length - 1].after, null);
});

test("a candidate can be put on a client's shortlist, once only", () => {
  const store = fresh();
  store.addToQueue({ clientId: "c1", candidateId: "cand9" });
  store.addToQueue({ clientId: "c1", candidateId: "cand9" });
  const q = store.queue("c1").map((c) => c.id);
  assert.equal(q.filter((id) => id === "cand9").length, 1);
});

test("a share records the check that was computed at send time", () => {
  const store = fresh();
  const rec = store.share({ clientId: "c2", candidateId: "cand7", actor: "Aisha Verma" });
  assert.equal(rec.check.state, "conflict");
  assert.equal(rec.check.dealbreakerConflicts, 1);
  assert.equal(rec.check.confirmedConflicts, 1);
});

test("a clean send records a clean check and no conflict", () => {
  const store = fresh();
  const rec = store.share({ clientId: "c2", candidateId: "cand8", actor: "Aisha Verma" });
  assert.equal(rec.check.state, "clean");
  assert.equal(rec.check.confirmedConflicts, 0);
});

test("the check is computed by the store, not taken from the caller", () => {
  const store = fresh();
  // A caller cannot claim a clean send by saying so.
  const rec = store.share({
    clientId: "c2",
    candidateId: "cand7",
    actor: "Aisha Verma",
    check: { state: "clean", confirmedConflicts: 0 },
  });
  assert.equal(rec.check.state, "conflict");
});

test("a client with no criteria gets no conflict, only the missing-information state", () => {
  const store = fresh();
  const rec = store.share({ clientId: "c3", candidateId: "cand10", actor: "Farhan Qureshi" });
  assert.equal(rec.check.state, "no_history");
  assert.equal(rec.check.confirmedConflicts, 0);
});
