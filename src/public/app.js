"use strict";

let state = null; // bootstrap
let view = "clients";
let currentClientId = null;
let modal = null; // {type, clientId, candidateId, ...}
let suggestTimer = null;
let actingMatchmakerId = null; // the matchmaker record the workspace is acting as
let toastMessage = null;
let toastTimer = null;

const $app = document.getElementById("app");
const $modal = document.getElementById("modal-root");
const $toast = document.getElementById("toast");

const SEV_LABEL = {
  likely_dealbreaker: "Likely dealbreaker",
  preference: "Preference",
  uncertain: "Uncertain",
};

const REVIEW_LABEL = {
  conflict: "Conflict",
  contradiction: "Contradiction",
  repeat: "Prior rejection",
  preference_mismatch: "Preference mismatch",
  incomplete: "Information missing",
  clean: "No conflict",
  untagged: "Untagged candidate",
  no_history: "No feedback yet",
  uncoded_only: "History uncoded",
};

const SOURCE_OPTIONS = [
  ["internal_network", "Internal network"],
  ["matrimonial", "Matrimonial platform"],
  ["linkedin", "LinkedIn"],
  ["referral", "Referral"],
];

const KIND_LABEL = {
  confirmed_dealbreaker: "confirmed dealbreaker",
  confirmed_preference: "confirmed preference",
  stated_preference: "stated preference",
};

// A criterion read in words: the direction, the values, and how firm it is.
function criterionText(c) {
  if (!c) return "";
  const vals = (c.values || []).join(" or ");
  const dir = c.operator === "must_not_be" ? "must not be" : "must be";
  return `${dir} ${vals} (${KIND_LABEL[c.kind] || "criterion"})`;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dimLabel(key) {
  const d = (state.dimensions || []).find((x) => x.key === key);
  return d ? d.label : key;
}

function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.round(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return days + " days ago";
  const months = Math.round(days / 30);
  return months + " month" + (months === 1 ? "" : "s") + " ago";
}

function client(id) {
  return state.clients.find((c) => c.id === id);
}

function candidate(id) {
  return state.candidates.find((c) => c.id === id);
}

// The value a candidate carries on a dimension, or null when it is not known.
function valueOf(cand, dimension) {
  if (!cand || !cand.attributes) return null;
  const v = cand.attributes[dimension];
  return v === undefined || v === null ? null : v;
}

function dimensionValues(key) {
  const d = (state.dimensions || []).find((x) => x.key === key);
  return d ? d.values : [];
}

async function fetchBootstrap() {
  const res = await fetch("/api/bootstrap");
  state = await res.json();
  if (!actingMatchmakerId || !state.matchmakers.some((m) => m.id === actingMatchmakerId)) {
    actingMatchmakerId = state.meta.matchmakerId || (state.matchmakers[0] && state.matchmakers[0].id);
  }
}

// Every write goes through here. The acting matchmaker travels with the
// request, and a rejected write leaves the page untouched and returns a
// message the matchmaker can act on.
async function action(type, payload) {
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      payload: Object.assign({}, payload, { matchmakerId: actingMatchmakerId }),
    }),
  });
  let data;
  try {
    data = await res.json();
  } catch (err) {
    return { ok: false, error: "server_error", message: "The server did not answer." };
  }
  if (!res.ok || data.error) {
    return { ok: false, error: data.error, message: data.message, field: data.field };
  }
  state = data;
  return { ok: true, data };
}

// A confirmation appears only after the write has actually persisted.
function showToast(message) {
  toastMessage = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage = null;
    renderToast();
  }, 4000);
  renderToast();
}

function renderToast() {
  if (!$toast) return;
  $toast.innerHTML = toastMessage
    ? `<div class="toast" role="status">${esc(toastMessage)}</div>`
    : "";
}

// ---- rendering ----

function render() {
  renderToast();
  syncMatchmakerSelect();
  if (view === "measurement") return renderMeasurement();
  if (view === "candidates") return renderCandidates();
  if (view === "client" && currentClientId) return renderClient(currentClientId);
  renderClients();
}

// The workspace acts as one of the matchmaker records. Switching it changes
// who new records are attributed to.
function syncMatchmakerSelect() {
  const sel = document.getElementById("matchmaker-select");
  if (!sel || !state) return;
  const options = (state.matchmakers || [])
    .map((m) => `<option value="${esc(m.id)}"${m.id === actingMatchmakerId ? " selected" : ""}>${esc(m.name)}</option>`)
    .join("");
  sel.innerHTML = options;
}

function clientStatusChip(c) {
  const led = c.ledger;
  if (led.rows.some((r) => r.contradiction)) {
    return `<span class="chip contradiction">contradiction to resolve</span>`;
  }
  if (c.preferences.some((p) => p.kind === "confirmed_dealbreaker" && p.status === "active")) {
    return `<span class="chip conflict">confirmed dealbreaker</span>`;
  }
  if (led.total === 0) {
    const criteria = (c.preferences || []).filter((p) => p.status === "active").length;
    if (criteria > 0) {
      return `<span class="chip quiet">${criteria} criterion${criteria === 1 ? "" : "s"} on file, no rejections yet</span>`;
    }
    return `<span class="chip quiet">no feedback yet</span>`;
  }
  return `<span class="chip clean">${led.codedCount} coded rejection${led.codedCount === 1 ? "" : "s"}</span>`;
}

