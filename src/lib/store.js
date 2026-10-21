"use strict";

const fs = require("node:fs");

const DAY = 86400000;

function daysAgo(now, n) {
  return new Date(now - n * DAY).toISOString();
}

// Build the default synthetic dataset. Every name, city, profession and note is
// invented and clearly labelled synthetic. No real person or client data.
function buildSeed(now = Date.now()) {
  const candidates = [
    { id: "cand1", name: "Rohit K.", city: "Bangalore", profession: "Engineering Manager", source: "internal_network", dimensions: ["location_city_tier", "profession_seniority"] },
    { id: "cand2", name: "Vikram J.", city: "Jaipur", profession: "Product Lead", source: "matrimonial", dimensions: ["location_city_tier"] },
    { id: "cand3", name: "Aditya R.", city: "Chennai", profession: "Data Scientist", source: "linkedin", dimensions: ["location_city_tier", "education"] },
    { id: "cand4", name: "Arjun T.", city: "Bangalore", profession: "Founder", source: "referral", dimensions: ["location_city_tier"] },
    { id: "cand5", name: "Aarav M.", city: "Pune", profession: "Product Manager", source: "internal_network", dimensions: ["location_city_tier", "personality_temperament"] },
    { id: "cand6", name: "Karan D.", city: "Bangalore", profession: "Consultant", source: "referral", dimensions: ["location_city_tier"] },
    { id: "cand7", name: "Nikhil S.", city: "Mumbai", profession: "Trader", source: "matrimonial", dimensions: ["diet_lifestyle"] },
    { id: "cand8", name: "Dev P.", city: "Mumbai", profession: "Architect", source: "internal_network", dimensions: ["values_intent", "profession_seniority"] },
    { id: "cand9", name: "Siddharth B.", city: "Delhi", profession: "Sales Director", source: "linkedin", dimensions: [] },
    { id: "cand10", name: "Sam K.", city: "Delhi", profession: "Product Designer", source: "internal_network", dimensions: ["values_intent"] },
    { id: "cand11", name: "Manav G.", city: "Hyderabad", profession: "Finance Analyst", source: "matrimonial", dimensions: ["education"] },
    { id: "cand12", name: "Ishaan P.", city: "Bangalore", profession: "Lawyer", source: "internal_network", dimensions: ["marital_history"] },
  ];

  const clients = [
    { id: "c1", name: "Priya S.", city: "Bangalore", journey: "ongoing", arm: "intervention" },
    { id: "c2", name: "Rahul M.", city: "Mumbai", journey: "new", arm: "intervention" },
    { id: "c3", name: "Meera J.", city: "Delhi", journey: "ongoing", arm: "control" },
  ];

  const preferences = [
    { id: "p1", clientId: "c1", dimension: "location_city_tier", kind: "stated_preference", confirmed: false, status: "active", note: "Prefers to stay in the Bangalore metro", recordedAt: daysAgo(now, 70) },
    { id: "p2", clientId: "c2", dimension: "diet_lifestyle", kind: "confirmed_dealbreaker", confirmed: true, status: "active", note: "Non-vegetarian is a definite no", recordedAt: daysAgo(now, 30), confirmedAt: daysAgo(now, 30) },
    { id: "p3", clientId: "c2", dimension: "education", kind: "stated_preference", confirmed: false, status: "active", note: "Prefers a top-tier college", recordedAt: daysAgo(now, 30) },
  ];

  const rejections = [
    { id: "r1", clientId: "c1", candidateId: "cand1", dimension: "location_city_tier", severity: "preference", freeText: "Not based in Bangalore, says he won't relocate. She needs someone in the city.", recordedAt: daysAgo(now, 60), capturedBy: "aisha" },
    { id: "r2", clientId: "c1", candidateId: "cand2", dimension: "location_city_tier", severity: "likely_dealbreaker", freeText: "Lives in Jaipur, no plans to move. She said location is a hard no.", recordedAt: daysAgo(now, 40), capturedBy: "aisha" },
    { id: "r3", clientId: "c1", candidateId: "cand3", dimension: "location_city_tier", severity: "preference", freeText: "Based in Chennai, relocation unclear.", recordedAt: daysAgo(now, 20), capturedBy: "aisha" },
    { id: "r4", clientId: "c1", candidateId: "cand11", dimension: "education", severity: "preference", freeText: "Tier 2 college, she was expecting a top school.", recordedAt: daysAgo(now, 50), capturedBy: "aisha" },
    { id: "r5", clientId: "c1", candidateId: "cand12", dimension: null, severity: "uncertain", freeText: "Something about his family history bothered her, need to unpack it.", recordedAt: daysAgo(now, 30), capturedBy: "aisha" },
    { id: "r6", clientId: "c2", candidateId: "cand7", dimension: "diet_lifestyle", severity: "likely_dealbreaker", freeText: "He's non-vegetarian, that's a definite no for me.", recordedAt: daysAgo(now, 10), capturedBy: "aisha" },
  ];

  const acceptances = [
    { id: "a1", clientId: "c1", candidateId: "cand4", dimension: "location_city_tier", acceptedAt: daysAgo(now, 10) },
  ];

  // Historical shares that precede the rejections above. Each share must be
  // older than its rejection so the time ordering rules can be exercised.
  const shares = [
    { id: "s1", clientId: "c1", candidateId: "cand1", sharedAt: daysAgo(now, 62), actor: "aisha" },
    { id: "s2", clientId: "c1", candidateId: "cand2", sharedAt: daysAgo(now, 42), actor: "aisha" },
    { id: "s3", clientId: "c1", candidateId: "cand3", sharedAt: daysAgo(now, 22), actor: "aisha" },
    { id: "s4", clientId: "c1", candidateId: "cand4", sharedAt: daysAgo(now, 12), actor: "aisha" },
    { id: "s5", clientId: "c2", candidateId: "cand7", sharedAt: daysAgo(now, 12), actor: "aisha" },
    { id: "s6", clientId: "c1", candidateId: "cand11", sharedAt: daysAgo(now, 52), actor: "aisha" },
    { id: "s7", clientId: "c1", candidateId: "cand12", sharedAt: daysAgo(now, 32), actor: "aisha" },
  ];

  const queues = {
    c1: ["cand5", "cand6"],
    c2: ["cand7", "cand8", "cand9"],
    c3: ["cand10"],
  };

  return {
    meta: { synthetic: true, seedAt: new Date(now).toISOString(), matchmaker: "Aisha V." },
    clients,
    candidates,
    preferences,
    rejections,
    acceptances,
    confirmations: [],
    resolutions: [],
    shares,
    audit: [],
    queues,
  };
}

