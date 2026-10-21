"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { buildSeed, createStore, load, save } = require("./lib/store");
const { buildBootstrap } = require("./lib/bootstrap");

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

function applyAction(body) {
  const { type, payload } = body || {};
  const actor = (payload && payload.actor) || "aisha";
  switch (type) {
    case "share":
      store.share({
        clientId: payload.clientId,
        candidateId: payload.candidateId,
        consultedInsightIds: payload.consultedInsightIds,
        actor,
      });
      break;
    case "reject":
      store.reject({
        clientId: payload.clientId,
        candidateId: payload.candidateId,
        dimension: payload.dimension,
        severity: payload.severity,
        freeText: payload.freeText,
        latencyMs: payload.latencyMs,
        actor,
      });
      break;
    case "accept":
      store.accept({
        clientId: payload.clientId,
        candidateId: payload.candidateId,
        dimensions: payload.dimensions,
        surprise: payload.surprise,
        actor,
      });
      break;
    case "resolve":
      store.resolve({
        clientId: payload.clientId,
        candidateId: payload.candidateId,
        action: payload.action,
        rationale: payload.rationale,
        actor,
      });
      break;
    case "record_client_answer":
      store.recordClientAnswer({
        clientId: payload.clientId,
        dimension: payload.dimension,
        answer: payload.answer,
        verbatim: payload.verbatim,
        actor,
      });
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
      sendJson(res, 400, { error: "bad_request", message: err.message });
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
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
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