function renderClients() {
  $app.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Clients</h1>
        <p class="lead">Your active clients. Open one to review feedback and send profiles. Synthetic data.</p>
      </div>
      <button class="btn" data-add-client>Add a client</button>
    </div>
    <div class="client-list">
      ${state.clients
        .map(
          (c) => `
        <button class="client-card" data-open="${c.id}">
          <div style="flex:1; text-align:left">
            <div class="client-name">${esc(c.name)}</div>
            <div class="client-sub">${esc(c.city)} · ${esc(c.journey)} · ${c.matchmakerName ? esc(c.matchmakerName) : "unassigned"} · ${c.arm === "intervention" ? "ledger on" : "control"}</div>
          </div>
          ${clientStatusChip(c)}
        </button>`
        )
        .join("")}
    </div>`;
}

function renderClient(clientId) {
  const c = client(clientId);
  if (!c) return renderClients();

  const prefs = c.preferences || [];
  const rows = c.ledger.rows || [];
  const activePrefs = prefs.filter((p) => p.status === "active");
  const withdrawn = prefs.filter((p) => p.status !== "active");

  const prefsHtml = activePrefs.length
    ? activePrefs
        .map(
          (p) => `<div class="pref-row">
            <div class="pref-row-head">
              <span class="pref-tag ${p.kind === "confirmed_dealbreaker" ? "dealbreaker" : ""}">${esc(dimLabel(p.dimension))} · ${esc(p.operator === "must_not_be" ? "must not be" : "must be")} ${esc((p.values || []).join(" or "))}</span>
              <button class="link-btn" data-rm-pref="${esc(p.id)}" data-dim="${esc(dimLabel(p.dimension))}">Remove</button>
            </div>
            ${p.note ? `<div class="pref-note">“${esc(p.note)}”</div>` : `<div class="pref-note muted small">No note recorded. Add the client's own words.</div>`}
            <div class="pref-meta">${esc(KIND_LABEL[p.kind] || "criterion")} · ${p.source === "client_answer" ? "confirmed by the client" : "recorded at intake"}${p.recordedBy ? " by " + esc(p.recordedBy) : ""}${p.recordedAt ? " · " + relTime(p.recordedAt) : ""}</div>
          </div>`
        )
        .join("")
    : `<p class="muted small">Nothing recorded for this client yet. Without a criterion, the check has nothing to compare against and says so rather than reporting no conflict.</p>`;

  const withdrawnHtml = withdrawn.length
    ? `<div class="pref-meta withdrawn-note">Withdrawn: ${withdrawn
        .map((p) => `${esc(dimLabel(p.dimension))} ${esc(criterionText(p))}`)
        .join("; ")}</div>`
    : "";

  const changes = (c.preferenceEvents || []).slice().reverse();
  const changesHtml = changes.length
    ? changes
        .map(
          (e) => `<div class="change-row">
            <span class="ledger-dim">${esc(dimLabel(e.dimension))}</span>
            <span class="muted small">${
              e.after === null
                ? "withdrawn"
                : `${e.before && criterionText(e.before) !== criterionText(e.after) ? `changed from ${esc(criterionText(e.before))} to ` : ""}${esc(criterionText(e.after))}`
            } · ${relTime(e.at)}${e.by ? " · " + esc(e.by) : ""}</span>
          </div>`
        )
        .join("")
    : `<p class="muted small">No changes to the client's criteria yet.</p>`;

  const ledgerHtml = rows.length
    ? rows
        .map((r) => {
          const marker = r.contradiction
            ? `<div class="contradiction-line"><strong>Contradiction:</strong> rejected ${r.rejectedCount} on ${esc(r.label)}, then accepted ${r.acceptedCount}. Earliest rejection: <span class="q">“${esc(r.earliestRejection.freeText)}”</span></div>`
            : "";
          const rule = r.confirmedRule
            ? `<div class="rule-line">Client-confirmed: ${esc(r.confirmedRule)}</div>`
            : "";
          return `
            <div class="ledger-row">
              <div class="ledger-head">
                <span class="ledger-dim">${esc(r.label)}</span>
                <span class="ledger-counts">rejected ${r.rejectedCount} · accepted ${r.acceptedCount} · ${SEV_LABEL[r.latestSeverity]} · ${relTime(r.latestDate)}</span>
              </div>
              ${marker}${rule}
            </div>`;
        })
        .join("")
    : `<p class="muted small">No rejections logged yet. Capture a rejection to start the ledger.</p>`;

  const insightsHtml = (c.insights || []).length
    ? c.insights
        .map(
          (i) => `
        <div class="insight-row">
          <div class="insight-head">
            <span class="ledger-dim">accepted ${esc(i.candidateName)}</span>
            <span class="ledger-counts">${relTime(i.recordedAt)}</span>
          </div>
          <div class="taglist">${i.dimensions.length ? i.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}</span>`).join("") : `<span class="tag muted">no dimensions recorded</span>`}</div>
          ${i.surprise ? `<div class="q">“${esc(i.surprise)}”</div>` : `<div class="muted small">no note recorded</div>`}
        </div>`
        )
        .join("")
    : `<p class="muted small">No acceptance insights yet. Accept a profile to record what mattered or surprised you.</p>`;

  const queueHtml = c.queue.length
    ? c.queue
        .map((cand) => {
          const rv = cand.review;
          return `
          <div class="candidate">
            <div class="candidate-head">
              <div>
                <div class="candidate-name">${esc(cand.name)}</div>
                <div class="candidate-sub">${esc(cand.city)} · ${esc(cand.profession)} · ${esc(cand.source)}</div>
              </div>
              <span class="chip ${rv.state === "clean" ? "clean" : rv.state === "untagged" || rv.state === "no_history" || rv.state === "incomplete" ? "quiet" : rv.state === "conflict" ? "conflict" : "contradiction"}">${REVIEW_LABEL[rv.state]}</span>
            </div>
            <div class="taglist">
              ${cand.dimensions.length ? cand.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}${valueOf(cand, d) ? ": " + esc(valueOf(cand, d)) : ""}</span>`).join("") : `<span class="tag muted">nothing recorded</span>`}
            </div>
            <div class="candidate-actions">
              <button class="btn" data-send="${cand.id}">${rv.state === "clean" ? "Send" : "Review and send"}</button>
              <button class="btn secondary" data-accept="${cand.id}">Accept</button>
              <button class="btn ghost" data-reject="${cand.id}">Reject</button>
            </div>
          </div>`;
        })
        .join("")
    : `<p class="muted small">Nobody is on this client's shortlist yet. Add a candidate and the check runs against that client's criteria before anything is sent.</p>`;

  $app.innerHTML = `
    <button class="back-link" data-back>← Back to clients</button>
    <div class="client-header">
      <div>
        <h1>${esc(c.name)}</h1>
        <span class="muted small">${esc(c.city)} · ${esc(c.journey)} · ${c.matchmakerName ? esc(c.matchmakerName) : "unassigned"}</span>
      </div>
      <div class="arm-control">
        <span class="muted small">Pilot arm: ${c.arm === "control" ? "control, the check is computed but not shown" : "intervention, the check is shown"}</span>
        <button class="link-btn" data-set-arm="${c.arm === "control" ? "intervention" : "control"}" data-client="${esc(c.id)}">Move to the ${c.arm === "control" ? "intervention" : "control"} arm</button>
      </div>
    </div>

    <h2>Preferences</h2>
    <div class="panel">
      <div class="preflist">${prefsHtml}</div>
      ${withdrawnHtml}
      <button class="btn secondary" data-add-pref="${esc(c.id)}">Record what the client said</button>
      <div class="subhead">Changes</div>
      ${changesHtml}
    </div>

    <h2>Rejection ledger</h2>
    <div class="panel">
      <div class="completeness">${c.ledger.codedCount} of ${c.ledger.total} rejections coded${c.ledger.uncoded ? ` · ${c.ledger.uncoded} uncoded` : ""}</div>
      ${ledgerHtml}
    </div>

    <h2>Acceptance insights</h2>
    <div class="panel">
      ${insightsHtml}
    </div>

    <h2>Shortlist</h2>
    <div class="panel">
      ${queueHtml}
      <button class="btn secondary" data-add-cand="${esc(c.id)}">Add a candidate to the shortlist</button>
    </div>`;
}

function pct(v) {
  return v == null ? "n/a" : `${Math.round(v * 10) / 10}%`;
}

