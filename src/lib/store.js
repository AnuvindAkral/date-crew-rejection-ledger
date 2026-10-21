"use strict";

const fs = require("node:fs");

const { DIMENSION_BY_KEY, dimensionValues } = require("./dimensions");
const {
  evaluateSend,
  criteriaAt,
  criterionSummary,
  decisionsAgainstCriterion,
} = require("./rules");

const DAY = 86400000;

function daysAgo(now, n) {
  return new Date(now - n * DAY).toISOString();
}

// A validation failure the interface can show to the matchmaker. The message is
// written for the person filling in the form, not for a developer.
class InputError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "InputError";
    this.field = field || null;
  }
}

function text(value, label, field) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new InputError(`${label} is required.`, field);
  return v;
}

// Older records carried a single value and no direction. The direction they
// meant is recoverable: a dealbreaker forbade the value, a preference required
// it. Migrating on load keeps an existing store readable.
function normaliseCriterion(c) {
  if (!c) return c;
  if (Array.isArray(c.values) && c.operator) return c;
  const values = Array.isArray(c.values) ? c.values : c.value ? [c.value] : [];
  const operator =
    c.operator || (c.kind === "confirmed_dealbreaker" ? "must_not_be" : "must_be");
  return Object.assign({}, c, { values, operator });
}

