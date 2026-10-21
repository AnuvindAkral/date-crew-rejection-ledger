"use strict";

// Regression guard for a reported UI defect: the send-review sheet is the
// tallest modal in the app, and with the backdrop fixed and no height cap the
// action buttons fell below the fold with no way to scroll to them.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(
  path.join(__dirname, "..", "src", "public", "app.css"),
  "utf8"
);

test("the modal is capped to the viewport and scrolls internally", () => {
  assert.match(css, /\.modal\s*\{[^}]*max-height:\s*calc\(100vh[^}]*\}/);
  assert.match(css, /\.modal\s*\{[^}]*overflow-y:\s*auto/);
});

test("the modal action bar is sticky so the buttons stay reachable", () => {
  assert.match(css, /\.modal-actions\s*\{[^}]*position:\s*sticky/);
});

test("the backdrop can scroll as a fallback on very short viewports", () => {
  assert.match(css, /\.modal-backdrop\s*\{[^}]*overflow-y:\s*auto/);
});