function renderMeasurement() {
  const s = state.session;
  const o = s.outcome;
  const w = o.window;

  const ref = `
    <h2>Reference scenario</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Stage</th><th>Count</th><th>Step rate</th></tr>
        <tr><td>Profiles shared</td><td>1,000</td><td>-</td></tr>
        <tr><td>Profiles accepted</td><td>310</td><td>31.0%</td></tr>
        <tr><td>Contact details shared</td><td>210</td><td>67.7%</td></tr>
        <tr><td>Conversations started</td><td>150</td><td>71.4%</td></tr>
        <tr><td>Meetings fixed</td><td>75</td><td>50.0%</td></tr>
        <tr><td>Meetings completed</td><td>42</td><td>56.0%</td></tr>
      </table>
      <p class="note">Supplied scenario figures from the assessment brief. About 35% of rejected profiles were reportedly for reasons already stated in client preferences, denominator ambiguous. This is reference context, not this session's data.</p>
    </div>`;

  const periodRow = (label, b) => `
    <tr>
      <td>${label}</td>
      <td>${b.shares}</td>
      <td>${b.audited}</td>
      <td>${b.conflictShares}</td>
      <td>${b.hardConflictShares}</td>
      <td>${b.softMismatchShares}</td>
      <td>${b.unknownShares}</td>
      <td>${b.cleanShares}</td>
      <td>${pct(b.rate)}</td>
    </tr>`;

  const clientRows = state.clients
    .map((c) => {
      const a = c.metricA;
      const b = c.arcr;
      return `
        <tr>
          <td>${esc(c.name)}</td>
          <td>${a.coded} coded · ${a.uncoded} uncoded</td>
          <td>${a.conflicts} / ${a.coded}${a.coded ? ` = ${Math.round(a.rate * 100)}%` : ""}</td>
          <td>${b.eligible} eligible · ${b.numerator} repeat</td>
          <td>${b.hard} hard · ${b.settled} settled · ${b.contradiction} contradiction · ${b.plain} plain</td>
          <td>${b.rate == null ? "n/a" : Math.round(b.rate * 100) + "%"}</td>
        </tr>`;
    })
    .join("");

  const mmRows = o.byMatchmaker
    .map(
      (m) => `<tr>
        <td>${esc(m.name)}</td>
        <td>${m.shares}</td>
        <td>${m.audited}</td>
        <td>${m.conflictShares}</td>
        <td>${m.unknownShares}</td>
        <td>${pct(m.rate)}</td>
      </tr>`
    )
    .join("");

  const clRows = o.byClient
    .map(
      (c) => `<tr>
        <td>${esc(c.name)}</td>
        <td>${c.shares}</td>
        <td>${c.audited}</td>
        <td>${c.conflictShares}</td>
        <td>${c.hardConflictShares}</td>
        <td>${c.unknownShares}</td>
        <td>${pct(c.rate)}</td>
      </tr>`
    )
    .join("");

  const audits = (state.audits || [])
    .slice()
    .reverse()
    .map((a) => {
      const cl = state.clients.find((x) => x.id === a.clientId);
      const cand = state.candidates.find((x) => x.id === a.candidateId);
      const detail = (a.details || [])
        .map((d) => `${esc(d.requirement || d.dimension)}${d.value ? " vs " + esc(d.value) : " (value not recorded)"}`)
        .join("; ");
      const review =
        a.humanConfirmed === true
          ? `<span class="chip clean">confirmed</span>`
          : a.humanConfirmed === false
            ? `<span class="chip conflict">disputed</span>`
            : `<button class="link-btn" data-audit-confirm="${esc(a.id)}">Confirm</button> <button class="link-btn" data-audit-dispute="${esc(a.id)}">Dispute</button>`;
      return `<tr>
        <td>${esc(cl ? cl.name : a.clientId)}</td>
        <td>${esc(cand ? cand.name : a.candidateId)}</td>
        <td>${esc(a.classification.replace("_", " "))}</td>
        <td class="small">${esc(detail)}</td>
        <td>${review}</td>
      </tr>`;
    })
    .join("");

  $app.innerHTML = `
    <h1>Measurement</h1>
    <p class="lead">The operator view. The primary outcome is measured over every profile shared, and it is decided by an audit that does not depend on whether the matchmaker used the check. That is what stops the number improving because people stopped using the tool.</p>

    <h2>Primary outcome · criterion conflicts among all profiles shared</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Period</th><th>Shared</th><th>Audited</th><th>Conflicted</th><th>Hard</th><th>Soft</th><th>Unknown</th><th>Clean</th><th>Rate</th></tr>
        ${periodRow("Baseline, before the window", w.baseline)}
        ${periodRow("Baseline, control arm", w.baselineControl)}
        ${periodRow("Measurement window, intervention", w.measurement)}
        ${periodRow("Measurement window, control", w.measurementControl)}
      </table>
      <p class="note"><strong>Definition.</strong> The proportion of all profiles shared in the period that contain a conflict with a criterion the client had on file at the moment of sending. Numerator: profiles whose audit found a violated criterion. Denominator: every profile shared in the period, whether or not the check was opened. Classification: a <strong>hard</strong> conflict breaks a confirmed dealbreaker, a <strong>soft</strong> mismatch breaks a confirmed or stated preference, and <strong>unknown</strong> means a criterion could not be checked because the candidate's value is not recorded, which is never counted as clean.</p>
      <p class="note"><strong>Window.</strong> The measurement window opened on ${esc(new Date(w.pilotStart).toISOString().slice(0, 10))}. Everything before it is baseline, audited by the same process, so the two are comparable.</p>
      <p class="note"><strong>Audit.</strong> Every share is re-evaluated after the fact against the criteria that were in force at the time, by the same rules, whether or not the check was shown and whichever arm the client is on. A reviewer can confirm or dispute each audit, and the human-confirmed figure is reported separately. An automated audit can inherit the rule engine's mistakes, which is why the human step exists and why a real pilot would blind-re-code a sample.</p>
      <p class="note"><strong>What this is not.</strong> These are synthetic numbers from a local prototype. They are a proposed pilot measurement, not a demonstrated effect on The Date Crew's business. No pilot has been run.</p>
    </div>

    <h2>Adoption guardrail</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Arm</th><th>Eligible profiles shared</th><th>Checked before sending</th><th>Rate</th></tr>
        <tr><td>Intervention</td><td>${o.adoption.intervention.eligible}</td><td>${o.adoption.intervention.checked}</td><td>${pct(o.adoption.intervention.rate)}</td></tr>
        <tr><td>Control</td><td>${o.adoption.control.eligible}</td><td>${o.adoption.control.checked}</td><td>${pct(o.adoption.control.rate)}</td></tr>
      </table>
      <p class="note">The proportion of eligible profiles shared that had the check open before they went out. The control arm is zero by design, because the check is computed for it but never shown. A primary rate that falls while this falls is not a result, and the two are shown together so that is visible.</p>
    </div>

    <h2>Diagnostics</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Measure</th><th>Value</th><th>What it means</th></tr>
        <tr><td>Confirmed dealbreaker conflicts reaching the client</td><td>${w.measurement.hardConflictShares}</td><td>Audit found the profile broke a confirmed no</td></tr>
        <tr><td>Softer preference mismatches reaching the client</td><td>${w.measurement.softMismatchShares}</td><td>Broke a preference, confirmed or not, and broke no firm no. The two rows are disjoint and add up to the rate</td></tr>
        <tr><td>Unknown coverage</td><td>${w.measurement.unknownShares} of ${w.measurement.audited} audited</td><td>Could not be checked because a value is not recorded</td></tr>
        <tr><td>Overrides</td><td>${o.overrides.count} (${o.overrides.dealbreaker} firm, ${o.overrides.preference} preference, ${o.overrides.advisory} advisory)</td><td>A warning was on the card and the profile went anyway</td></tr>
        <tr><td>Overrides with a stated reason</td><td>${o.overrides.withReason} of ${o.overrides.count}</td><td>Without a reason, an override cannot be reviewed</td></tr>
      </table>
      ${
        o.overrides.detail.length
          ? `<table class="metrics">
              <tr><th>Client</th><th>Candidate</th><th>Level</th><th>Reason given</th></tr>
              ${o.overrides.detail
                .map(
                  (x) => `<tr>
                    <td>${esc((state.clients.find((c) => c.id === x.clientId) || {}).name || x.clientId)}</td>
                    <td>${esc((state.candidates.find((c) => c.id === x.candidateId) || {}).name || x.candidateId)}</td>
                    <td>${esc(x.level)}</td>
                    <td>${x.reason ? esc(x.reason) : `<span class="muted">none given</span>`}</td>
                  </tr>`
                )
                .join("")}
            </table>`
          : ""
      }
      <p class="note">Overrides are reported because a matchmaker who overrides every warning has a tool that is not working, and a tool that is not working should not be defended as a success. The reason is what makes them reviewable.</p>
    </div>

    <h2>By matchmaker</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Matchmaker</th><th>Shared</th><th>Audited</th><th>Conflicted</th><th>Unknown</th><th>Rate</th></tr>
        ${mmRows || `<tr><td colspan="6" class="muted">No shares yet.</td></tr>`}
      </table>
      <p class="note">Read these as a per-matchmaker description, not as a comparison. Case mix and sourcing differ between matchmakers, and without controlling for them the 44% and 21% acceptance rates in the brief cannot be read as a difference in skill. Small numbers are not evidence either way.</p>
    </div>

    <h2>By client</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Client</th><th>Shared</th><th>Audited</th><th>Conflicted</th><th>Hard</th><th>Unknown</th><th>Rate</th></tr>
        ${clRows || `<tr><td colspan="7" class="muted">No shares yet.</td></tr>`}
      </table>
    </div>

    <h2>Audit</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Client</th><th>Candidate</th><th>Audit says</th><th>Criterion against candidate value</th><th>Review</th></tr>
        ${audits || `<tr><td colspan="5" class="muted">No shares audited yet.</td></tr>`}
      </table>
      <p class="note">One row per profile shared, including the ones with nothing against them, so the denominator is visible and not just the interesting cases.</p>
    </div>

    <h2>Session counts</h2>
    <div class="metric-grid">
      <div class="metric-card"><div class="metric-value">${s.shares}</div><div class="metric-label">Shares</div></div>
      <div class="metric-card"><div class="metric-value">${s.cardViews}</div><div class="metric-label">Cards opened</div></div>
      <div class="metric-card"><div class="metric-value">${s.audits}</div><div class="metric-label">Audits</div></div>
      <div class="metric-card"><div class="metric-value">${s.codedRejections}</div><div class="metric-label">Coded rejections</div></div>
      <div class="metric-card"><div class="metric-value">${s.uncodedRejections}</div><div class="metric-label">Uncoded rejections</div></div>
      <div class="metric-card"><div class="metric-value">${s.acceptances}</div><div class="metric-label">Acceptances</div></div>
      <div class="metric-card"><div class="metric-value">${s.insights}</div><div class="metric-label">Acceptance insights</div></div>
      <div class="metric-card"><div class="metric-value">${s.confirmations}</div><div class="metric-label">Client confirmations</div></div>
    </div>

    <h2>Diagnostic · historical conflict rate</h2>
    <div class="panel"><div class="muted small">Coded rejections whose reason was already in the client's recorded preferences at rejection time. This is the post-hoc version of the brief's 35% figure, and its denominator is the rejections, not the shares. It is a diagnostic, not the primary outcome.</div></div>

    <h2>Diagnostic · repeat-conflict rate (recurrence)</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Client</th><th>Historical (coded)</th><th>Conflicts</th><th>ARCR eligible / repeat</th><th>ARCR sub-rates</th><th>ARCR</th></tr>
        ${clientRows}
      </table>
      <p class="note">ARCR measures recurrence, not avoidability. Sub-rates split the numerator by the evidence available at share time: hard (a confirmed dealbreaker existed), settled (a confirmed preference, so the card is silent), contradiction (a prior rejection then a later acceptance), plain (a prior rejection only). Synthetic, illustrative data.</p>
    </div>

    <h2>Learning loop · acceptance insight consultation</h2>
    <div class="panel">
      <div class="metric-value">${s.insightConsultation.consulted} / ${s.insightConsultation.eligible}${s.insightConsultation.rate == null ? " · no opportunity yet" : ` = ${Math.round(s.insightConsultation.rate * 100)}%`}</div>
      <p class="note">Of the acceptance insights that had a subsequent recommendation to inform, how many were explicitly consulted.${s.insightConsultation.noOpportunity ? ` ${s.insightConsultation.noOpportunity} insight${s.insightConsultation.noOpportunity === 1 ? "" : "s"} with no subsequent recommendation yet ${s.insightConsultation.noOpportunity === 1 ? "is" : "are"} not counted as unconsulted.` : ""} This measures whether the learning loop is used, not whether it improves matching.</p>
    </div>

    ${ref}`;
}

