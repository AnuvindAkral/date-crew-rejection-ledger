"use strict";

const fs = require("node:fs");

const { DIMENSION_BY_KEY, dimensionValues } = require("./dimensions");
const { evaluateSend } = require("./rules");

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

// Build the default synthetic dataset. Every name, city, profession and note is
// invented and clearly labelled synthetic. No real person or client data.
//
// Candidates carry attributes (a value for each dimension they have something
// to say about). Clients carry preferences (a dimension, a value, and whether it
// is an ordinary preference or a confirmed dealbreaker). The two are compared
// as values, so "Non-vegetarian" can be told apart from "Vegetarian".
function buildSeed(now = Date.now()) {
  const matchmakers = [
    { id: "m1", name: "Aisha Verma", initials: "AV" },
    { id: "m2", name: "Farhan Qureshi", initials: "FQ" },
  ];

  const candidates = [
    { id: "cand1", name: "Rohit K.", city: "Mumbai", profession: "Engineering Manager", source: "internal_network", attributes: { location_city_tier: "Mumbai", profession_seniority: "Senior professional" } },
    { id: "cand2", name: "Vikram J.", city: "Jaipur", profession: "Product Lead", source: "matrimonial", attributes: { location_city_tier: "Tier 2 city" } },
    { id: "cand3", name: "Aditya R.", city: "Chennai", profession: "Data Scientist", source: "linkedin", attributes: { location_city_tier: "Other metro", education: "Top-tier college" } },
    { id: "cand4", name: "Arjun T.", city: "Bangalore", profession: "Founder", source: "referral", attributes: { location_city_tier: "Bangalore metro", personality_temperament: "Calm" } },
    { id: "cand5", name: "Aarav M.", city: "Pune", profession: "Product Manager", source: "internal_network", attributes: { location_city_tier: "Pune", personality_temperament: "Outgoing" } },
    { id: "cand6", name: "Karan D.", city: "Bangalore", profession: "Consultant", source: "referral", attributes: { location_city_tier: "Bangalore metro" } },
    { id: "cand7", name: "Nikhil S.", city: "Mumbai", profession: "Trader", source: "matrimonial", attributes: { diet_lifestyle: "Non-vegetarian" } },
    { id: "cand8", name: "Dev P.", city: "Mumbai", profession: "Architect", source: "internal_network", attributes: { diet_lifestyle: "Vegetarian", education: "Top-tier college", values_intent: "Does not want children", profession_seniority: "Senior professional" } },
    { id: "cand9", name: "Siddharth B.", city: "Delhi", profession: "Sales Director", source: "linkedin", attributes: {} },
    { id: "cand10", name: "Sam K.", city: "Delhi", profession: "Product Designer", source: "internal_network", attributes: { values_intent: "Wants children" } },
    { id: "cand11", name: "Manav G.", city: "Hyderabad", profession: "Finance Analyst", source: "matrimonial", attributes: { education: "Tier 2 college" } },
    { id: "cand12", name: "Ishaan P.", city: "Bangalore", profession: "Lawyer", source: "internal_network", attributes: { marital_history: "Divorced" } },
    { id: "cand13", name: "Varun J.", city: "Pune", profession: "Architect", source: "internal_network", attributes: { profession_seniority: "Mid-career" } },
    { id: "cand14", name: "Ishita P.", city: "Delhi", profession: "Architect", source: "referral", attributes: { values_intent: "Does not want children" } },
  ];

  const clients = [
    { id: "c1", name: "Priya S.", city: "Bangalore", journey: "ongoing", arm: "intervention", matchmakerId: "m1" },
    { id: "c2", name: "Rahul M.", city: "Mumbai", journey: "new", arm: "intervention", matchmakerId: "m1" },
    { id: "c3", name: "Meera J.", city: "Delhi", journey: "ongoing", arm: "control", matchmakerId: "m2" },
    { id: "c4", name: "Neha K.", city: "Delhi", journey: "ongoing", arm: "intervention", matchmakerId: "m2" },
  ];

  const preferences = [
    { id: "p1", clientId: "c1", dimension: "location_city_tier", value: "Bangalore metro", kind: "stated_preference", confirmed: false, status: "active", note: "Prefers to stay in the Bangalore metro", source: "onboarding", recordedAt: daysAgo(now, 70), recordedBy: "Aisha Verma" },
    { id: "p2", clientId: "c2", dimension: "diet_lifestyle", value: "Non-vegetarian", kind: "confirmed_dealbreaker", confirmed: true, status: "active", note: "Non-vegetarian is a definite no", source: "onboarding", recordedAt: daysAgo(now, 30), confirmedAt: daysAgo(now, 30), recordedBy: "Aisha Verma" },
    { id: "p3", clientId: "c2", dimension: "education", value: "Top-tier college", kind: "stated_preference", confirmed: false, status: "active", note: "Prefers a top-tier college", source: "onboarding", recordedAt: daysAgo(now, 30), recordedBy: "Aisha Verma" },
    { id: "p4", clientId: "c4", dimension: "values_intent", value: "Wants children", kind: "stated_preference", confirmed: false, status: "active", note: "Wants to have children", source: "onboarding", recordedAt: daysAgo(now, 25), recordedBy: "Farhan Qureshi" },
  ];

  const rejections = [
    { id: "r1", clientId: "c1", candidateId: "cand1", dimension: "location_city_tier", value: "Mumbai", severity: "preference", freeText: "Not based in Bangalore, says he won't relocate. She needs someone in the city.", recordedAt: daysAgo(now, 60), capturedBy: "Aisha Verma" },
    { id: "r2", clientId: "c1", candidateId: "cand2", dimension: "location_city_tier", value: "Tier 2 city", severity: "likely_dealbreaker", freeText: "Lives in Jaipur, no plans to move. She said location is a hard no.", recordedAt: daysAgo(now, 40), capturedBy: "Aisha Verma" },
    { id: "r3", clientId: "c1", candidateId: "cand3", dimension: "location_city_tier", value: "Other metro", severity: "preference", freeText: "Based in Chennai, relocation unclear.", recordedAt: daysAgo(now, 20), capturedBy: "Aisha Verma" },
    { id: "r4", clientId: "c1", candidateId: "cand11", dimension: "education", value: "Tier 2 college", severity: "preference", freeText: "Tier 2 college, she was expecting a top school.", recordedAt: daysAgo(now, 50), capturedBy: "Aisha Verma" },
    { id: "r5", clientId: "c1", candidateId: "cand12", dimension: null, value: null, severity: "uncertain", freeText: "Something about his family history bothered her, need to unpack it.", recordedAt: daysAgo(now, 30), capturedBy: "Aisha Verma" },
    { id: "r6", clientId: "c2", candidateId: "cand7", dimension: "diet_lifestyle", value: "Non-vegetarian", severity: "likely_dealbreaker", freeText: "He's non-vegetarian, that's a definite no for me.", recordedAt: daysAgo(now, 10), capturedBy: "Aisha Verma" },
  ];

  const acceptances = [
    { id: "a1", clientId: "c1", candidateId: "cand4", dimension: "location_city_tier", value: "Bangalore metro", acceptedAt: daysAgo(now, 10) },
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
      recordedAt: daysAgo(now, 9),
      recordedBy: "Aisha Verma",
    },
  ];

  // Historical shares that precede the rejections above. Each share must be
  // older than its rejection so the time ordering rules can be exercised.
  const shares = [
    { id: "s1", clientId: "c1", candidateId: "cand1", sharedAt: daysAgo(now, 62), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s2", clientId: "c1", candidateId: "cand2", sharedAt: daysAgo(now, 42), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s3", clientId: "c1", candidateId: "cand3", sharedAt: daysAgo(now, 22), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s4", clientId: "c1", candidateId: "cand4", sharedAt: daysAgo(now, 12), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s5", clientId: "c2", candidateId: "cand7", sharedAt: daysAgo(now, 12), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s6", clientId: "c1", candidateId: "cand11", sharedAt: daysAgo(now, 52), actor: "Aisha Verma", consultedInsightIds: [] },
    { id: "s7", clientId: "c1", candidateId: "cand12", sharedAt: daysAgo(now, 32), actor: "Aisha Verma", consultedInsightIds: [] },
  ];

  const queues = {
    c1: ["cand5", "cand6"],
    c2: ["cand7", "cand8", "cand9"],
    c3: ["cand10"],
    c4: ["cand13", "cand14"],
  };

  return {
    meta: { synthetic: true, seedAt: new Date(now).toISOString(), matchmakerId: "m1" },
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
    audit: [],
    queues,
  };
}

