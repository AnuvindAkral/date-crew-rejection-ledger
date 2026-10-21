"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { buildSeed, createStore, load, save, InputError } = require("./lib/store");
const { buildBootstrap } = require("./lib/bootstrap");
const { evaluateSend } = require("./lib/rules");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4321;
const STORE_PATH = path.join(__dirname, "..", "_store", "state.json");
const PUBLIC_DIR = path.join(__dirname, "public");

let store = load(STORE_PATH);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

// The person acting. It comes from a matchmaker record, not a name typed into
// a box, so the audit trail points at a real record.
function resolveActor(payload) {
  const requested = payload && payload.matchmakerId;
  if (!requested) {
    const fallback = store.matchmaker(store.state.meta.matchmakerId) || store.matchmakers()[0];
    return fallback ? fallback.name : null;
  }
  const mm = store.matchmaker(requested);
  if (!mm) throw new InputError("Unknown matchmaker. Pick one from the list.", "matchmakerId");
  return mm.name;
}

function applyAction(body) {
  const { type, payload } = body || {};
  const p = payload || {};
  const actor = resolveActor(p);
  switch (type) {
    case "share":
      store.share({
        clientId: p.clientId,
        candidateId: p.candidateId,
        consultedInsightIds: p.consultedInsightIds,
        actor,
      });
      break;
    case "reject":
      store.reject({
        clientId: p.clientId,
        candidateId: p.candidateId,
        dimension: p.dimension,
        severity: p.severity,
        freeText: p.freeText,
        latencyMs: p.latencyMs,
        actor,
      });
      break;
    case "accept":
      store.accept({
        clientId: p.clientId,
        candidateId: p.candidateId,
        dimensions: p.dimensions,
        surprise: p.surprise,
        actor,
      });
      break;
    case "resolve":
      store.resolve({
        clientId: p.clientId,
        candidateId: p.candidateId,
        action: p.action,
        rationale: p.rationale,
        actor,
      });
      break;
    case "record_client_answer":
      store.recordClientAnswer({
        clientId: p.clientId,
        dimension: p.dimension,
        answer: p.answer,
        value: p.value,
        verbatim: p.verbatim,
        actor,
      });
      break;
    case "create_matchmaker":
      store.createMatchmaker({ name: p.name });
      break;
    case "create_client":
      store.createClient({
        name: p.name,
        city: p.city,
        journey: p.journey,
        matchmakerId: p.matchmakerId,
      });
      break;
    case "create_candidate":
      store.createCandidate({
        name: p.name,
        city: p.city,
        profession: p.profession,
        source: p.source,
        attributes: p.attributes,
      });
      break;
    case "set_preference":
      store.setPreference({
        clientId: p.clientId,
        dimension: p.dimension,
        value: p.value,
        kind: p.kind,
        note: p.note,
        actor,
        source: p.source || "onboarding",
      });
      break;
    case "remove_preference":
      store.removePreference({
        clientId: p.clientId,
        preferenceId: p.preferenceId,
        actor,
      });
      break;
    case "add_to_queue":
      store.addToQueue({ clientId: p.clientId, candidateId: p.candidateId });
      break;
    case "reset":
      store = createStore(buildSeed());
      break;
    default:
      return { error: "unknown_action", type };
  }
  save(store, STORE_PATH);
  return { ok: true };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/bootstrap" && req.method === "GET") {
    sendJson(res, 200, buildBootstrap(store));
    return;
  }

  // An ad-hoc check of one candidate against one client, without sending
  // anything. Used by the Candidates view so a reviewer can pick a client and a
  // profile and see the same result the send card would show.
  if (url.pathname === "/api/check" && req.method === "GET") {
    const clientId = url.searchParams.get("clientId");
    const candidateId = url.searchParams.get("candidateId");
    const cl = store.client(clientId);
    const cand = store.candidate(candidateId);
    if (!cl || !cand) {
      sendJson(res, 404, { error: "not_found", message: "Unknown client or candidate." });
      return;
    }
    const review = evaluateSend(store, clientId, cand);
    sendJson(res, 200, Object.assign({}, review, { surface: cl.arm === "intervention" }));
    return;
  }

  if (url.pathname === "/api/suggest" && req.method === "POST") {
    const body = await readBody(req);
    const { suggestDimension } = require("./lib/suggest");
    sendJson(res, 200, { dimension: suggestDimension(body.freeText) });
    return;
  }

  if (url.pathname === "/api/action" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const result = applyAction(body);
      if (result.error) {
        sendJson(res, 400, result);
        return;
      }
      sendJson(res, 200, buildBootstrap(store));
    } catch (err) {
      if (err instanceof InputError) {
        // A validation problem the matchmaker can fix. The message is written
        // for them, and names the field it belongs to.
        sendJson(res, 400, { error: "invalid_input", message: err.message, field: err.field });
        return;
      }
      console.error("action failed:", err);
      sendJson(res, 500, { error: "server_error", message: "Something went wrong saving that." });
    }
    return;
  }

  // Static files.
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = path.join(PUBLIC_DIR, path.normalize(filePath));
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      // A local prototype should always serve the file on disk, never a stale copy.
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(data);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Rejection Ledger prototype running at http://localhost:${PORT}`);
    console.log("Synthetic data only. This is a demo, not a production system.");
  });
}

module.exports = { server, applyAction, store };