// ---- modals ----

let lastFocused = null;

function openModal(html) {
  lastFocused = document.activeElement;
  $modal.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  const root = $modal.querySelector(".modal");
  root.focus();
  // Escape closes a card that has not been resolved yet, so nothing is lost.
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeModal();
    }
  });
}

function closeModal() {
  modal = null;
  $modal.innerHTML = "";
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  lastFocused = null;
}

function positiveStrip(rv) {
  const pos = rv.positive || [];
  if (!pos.length) {
    return `<div class="evidence-strip"><span class="strip-label">Supports sending</span><span class="muted">no positive signal recorded</span></div>`;
  }
  const items = pos
    .map((p) => {
      if (p.source === "criterion") {
        return `<span class="pos-item"><span class="pos-source">${p.confirmed ? "meets a confirmed preference" : "meets a stated preference"}</span> ${esc(dimLabel(p.dimension))}${p.detail ? `: ${esc(p.detail)}` : ""}</span>`;
      }
      return `<span class="pos-item"><span class="pos-source">accepted before</span> ${esc(dimLabel(p.dimension))}${p.detail ? ` · ${esc(p.detail)}` : ""}</span>`;
    })
    .join("");
  return `<div class="evidence-strip"><span class="strip-label">Supports sending</span>${items}</div>`;
}

// The reason a finding appeared, written by the decision layer so the screen
// never has to reconstruct it.
function findingLine(f) {
  if (f.sentence) return esc(f.sentence);
  const label = dimLabel(f.dimension);
  if (f.type === "incomplete") {
    return `<strong>Missing information on ${esc(label)}:</strong> ${esc(f.detail)}.`;
  }
  return `On ${esc(label)}, this candidate is ${esc(f.value)}.`;
}

// The client's own words, and where the criterion came from.
function criterionEvidence(criterion) {
  if (!criterion) return "";
  const kindLabel =
    criterion.kind === "confirmed_dealbreaker"
      ? "confirmed dealbreaker"
      : criterion.kind === "confirmed_preference"
        ? "confirmed preference"
        : "stated preference";
  const dir = criterion.operator === "must_not_be" ? "must not be" : "must be";
  const vals = (criterion.values || []).join(" or ");
  let html = `<p class="criterion-line"><span class="pos-source">${esc(kindLabel)}</span> ${esc(dimLabel(criterion.dimension))} ${esc(dir)} ${esc(vals)}</p>`;
  if (criterion.note) {
    html += `<p class="q">“${esc(criterion.note)}”</p>`;
  }
  html += `<p class="muted small">${criterion.source === "client_answer" ? "confirmed by the client" : "recorded at intake"}${criterion.recordedBy ? " by " + esc(criterion.recordedBy) : ""}${criterion.recordedAt ? " · " + relTime(criterion.recordedAt) : ""}</p>`;
  return html;
}