function createStore(initial) {
  const state = JSON.parse(JSON.stringify(initial));

  let seq = 1;
  function id(prefix) {
    seq += 1;
    return prefix + seq;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function log(type, payload) {
    state.audit.push({ id: id("aud"), type, ...payload, timestamp: nowIso() });
  }

  const store = {
    state,

    client(clientId) {
      return state.clients.find((c) => c.id === clientId) || null;
    },
    candidate(candidateId) {
      return state.candidates.find((c) => c.id === candidateId) || null;
    },
    preferences(clientId) {
      return state.preferences.filter((p) => p.clientId === clientId);
    },
    rejections(clientId) {
      return state.rejections.filter((r) => r.clientId === clientId);
    },
    acceptances(clientId) {
      return state.acceptances.filter((a) => a.clientId === clientId);
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

    share({ clientId, candidateId, actor }) {
      const rec = { id: id("shr"), clientId, candidateId, sharedAt: nowIso(), actor };
      state.shares.push(rec);
      store.removeFromQueue(clientId, candidateId);
      log("share", { clientId, candidateId, actor });
      return rec;
    },

    reject({ clientId, candidateId, dimension, severity, freeText, actor, latencyMs }) {
      const now = nowIso();
      // A rejection implies a share preceded it. If none is recorded, create one so
      // Metric A and ARCR have the share-time ordering they need.
      const hasShare = state.shares.some((s) => s.clientId === clientId && s.candidateId === candidateId);
      if (!hasShare) {
        state.shares.push({ id: id("shr"), clientId, candidateId, sharedAt: now, actor });
      }
      const rec = {
        id: id("rej"),
        clientId,
        candidateId,
        dimension: dimension || null,
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

    accept({ clientId, candidateId, actor }) {
      const rec = { id: id("acc"), clientId, candidateId, acceptedAt: nowIso() };
      state.acceptances.push(rec);
      store.removeFromQueue(clientId, candidateId);
      log("profile_accepted", { clientId, candidateId, actor });
      return rec;
    },

    resolve({ clientId, candidateId, action, rationale, actor }) {
      const rec = {
        id: id("res"),
        clientId,
        candidateId,
        action,
        rationale: rationale || "",
        resolvedAt: nowIso(),
        actor,
      };
      state.resolutions.push(rec);
      log("card_resolved", { clientId, candidateId, action, actor });
      return rec;
    },

    recordClientAnswer({ clientId, dimension, answer, verbatim, actor }) {
      const now = nowIso();
      const rec = {
        id: id("cnf"),
        clientId,
        dimension,
        question: "Is this a dealbreaker or a preference?",
        answer,
        verbatim: verbatim || "",
        recordedAt: now,
        recordedBy: actor,
      };
      state.confirmations.push(rec);
      // A client answer promotes a dimension to a confirmed preference or dealbreaker.
      // Only this path writes to a client preference, and only with a client's
      // actual recorded words. An empty verbatim writes no rule.
      if ((answer === "dealbreaker" || answer === "preference") && verbatim && verbatim.trim()) {
        const kind = answer === "dealbreaker" ? "confirmed_dealbreaker" : "stated_preference";
        const existing = state.preferences.find(
          (p) => p.clientId === clientId && p.dimension === dimension && p.status === "active"
        );
        if (existing) {
          existing.kind = kind;
          existing.confirmed = true;
          existing.status = "active";
          existing.confirmedAt = now;
          existing.recordedAt = now;
        } else {
          state.preferences.push({
            id: id("pref"),
            clientId,
            dimension,
            kind,
            confirmed: true,
            status: "active",
            note: "",
            recordedAt: now,
            confirmedAt: now,
          });
        }
      }
      log("preference_confirmed", { clientId, dimension, answer, actor });
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

module.exports = { buildSeed, createStore, load, save, DAY, daysAgo };