// Build the default synthetic dataset. Every name, city, profession and note is
// invented and clearly labelled synthetic. No real person or client data.
//
// The dated history here is the baseline period: what a matchmaker did before
// the check existed. It exists so the audit has something to audit, not to
// suggest that anything was measured in a real pilot.
function buildSeed(now = Date.now()) {
  const matchmakers = [
    { id: "m1", name: "Aisha Verma", initials: "AV" },
    { id: "m2", name: "Farhan Qureshi", initials: "FQ" },
  ];

  const candidates = [
    { id: "cand1", name: "Rohit K.", city: "Mumbai", profession: "Engineering Manager", source: "internal_network", attributes: { location_city_tier: "Mumbai", profession_seniority: "Senior professional", smoking_habit: "Non-smoker" } },
    { id: "cand2", name: "Vikram J.", city: "Jaipur", profession: "Product Lead", source: "matrimonial", attributes: { location_city_tier: "Tier 2 city", smoking_habit: "Occasional smoker" } },
    { id: "cand3", name: "Aditya R.", city: "Chennai", profession: "Data Scientist", source: "linkedin", attributes: { location_city_tier: "Other metro", education: "Top-tier college" } },
    { id: "cand4", name: "Arjun T.", city: "Bangalore", profession: "Founder", source: "referral", attributes: { location_city_tier: "Bangalore metro", personality_temperament: "Calm", smoking_habit: "Regular smoker" } },
    { id: "cand5", name: "Aarav M.", city: "Pune", profession: "Product Manager", source: "internal_network", attributes: { location_city_tier: "Pune", personality_temperament: "Outgoing", smoking_habit: "Non-smoker" } },
    { id: "cand6", name: "Karan D.", city: "Bangalore", profession: "Consultant", source: "referral", attributes: { location_city_tier: "Bangalore metro", smoking_habit: "Non-smoker" } },
    { id: "cand7", name: "Nikhil S.", city: "Mumbai", profession: "Trader", source: "matrimonial", attributes: { diet_lifestyle: "Non-vegetarian", smoking_habit: "Non-smoker" } },
    { id: "cand8", name: "Dev P.", city: "Mumbai", profession: "Architect", source: "internal_network", attributes: { diet_lifestyle: "Vegetarian", education: "Top-tier college", values_intent: "Does not want children", profession_seniority: "Senior professional", smoking_habit: "Non-smoker" } },
    { id: "cand9", name: "Siddharth B.", city: "Delhi", profession: "Sales Director", source: "linkedin", attributes: {} },
    { id: "cand10", name: "Sam K.", city: "Delhi", profession: "Product Designer", source: "internal_network", attributes: { values_intent: "Wants children", smoking_habit: "Non-smoker" } },
    { id: "cand11", name: "Manav G.", city: "Hyderabad", profession: "Finance Analyst", source: "matrimonial", attributes: { education: "Tier 2 college" } },
    { id: "cand12", name: "Ishaan P.", city: "Bangalore", profession: "Lawyer", source: "internal_network", attributes: { marital_history: "Divorced", smoking_habit: "Non-smoker" } },
    { id: "cand13", name: "Varun J.", city: "Pune", profession: "Architect", source: "internal_network", attributes: { profession_seniority: "Mid-career", smoking_habit: "Non-smoker" } },
    { id: "cand14", name: "Ishita P.", city: "Delhi", profession: "Architect", source: "referral", attributes: { values_intent: "Does not want children", smoking_habit: "Non-smoker" } },
  ];

  const clients = [
    { id: "c1", name: "Priya S.", city: "Bangalore", journey: "ongoing", arm: "intervention", matchmakerId: "m1" },
    { id: "c2", name: "Rahul M.", city: "Mumbai", journey: "new", arm: "intervention", matchmakerId: "m1" },
    { id: "c3", name: "Meera J.", city: "Delhi", journey: "ongoing", arm: "control", matchmakerId: "m2" },
    { id: "c4", name: "Neha K.", city: "Delhi", journey: "ongoing", arm: "intervention", matchmakerId: "m2" },
  ];

  // The client's criteria. A criterion records a direction and a set of values,
  // and separately how firm the client made it.
  const preferences = [
    { id: "p1", clientId: "c1", dimension: "location_city_tier", operator: "must_be", values: ["Bangalore metro"], kind: "stated_preference", confirmed: false, status: "active", note: "Prefers to stay in the Bangalore metro", source: "onboarding", recordedAt: daysAgo(now, 75), recordedBy: "Aisha Verma" },
    { id: "p2", clientId: "c1", dimension: "smoking_habit", operator: "must_not_be", values: ["Occasional smoker", "Regular smoker"], kind: "confirmed_dealbreaker", confirmed: true, status: "active", note: "Will not consider anyone who smokes", source: "onboarding", recordedAt: daysAgo(now, 70), confirmedAt: daysAgo(now, 70), recordedBy: "Aisha Verma" },
    { id: "p3", clientId: "c2", dimension: "diet_lifestyle", operator: "must_not_be", values: ["Non-vegetarian"], kind: "confirmed_dealbreaker", confirmed: true, status: "active", note: "Non-vegetarian is a definite no", source: "onboarding", recordedAt: daysAgo(now, 50), confirmedAt: daysAgo(now, 50), recordedBy: "Aisha Verma" },
    { id: "p4", clientId: "c2", dimension: "education", operator: "must_be", values: ["Top-tier college"], kind: "stated_preference", confirmed: false, status: "active", note: "Prefers a top-tier college", source: "onboarding", recordedAt: daysAgo(now, 50), recordedBy: "Aisha Verma" },
    { id: "p5", clientId: "c2", dimension: "smoking_habit", operator: "must_be", values: ["Non-smoker"], kind: "confirmed_preference", confirmed: true, status: "active", note: "Would prefer a non-smoker", source: "onboarding", recordedAt: daysAgo(now, 50), confirmedAt: daysAgo(now, 50), recordedBy: "Aisha Verma" },
    { id: "p6", clientId: "c4", dimension: "values_intent", operator: "must_be", values: ["Wants children"], kind: "stated_preference", confirmed: false, status: "active", note: "Wants to have children", source: "onboarding", recordedAt: daysAgo(now, 45), recordedBy: "Farhan Qureshi" },
    // A pattern the matchmaker noticed, not something the client said. It is
    // recorded as a hypothesis, and it never rules a profile out on its own.
    { id: "p7", clientId: "c1", dimension: "personality_temperament", operator: "must_be", values: ["Calm", "Reserved"], kind: "observation", confirmed: false, status: "active", note: "She has twice said she likes someone calm and steady", source: "matchmaker_note", recordedAt: daysAgo(now, 12), recordedBy: "Aisha Verma" },
  ];

  const rejections = [
    { id: "r1", clientId: "c1", candidateId: "cand1", dimension: "location_city_tier", value: "Mumbai", severity: "preference", freeText: "Not based in Bangalore, says he won't relocate. She needs someone in the city.", recordedAt: daysAgo(now, 60), capturedBy: "Aisha Verma" },
    { id: "r2", clientId: "c1", candidateId: "cand2", dimension: "location_city_tier", value: "Tier 2 city", severity: "likely_dealbreaker", freeText: "Lives in Jaipur, no plans to move. She said location is a hard no.", recordedAt: daysAgo(now, 45), capturedBy: "Aisha Verma" },
    { id: "r3", clientId: "c1", candidateId: "cand3", dimension: "location_city_tier", value: "Other metro", severity: "preference", freeText: "Based in Chennai, relocation unclear.", recordedAt: daysAgo(now, 40), capturedBy: "Aisha Verma" },
    { id: "r4", clientId: "c1", candidateId: "cand11", dimension: "education", value: "Tier 2 college", severity: "preference", freeText: "Tier 2 college, she was expecting a top school.", recordedAt: daysAgo(now, 50), capturedBy: "Aisha Verma" },
    { id: "r5", clientId: "c1", candidateId: "cand12", dimension: null, value: null, severity: "uncertain", freeText: "Something about his family history bothered her, need to unpack it.", recordedAt: daysAgo(now, 35), capturedBy: "Aisha Verma" },
    { id: "r6", clientId: "c2", candidateId: "cand7", dimension: "diet_lifestyle", value: "Non-vegetarian", severity: "likely_dealbreaker", freeText: "He's non-vegetarian, that's a definite no for me.", recordedAt: daysAgo(now, 25), capturedBy: "Aisha Verma" },
  ];

  const acceptances = [
    { id: "a1", clientId: "c1", candidateId: "cand4", dimension: "location_city_tier", value: "Bangalore metro", acceptedAt: daysAgo(now, 30) },
  ];

  // Acceptance insights captured by the matchmaker at the moment of a positive
  // response. These are the missing positive signal: what mattered, and what
  // surprised. Synthetic, matchmaker-authored, never inferred from the profile.
  const insights = [
    {
      id: "i1",
      clientId: "c1",
      candidateId: "cand4",
      dimensions: ["personality_temperament"],
      surprise: "Warmer and calmer in person than his profile suggested. Location mattered less than she expected.",
      recordedAt: daysAgo(now, 29),
      recordedBy: "Aisha Verma",
    },
  ];

  // Historical shares, all before the pilot window opened. They are the
  // baseline the audit measures against.
  const shares = [
    { id: "s1", clientId: "c1", candidateId: "cand1", sharedAt: daysAgo(now, 62), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s2", clientId: "c1", candidateId: "cand2", sharedAt: daysAgo(now, 47), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s3", clientId: "c1", candidateId: "cand3", sharedAt: daysAgo(now, 42), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s4", clientId: "c1", candidateId: "cand4", sharedAt: daysAgo(now, 37), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s5", clientId: "c2", candidateId: "cand7", sharedAt: daysAgo(now, 27), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s6", clientId: "c1", candidateId: "cand11", sharedAt: daysAgo(now, 57), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s7", clientId: "c1", candidateId: "cand12", sharedAt: daysAgo(now, 33), actor: "Aisha Verma", consultedInsightIds: [] },
  ];

  const queues = {
    c1: ["cand5", "cand6"],
    c2: ["cand7", "cand8", "cand9"],
    c3: ["cand10"],
    c4: ["cand13", "cand14"],
  };

  return {
    meta: {
      synthetic: true,
      seedAt: new Date(now).toISOString(),
      matchmakerId: "m1",
      // The measurement window opens here. Everything before it is baseline.
      pilotStart: daysAgo(now, 18),
    },
    matchmakers,
    clients,
    candidates,
    preferences,
    preferenceEvents: [],
    rejections,
    acceptances,
    insights,
    confirmations: [],
    resolutions: [],
    shares,
    cardViews: [],
    audits: [],
    audit: [],
    queues,
  };
}