function insightsStrip(insights) {
  const list = insights || [];
  if (!list.length) return "";
  const items = list
    .map(
      (i) => `
      <label class="insight-check">
        <input type="checkbox" class="consult-check" data-insight="${esc(i.id)}" />
        <span class="insight-body">
          <span class="pos-source">accepted ${esc(i.candidateName)}</span>
          ${i.dimensions.length ? i.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}</span>`).join("") : `<span class="tag muted">no dimensions</span>`}
          ${i.surprise ? `<span class="q">“${esc(i.surprise)}”</span>` : ""}
        </span>
      </label>`
    )
    .join("");
  return `<div class="evidence-strip insights">
    <span class="strip-label">Acceptance insights</span>
    <span class="muted small">Tick the ones that informed this recommendation.</span>
    ${items}
  </div>`;
}

async function openSend(clientId, cand, reviewOverride) {
  const rv = reviewOverride || cand.review;
  const cl = client(clientId);

  // The card was opened, so the matchmaker looked at whatever it had to say.
  // This is the evidence the adoption guardrail is built on, so it is recorded
  // before anything can be sent.
  await action("record_card_view", {
    clientId,
    candidateId: cand.id,
    surfaced: rv.surface !== false,
  });

  // Control-arm clients never see ledger evidence. The review is still computed
  // server-side for measurement, but the matchmaker gets a plain confirmation.
  if (rv.surface === false) {
    openModal(`
      <h2>Send profile · ${esc(cand.name)} → ${esc(cl.name)}</h2>
      <p class="muted">Send this profile to ${esc(cl.name)}?</p>
      <div class="modal-actions">
        <button class="btn" data-proceed>Send</button>
        <button class="btn secondary" data-close>Hold</button>
      </div>`);
    const root = $modal.querySelector(".modal");
    root.querySelector("[data-proceed]").addEventListener("click", () => sendAndResolve(clientId, cand.id, "proceed", "Send (control)"));
    root.querySelector("[data-close]").addEventListener("click", closeModal);
    return;
  }

  const positiveHtml = positiveStrip(rv);
  const insightsHtml = insightsStrip(cl.insights);
  let body = "";
  let actions = "";

  if (rv.state === "clean") {
    body = `<div class="card-state clean"><h3>No conflict</h3><div class="evidence">No recorded history conflicts with this candidate.</div></div>`;
    actions = `<button class="btn" data-proceed>Send profile</button><button class="btn secondary" data-close>Hold</button>`;
  } else if (rv.state === "untagged") {
    body = `<div class="card-state untagged"><h3>Untagged candidate</h3><div class="evidence">This candidate has no dimension tags, so no comparison can be made. Untagged is not the same as compatible.</div></div>`;
    actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-close>Hold</button>`;
  } else if (rv.state === "no_history") {
    body = `<div class="card-state no_history"><h3>No feedback yet</h3><div class="evidence">This client has no recorded preferences or rejections, so there is nothing to check against yet.</div></div>`;
    actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-close>Hold</button>`;
  } else if (rv.state === "uncoded_only") {
    body = `<div class="card-state no_history"><h3>History present but uncoded</h3><div class="evidence">This client has rejection feedback, but none of it is coded yet. That is not the same as no conflict.</div></div>`;
    actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-close>Hold</button>`;
  } else {
    const finding = rv.findings[0];
    const dim = dimLabel(finding.dimension);
    const clientRec = client(clientId);
    const others = rv.findings.slice(1);
    const alsoHtml = others.length
      ? `<div class="also-flagged"><div class="also-label">Also flagged</div>${others.map((f) => `<div>${findingLine(f)}</div>`).join("")}</div>`
      : "";
    const critHtml = criterionEvidence(finding.criterion);
    const overrideField = `
      <div class="field">
        <label for="override-reason">Why are you sending this anyway?</label>
        <input id="override-reason" type="text" placeholder="Optional, but it is what makes the override reviewable" />
        <div class="muted small">Recorded with the override, and reported back in the measurement view.</div>
      </div>`;
    if (rv.state === "conflict") {
      body = `
        <div class="card-state conflict"><h3>Conflict · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>${findingLine(finding)}</p>
          ${critHtml}
          <p>The comparison is on the value and in the direction the client set, not on the category.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn secondary" data-proceed>Send anyway</button><button class="btn" data-hold>Hold</button>`;
    } else if (rv.state === "contradiction") {
      const row = (clientRec.ledger.rows || []).find((r) => r.dimension === finding.dimension);
      const acc = (clientRec.acceptances || []).find((a) => {
        const ds = a.dimension
          ? [a.dimension]
          : candidate(a.candidateId)
            ? candidate(a.candidateId).dimensions
            : [];
        return ds.includes(finding.dimension);
      });
      body = `
        <div class="card-state contradiction"><h3>Contradiction · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>${findingLine(finding)}</p>
          <p>This client <strong>rejected ${row ? row.rejectedCount : "this dimension"} profiles</strong> on ${esc(dim)}, then <strong>accepted ${row ? row.acceptedCount : "one"} later</strong>.</p>
          <div class="compare">
            <div class="side rejected">
              <div class="side-label">Rejected earlier</div>
              <div class="candidate-name">${esc(candidate(row.earliestRejection.candidateId).name)}</div>
              <div class="q">“${esc(row.earliestRejection.freeText)}”</div>
            </div>
            <div class="side accepted">
              <div class="side-label">Accepted later</div>
              <div class="candidate-name">${acc ? esc(acc.candidateName) : "a profile on this dimension"}</div>
              <div class="muted small">${acc ? relTime(acc.acceptedAt) : ""}</div>
            </div>
          </div>
          <p class="q">“You rejected these for ${esc(dim)} and later accepted one with it. Is it a dealbreaker, or a preference?”</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-ask>Ask the client</button><button class="btn secondary" data-proceed>Send anyway</button><button class="btn ghost" data-hold>Hold</button>`;
    } else if (rv.state === "preference_mismatch") {
      body = `
        <div class="card-state repeat"><h3>Preference mismatch · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>${findingLine(finding)}</p>
          ${critHtml}
          <p>${finding.basis === "stated_preference" ? "This is a stated preference rather than a confirmed one, so it is advice and not a warning." : "The client confirmed this preference, but it is a criterion they hold rather than a no."} It does not block a send.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-ask>Ask the client</button><button class="btn ghost" data-hold>Hold</button>`;
    } else if (rv.state === "incomplete") {
      body = `
        <div class="card-state no_history"><h3>Information missing · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>${findingLine(finding)}</p>
          ${critHtml}
          <p>Unknown is not the same as compatible, so it is worth a moment before sending.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-close>Hold</button>`;
    } else {
      // repeat
      body = `
        <div class="card-state repeat"><h3>Prior rejection · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>${findingLine(finding)}</p>
          <p>This is an unconfirmed pattern, not a confirmed dealbreaker. It does not block a send.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-ask>Ask the client</button><button class="btn ghost" data-hold>Hold</button>`;
    }
    // Any card that shows a warning can be overridden, so any of them can
    // carry a reason. A reason is what makes the override reviewable later.
    body += overrideField;
  }

  openModal(`
    <h2>Send review · ${esc(cand.name)} → ${esc(cl.name)}</h2>
    ${body}
    ${positiveHtml}
    ${insightsHtml}
    <div class="modal-actions">${actions}</div>`);

  const send = () => {
    const consulted = [...$modal.querySelectorAll(".consult-check:checked")].map((el) => el.getAttribute("data-insight"));
    const reasonEl = $modal.querySelector("#override-reason");
    const reason = reasonEl ? reasonEl.value.trim() : "";
    const rationale = reason
      ? reason
      : rv.state === "conflict"
        ? "Sent anyway, no reason given"
        : "Send reviewed";
    sendAndResolve(clientId, cand.id, "proceed", rationale, consulted);
  };
  const ask = () => openAnswer(clientId, cand, rv.findings[0] ? rv.findings[0].dimension : null);
  const hold = () => holdSend(clientId, cand.id);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-proceed]") && root.querySelector("[data-proceed]").addEventListener("click", send);
  root.querySelector("[data-ask]") && root.querySelector("[data-ask]").addEventListener("click", ask);
  root.querySelector("[data-hold]") && root.querySelector("[data-hold]").addEventListener("click", hold);
  root.querySelector("[data-close]") && root.querySelector("[data-close]").addEventListener("click", closeModal);
}

async function sendAndResolve(clientId, candidateId, actionName, rationale, consultedInsightIds) {
  const res = await action("share", { clientId, candidateId, consultedInsightIds });
  if (!res.ok) {
    showToast(res.message);
    return;
  }
  await action("resolve", { clientId, candidateId, action: actionName, rationale });
  closeModal();
  showToast("Sent. The recommendation and the check that preceded it are both recorded.");
  render();
}

async function holdSend(clientId, candidateId) {
  const res = await action("resolve", { clientId, candidateId, action: "hold", rationale: "Held for review" });
  if (!res.ok) {
    showToast(res.message);
    return;
  }
  closeModal();
  showToast("Held. Nothing was sent and the candidate stays on the shortlist.");
  render();
}

function openAnswer(clientId, cand, dimension) {
  const values = dimensionValues(dimension);
  // The value the client last accepted on this dimension, and the value they
  // last rejected. These are the two a rule is most likely to be about.
  const clientRec = client(clientId);
  const acceptedValue = (clientRec.acceptances || [])
    .filter((a) => a.dimension === dimension)
    .sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt))[0];
  const rejectedValue = (clientRec.rejections || [])
    .filter((r) => r.dimension === dimension)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0];

  openModal(`
    <h2>Ask the client · ${esc(dimLabel(dimension))}</h2>
    <div class="evidence">
      <p class="q">“You rejected profiles for ${esc(dimLabel(dimension))} and later accepted one with it. Is it a dealbreaker, or a preference?”</p>
      <p class="muted small">Recording the client's answer settles this dimension. Only the client's answer writes a rule, and only with a value and the client's own words.</p>
    </div>
    <div class="field">
      <label>Which value is this about?</label>
      <select id="answer-value">
        ${values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}
      </select>
      <div class="muted small">
        ${acceptedValue ? `Accepted on ${esc(acceptedValue.value || acceptedValue.dimension)}.` : "No earlier acceptance recorded."}
        ${rejectedValue && rejectedValue.value ? ` Last rejected on ${esc(rejectedValue.value)}.` : ""}
      </div>
    </div>
    <div class="field">
      <label>What did the client say, in their words? <span class="muted small">(required to settle a rule)</span></label>
      <textarea id="verbatim" placeholder="e.g. Location is a preference, not a dealbreaker, as long as they're settled about it"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn" data-ans="preference" data-value="${acceptedValue ? esc(acceptedValue.value || "") : ""}">Preference</button>
      <button class="btn" data-ans="dealbreaker" data-value="${rejectedValue && rejectedValue.value ? esc(rejectedValue.value) : ""}">Dealbreaker</button>
      <button class="btn ghost" data-ans="uncertain">Not sure</button>
    </div>`);

  const root = $modal.querySelector(".modal");
  const verbatimEl = root.querySelector("#verbatim");
  const valueEl = root.querySelector("#answer-value");
  root.querySelectorAll("[data-ans]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const answer = btn.getAttribute("data-ans");
      const suggested = btn.getAttribute("data-value");
      if (suggested && valueEl) valueEl.value = suggested;
      const res = await action("record_client_answer", {
        clientId,
        dimension,
        answer,
        value: valueEl ? valueEl.value : null,
        verbatim: verbatimEl.value,
      });
      if (!res.ok) {
        showToast(res.message);
        return;
      }
      if (answer === "dealbreaker") {
        await action("resolve", { clientId, candidateId: cand.id, action: "hold", rationale: "Client confirmed this is a dealbreaker" });
      } else if (answer === "preference") {
        await action("share", { clientId, candidateId: cand.id });
        await action("resolve", { clientId, candidateId: cand.id, action: "resolve", rationale: "Client settled the dimension: preference" });
      } else {
        // Not sure: hold, do not share, do not write a rule.
        await action("resolve", { clientId, candidateId: cand.id, action: "hold", rationale: "Client was not sure; held for follow-up" });
      }
      closeModal();
      if (answer === "uncertain") {
        showToast("Noted. No rule written, and nothing was sent. Follow up with the client.");
      } else {
        showToast("The client's answer is recorded, and the rule is written from their words.");
      }
      render();
    })
  );
}