// The send-time check, reduced to what a metric or an audit line needs.
// The server recomputes this at share time so the recorded number is never
// something the interface claimed.
function summariseCheck(review) {
  const findings = (review && review.findings ? review.findings : []).map((f) => ({
    type: f.type,
    basis: f.basis || "history",
    dimension: f.dimension,
    value: f.value === undefined ? null : f.value,
  }));
  const dealbreaker = findings.filter((f) => f.basis === "confirmed_dealbreaker");
  const confirmedMismatch = findings.filter((f) => f.basis === "confirmed_preference");
  const statedMismatch = findings.filter((f) => f.basis === "stated_preference");
  return {
    state: review ? review.state : null,
    findings,
    flagged: findings.length > 0,
    confirmedConflicts: dealbreaker.length + confirmedMismatch.length,
    dealbreakerConflicts: dealbreaker.length,
    confirmedPreferenceMismatches: confirmedMismatch.length,
    statedPreferenceMismatches: statedMismatch.length,
  };
}

function createStore(initial) {
  const state = JSON.parse(JSON.stringify(initial));
  if (!state.matchmakers) state.matchmakers = [];
  if (!state.preferenceEvents) state.preferenceEvents = [];

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

  // The send-time check, reduced to what a metric or an audit line needs.
  // The server recomputes this at share time so the recorded number is never
  // something the interface claimed.
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
    activePreferences(clientId) {
      return store.preferences(clientId).filter((p) => p.status === "active");
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
        // A new client starts on the control arm so the pilot can allocate them.
        arm: "control",
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

    // Record what the client said about a dimension. An ordinary preference is
    // advisory. A dealbreaker is an explicit no, so it governs the dimension.
    // Every write is logged with what it replaced, so a change is traceable.
    setPreference({ clientId, dimension, value, kind, note, actor, source }) {
      const clientRec = store.client(clientId);
      if (!clientRec) throw new InputError("Unknown client.", "clientId");
      if (!DIMENSION_BY_KEY[dimension]) {
        throw new InputError("Pick a dimension.", "dimension");
      }
      const cleanValue = text(value, "Value", "value");
      if (dimensionValues(dimension).indexOf(cleanValue) === -1) {
        throw new InputError(
          `"${cleanValue}" is not a recorded value for ${DIMENSION_BY_KEY[dimension].label}.`,
          "value"
        );
      }
      const isDealbreaker = kind === "confirmed_dealbreaker";
      const now = nowIso();
      const existing = state.preferences.find(
        (p) => p.clientId === clientId && p.dimension === dimension && p.status === "active"
      );
      const before = existing
        ? { kind: existing.kind, value: existing.value, note: existing.note || "" }
        : null;
      const rec = existing || {
        id: id("pref"),
        clientId,
        dimension,
        createdAt: now,
      };
      rec.value = cleanValue;
      rec.kind = isDealbreaker ? "confirmed_dealbreaker" : "stated_preference";
      rec.confirmed = isDealbreaker;
      rec.status = "active";
      rec.note = typeof note === "string" ? note.trim() : "";
      rec.source = source || "onboarding";
      rec.recordedAt = now;
      rec.recordedBy = actor || null;
      if (isDealbreaker) rec.confirmedAt = now;
      if (!existing) state.preferences.push(rec);

      state.preferenceEvents.push({
        id: id("pev"),
        clientId,
        dimension,
        before,
        after: { kind: rec.kind, value: rec.value, note: rec.note },
        at: now,
        by: actor || null,
        source: rec.source,
      });
      log("preference_recorded", { clientId, dimension, value: cleanValue, kind: rec.kind, actor });
      return rec;
    },

    // Withdraw a criterion. The record is kept with a removed status so the
    // history of what was believed stays readable.
    removePreference({ clientId, preferenceId, actor }) {
      const pref = state.preferences.find((p) => p.id === preferenceId && p.clientId === clientId);
      if (!pref) throw new InputError("Unknown preference.", "preferenceId");
      pref.status = "removed";
      pref.removedAt = nowIso();
      state.preferenceEvents.push({
        id: id("pev"),
        clientId,
        dimension: pref.dimension,
        before: { kind: pref.kind, value: pref.value, note: pref.note || "" },
        after: null,
        at: pref.removedAt,
        by: actor || null,
        source: "removed",
      });
      log("preference_removed", { clientId, dimension: pref.dimension, actor });
      return pref;
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

    share({ clientId, candidateId, actor, consultedInsightIds }) {
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
      log("share", { clientId, candidateId, actor, consultedInsightIds: consulted, check: rec.check });
      return rec;
    },

    reject({ clientId, candidateId, dimension, severity, freeText, actor, latencyMs }) {
      const now = nowIso();
      // A rejection implies a share preceded it. If none is recorded, create one so
      // Metric A and ARCR have the share-time ordering they need.
      const hasShare = state.shares.some((s) => s.clientId === clientId && s.candidateId === candidateId);
      if (!hasShare) {
        const cand = store.candidate(candidateId);
        const review = cand ? evaluateSend(store, clientId, cand) : null;
        state.shares.push({
          id: id("shr"),
          clientId,
          candidateId,
          sharedAt: now,
          actor,
          consultedInsightIds: [],
          check: summariseCheck(review),
        });
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
      log("card_resolved", { clientId, candidateId, action, actor });
      return rec;
    },

    recordClientAnswer({ clientId, dimension, answer, value, verbatim, actor }) {
      const now = nowIso();
      const rec = {
        id: id("cnf"),
        clientId,
        dimension,
        question: "Is this a dealbreaker or a preference?",
        answer,
        value: value || null,
        verbatim: verbatim || "",
        recordedAt: now,
        recordedBy: actor,
      };
      state.confirmations.push(rec);
      // A client answer promotes a dimension to a confirmed preference or
      // dealbreaker. Only this path writes a client preference, and only when
      // there is a value to write, the client's own words, and a client answer.
      if ((answer === "dealbreaker" || answer === "preference") && value && verbatim && verbatim.trim()) {
        const kind = answer === "dealbreaker" ? "confirmed_dealbreaker" : "stated_preference";
        const existing = state.preferences.find(
          (p) => p.clientId === clientId && p.dimension === dimension && p.status === "active"
        );
        const before = existing
          ? { kind: existing.kind, value: existing.value, note: existing.note || "" }
          : null;
        if (existing) {
          existing.kind = kind;
          existing.value = value;
          existing.confirmed = true;
          existing.status = "active";
          existing.confirmedAt = now;
          existing.recordedAt = now;
          existing.source = "client_answer";
          existing.recordedBy = actor || null;
        } else {
          state.preferences.push({
            id: id("pref"),
            clientId,
            dimension,
            value,
            kind,
            confirmed: true,
            status: "active",
            note: "",
            source: "client_answer",
            recordedAt: now,
            confirmedAt: now,
            recordedBy: actor || null,
          });
        }
        state.preferenceEvents.push({
          id: id("pev"),
          clientId,
          dimension,
          before,
          after: { kind, value, note: "" },
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

module.exports = { buildSeed, createStore, load, save, DAY, daysAgo, InputError, summariseCheck };