// The send-time check, reduced to what a metric or an audit line needs.
function summariseCheck(review) {
  const findings = (review && review.findings ? review.findings : []).map((f) => ({
    type: f.type,
    basis: f.basis || "history",
    dimension: f.dimension,
    value: f.value === undefined ? null : f.value,
    requirement: f.requirement || null,
  }));
  const hard = findings.filter((f) => f.basis === "confirmed_dealbreaker");
  const confirmed = findings.filter((f) => f.basis === "confirmed_preference");
  const stated = findings.filter((f) => f.basis === "stated_preference");
  return {
    state: review ? review.state : null,
    findings,
    flagged: findings.length > 0,
    confirmedConflicts: hard.length + confirmed.length,
    dealbreakerConflicts: hard.length,
    confirmedPreferenceMismatches: confirmed.length,
    statedPreferenceMismatches: stated.length,
  };
}

function createStore(initial) {
  const state = JSON.parse(JSON.stringify(initial));
  if (!state.matchmakers) state.matchmakers = [];
  if (!state.preferenceEvents) state.preferenceEvents = [];
  if (!state.cardViews) state.cardViews = [];
  if (!state.audits) state.audits = [];
  if (!state.meta) state.meta = {};
  if (!state.meta.pilotStart) state.meta.pilotStart = new Date().toISOString();
  for (const c of state.preferences || []) normaliseCriterion(c);

  // Every id in the workspace, so a generated id can never land on a seeded
  // one. The seed uses short ids like "cand2" and "m2", which a naive counter
  // would happily produce and overwrite a real record with.
  const takenIds = new Set();
  for (const key of [
    "matchmakers",
    "clients",
    "candidates",
    "preferences",
    "rejections",
    "acceptances",
    "insights",
    "confirmations",
    "resolutions",
    "shares",
    "preferenceEvents",
    "cardViews",
    "audits",
    "audit",
  ]) {
    for (const rec of state[key] || []) {
      if (rec && rec.id) takenIds.add(rec.id);
    }
  }

  let seq = 0;
  function id(prefix) {
    let candidate;
    do {
      seq += 1;
      candidate = prefix + seq;
    } while (takenIds.has(candidate));
    takenIds.add(candidate);
    return candidate;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function log(type, payload) {
    state.audit.push({ id: id("aud"), type, ...payload, timestamp: nowIso() });
  }

  // The value a candidate carries on a dimension, if it is known.
  function candidateValue(candidateId, dimension) {
    const cand = state.candidates.find((c) => c.id === candidateId);
    if (!cand || !cand.attributes) return null;
    const v = cand.attributes[dimension];
    return v === undefined || v === null ? null : v;
  }

  const store = {
    state,

    matchmaker(matchmakerId) {
      return state.matchmakers.find((m) => m.id === matchmakerId) || null;
    },
    matchmakers() {
      return state.matchmakers;
    },
    client(clientId) {
      return state.clients.find((c) => c.id === clientId) || null;
    },
    candidate(candidateId) {
      return state.candidates.find((c) => c.id === candidateId) || null;
    },
    preferences(clientId) {
      return state.preferences.filter((p) => p.clientId === clientId);
    },
    // The criteria in force right now.
    activeCriteria(clientId) {
      return Array.from(criteriaAt(store, clientId, new Date()).values());
    },
    criterionHistory(clientId) {
      return store.preferences(clientId).slice().sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
    },
    preferenceEvents(clientId) {
      return state.preferenceEvents.filter((e) => e.clientId === clientId);
    },
    rejections(clientId) {
      return state.rejections.filter((r) => r.clientId === clientId);
    },
    acceptances(clientId) {
      return state.acceptances.filter((a) => a.clientId === clientId);
    },
    insights(clientId) {
      return state.insights.filter((i) => i.clientId === clientId);
    },
    confirmations(clientId) {
      return state.confirmations.filter((c) => c.clientId === clientId);
    },
    shares(clientId) {
      return state.shares.filter((s) => s.clientId === clientId);
    },
    cardViews(clientId) {
      return state.cardViews.filter((v) => v.clientId === clientId);
    },
    audits() {
      return state.audits;
    },
    // The places where the client's file does not agree with a decision they
    // made. This is the client's own inconsistency, not anything about a
    // particular profile, so it is worked out for the client as a whole.
    clientContradictions(clientId) {
      const out = [];
      for (const criterion of store.activeCriteria(clientId)) {
        if (criterion.kind === "observation") continue;
        const decisions = decisionsAgainstCriterion(
          store,
          clientId,
          criterion.dimension,
          criterion
        );
        if (!decisions.length) continue;
        out.push({
          dimension: criterion.dimension,
          criterion: Object.assign({}, criterion, { summary: criterionSummary(criterion) }),
          decisions,
        });
      }
      return out;
    },
    auditsFor(clientId) {
      return state.audits.filter((a) => a.clientId === clientId);
    },
    queue(clientId) {
      return (state.queues[clientId] || []).map((cid) => store.candidate(cid)).filter(Boolean);
    },
    allAudit() {
      return state.audit;
    },

    removeFromQueue(clientId, candidateId) {
      const q = state.queues[clientId] || [];
      state.queues[clientId] = q.filter((cid) => cid !== candidateId);
    },

    // ---- records created through the interface ----

    createMatchmaker({ name }) {
      const clean = text(name, "Matchmaker name", "name");
      if (state.matchmakers.some((m) => m.name.toLowerCase() === clean.toLowerCase())) {
        throw new InputError(`${clean} is already on the team.`, "name");
      }
      const initials = clean
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const rec = { id: id("m"), name: clean, initials };
      state.matchmakers.push(rec);
      log("matchmaker_created", { matchmakerId: rec.id, name: rec.name });
      return rec;
    },

    createClient({ name, city, journey, matchmakerId }) {
      const cleanName = text(name, "Client name", "name");
      const cleanCity = text(city, "City", "city");
      const mm = store.matchmaker(matchmakerId);
      if (!mm) throw new InputError("Pick the matchmaker who looks after this client.", "matchmakerId");
      if (state.clients.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
        throw new InputError(`${cleanName} is already on the list.`, "name");
      }
      const rec = {
        id: id("cl"),
        name: cleanName,
        city: cleanCity,
        journey: journey === "new" ? "new" : "ongoing",
        // The check is on by default. The arms are a pilot allocation, not a
        // product behaviour, and a matchmaker who adds a client and then finds
        // the check never fires would conclude the tool does nothing.
        arm: "intervention",
        matchmakerId: mm.id,
        createdAt: nowIso(),
      };
      state.clients.push(rec);
      state.queues[rec.id] = [];
      log("client_created", { clientId: rec.id, name: rec.name, matchmakerId: mm.id });
      return rec;
    },

    createCandidate({ name, city, profession, source, attributes }) {
      const cleanName = text(name, "Candidate name", "name");
      const cleanCity = text(city, "City", "city");
      const cleanProfession = text(profession, "Profession", "profession");
      const list = Array.isArray(attributes) ? attributes : [];
      const map = {};
      for (const a of list) {
        const dimension = text(a && a.dimension, "Attribute", "attributes");
        if (!DIMENSION_BY_KEY[dimension]) {
          throw new InputError(`"${dimension}" is not a known dimension.`, "attributes");
        }
        const value = text(a && a.value, `Value for ${DIMENSION_BY_KEY[dimension].label}`, "attributes");
        if (dimensionValues(dimension).indexOf(value) === -1) {
          throw new InputError(
            `"${value}" is not a recorded value for ${DIMENSION_BY_KEY[dimension].label}.`,
            "attributes"
          );
        }
        map[dimension] = value;
      }
      const rec = {
        id: id("cand"),
        name: cleanName,
        city: cleanCity,
        profession: cleanProfession,
        source: source || "internal_network",
        attributes: map,
        createdAt: nowIso(),
      };
      state.candidates.push(rec);
      log("candidate_created", { candidateId: rec.id, name: rec.name });
      return rec;
    },

    // Record what the client said about a dimension. A criterion has a
    // direction, a set of values, and a level of firmness, and those are
    // recorded separately. Every write is versioned: the old criterion stays
    // readable with the date it was in force, so a share can be audited
    // against the file as it was rather than as it is now.
    setPreference({ clientId, dimension, operator, values, value, kind, note, actor, source }) {
      const clientRec = store.client(clientId);
      if (!clientRec) throw new InputError("Unknown client.", "clientId");
      if (!DIMENSION_BY_KEY[dimension]) {
        throw new InputError("Pick a dimension.", "dimension");
      }
      const kinds = [
        "confirmed_dealbreaker",
        "confirmed_preference",
        "stated_preference",
        "observation",
      ];
      const chosen = kinds.indexOf(kind) === -1 ? "stated_preference" : kind;
      // With no operator given, a dealbreaker forbids the value and a
      // preference requires it. This is the same reading the migration applies
      // to older records, so the two can never disagree.
      const op =
        operator === "must_not_be" || operator === "must_be"
          ? operator
          : chosen === "confirmed_dealbreaker"
            ? "must_not_be"
            : "must_be";
      const raw = Array.isArray(values) ? values : values || value ? [values || value] : [];
      const list = raw.map((v) => text(v, "Value", "values")).filter(Boolean);
      if (!list.length) throw new InputError("Pick at least one value.", "values");
      const allowed = dimensionValues(dimension);
      for (const v of list) {
        if (allowed.indexOf(v) === -1) {
          throw new InputError(
            `"${v}" is not a recorded value for ${DIMENSION_BY_KEY[dimension].label}.`,
            "values"
          );
        }
      }
      const now = nowIso();

      // A confirmed rule has to be backed by something the client said. Either
      // the answer was recorded from the client, or the matchmaker wrote down
      // what the client said. Without one of those, what the matchmaker has is
      // an inference, and it is recorded as an observation instead.
      const isConfirmed = chosen === "confirmed_dealbreaker" || chosen === "confirmed_preference";
      if (isConfirmed && source !== "client_answer" && !(typeof note === "string" && note.trim())) {
        throw new InputError(
          "A confirmed criterion needs the client's own words, or an answer recorded from the client. Record it as an observation to check if it is only a pattern you noticed.",
          "note"
        );
      }

      const existing = store.activeCriteria(clientId).find((c) => c.dimension === dimension);
      const before = existing
        ? {
            operator: existing.operator,
            values: existing.values,
            kind: existing.kind,
            note: existing.note || "",
          }
        : null;
      if (existing) {
        existing.status = "superseded";
        existing.supersededAt = now;
      }

      const rec = {
        id: id("pref"),
        clientId,
        dimension,
        operator: op,
        values: list,
        kind: chosen,
        confirmed: isConfirmed,
        status: "active",
        note: typeof note === "string" ? note.trim() : "",
        source: source || "onboarding",
        recordedAt: now,
        recordedBy: actor || null,
        supersedes: existing ? existing.id : null,
      };
      if (isConfirmed) rec.confirmedAt = now;
      state.preferences.push(rec);

      state.preferenceEvents.push({
        id: id("pev"),
        clientId,
        dimension,
        before,
        after: { operator: op, values: list, kind: chosen, note: rec.note },
        at: now,
        by: actor || null,
        source: rec.source,
      });
      log("preference_recorded", { clientId, dimension, operator: op, values: list, kind: chosen, actor });
      return rec;
    },

    // Withdraw a criterion. The record is kept with a removed date so the
    // history of what was believed stays readable and the audit can tell what
    // was in force when.
    removePreference({ clientId, preferenceId, actor }) {
      const pref = state.preferences.find((p) => p.id === preferenceId && p.clientId === clientId);
      if (!pref) throw new InputError("Unknown criterion.", "preferenceId");
      const now = nowIso();
      pref.status = "removed";
      pref.removedAt = now;
      state.preferenceEvents.push({
        id: id("pev"),
        clientId,
        dimension: pref.dimension,
        before: { operator: pref.operator, values: pref.values, kind: pref.kind, note: pref.note || "" },
        after: null,
        at: now,
        by: actor || null,
        source: "removed",
      });
      log("preference_removed", { clientId, dimension: pref.dimension, actor });
      return pref;
    },

    // Move a client between the pilot arms. This is an allocation decision,
    // and it is recorded so the measurement can be read by arm afterwards.
    setArm({ clientId, arm, actor }) {
      const clientRec = store.client(clientId);
      if (!clientRec) throw new InputError("Unknown client.", "clientId");
      if (arm !== "control" && arm !== "intervention") {
        throw new InputError("Pick an arm.", "arm");
      }
      const before = clientRec.arm;
      clientRec.arm = arm;
      log("client_arm_changed", { clientId, before, arm, actor });
      return clientRec;
    },

    addToQueue({ clientId, candidateId }) {
      const clientRec = store.client(clientId);
      if (!clientRec) throw new InputError("Unknown client.", "clientId");
      const cand = store.candidate(candidateId);
      if (!cand) throw new InputError("Unknown candidate.", "candidateId");
      const q = state.queues[clientId] || [];
      if (q.indexOf(candidateId) === -1) {
        state.queues[clientId] = q.concat([candidateId]);
        log("candidate_shortlisted", { clientId, candidateId });
      }
      return cand;
    },

    // ---- events ----

    // The matchmaker opened the card for this candidate. This is the evidence
    // for whether the check was consulted, which the adoption guardrail needs.
    recordCardView({ clientId, candidateId, actor, surfaced }) {
      const rec = {
        id: id("cv"),
        clientId,
        candidateId,
        at: nowIso(),
        actor,
        surfaced: !!surfaced,
      };
      state.cardViews.push(rec);
      log("card_viewed", { clientId, candidateId, actor, surfaced: rec.surfaced });
      return rec;
    },

    share({ clientId, candidateId, actor, consultedInsightIds }) {
      // A profile already sent to this client, with no answer yet, is the same
      // introduction. Sending it again is almost always a double click, and it
      // would double count the profile in the measurement.
      const earlier = state.shares.find(
        (s) => s.clientId === clientId && s.candidateId === candidateId
      );
      if (earlier) {
        const answered =
          state.rejections.some(
            (r) => r.clientId === clientId && r.candidateId === candidateId
          ) ||
          state.acceptances.some(
            (a) => a.clientId === clientId && a.candidateId === candidateId
          );
        if (!answered) {
          log("duplicate_share_ignored", { clientId, candidateId, actor });
          return Object.assign({}, earlier, { duplicate: true });
        }
      }
      // Only insights that exist and belong to this client may be cited.
      const valid = new Set(state.insights.filter((i) => i.clientId === clientId).map((i) => i.id));
      const consulted = Array.isArray(consultedInsightIds)
        ? consultedInsightIds.filter((i) => valid.has(i))
        : [];
      const cand = store.candidate(candidateId);
      const review = cand ? evaluateSend(store, clientId, cand) : null;
      const rec = {
        id: id("shr"),
        clientId,
        candidateId,
        sharedAt: nowIso(),
        actor,
        consultedInsightIds: consulted,
        // The check is recomputed here, at the moment of sending, so the
        // measured conflict rate is a fact about the send and not a claim by
        // the interface.
        check: summariseCheck(review),
      };
      state.shares.push(rec);
      store.removeFromQueue(clientId, candidateId);
      // Every share is audited, whether or not the check was shown and
      // whichever arm the client is on. The audit does not depend on the
      // matchmaker having used the product.
      store.auditShare({ shareId: rec.id, by: actor });
      log("share", { clientId, candidateId, actor, consultedInsightIds: consulted, check: rec.check });
      return rec;
    },

    // Re-evaluate a share against the criteria that were in force at the
    // moment it was shared. This is the audit: the same deterministic rules,
    // the same classification, applied to every share whether or not the
    // check was surfaced, and to the file as it was at the time.
    auditShare({ shareId, by }) {
      const share = state.shares.find((s) => s.id === shareId);
      if (!share) throw new InputError("Unknown share.", "shareId");
      const cand = store.candidate(share.candidateId);
      if (!cand) throw new InputError("Unknown candidate.", "candidateId");
      const review = evaluateSend(store, share.clientId, cand, share.sharedAt);

      const criterionFindings = review.findings.filter(
        (f) => f.basis === "confirmed_dealbreaker" || f.basis === "confirmed_preference" || f.basis === "stated_preference"
      );
      const hard = criterionFindings.filter((f) => f.basis === "confirmed_dealbreaker");
      const soft = criterionFindings.filter((f) => f.basis !== "confirmed_dealbreaker");
      const unknown = review.findings.filter((f) => f.basis === "unknown");
      const history = review.findings.filter((f) => f.basis === "history");
      // The criteria that were in force at the time. A profile with nothing
      // recorded at all cannot be checked against any of them, so every one of
      // them counts as unchecked.
      const criteriaInForce = criteriaAt(store, share.clientId, share.sharedAt);
      // An observation is a hypothesis, not something to check a profile
      // against. A client whose only record is an observation has nothing to
      // compare against, and must not be counted as a clean result.
      const applicableCriteria = [...criteriaInForce.values()].filter(
        (c) => c.kind !== "observation"
      );
      const hadCriteria = applicableCriteria.length > 0;
      const untagged = review.state === "untagged";
      const unknownCount = unknown.length + (untagged ? applicableCriteria.length : 0);

      const classification = hard.length
        ? "hard_conflict"
        : soft.length
          ? "soft_mismatch"
          : unknownCount > 0
            ? "unknown"
            : hadCriteria
              ? "clean"
              : "no_criteria";

      const rec = {
        id: id("aud"),
        shareId: share.id,
        clientId: share.clientId,
        candidateId: share.candidateId,
        at: nowIso(),
        by: by || null,
        classification,
        hard: hard.length,
        soft: soft.length,
        unknown: unknownCount,
        history: history.length,
        details: criterionFindings.map((f) => ({
          type: f.type,
          basis: f.basis,
          dimension: f.dimension,
          value: f.value === undefined ? null : f.value,
          requirement: f.requirement || null,
        })),
        // A reviewer can confirm or dispute the audit. The rate is reported
        // both ways, because an automated audit can inherit the rule engine's
        // mistakes and needs a human to catch them.
        humanConfirmed: null,
        note: "",
      };
      const existing = state.audits.findIndex((a) => a.shareId === share.id);
      if (existing === -1) state.audits.push(rec);
      else state.audits[existing] = rec;
      return rec;
    },

    // Audit every share that has not been audited yet.
    runAudit({ by }) {
      let done = 0;
      for (const share of state.shares) {
        if (state.audits.some((a) => a.shareId === share.id)) continue;
        store.auditShare({ shareId: share.id, by });
        done += 1;
      }
      log("audit_run", { sharesAudited: done, by });
      return { audited: done };
    },

    // A human reviewer marks an audit as right or wrong.
    confirmAudit({ auditId, humanConfirmed, note, by }) {
      const rec = state.audits.find((a) => a.id === auditId);
      if (!rec) throw new InputError("Unknown audit.", "auditId");
      rec.humanConfirmed = !!humanConfirmed;
      rec.note = typeof note === "string" ? note.trim() : rec.note;
      rec.confirmedAt = nowIso();
      rec.confirmedBy = by || null;
      log("audit_reviewed", { auditId, humanConfirmed: rec.humanConfirmed, by });
      return rec;
    },

    reject({ clientId, candidateId, dimension, severity, freeText, actor, latencyMs }) {
      const now = nowIso();
      // A rejection implies a share preceded it. If none is recorded, create one so
      // the metric and ARCR have the share-time ordering they need.
      const hasShare = state.shares.some((s) => s.clientId === clientId && s.candidateId === candidateId);
      if (!hasShare) {
        const cand = store.candidate(candidateId);
        const review = cand ? evaluateSend(store, clientId, cand) : null;
        const share = {
          id: id("shr"),
          clientId,
          candidateId,
          sharedAt: now,
          actor,
          consultedInsightIds: [],
          check: summariseCheck(review),
        };
        state.shares.push(share);
        store.auditShare({ shareId: share.id, by: actor });
      }
      const rec = {
        id: id("rej"),
        clientId,
        candidateId,
        dimension: dimension || null,
        // The value the candidate actually carried on that dimension, so the
        // history records what was rejected rather than only a category.
        value: dimension ? candidateValue(candidateId, dimension) : null,
        severity,
        freeText: freeText || "",
        recordedAt: now,
        capturedBy: actor,
        latencyMs: typeof latencyMs === "number" ? latencyMs : null,
      };
      state.rejections.push(rec);
      store.removeFromQueue(clientId, candidateId);
      log("rejection_logged", { clientId, candidateId, dimension, severity, actor });
      return rec;
    },

    accept({ clientId, candidateId, actor, dimensions, surprise }) {
      // The client said yes, so the profile was sent. If no share was recorded
      // for it, it still has to be in the denominator.
      const shared = state.shares.some(
        (s) => s.clientId === clientId && s.candidateId === candidateId
      );
      if (!shared) {
        const cand = store.candidate(candidateId);
        const review = cand ? evaluateSend(store, clientId, cand) : null;
        const share = {
          id: id("shr"),
          clientId,
          candidateId,
          sharedAt: nowIso(),
          actor,
          consultedInsightIds: [],
          check: summariseCheck(review),
        };
        state.shares.push(share);
        store.auditShare({ shareId: share.id, by: actor });
      }
      const rec = { id: id("acc"), clientId, candidateId, acceptedAt: nowIso() };
      state.acceptances.push(rec);
      // The acceptance debrief: capture what mattered and what surprised, only if
      // the matchmaker records it. Nothing is inferred from the profile itself.
      if ((Array.isArray(dimensions) && dimensions.length > 0) || (surprise && surprise.trim())) {
        const insight = {
          id: id("ins"),
          clientId,
          candidateId,
          dimensions: Array.isArray(dimensions) ? dimensions : [],
          surprise: surprise || "",
          recordedAt: nowIso(),
          recordedBy: actor,
        };
        state.insights.push(insight);
        log("acceptance_insight", { clientId, candidateId, dimensions: insight.dimensions, actor });
        rec.insightId = insight.id;
      }
      store.removeFromQueue(clientId, candidateId);
      log("profile_accepted", { clientId, candidateId, actor });
      return rec;
    },

    resolve({ clientId, candidateId, action, rationale, actor }) {
      const cand = store.candidate(candidateId);
      const review = cand ? evaluateSend(store, clientId, cand) : null;
      const rec = {
        id: id("res"),
        clientId,
        candidateId,
        action,
        rationale: rationale || "",
        resolvedAt: nowIso(),
        actor,
        // What the check said at the moment the card was closed, so a hold can
        // be counted as a conflict prevented before sending.
        check: summariseCheck(review),
      };
      state.resolutions.push(rec);
      log("card_resolved", { clientId, candidateId, action, actor, rationale: rec.rationale });
      return rec;
    },

    recordClientAnswer({ clientId, dimension, answer, value, values, operator, kind, verbatim, actor }) {
      const now = nowIso();
      const list = (Array.isArray(values) ? values : value ? [value] : []).filter(Boolean);
      const rec = {
        id: id("cnf"),
        clientId,
        dimension,
        question: "What did the client say about this?",
        answer,
        value: list[0] || null,
        values: list,
        operator: operator || null,
        kind: kind || null,
        verbatim: verbatim || "",
        recordedAt: now,
        recordedBy: actor,
      };
      state.confirmations.push(rec);
      // A client answer promotes a dimension to a confirmed criterion. Only this
      // path writes one, and only with a value to write and the client's own
      // words. The direction follows what the client settled: a dealbreaker
      // forbids the value they rejected, a preference requires the value they
      // accepted.
      if (
        (answer === "dealbreaker" || answer === "preference") &&
        list.length &&
        verbatim &&
        verbatim.trim()
      ) {
        const kindToUse =
          kind || (answer === "dealbreaker" ? "confirmed_dealbreaker" : "confirmed_preference");
        const opToUse =
          operator || (answer === "dealbreaker" ? "must_not_be" : "must_be");
        const existing = store.activeCriteria(clientId).find((c) => c.dimension === dimension);
        const before = existing
          ? { operator: existing.operator, values: existing.values, kind: existing.kind, note: existing.note || "" }
          : null;
        if (existing) {
          existing.status = "superseded";
          existing.supersededAt = now;
        }
        const pref = {
          id: id("pref"),
          clientId,
          dimension,
          operator: opToUse,
          values: list,
          kind: kindToUse,
          confirmed: true,
          status: "active",
          note: verbatim.trim(),
          source: "client_answer",
          recordedAt: now,
          confirmedAt: now,
          recordedBy: actor || null,
          supersedes: existing ? existing.id : null,
        };
        state.preferences.push(pref);
        state.preferenceEvents.push({
          id: id("pev"),
          clientId,
          dimension,
          before,
          after: { operator: opToUse, values: list, kind: kindToUse, note: verbatim.trim() },
          at: now,
          by: actor || null,
          source: "client_answer",
        });
      }
      log("preference_confirmed", { clientId, dimension, answer, value, actor });
      return rec;
    },

    toJSON() {
      return JSON.parse(JSON.stringify(state));
    },
  };

  // Every share in the workspace is audited, including the history that came
  // before the check existed. The baseline has to be judged by the same
  // process as the measurement window, or the two are not comparable.
  store.runAudit({ by: null });

  return store;
}

function load(path, seedNow) {
  try {
    const raw = fs.readFileSync(path, "utf8");
    return createStore(JSON.parse(raw));
  } catch (err) {
    return createStore(buildSeed(seedNow));
  }
}

function save(store, path) {
  fs.mkdirSync(require("node:path").dirname(path), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(store.toJSON(), null, 2));
}

module.exports = { buildSeed, createStore, load, save, DAY, daysAgo, InputError, summariseCheck, normaliseCriterion };