function openReject(clientId, cand) {
  const dims = state.dimensions;
  const openedAt = Date.now();
  openModal(`
    <h2>Reject · ${esc(cand.name)}</h2>
    <div class="field">
      <label>What did the client reject on?</label>
      <div class="dim-picker" id="dim-picker">
        ${dims
          .map((d) => `<span class="dim-chip" data-dim="${d.key}" title="${esc(d.hint)}">${esc(d.label)}</span>`)
          .join("")}
      </div>
      <div class="suggest-line" id="suggest-line"></div>
    </div>
    <div class="field">
      <label>Severity</label>
      <div class="severity-row">
        <label><input type="radio" name="sev" value="preference" checked /> Preference</label>
        <label><input type="radio" name="sev" value="likely_dealbreaker" /> Likely dealbreaker</label>
        <label><input type="radio" name="sev" value="uncertain" /> Uncertain</label>
      </div>
    </div>
    <div class="field">
      <label>Rejection reason <span class="muted small">(kept private, for the matchmaker)</span></label>
      <textarea id="free-text" placeholder="e.g. Not based in Bangalore, won't relocate"></textarea>
      <div class="suggest-line" id="free-suggest"></div>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" data-close>Cancel</button>
      <button class="btn" id="save-reject">Save rejection</button>
    </div>`);

  let selectedDim = null;
  const picker = $modal.querySelector("#dim-picker");
  picker.querySelectorAll(".dim-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      picker.querySelectorAll(".dim-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedDim = chip.getAttribute("data-dim");
      const line = $modal.querySelector("#suggest-line");
      if (line) {
        const v = valueOf(cand, selectedDim);
        line.textContent = v
          ? `${cand.name} is ${v} on ${dimLabel(selectedDim)}.`
          : `We have nothing recorded for ${cand.name} on ${dimLabel(selectedDim)}.`;
      }
    })
  );

  const freeText = $modal.querySelector("#free-text");
  const freeSuggest = $modal.querySelector("#free-suggest");
  freeText.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    const text = freeText.value;
    if (!text.trim()) {
      freeSuggest.textContent = "";
      return;
    }
    suggestTimer = setTimeout(async () => {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText: text }),
      });
      const data = await res.json();
      if (data.dimension && !selectedDim) {
        freeSuggest.textContent = "Suggested: " + dimLabel(data.dimension) + " (tap to apply)";
        freeSuggest.onclick = () => {
          selectedDim = data.dimension;
          picker.querySelectorAll(".dim-chip").forEach((c) => c.classList.toggle("selected", c.getAttribute("data-dim") === selectedDim));
          freeSuggest.textContent = "Applied. Confirm before saving.";
        };
      }
    }, 300);
  });

  $modal.querySelector("[data-close]").addEventListener("click", closeModal);
  $modal.querySelector("#save-reject").addEventListener("click", async () => {
    const severity = $modal.querySelector('input[name="sev"]:checked').value;
    const res = await action("reject", {
      clientId,
      candidateId: cand.id,
      dimension: selectedDim,
      severity,
      freeText: freeText.value,
      latencyMs: Date.now() - openedAt,
    });
    if (!res.ok) {
      showToast(res.message);
      return;
    }
    closeModal();
    showToast(
      selectedDim
        ? `Rejection recorded against ${dimLabel(selectedDim)}.`
        : "Rejection recorded, uncoded. It is in the ledger but no dimension to check against."
    );
    render();
  });
}

function openAccept(clientId, cand) {
  const dims = state.dimensions;
  openModal(`
    <h2>Accept · ${esc(cand.name)}</h2>
    <p class="muted small">Record what this positive response taught you. Nothing is inferred from the profile.</p>
    <div class="field">
      <label>What mattered? <span class="muted small">(pick one or more)</span></label>
      <div class="dim-picker" id="accept-dim-picker">
        ${dims
          .map((d) => `<span class="dim-chip" data-dim="${d.key}" title="${esc(d.hint)}">${esc(d.label)}</span>`)
          .join("")}
      </div>
    </div>
    <div class="field">
      <label>What surprised you?</label>
      <textarea id="accept-surprise" placeholder="e.g. He was warmer in person than his profile suggested"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" data-close>Cancel</button>
      <button class="btn" id="save-accept">Save acceptance</button>
    </div>`);

  const selected = new Set();
  const picker = $modal.querySelector("#accept-dim-picker");
  picker.querySelectorAll(".dim-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      const key = chip.getAttribute("data-dim");
      if (selected.has(key)) {
        selected.delete(key);
        chip.classList.remove("selected");
      } else {
        selected.add(key);
        chip.classList.add("selected");
      }
    })
  );

  $modal.querySelector("[data-close]").addEventListener("click", closeModal);
  $modal.querySelector("#save-accept").addEventListener("click", async () => {
    const res = await action("accept", {
      clientId,
      candidateId: cand.id,
      dimensions: [...selected],
      surprise: $modal.querySelector("#accept-surprise").value,
    });
    if (!res.ok) {
      showToast(res.message);
      return;
    }
    closeModal();
    showToast("Acceptance recorded.");
    render();
  });
}

// ---- records created through the interface ----

function valueOptions(dimensionKey, selected) {
  const values = dimensionValues(dimensionKey);
  if (!values.length) return `<option value="">no values recorded for this dimension</option>`;
  return values
    .map((v) => `<option value="${esc(v)}"${v === selected ? " selected" : ""}>${esc(v)}</option>`)
    .join("");
}

// Keep a value dropdown in step with the dimension above it.
function wireDimensionValue(dimSel, valSel) {
  const sync = () => {
    valSel.innerHTML = valueOptions(dimSel.value, null);
  };
  dimSel.addEventListener("change", sync);
  sync();
}

function showFormError(root, message) {
  const el = root.querySelector(".form-error");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  const field = root.querySelector("[aria-invalid='true']");
  if (field) field.focus();
}

function openAddClient() {
  openModal(`
    <h2>Add a client</h2>
    <p class="muted small">Synthetic demo records only. A new client starts on the control arm, so the pilot can allocate them.</p>
    <form id="client-form" novalidate>
      <div class="field">
        <label for="c-name">Client name</label>
        <input id="c-name" type="text" placeholder="e.g. Ananya Rao" autocomplete="off" />
      </div>
      <div class="field">
        <label for="c-city">City</label>
        <input id="c-city" type="text" placeholder="e.g. Bengaluru" autocomplete="off" />
      </div>
      <div class="field">
        <label for="c-journey">Where they are in the journey</label>
        <select id="c-journey">
          <option value="ongoing">Ongoing</option>
          <option value="new">New</option>
        </select>
      </div>
      <div class="field">
        <label for="c-mm">Matchmaker looking after them</label>
        <select id="c-mm">
          ${(state.matchmakers || [])
            .map(
              (m) =>
                `<option value="${esc(m.id)}"${m.id === actingMatchmakerId ? " selected" : ""}>${esc(m.name)}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="form-error" role="alert" hidden></div>
      <div class="modal-actions">
        <button class="btn secondary" type="button" data-close>Cancel</button>
        <button class="btn" type="submit">Save client</button>
      </div>
    </form>`);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-close]").addEventListener("click", closeModal);
  root.querySelector("#client-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await action("create_client", {
      name: root.querySelector("#c-name").value,
      city: root.querySelector("#c-city").value,
      journey: root.querySelector("#c-journey").value,
      matchmakerId: root.querySelector("#c-mm").value,
    });
    if (!res.ok) return showFormError(root, res.message);
    const name = root.querySelector("#c-name").value.trim();
    closeModal();
    showToast(`${name} added. No criteria recorded yet, so the check will say there is nothing to compare against.`);
    render();
  });
  root.querySelector("#c-name").focus();
}

function openAddMatchmaker() {
  openModal(`
    <h2>Add a matchmaker</h2>
    <p class="muted small">A matchmaker record. Everything captured from now on is attributed to whoever is acting.</p>
    <form id="mm-form" novalidate>
      <div class="field">
        <label for="mm-name">Name</label>
        <input id="mm-name" type="text" placeholder="e.g. Neha Iyer" autocomplete="off" />
      </div>
      <div class="form-error" role="alert" hidden></div>
      <div class="modal-actions">
        <button class="btn secondary" type="button" data-close>Cancel</button>
        <button class="btn" type="submit">Save matchmaker</button>
      </div>
    </form>`);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-close]").addEventListener("click", closeModal);
  root.querySelector("#mm-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await action("create_matchmaker", { name: root.querySelector("#mm-name").value });
    if (!res.ok) return showFormError(root, res.message);
    const name = root.querySelector("#mm-name").value.trim();
    closeModal();
    showToast(`${name} added to the matchmakers.`);
    render();
  });
  root.querySelector("#mm-name").focus();
}

function openAddCandidate() {
  const dims = state.dimensions || [];
  const attrRow = (n) => `
    <div class="attr-row">
      <select data-attr-dim="${n}" aria-label="Attribute ${n} dimension">
        <option value="">no attribute</option>
        ${dims.map((d) => `<option value="${esc(d.key)}">${esc(d.label)}</option>`).join("")}
      </select>
      <select data-attr-val="${n}" aria-label="Attribute ${n} value" disabled></select>
    </div>`;

  openModal(`
    <h2>Add a candidate</h2>
    <p class="muted small">Record only what you actually know. A blank attribute means unknown, and unknown is never treated as a match.</p>
    <form id="cand-form" novalidate>
      <div class="field">
        <label for="k-name">Name</label>
        <input id="k-name" type="text" placeholder="e.g. Meera S." autocomplete="off" />
      </div>
      <div class="field">
        <label for="k-city">City</label>
        <input id="k-city" type="text" placeholder="e.g. Pune" autocomplete="off" />
      </div>
      <div class="field">
        <label for="k-prof">Profession</label>
        <input id="k-prof" type="text" placeholder="e.g. Architect" autocomplete="off" />
      </div>
      <div class="field">
        <label for="k-source">Where the profile came from</label>
        <select id="k-source">
          ${SOURCE_OPTIONS.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Known attributes</label>
        ${attrRow(1)}${attrRow(2)}${attrRow(3)}
        <div class="muted small">Pick a dimension, then the value this person actually has on it.</div>
      </div>
      <div class="form-error" role="alert" hidden></div>
      <div class="modal-actions">
        <button class="btn secondary" type="button" data-close>Cancel</button>
        <button class="btn" type="submit">Save candidate</button>
      </div>
    </form>`);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-close]").addEventListener("click", closeModal);
  for (let n = 1; n <= 3; n++) {
    const dimSel = root.querySelector(`[data-attr-dim="${n}"]`);
    const valSel = root.querySelector(`[data-attr-val="${n}"]`);
    const sync = () => {
      valSel.innerHTML = dimSel.value ? valueOptions(dimSel.value, null) : "";
      valSel.disabled = !dimSel.value;
    };
    dimSel.addEventListener("change", sync);
    sync();
  }
  root.querySelector("#cand-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const attributes = [];
    for (let n = 1; n <= 3; n++) {
      const dim = root.querySelector(`[data-attr-dim="${n}"]`).value;
      const val = root.querySelector(`[data-attr-val="${n}"]`).value;
      if (dim && val) attributes.push({ dimension: dim, value: val });
    }
    const res = await action("create_candidate", {
      name: root.querySelector("#k-name").value,
      city: root.querySelector("#k-city").value,
      profession: root.querySelector("#k-prof").value,
      source: root.querySelector("#k-source").value,
      attributes,
    });
    if (!res.ok) return showFormError(root, res.message);
    const name = root.querySelector("#k-name").value.trim();
    closeModal();
    showToast(`${name} added.`);
    render();
  });
  root.querySelector("#k-name").focus();
}

function openPreferenceEditor(clientId) {
  const cl = client(clientId);
  const dims = state.dimensions || [];
  const existing = (cl.preferences || []).filter((p) => p.status === "active");
  let chosen = [];

  openModal(`
    <h2>Record what ${esc(cl.name)} said</h2>
    <p class="muted small">A criterion has a direction and a level of firmness, and they are separate. "Must be vegetarian" and "must not be vegetarian" are opposite criteria, and only one of them can be right.</p>
    <form id="pref-form" novalidate>
      <div class="field">
        <label for="p-dim">Which dimension</label>
        <select id="p-dim">
          ${dims.map((d) => `<option value="${esc(d.key)}">${esc(d.label)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="p-op">Which direction</label>
        <select id="p-op">
          <option value="must_be">The partner must be ...</option>
          <option value="must_not_be">The partner must not be ...</option>
        </select>
        <div class="muted small" id="p-op-hint"></div>
      </div>
      <div class="field">
        <label>Which values</label>
        <div class="dim-picker" id="p-value-picker"></div>
        <div class="muted small" id="p-value-hint"></div>
      </div>
      <div class="field">
        <label>How firm did the client make it</label>
        <div class="severity-row">
          <label><input type="radio" name="kind" value="stated_preference" checked /> Stated preference</label>
          <label><input type="radio" name="kind" value="confirmed_preference" /> Confirmed preference</label>
          <label><input type="radio" name="kind" value="confirmed_dealbreaker" /> Confirmed dealbreaker</label>
        </div>
        <div class="muted small">Only a confirmed dealbreaker is treated as a firm no. The other two are advice, and the card always says which is which.</div>
      </div>
      <div class="field">
        <label for="p-note">The client's own words <span class="muted small">(recommended)</span></label>
        <input id="p-note" type="text" placeholder="e.g. She won't consider anyone outside Bengaluru" autocomplete="off" />
      </div>
      ${
        existing.length
          ? `<div class="field"><label>Already on file</label>${existing
              .map((p) => `<div class="muted small">${esc(dimLabel(p.dimension))} · ${esc(criterionText(p))}</div>`)
              .join("")}<div class="muted small">Saving over one of these replaces it and records the change, and the old version stays readable with the date it was in force.</div></div>`
          : ""
      }
      <div class="form-error" role="alert" hidden></div>
      <div class="modal-actions">
        <button class="btn secondary" type="button" data-close>Cancel</button>
        <button class="btn" type="submit">Save criterion</button>
      </div>
    </form>`);

  const root = $modal.querySelector(".modal");
  const dimSel = root.querySelector("#p-dim");
  const opSel = root.querySelector("#p-op");
  const picker = root.querySelector("#p-value-picker");
  const opHint = root.querySelector("#p-op-hint");
  const valHint = root.querySelector("#p-value-hint");

  function renderPicker() {
    const values = dimensionValues(dimSel.value);
    picker.innerHTML = values
      .map((v) => `<span class="dim-chip${chosen.indexOf(v) !== -1 ? " selected" : ""}" data-val="${esc(v)}">${esc(v)}</span>`)
      .join("");
    picker.querySelectorAll(".dim-chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        const v = chip.getAttribute("data-val");
        const at = chosen.indexOf(v);
        if (at === -1) chosen.push(v);
        else chosen.splice(at, 1);
        renderPicker();
      })
    );
    const dir = opSel.value === "must_not_be" ? "must not be" : "must be";
    valHint.textContent = chosen.length
      ? `The partner ${dir} ${chosen.join(" or ")}.`
      : "Pick at least one value. Pick several for a set, for example two kinds of smoker.";
  }

  function renderOpHint() {
    opHint.textContent =
      opSel.value === "must_not_be"
        ? "Use this when the client refuses a value. Any of the values below is a no."
        : "Use this when the client requires a value. A candidate with any other value does not meet the criterion.";
    renderPicker();
  }

  dimSel.addEventListener("change", () => {
    chosen = [];
    renderPicker();
  });
  opSel.addEventListener("change", renderOpHint);
  renderOpHint();

  root.querySelector("[data-close]").addEventListener("click", closeModal);
  root.querySelector("#pref-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!chosen.length) {
      showFormError(root, "Pick at least one value for the criterion.");
      return;
    }
    const res = await action("set_preference", {
      clientId,
      dimension: dimSel.value,
      operator: opSel.value,
      values: chosen,
      kind: root.querySelector('input[name="kind"]:checked').value,
      note: root.querySelector("#p-note").value,
    });
    if (!res.ok) return showFormError(root, res.message);
    const summary = `${dimLabel(dimSel.value)} ${opSel.value === "must_not_be" ? "must not be" : "must be"} ${chosen.join(" or ")}`;
    closeModal();
    showToast(`Saved: ${summary}.`);
    render();
  });
}

function openAddToQueue(clientId) {
  const cl = client(clientId);
  const onList = new Set(cl.queue.map((q) => q.id));
  const others = state.candidates.filter((c) => !onList.has(c.id));

  openModal(`
    <h2>Shortlist a candidate for ${esc(cl.name)}</h2>
    ${
      others.length
        ? `<form id="q-form" novalidate>
            <div class="field">
              <label for="q-cand">Candidate</label>
              <select id="q-cand">
                ${others
                  .map(
                    (c) =>
                      `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.city)} · ${esc(c.profession)}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-error" role="alert" hidden></div>
            <div class="modal-actions">
              <button class="btn secondary" type="button" data-close>Cancel</button>
              <button class="btn" type="submit">Add to shortlist</button>
            </div>
          </form>`
        : `<p class="muted">Every candidate is already on this client's shortlist. Add a new candidate from the Candidates view first.</p>
           <div class="modal-actions"><button class="btn" type="button" data-close>Close</button></div>`
    }`);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-close]").addEventListener("click", closeModal);
  const form = root.querySelector("#q-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const candidateId = root.querySelector("#q-cand").value;
      const res = await action("add_to_queue", { clientId, candidateId });
      if (!res.ok) return showFormError(root, res.message);
      const cand = state.candidates.find((c) => c.id === candidateId);
      closeModal();
      showToast(`${cand ? cand.name : "Candidate"} added to ${cl.name}'s shortlist.`);
      render();
    });
  }
}

// ---- the candidates view ----

function renderCandidates() {
  const cards = state.candidates
    .map((cand) => {
      const clientOptions = state.clients
        .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
        .join("");
      return `
      <div class="candidate">
        <div class="candidate-head">
          <div>
            <div class="candidate-name">${esc(cand.name)}</div>
            <div class="candidate-sub">${esc(cand.city)} · ${esc(cand.profession)} · ${esc(cand.source)}</div>
          </div>
        </div>
        <div class="taglist">
          ${cand.dimensions.length ? cand.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}${valueOf(cand, d) ? ": " + esc(valueOf(cand, d)) : ""}</span>`).join("") : `<span class="tag muted">nothing recorded</span>`}
        </div>
        <div class="candidate-actions">
          <select data-check-client="${esc(cand.id)}" aria-label="Client to check ${esc(cand.name)} against">${clientOptions}</select>
          <button class="btn" data-check="${esc(cand.id)}">Check against this client</button>
        </div>
      </div>`;
    })
    .join("");

  $app.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Candidates</h1>
        <p class="lead">Every profile in the workspace. Pick a client and the check runs against that client's recorded criteria, without anything being sent.</p>
      </div>
      <button class="btn" data-add-candidate>Add a candidate</button>
    </div>
    <div class="candidate-grid">${cards}</div>`;
}

// ---- events ----

$app.addEventListener("click", async (e) => {
  const openEl = e.target.closest("[data-open]");
  if (openEl) {
    currentClientId = openEl.getAttribute("data-open");
    view = "client";
    render();
    return;
  }
  const back = e.target.closest("[data-back]");
  if (back) {
    view = "clients";
    currentClientId = null;
    render();
    return;
  }
  if (e.target.closest("[data-add-client]")) {
    openAddClient();
    return;
  }
  if (e.target.closest("[data-add-candidate]")) {
    openAddCandidate();
    return;
  }
  const addPref = e.target.closest("[data-add-pref]");
  if (addPref) {
    openPreferenceEditor(addPref.getAttribute("data-add-pref"));
    return;
  }
  const addCand = e.target.closest("[data-add-cand]");
  if (addCand) {
    openAddToQueue(addCand.getAttribute("data-add-cand"));
    return;
  }
  const rmPref = e.target.closest("[data-rm-pref]");
  if (rmPref) {
    const clientId = currentClientId;
    const res = await action("remove_preference", {
      clientId,
      preferenceId: rmPref.getAttribute("data-rm-pref"),
    });
    if (res.ok) {
      showToast(`${rmPref.getAttribute("data-dim")} criterion withdrawn. The change is on the record.`);
      render();
    } else {
      showToast(res.message);
    }
    return;
  }
  const armEl = e.target.closest("[data-set-arm]");
  if (armEl) {
    const clientId = armEl.getAttribute("data-client");
    const arm = armEl.getAttribute("data-set-arm");
    const res = await action("set_arm", { clientId, arm });
    if (res.ok) {
      showToast(
        arm === "control"
          ? "Moved to the control arm. The check is still computed for this client, but it is not shown."
          : "Moved to the intervention arm. The check is shown before sending."
      );
    } else {
      showToast(res.message);
    }
    render();
    return;
  }
  const confirmAudit = e.target.closest("[data-audit-confirm]");
  if (confirmAudit) {
    const res = await action("confirm_audit", {
      auditId: confirmAudit.getAttribute("data-audit-confirm"),
      humanConfirmed: true,
    });
    if (res.ok) showToast("Audit confirmed.");
    else showToast(res.message);
    render();
    return;
  }
  const disputeAudit = e.target.closest("[data-audit-dispute]");
  if (disputeAudit) {
    const res = await action("confirm_audit", {
      auditId: disputeAudit.getAttribute("data-audit-dispute"),
      humanConfirmed: false,
    });
    if (res.ok) showToast("Audit disputed. It stays in the denominator and is reported separately.");
    else showToast(res.message);
    render();
    return;
  }
  const checkEl = e.target.closest("[data-check]");
  if (checkEl) {
    const candId = checkEl.getAttribute("data-check");
    const sel = $app.querySelector(`[data-check-client="${candId}"]`);
    const clientId = sel ? sel.value : state.clients[0].id;
    const res = await fetch(
      `/api/check?clientId=${encodeURIComponent(clientId)}&candidateId=${encodeURIComponent(candId)}`
    );
    if (!res.ok) {
      showToast("That check could not run.");
      return;
    }
    const review = await res.json();
    await openSend(clientId, candidate(candId), review);
    return;
  }
  const sendEl = e.target.closest("[data-send]");
  if (sendEl) {
    const cand = client(currentClientId).queue.find((q) => q.id === sendEl.getAttribute("data-send"));
    await openSend(currentClientId, cand);
    return;
  }
  const acceptEl = e.target.closest("[data-accept]");
  if (acceptEl) {
    const cand = client(currentClientId).queue.find((q) => q.id === acceptEl.getAttribute("data-accept"));
    openAccept(currentClientId, cand);
    return;
  }
  const rejectEl = e.target.closest("[data-reject]");
  if (rejectEl) {
    const cand = client(currentClientId).queue.find((q) => q.id === rejectEl.getAttribute("data-reject"));
    openReject(currentClientId, cand);
    return;
  }
});

document.querySelectorAll(".nav-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    view = btn.getAttribute("data-view");
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
    if (view !== "client") {
      currentClientId = null;
    }
    render();
  })
);

const matchmakerSelect = document.getElementById("matchmaker-select");
if (matchmakerSelect) {
  matchmakerSelect.addEventListener("change", () => {
    actingMatchmakerId = matchmakerSelect.value;
    const mm = (state.matchmakers || []).find((m) => m.id === actingMatchmakerId);
    showToast(`Acting as ${mm ? mm.name : "unknown"}. New records are attributed to that matchmaker.`);
    render();
  });
}

const manageMatchmakerBtn = document.getElementById("manage-mm-btn");
if (manageMatchmakerBtn) {
  manageMatchmakerBtn.addEventListener("click", openAddMatchmaker);
}

document.getElementById("reset-btn").addEventListener("click", async () => {
  const res = await action("reset", {});
  currentClientId = null;
  view = "clients";
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === "clients"));
  if (res.ok) {
    showToast("Demo reset to the seeded synthetic records.");
  }
  render();
});

// ---- boot ----

(async function boot() {
  await fetchBootstrap();
  document.querySelector(".nav-btn[data-view='clients']").classList.add("active");
  render();
})();
