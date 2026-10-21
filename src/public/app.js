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
  no_criteria: "Nothing to compare against",
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
  if (c.summary) return c.summary;
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
  if (view === "profiles") return renderProfiles();
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
    <div class="panel quiet-zone">
      <div class="muted small">Matchmakers on the team: ${(state.matchmakers || []).map((m) => esc(m.name)).join(", ")} · <button class="link-btn" data-add-matchmaker>add a matchmaker</button></div>
    </div>
    <div class="client-list">
      ${state.clients
        .map(
          (c) => `
        <button class="client-card" data-open="${c.id}">
          <div style="flex:1; text-align:left">
            <div class="client-name">${esc(c.name)}</div>
            <div class="client-sub">${esc(c.city)} · ${esc(c.journey)} · ${c.matchmakerName ? esc(c.matchmakerName) : "unassigned"} · ${c.arm === "intervention" ? "check on" : "check hidden"}</div>
          </div>
          ${clientStatusChip(c)}
        </button>`
        )
        .join("")}
    </div>`;
}

function dimNoun(key) {
  const d = (state.dimensions || []).find((x) => x.key === key);
  return d ? d.noun : key;
}

// What has already happened to a profile on the shortlist: held, sent and
// waiting, or answered. The matchmaker should never have to guess.
function profileState(clientId, candidateId) {
  const cl = client(clientId);
  const sent = (cl.sent || []).filter((s) => s.candidateId === candidateId);
  if (sent.length) {
    const latest = sent[0];
    if (latest.outcome === "rejected") return { tone: "bad", text: "They said no" };
    if (latest.outcome === "accepted") return { tone: "good", text: "They said yes" };
    return { tone: "warn", text: "Sent, waiting on the client" };
  }
  const held = (cl.resolutions || []).filter(
    (r) => r.candidateId === candidateId && r.action === "hold"
  );
  if (held.length) return { tone: "muted", text: "Held, not sent" };
  return null;
}

// One plain line describing what the check found, for a shortlist row. The
// matchmaker should be able to decide whether to open the card from this line.
function candidateStatusLine(review) {
  if (!review) return "Not checked yet";
  const findings = review.findings || [];
  const actionable = findings.filter((f) => f.type !== "incomplete");
  const missing = findings.filter((f) => f.type === "incomplete");
  if (actionable.length) {
    return `${actionable.length} thing${actionable.length === 1 ? "" : "s"} to check`;
  }
  if (missing.length) {
    const nouns = missing.map((f) => dimNoun(f.dimension));
    return `Missing information on ${nouns.join(" and ")}`;
  }
  if (review.state === "untagged") return "Nothing recorded about this profile";
  if (
    review.state === "no_history" ||
    review.state === "uncoded_only" ||
    review.state === "no_criteria"
  ) {
    return "Nothing to compare against yet";
  }
  return "No conflicts found in the information available";
}

function statusTone(review) {
  const findings = (review && review.findings) || [];
  if (findings.some((f) => f.type === "conflict")) return "bad";
  if (findings.some((f) => f.type !== "incomplete")) return "warn";
  if (findings.some((f) => f.type === "incomplete")) return "muted";
  return "good";
}

// The client's own record, in the order that matters: what would stop a
// profile going out, then what they would prefer, then what has changed.
function renderClient(clientId) {
  const c = client(clientId);
  if (!c) return renderClients();

  const activePrefs = c.preferences || [];
  // Three groups, by what the evidence is. A dealbreaker is a firm no the
  // client confirmed. A preference is something they said, which is advice
  // unless they confirmed it. An observation is a pattern someone noticed, and
  // it never rules a profile out on its own.
  const dealbreakers = activePrefs.filter((p) => p.kind === "confirmed_dealbreaker");
  const preferences = activePrefs.filter(
    (p) => p.kind !== "confirmed_dealbreaker" && p.kind !== "observation"
  );
  const observations = activePrefs.filter((p) => p.kind === "observation");
  const changes = (c.preferenceEvents || []).slice().reverse();

  const prefRow = (p) => `
    <div class="pref-row">
      <div class="pref-row-head">
        <span class="pref-tag ${p.kind === "confirmed_dealbreaker" ? "dealbreaker" : ""}">${esc(p.firmness)}</span>
        <span class="pref-dim">${esc(dimLabel(p.dimension))}</span>
        <button class="link-btn" data-rm-pref="${esc(p.id)}" data-dim="${esc(dimLabel(p.dimension))}">Remove</button>
      </div>
      <div class="pref-summary">${esc(p.summary)}</div>
      ${p.note ? `<div class="pref-note">“${esc(p.note)}”</div>` : ""}
      <div class="pref-meta">${esc(p.tierLabel || p.sourceLabel)}${p.recordedBy ? " · recorded by " + esc(p.recordedBy) : ""}${p.recordedAt ? " · " + relTime(p.recordedAt) : ""}</div>
    </div>`;

  const wantsHtml =
    dealbreakers.length || preferences.length || observations.length
      ? `${dealbreakers.length ? `<div class="subhead">Deal breakers</div><p class="muted small">A firm no the client confirmed. Every profile is checked against it.</p>${dealbreakers.map(prefRow).join("")}` : ""}
         ${preferences.length ? `<div class="subhead">Preferences</div><p class="muted small">What the client said. Checked every time, and shown as advice rather than a no.</p>${preferences.map(prefRow).join("")}` : ""}
         ${observations.length ? `<div class="subhead">To check with the client</div><p class="muted small">Patterns someone noticed. They are not treated as something the client said, and nothing is ruled out on them.</p>${observations.map(prefRow).join("")}` : ""}`
      : `<p class="muted small">Nothing on file for this client yet. Until there is something to compare against, the check can only say that there is nothing to compare against.</p>`;

  const contradictions = c.contradictions || [];
  const contradictionHtml = contradictions.length
    ? `<div class="panel attention">
        <div class="attention-head">Worth resolving</div>
        ${contradictions
          .map(
            (x) => `<p>${esc(criterionText(x.criterion))}. ${esc(
              x.decisions[0].kind === "accepted" ? "They accepted" : "They turned down"
            )} ${esc(x.decisions[0].candidateName || "a profile")}${
              x.decisions[0].value ? `, whose profile listed: ${esc(x.decisions[0].value)}` : ""
            }. The two do not agree, and only the client can say which is right.</p>`
          )
          .join("")}
        <button class="btn" data-ask-client="${esc(c.id)}" data-dimension="${esc(contradictions[0].dimension)}">Ask the client</button>
      </div>`
    : "";

  const queueHtml = c.queue.length
    ? c.queue
        .map((cand) => {
          const state = profileState(c.id, cand.id);
          return `<div class="candidate">
            <div class="candidate-head">
              <div>
                <div class="candidate-name">${esc(cand.name)}</div>
                <div class="candidate-sub">${esc(cand.city)} · ${esc(cand.profession)}</div>
              </div>
              <span class="status ${state ? state.tone : statusTone(cand.review)}">${esc(state ? state.text : candidateStatusLine(cand.review))}</span>
            </div>
            <div class="taglist">
              ${cand.dimensions.length ? cand.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}${valueOf(cand, d) ? ": " + esc(valueOf(cand, d)) : ""}</span>`).join("") : `<span class="tag muted">nothing recorded</span>`}
            </div>
            ${
              state
                ? `<div class="candidate-note">${esc(candidateStatusLine(cand.review))}</div>`
                : ""
            }
            <div class="candidate-actions">
              <button class="btn" data-send="${cand.id}">${state && state.text.indexOf("Sent") === 0 ? "Check again" : "Check before sharing"}</button>
            </div>
          </div>`;
        })
        .join("")
    : `<p class="muted small">Nobody is on this client's shortlist. Add a profile and the check runs against what this client has told you.</p>`;

  const sentHtml = (c.sent || []).length
    ? c.sent
        .map((s) => {
          let outcome;
          let actions = "";
          if (s.outcome === "rejected") {
            const reason = s.rejection.dimension
              ? esc(dimLabel(s.rejection.dimension))
              : "no reason recorded";
            outcome = `They said no${s.rejection.dimension ? " over " + reason : ""}`;
            actions = `<button class="link-btn" data-say-no="${esc(s.candidateId)}">Change</button>`;
          } else if (s.outcome === "accepted") {
            outcome = "They said yes";
            actions = `<button class="link-btn" data-say-yes="${esc(s.candidateId)}">Note what mattered</button>`;
          } else {
            outcome = "No answer yet";
            actions = `<button class="link-btn" data-say-no="${esc(s.candidateId)}">They said no</button><button class="link-btn" data-say-yes="${esc(s.candidateId)}">They said yes</button>`;
          }
          return `<div class="sent-row">
            <div>
              <div class="candidate-name">${esc(s.candidateName)}</div>
              <div class="candidate-sub">${s.candidateCity ? esc(s.candidateCity) + " · " : ""}sent ${relTime(s.sharedAt)}${s.actor ? " by " + esc(s.actor) : ""}</div>
              ${s.rejection && s.rejection.freeText ? `<div class="pref-note">“${esc(s.rejection.freeText)}”</div>` : ""}
            </div>
            <div class="sent-side">
              <span class="status ${s.outcome === "rejected" ? "bad" : s.outcome === "accepted" ? "good" : "muted"}">${esc(outcome)}</span>
              <div class="candidate-actions">${actions}</div>
            </div>
          </div>`;
        })
        .join("")
    : `<p class="muted small">Nothing sent to this client yet.</p>`;

  const changesHtml = changes.length
    ? changes
        .map(
          (e) => `<div class="change-row">
            <span class="pref-dim">${esc(dimLabel(e.dimension))}</span>
            <span class="muted small">${
              e.after === null
                ? "withdrawn"
                : `${e.before && e.before.values && e.before.values.join() !== e.after.values.join() ? "changed from " + esc((e.before.values || []).join(" or ")) + " to " : ""}${esc((e.after.values || []).join(" or "))}`
            } · ${relTime(e.at)}${e.by ? " · " + esc(e.by) : ""}</span>
          </div>`
        )
        .join("")
    : `<p class="muted small">Nothing has changed since this client was set up.</p>`;

  const feedbackHtml = (c.ledger.rows || []).length
    ? c.ledger.rows
        .map(
          (r) => `<div class="ledger-row">
            <div class="ledger-head">
              <span class="ledger-dim">${esc(r.label)}</span>
              <span class="ledger-counts">${r.rejectedCount} rejected · ${r.acceptedCount} accepted</span>
            </div>
          </div>`
        )
        .join("")
    : `<p class="muted small">No rejections recorded yet.</p>`;

  $app.innerHTML = `
    <button class="back-link" data-back>← Back to clients</button>
    <div class="client-header">
      <div>
        <h1>${esc(c.name)}</h1>
        <span class="muted small">${esc(c.city)} · ${esc(c.journey)} · ${c.matchmakerName ? esc(c.matchmakerName) : "unassigned"}</span>
      </div>
    </div>

    <h2>Preferences and deal breakers</h2>
    <div class="panel">
      ${wantsHtml}
      <button class="btn secondary" data-add-pref="${esc(c.id)}">Record something the client said</button>
      <div class="subhead">Changes</div>
      ${changesHtml}
    </div>

    ${contradictionHtml}

    <h2>Candidates to review</h2>
    <div class="panel">
      ${queueHtml}
      <button class="btn secondary" data-add-cand="${esc(c.id)}">Check another profile</button>
    </div>

    <h2>Profiles sent</h2>
    <div class="panel">
      ${sentHtml}
    </div>

    <details class="panel history">
      <summary>Match histories</summary>
      <p class="muted small">What the client has said no to, and what they accepted. This is kept for reference; you do not have to maintain it.</p>
      ${feedbackHtml}
    </details>

    <div class="panel quiet-zone">
      <div class="muted small">Pilot group: ${c.arm === "control" ? "the check is worked out for this client but not shown" : "the check is shown for this client"} · <button class="link-btn" data-set-arm="${c.arm === "control" ? "intervention" : "control"}" data-client="${esc(c.id)}">move to the ${c.arm === "control" ? "shown" : "hidden"} group</button></div>
    </div>`;
}

function pct(v) {
  return v == null ? "n/a" : `${Math.round(v * 10) / 10}%`;
}

// A number, in plain words, with the sample it came from. Zero and no data are
// different things and are shown differently.
function metricLine(label, value, sample, explain) {
  if (!sample) {
    return `<div class="metric-line">
      <div class="metric-name">${esc(label)}</div>
      <div class="metric-value none">No data</div>
      <div class="metric-note">${esc(explain)}</div>
    </div>`;
  }
  return `<div class="metric-line">
    <div class="metric-name">${esc(label)}</div>
    <div class="metric-value">${esc(String(value))}</div>
    <div class="metric-note">${esc(explain)}</div>
    <div class="metric-sample">out of ${esc(String(sample))} ${sample === 1 ? "profile" : "profiles"}</div>
  </div>`;
}

function smallSampleWarning(sample) {
  if (!sample) return "";
  if (sample >= 5) return "";
  return `<p class="note warn">This is a very small sample. Treat it as a prompt to look, not as a finding.</p>`;
}

function renderMeasurement() {
  const s = state.session;
  const o = s.outcome;
  const h = o.headline;
  const cur = h.current;
  const before = h.before;
  const pilotStart = new Date(o.window.pilotStart).toISOString().slice(0, 10);
  const checked = h.checkedBeforeSending;
  const eligible = h.eligibleToCheck;

  const currentBlock = cur.sent
    ? `<div class="metric-lines">
        ${metricLine("Profiles sent", cur.sent, cur.sent, "Profiles shared with a client since the check was introduced.")}
        ${metricLine("Checked before sending", checked, eligible, "Profiles the matchmaker opened the check for before sending.")}
        ${metricLine("Potential mismatches found", cur.issues, cur.sent, "Profiles where the check found a conflict with a preference or deal breaker on file.")}
        ${metricLine("Dealbreaker conflicts that reached clients", cur.dealbreakers, cur.sent, "A confirmed no went out anyway. The matchmaker chose to send it.")}
        ${metricLine("Preference mismatches that reached clients", cur.mismatches, cur.sent, "A preference was broken, and it went out.")}
        ${metricLine("Profiles with missing information", cur.missingInformation, cur.sent, "Something was not recorded, so part of the file could not be checked.")}
        ${metricLine("No conflicts found", cur.noConflicts, cur.sent, "Checked against what was on file, and nothing stood in the way. This is not a statement that the profile was a good match.")}
        ${metricLine("Nothing to compare against", cur.nothingToCompare, cur.sent, "The client had nothing on file, so the profile could not be judged. These are not counted as conflicts found.")}
      </div>
      ${smallSampleWarning(cur.sent)}`
    : `<p class="muted">No profiles have been sent since the check was introduced on ${esc(pilotStart)}. Send a profile and the numbers will fill in.</p>`;

  const beforeBlock = before.sent
    ? `<div class="metric-lines">
        ${metricLine("Profiles sent", before.sent, before.sent, "The same measure, for the period before the check was introduced.")}
        ${metricLine("Potential mismatches found", before.issues, before.sent, "Found by reviewing each profile against the file as it was at the time.")}
        ${metricLine("Profiles with missing information", before.missingInformation, before.sent, "Part of the file could not be checked.")}
        ${metricLine("No conflicts found", before.noConflicts, before.sent, "Nothing on file stood in the way.")}
        ${metricLine("Nothing to compare against", before.nothingToCompare, before.sent, "The client had nothing on file at the time.")}
      </div>
      ${smallSampleWarning(before.sent)}`
    : `<p class="muted">No profiles were sent before the check was introduced.</p>`;

  const rows = state.clients
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

  const auditRows = (state.audits || [])
    .slice()
    .reverse()
    .map((a) => {
      const cl = state.clients.find((x) => x.id === a.clientId);
      const cand = state.candidates.find((x) => x.id === a.candidateId);
      const detail = (a.details || [])
        .map((d) => `${esc(d.requirement || d.dimension)}${d.value ? " vs " + esc(d.value) : " (not recorded)"}`)
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
        <td>${esc(a.classification.replace(/_/g, " "))}</td>
        <td class="small">${esc(detail)}</td>
        <td>${review}</td>
      </tr>`;
    })
    .join("");

  const ref = `
    <h2>The funnel the assessment gave us</h2>
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
      <p class="note">Supplied figures from the assessment brief. About 35% of rejected profiles were reported to conflict with preferences already stated, and the denominator for that figure is not given. This is reference context, not this session's data.</p>
    </div>`;

  $app.innerHTML = `
    <h1>How it's going</h1>
    <p class="lead">For whoever is running the pilot. Every number comes from profiles that were actually sent, and every one of them is reviewed against the client's file as it was at the time.</p>

    <h2>Since the check was introduced</h2>
    <div class="panel">${currentBlock}</div>

    <h2>Before the check was introduced</h2>
    <div class="panel">${beforeBlock}</div>

    <div class="panel">
      <p class="note">These are descriptions of what happened, not proof that the check caused anything. A pilot would need a baseline measured the same way, the same review applied to both groups, and a blind human re-check of a sample, because the review and the audit use the same rules and can be wrong in the same way.</p>
    </div>

    <details class="panel history">
      <summary>Details for the pilot operator</summary>
      <h3>By client</h3>
      <table class="metrics">
        <tr><th>Client</th><th>Historical (coded)</th><th>Conflicts</th><th>ARCR eligible / repeat</th><th>ARCR sub-rates</th><th>ARCR</th></tr>
        ${rows}
      </table>
      <p class="note">ARCR measures recurrence, not avoidability. Sub-rates split the numerator by the evidence available at share time: hard (a confirmed dealbreaker existed), settled (a confirmed preference, so the card is silent), contradiction (a prior rejection then a later acceptance), plain (a prior rejection only). Synthetic, illustrative data.</p>
      <h3>Every profile reviewed</h3>
      <table class="metrics">
        <tr><th>Client</th><th>Candidate</th><th>Review says</th><th>Criterion against candidate value</th><th>Review</th></tr>
        ${auditRows || `<tr><td colspan="5" class="muted">Nothing reviewed yet.</td></tr>`}
      </table>
      <p class="note">One row per profile sent, including the ones with nothing against them, so the denominator is visible and not just the interesting cases.</p>
    </details>

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

// The acceptance debrief is a separate feature, not part of the check, so it
// stays out of the way until the matchmaker wants it. Opening it is what counts
// as having consulted it.
function insightsStrip(insights) {
  const list = insights || [];
  if (!list.length) return "";
  const items = list
    .map(
      (i) => `
      <div class="insight-row">
        <span class="pos-source">accepted ${esc(i.candidateName)}</span>
        ${i.dimensions.length ? i.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}</span>`).join("") : `<span class="tag muted">nothing recorded</span>`}
        ${i.surprise ? `<span class="q">“${esc(i.surprise)}”</span>` : ""}
      </div>`
    )
    .join("");
  return `<details class="also insights">
    <summary>What they liked before (${list.length})</summary>
    <p class="muted small">From the acceptance debrief. Opening this counts as consulting it.</p>
    ${items}
  </details>`;
}

async function openSend(clientId, cand, reviewOverride, skipView) {
  const cl = client(clientId);
  let rv = reviewOverride || cand.review;
  if (!rv) {
    // The card is coming back after a clarification, so the review is worked out
    // again against the file as it now stands.
    const res = await fetch(
      `/api/check?clientId=${encodeURIComponent(clientId)}&candidateId=${encodeURIComponent(cand.id)}`
    );
    if (!res.ok) {
      showToast("That check could not run.");
      return;
    }
    rv = await res.json();
  }

  // The card was opened, so the matchmaker looked at whatever it had to say.
  // This is the evidence the adoption guardrail is built on, so it is recorded
  // before anything can be sent.
  if (!skipView) {
    await action("record_card_view", {
      clientId,
      candidateId: cand.id,
      surfaced: rv.surface !== false,
    });
  }

  // Control-group clients never see the check. It is still worked out for them,
  // so the two groups can be compared, but the matchmaker gets a plain
  // confirmation.
  if (rv.surface === false) {
    openModal(`
      <h2>Send profile · ${esc(cand.name)} → ${esc(cl.name)}</h2>
      <p class="muted">Send this profile to ${esc(cl.name)}?</p>
      <div class="modal-actions">
        <button class="btn" data-proceed>Send</button>
        <button class="btn secondary" data-close>Hold</button>
      </div>`);
    const root = $modal.querySelector(".modal");
    root.querySelector("[data-proceed]").addEventListener("click", () =>
      sendAndResolve(clientId, cand.id, "proceed", "Send (no check shown)", [])
    );
    root.querySelector("[data-close]").addEventListener("click", closeModal);
    return;
  }

  // A profile already sent to this client, with no answer yet, is the same
  // introduction. The card says so rather than offering to send it again.
  const alreadySent = (cl.sent || []).some(
    (s) => s.candidateId === cand.id && s.outcome === "pending"
  );

  const findings = rv.findings || [];
  const actionable = findings.filter((f) => f.type !== "incomplete");
  const rest = findings.filter((f) => f.type === "incomplete");
  const first = actionable[0] || rest[0] || null;
  const others = findings.filter((f) => f !== first);
  const isFirm = first && first.type === "conflict";

  const findingBlock = (f) => {
    if (!f) return "";
    const crit = f.criterion;
    const kind =
      f.type === "conflict"
        ? "Dealbreaker"
        : f.type === "preference_mismatch"
          ? f.basis === "confirmed_preference"
            ? "Preference mismatch"
            : "Preference mismatch, not confirmed"
          : f.type === "contradiction"
            ? "Their file disagrees with itself"
            : f.type === "repeat"
              ? "You have rejected on this before"
              : "Missing information";
    const source = crit
      ? `<span>${esc(f.tierLabel || "From the onboarding call")}</span>`
      : `<span>A decision they made, not a rule</span>`;
    const valueLine =
      f.value === null || f.value === undefined
        ? `<span>Nothing recorded on the profile for ${esc(dimNoun(f.dimension))}</span>`
        : `<span>The profile lists: ${esc(f.value)}</span>`;
    return `<div class="finding">
        <div class="finding-kind">${esc(kind)}</div>
        <p class="finding-sentence">${esc(f.sentence || "")}</p>
        ${crit && crit.note ? `<p class="finding-words">The client said: “${esc(crit.note)}”</p>` : ""}
        <div class="finding-source">${source}${valueLine}</div>
      </div>`;
  };

  const headline = !findings.length
    ? "Nothing to check"
    : actionable.length === 1
      ? "One thing to check"
      : `${actionable.length} things to check`;

  const nothingToCheck = !findings.length
    ? rv.state === "no_criteria"
      ? `<div class="card-state clean">
          <h3>Nothing to compare against</h3>
          <p>There is nothing on this client's file that a profile can be checked against. The only thing recorded is a pattern, and a pattern is a question for the client, not a rule.</p>
        </div>`
      : `<div class="card-state clean">
        <h3>No conflicts found in the information available</h3>
        <p>Nothing this client has told us conflicts with what is recorded about this profile. Mutual compatibility, not just profile alignment: treat this as nothing standing in the way rather than as a good match.</p>
      </div>`
    : findingBlock(first);

  const alsoHtml = others.length
    ? `<details class="also"><summary>Also worth knowing (${others.length})</summary>${others.map(findingBlock).join("")}</details>`
    : "";

  // An observation is a pattern the matchmaker noticed. It is shown as
  // context, it never rules a profile out, and it comes with the question to
  // put to the client.
  const observations = rv.observations || [];
  const observationsHtml = observations.length
    ? `<div class="observations">
        <div class="obs-head">Worth checking with the client</div>
        ${observations
          .map(
            (o) => `<div class="obs-item">
              <p>${esc(criterionText(o))}.</p>
              ${o.note ? `<p class="obs-note">What you noticed: “${esc(o.note)}”</p>` : ""}
              <p class="obs-line">This is a pattern, not something the client has said. It has not ruled this profile out.</p>
              <button class="btn secondary" data-ask-obs="${esc(o.dimension)}">Ask the client about this</button>
            </div>`
          )
          .join("")}
      </div>`
    : "";

  const positiveHtml = (rv.positive || []).length
    ? `<div class="evidence-strip">
        <span class="strip-label">In their favour</span>
        ${rv.positive
          .map((p) =>
            p.source === "criterion"
              ? `<span class="pos-item">${esc(p.detail || dimLabel(p.dimension))}</span>`
              : `<span class="pos-item">They accepted ${esc(p.detail || "someone")} before${p.value ? `, who is ${esc(p.value)}` : ""} on ${esc(dimLabel(p.dimension).toLowerCase())}</span>`
          )
          .join("")}
      </div>`
    : "";

  const insightsHtml = insightsStrip(cl.insights);
  let consulted = [];

  openModal(`
    <h2>Check before sharing · ${esc(cand.name)} → ${esc(cl.name)}</h2>
    <div class="card-state ${isFirm ? "conflict" : actionable.length ? "warn" : "clean"}">
      <h3>${esc(headline)}</h3>
    </div>
    ${nothingToCheck}
    ${alsoHtml}
    ${observationsHtml}
    ${positiveHtml}
    ${insightsHtml}
    <div class="modal-actions">
      <button class="btn secondary" data-hold>Hold the profile</button>
      ${first && first.type !== "incomplete" ? `<button class="btn" data-ask>Ask the client</button>` : ""}
      ${
        alreadySent
          ? `<span class="muted small">Already sent to ${esc(cl.name)}, waiting on their answer.</span>`
          : `<button class="btn" data-proceed>${isFirm ? "Share anyway" : "Share this profile"}</button>`
      }
    </div>
    <div class="field reason-field" id="reason-field" hidden>
      <label for="override-reason">Why are you sharing it anyway?</label>
      <input id="override-reason" type="text" placeholder="A line is enough, and it is what makes this reviewable later" autocomplete="off" />
      <div class="muted small" id="reason-error" hidden>Add a reason so this can be reviewed later.</div>
    </div>`);

  const root = $modal.querySelector(".modal");
  const insightsDetails = root.querySelector("details.insights");
  if (insightsDetails) {
    insightsDetails.addEventListener("toggle", () => {
      if (insightsDetails.open) {
        consulted = (cl.insights || []).map((i) => i.id);
      }
    });
  }
  const reasonField = root.querySelector("#reason-field");
  const reasonInput = root.querySelector("#override-reason");
  const reasonError = root.querySelector("#reason-error");
  const proceedBtn = root.querySelector("[data-proceed]");

  const send = () => {
    const reason = reasonInput ? reasonInput.value.trim() : "";
    if (isFirm && !reason) {
      // A firm no gets a reason. Anything less does not earn that friction.
      reasonField.hidden = false;
      reasonError.hidden = false;
      reasonInput.focus();
      proceedBtn.textContent = "Confirm and share";
      return;
    }
    sendAndResolve(
      clientId,
      cand.id,
      "proceed",
      reason || (first ? "Sent after review" : "Sent"),
      consulted
    );
  };

  const ask = () =>
    openAnswer(clientId, cand, first && first.criterion ? first.dimension : first ? first.dimension : null);
  root.querySelectorAll("[data-ask-obs]").forEach((btn) =>
    btn.addEventListener("click", () =>
      openAnswer(clientId, cand, btn.getAttribute("data-ask-obs"))
    )
  );
  const hold = () => holdSend(clientId, cand.id);

  proceedBtn.addEventListener("click", send);
  const askBtn = root.querySelector("[data-ask]");
  if (askBtn) askBtn.addEventListener("click", ask);
  root.querySelector("[data-hold]").addEventListener("click", hold);
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

// Asking the client. This records what they actually said, including when
// what they said has changed: a different value, a different direction, or a
// different level of firmness. The old version is kept with the date it was in
// force, so the change is traceable.
function openAnswer(clientId, cand, dimension) {
  const cl = client(clientId);
  const values = dimensionValues(dimension);
  const existing = (cl.preferences || []).find((p) => p.dimension === dimension);
  const rejected = (cl.rejections || [])
    .filter((r) => r.dimension === dimension)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0];
  const accepted = (cl.acceptances || [])
    .filter((a) => a.dimension === dimension)
    .sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt))[0];

  // A sensible starting point: what the client last accepted, or what they
  // last rejected, or what is on file now.
  let chosen = existing ? existing.values.slice() : [];
  if (!chosen.length && accepted && accepted.value) chosen = [accepted.value];
  if (!chosen.length && rejected && rejected.value) chosen = [rejected.value];
  let direction = existing ? existing.operator : "must_not_be";
  let firmness = existing ? existing.kind : "confirmed_dealbreaker";

  const dimensionInfo = (state.dimensions || []).find((d) => d.key === dimension);
  const question = dimensionInfo && dimensionInfo.question
    ? dimensionInfo.question
    : `What would ${cl.name} consider for ${dimLabel(dimension).toLowerCase()}?`;
  const noun = dimLabel(dimension).toLowerCase();

  // What the client has done before, kept apart from what they have said.
  // These are decisions, and they are not proof of a preference.
  const decisions = [];
  for (const a of cl.acceptances || []) {
    if (a.dimension !== dimension) continue;
    decisions.push({ kind: "accepted", name: a.candidateName, value: a.value, at: a.acceptedAt });
  }
  for (const r of cl.rejections || []) {
    if (r.dimension !== dimension) continue;
    decisions.push({
      kind: "rejected",
      name: (candidate(r.candidateId) || {}).name,
      value: r.value,
      at: r.recordedAt,
    });
  }
  decisions.sort((x, y) => new Date(y.at) - new Date(x.at));
  const decisionsHtml = decisions.length
    ? `<div class="field">
        <label>Previous decisions</label>
        ${decisions
          .map(
            (d) =>
              `<div class="muted small">${d.kind === "accepted" ? "Accepted" : "Turned down"} ${esc(d.name || "")}${d.value ? `, ${esc(d.value)}` : ""} · ${esc(relTime(d.at))}</div>`
          )
          .join("")}
        <div class="muted small">These are what happened. They do not establish what ${esc(cl.name)} wants, and they are not checked against a profile on their own.</div>
      </div>`
    : "";

  openModal(`
    <h2 id="ans-title">Clarify ${esc(cl.name)}'s ${esc(noun)} preference</h2>
    <div class="field">
      <label for="ans-dim">What is this about</label>
      <select id="ans-dim">
        ${(state.dimensions || [])
          .map(
            (d) =>
              `<option value="${esc(d.key)}"${d.key === dimension ? " selected" : ""}>${esc(d.label)}</option>`
          )
          .join("")}
      </select>
    </div>
    <div class="field">
      <label id="ans-question">${esc(question)}</label>
    </div>
    <div class="field">
      <label>Which direction</label>
      <select id="ans-op">
        <option value="must_not_be">The partner must not be ...</option>
        <option value="must_be">The partner must be ...</option>
      </select>
    </div>
    <div class="field">
      <label>Which values</label>
      <div class="dim-picker" id="ans-values"></div>
      <div class="muted small" id="ans-hint"></div>
    </div>
    <div class="field">
      <label>How firm is it</label>
      <div class="severity-row severity-column">
        <label><input type="radio" name="kind" value="confirmed_preference" checked /> A preference, not a no</label>
        <label><input type="radio" name="kind" value="confirmed_dealbreaker" /> A definite no</label>
        <label><input type="radio" name="kind" value="stated_preference" /> Still not sure, so just advice</label>
      </div>
      <div class="muted small" id="ans-kind-hint"></div>
    </div>
    <div class="field">
      <label>Their own words</label>
      <textarea id="verbatim" placeholder="e.g. Location is a preference, not a dealbreaker"></textarea>
    </div>
    ${decisionsHtml}
    <div class="form-error" role="alert" hidden></div>
    <div class="modal-actions">
      <button class="btn secondary" type="button" data-close>Cancel</button>
      <button class="btn" type="button" id="ans-save">Save what they said</button>
    </div>`);

  const root = $modal.querySelector(".modal");
  const opSel = root.querySelector("#ans-op");
  const picker = root.querySelector("#ans-values");
  const hint = root.querySelector("#ans-hint");
  const kindHint = root.querySelector("#ans-kind-hint");
  const dimSel = root.querySelector("#ans-dim");
  const questionEl = root.querySelector("#ans-question");
  const titleEl = root.querySelector("#ans-title");
  // The values and the question follow the dimension, so the matchmaker can
  // put any of it to the client.
  let currentDimension = dimension;
  const valuesFor = (key) => dimensionValues(key);
  dimSel.addEventListener("change", () => {
    currentDimension = dimSel.value;
    chosen = [];
    const info = (state.dimensions || []).find((d) => d.key === currentDimension);
    questionEl.textContent = info && info.question ? info.question : "";
    if (info && titleEl) {
      titleEl.innerHTML = `Clarify ${esc(cl.name)}'s ${esc(info.label.toLowerCase())} preference`;
    }
    renderValues();
  });
  const kindEls = [...root.querySelectorAll('input[name="kind"]')];
  function renderKindHint() {
    const kind = (kindEls.find((el) => el.checked) || {}).value;
    kindHint.textContent =
      kind === "confirmed_dealbreaker"
        ? "A definite no. Every profile is checked against it, and one that breaks it is a conflict."
        : kind === "confirmed_preference"
          ? "A preference. Every profile is checked against it, and one that misses it is a mismatch, not a conflict."
          : "Still advice. It is recorded, and nothing is ruled out on it until the client confirms.";
  }
  kindEls.forEach((el) => el.addEventListener("change", renderKindHint));
  renderKindHint();

  opSel.value = direction;
  kindEls.forEach((el) => {
    if (el.value === firmness) el.checked = true;
  });

  function renderValues() {
    const values = valuesFor(currentDimension);
    picker.innerHTML = values
      .map(
        (v) =>
          `<span class="dim-chip${chosen.indexOf(v) !== -1 ? " selected" : ""}" data-val="${esc(v)}">${esc(v)}</span>`
      )
      .join("");
    picker.querySelectorAll(".dim-chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        const v = chip.getAttribute("data-val");
        const at = chosen.indexOf(v);
        if (at === -1) chosen.push(v);
        else chosen.splice(at, 1);
        renderValues();
      })
    );
    const dir = opSel.value === "must_not_be" ? "must not be" : "must be";
    hint.textContent = chosen.length
      ? `The partner ${dir} ${chosen.join(" or ")}.`
      : "Pick at least one value.";
  }
  opSel.addEventListener("change", renderValues);
  renderValues();

  root.querySelector("[data-close]").addEventListener("click", closeModal);
  root.querySelector("#ans-save").addEventListener("click", async () => {
    const verbatim = root.querySelector("#verbatim").value;
    const kind = (kindEls.find((el) => el.checked) || {}).value || "confirmed_preference";
    if (!chosen.length) {
      showFormError(root, "Pick at least one value for the criterion.");
      return;
    }
    if (!verbatim.trim()) {
      showFormError(root, "Write what the client said in their own words. A rule is not written without it.");
      return;
    }
    const res = await action("record_client_answer", {
      clientId,
      dimension: currentDimension,
      answer: kind === "confirmed_dealbreaker" ? "dealbreaker" : "preference",
      operator: opSel.value,
      values: chosen,
      kind,
      verbatim,
    });
    if (!res.ok) {
      showFormError(root, res.message);
      return;
    }
    closeModal();
    showToast("Recorded. Their file now says what they just said, and the old version is kept.");
    render();
    // The card comes back with the updated file, so the matchmaker decides
    // again with the new criterion in place.
    await openSend(clientId, cand, null, true);
  });
}

// Capturing a rejection. The choices offered are the ones that matter for this
// client and this candidate, not the whole vocabulary. The full list is still
// there, one step away, for the case that needs it.
function openReject(clientId, cand) {
  const cl = client(clientId);
  const dims = state.dimensions || [];
  const openedAt = Date.now();

  const clientDims = new Set();
  for (const p of cl.preferences || []) clientDims.add(p.dimension);
  for (const r of cl.rejections || []) if (r.dimension) clientDims.add(r.dimension);

  const relevant = dims.filter((d) => clientDims.has(d.key));
  const others = dims.filter((d) => !clientDims.has(d.key));

  const chip = (d) => {
    const value = valueOf(cand, d.key);
    return `<span class="dim-chip${value ? " with-value" : ""}" data-dim="${esc(d.key)}">${esc(d.label)}${value ? ` <span class="chip-value">${esc(value)}</span>` : ""}</span>`;
  };

  openModal(`
    <h2>What did they say no to · ${esc(cand.name)}</h2>
    <p class="muted small">The first conversation is about identity, the rejection conversation is about reality. Start from what is relevant to ${esc(cl.name)}. You can pick something else if it is not here.</p>
    <div class="field">
      <label>What was it about</label>
      <div class="dim-picker" id="dim-picker">${relevant.map(chip).join("")}</div>
      <details class="also"><summary id="other-label">Something else</summary>
        <div class="dim-picker" id="other-picker">${others.map(chip).join("")}</div>
      </details>
      <div class="muted small" id="suggest-line"></div>
    </div>
    <div class="field">
      <label>How firm was it</label>
      <div class="severity-row">
        <label><input type="radio" name="sev" value="preference" checked /> One of the reasons</label>
        <label><input type="radio" name="sev" value="likely_dealbreaker" /> Looks like a firm no</label>
        <label><input type="radio" name="sev" value="uncertain" /> Not sure yet</label>
      </div>
    </div>
    <div class="field">
      <label>Anything in the client's own words <span class="muted small">(optional)</span></label>
      <textarea id="free-text" placeholder="e.g. Not based in Bangalore, won't relocate"></textarea>
      <div class="suggest-line" id="free-suggest"></div>
    </div>
    <div class="field" id="rule-hint" hidden>
      <div class="notice"></div>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" type="button" data-close>Cancel</button>
      <button class="btn" id="save-reject">Save</button>
    </div>`);

  let selectedDim = null;
  const picker = $modal.querySelector("#dim-picker");
  const otherPicker = $modal.querySelector("#other-picker");
  const suggestLine = $modal.querySelector("#suggest-line");
  const ruleHint = $modal.querySelector("#rule-hint");

  const wireChips = (container) =>
    container.querySelectorAll(".dim-chip").forEach((chipEl) =>
      chipEl.addEventListener("click", () => {
        picker.querySelectorAll(".dim-chip").forEach((c) => c.classList.remove("selected"));
        otherPicker.querySelectorAll(".dim-chip").forEach((c) => c.classList.remove("selected"));
        chipEl.classList.add("selected");
        selectedDim = chipEl.getAttribute("data-dim");
        const value = valueOf(cand, selectedDim);
        suggestLine.textContent = value
          ? `${cand.name} is ${value} on ${dimLabel(selectedDim).toLowerCase()}.`
          : `Nothing is recorded about ${cand.name}'s ${dimLabel(selectedDim).toLowerCase()}.`;
        // If the client already has a rule here, say so. The rejection is
        // evidence, not permission to rewrite what the client told us.
        const rule = (cl.preferences || []).find((p) => p.dimension === selectedDim);
        if (rule) {
          ruleHint.hidden = false;
          ruleHint.querySelector(".notice").innerHTML = `${esc(cl.name)} has a rule about ${esc(dimLabel(selectedDim).toLowerCase())}: ${esc(rule.summary)}. If that has changed, ask them rather than changing it here. <button class="link-btn" data-ask-here="${esc(selectedDim)}">Ask the client</button>`;
          const askBtn = ruleHint.querySelector("[data-ask-here]");
          if (askBtn) {
            askBtn.addEventListener("click", () => {
              closeModal();
              openAnswer(clientId, cand, selectedDim);
            });
          }
        } else {
          ruleHint.hidden = true;
        }
      })
    );
  wireChips(picker);
  wireChips(otherPicker);

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
        freeSuggest.textContent = `That sounds like ${dimLabel(data.dimension).toLowerCase()}. Pick it above if that is right.`;
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
        ? `Saved. ${cl.name}'s file now records that they said no over ${dimLabel(selectedDim).toLowerCase()}.`
        : "Saved. It is on file, but with no reason, so there is nothing to check against next time."
    );
    render();
  });
}

function openAccept(clientId, cand) {
  const dims = state.dimensions;
  openModal(`
    <h2>They said yes · ${esc(cand.name)}</h2>
    <p class="muted small">What mattered, and anything that surprised you. Nothing is worked out from the profile, so what you noticed is what gets written down.</p>
    <div class="field">
      <label>What mattered <span class="muted small">(pick one or more)</span></label>
      <div class="dim-picker" id="accept-dim-picker">
        ${dims
          .map((d) => `<span class="dim-chip" data-dim="${d.key}" title="${esc(d.hint)}">${esc(d.label)}</span>`)
          .join("")}
      </div>
    </div>
    <div class="field">
      <label>Anything that surprised you <span class="muted small">(optional)</span></label>
      <textarea id="accept-surprise" placeholder="e.g. Warmer in person than the profile suggested"></textarea>
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
    showToast("Saved. It will come up the next time you review a profile for this client.");
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
    <p class="muted small">Synthetic demo records only. A new client gets the check by default. The pilot can move a client to the other group from the client page.</p>
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
    <h2>What ${esc(cl.name)} has said</h2>
    <p class="muted small">Record what the client told you, and how sure it is. A pattern you have noticed on your own is kept as an observation and offered to them, rather than treated as something they said.</p>
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
        <label>How sure is this</label>
        <div class="severity-row severity-column">
          <label><input type="radio" name="kind" value="observation" checked /> A pattern I noticed, to check with the client</label>
          <label><input type="radio" name="kind" value="stated_preference" /> What they said when they first came in</label>
          <label><input type="radio" name="kind" value="confirmed_preference" /> They confirmed this themselves</label>
          <label><input type="radio" name="kind" value="confirmed_dealbreaker" /> They confirmed this is a no</label>
        </div>
        <div class="muted small" id="kind-hint"></div>
      </div>
      <div class="field">
        <label for="p-note">Their own words</label>
        <input id="p-note" type="text" placeholder="e.g. She won't consider anyone outside Bengaluru" autocomplete="off" />
        <div class="muted small" id="note-hint"></div>
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
  const kindHint = root.querySelector("#kind-hint");
  const noteHint = root.querySelector("#note-hint");
  const kindEls = [...root.querySelectorAll('input[name="kind"]')];
  function renderHints() {
    const kind = (kindEls.find((el) => el.checked) || {}).value;
    kindHint.textContent =
      kind === "observation"
        ? "An observation is something you noticed. It is shown to you and offered to the client, and it never rules a profile out on its own."
        : kind === "stated_preference"
          ? "What they said when they first came in. It is advice, and it does not stop a profile going out."
          : kind === "confirmed_preference"
            ? "They confirmed this. It is checked every time, and shown as a preference rather than a no."
            : "They confirmed this is a no. It is checked every time, and a profile that breaks it is a conflict.";
    noteHint.textContent =
      kind === "observation"
        ? "Optional. If they said something, put their words here."
        : "Needed. A confirmed criterion is only as good as the record of what they said.";
  }
  kindEls.forEach((el) => el.addEventListener("change", renderHints));
  renderHints();
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

function renderProfiles() {
  const cards = state.candidates
    .map(
      (cand) => `<div class="candidate">
        <div class="candidate-head">
          <div>
            <div class="candidate-name">${esc(cand.name)}</div>
            <div class="candidate-sub">${esc(cand.city)} · ${esc(cand.profession)} · ${esc(cand.source)}</div>
          </div>
        </div>
        <div class="taglist">
          ${cand.dimensions.length ? cand.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}${valueOf(cand, d) ? ": " + esc(valueOf(cand, d)) : ""}</span>`).join("") : `<span class="tag muted">nothing recorded</span>`}
        </div>
      </div>`
    )
    .join("");

  $app.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Profiles</h1>
        <p class="lead">Every profile in the workspace and what is known about it. To check one against a client, open that client and choose a profile to review.</p>
      </div>
      <button class="btn" data-add-candidate>Add a profile</button>
    </div>
    <div class="candidate-grid">${cards}</div>`;
}

// The check for a pair that is not on the client's list yet.
async function evaluateFor(clientId, cand) {
  const res = await fetch(
    `/api/check?clientId=${encodeURIComponent(clientId)}&candidateId=${encodeURIComponent(cand.id)}`
  );
  if (!res.ok) return null;
  return res.json();
}

// Choose a profile to review for this client. It shows what is known about
// each profile, so the matchmaker can pick without opening anything.
function openProfilePicker(clientId) {
  const cl = client(clientId);
  const onList = new Set(cl.queue.map((q) => q.id));
  const others = state.candidates.filter((c) => !onList.has(c.id));

  openModal(`
    <h2>Choose a profile to review for ${esc(cl.name)}</h2>
    <p class="muted small">${esc(cl.name)} has ${esc(dimLabel((cl.preferences[0] || {}).dimension) || "")}${cl.preferences.length ? " on file: " + esc(cl.preferences.map((p) => p.summary).join("; ")) : " nothing on file yet"}.</p>
    <div class="picker-list">
      ${
        others.length
          ? others
              .map(
                (cand) => `<button class="picker-row" data-pick="${esc(cand.id)}">
                  <div>
                    <div class="candidate-name">${esc(cand.name)}</div>
                    <div class="candidate-sub">${esc(cand.city)} · ${esc(cand.profession)}</div>
                    <div class="taglist">
                      ${cand.dimensions.length ? cand.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}${valueOf(cand, d) ? ": " + esc(valueOf(cand, d)) : ""}</span>`).join("") : `<span class="tag muted">nothing recorded</span>`}
                    </div>
                  </div>
                </button>`
              )
              .join("")
          : `<p class="muted small">Every profile is already on this client's list.</p>`
      }
    </div>
    <div class="modal-actions">
      <button class="btn secondary" type="button" data-close>Close</button>
      <button class="btn" type="button" data-new-profile>Add a new profile</button>
    </div>`);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-close]").addEventListener("click", closeModal);
  root.querySelectorAll("[data-pick]").forEach((row) =>
    row.addEventListener("click", async () => {
      const cand = candidate(row.getAttribute("data-pick"));
      closeModal();
      const review = await evaluateFor(clientId, cand);
      if (!review) {
        showToast("That check could not run.");
        return;
      }
      await openSend(clientId, cand, review);
    })
  );
  root.querySelector("[data-new-profile]").addEventListener("click", () => {
    closeModal();
    openAddCandidate();
  });
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
  if (e.target.closest("[data-add-matchmaker]")) {
    openAddMatchmaker();
    return;
  }
  const addPref = e.target.closest("[data-add-pref]");
  if (addPref) {
    openPreferenceEditor(addPref.getAttribute("data-add-pref"));
    return;
  }
  const addCand = e.target.closest("[data-add-cand]");
  if (addCand) {
    openProfilePicker(addCand.getAttribute("data-add-cand"));
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
  const pickEl = e.target.closest("[data-add-cand]");
  if (pickEl) {
    openProfilePicker(pickEl.getAttribute("data-add-cand"));
    return;
  }
  const askClientEl = e.target.closest("[data-ask-client]");
  if (askClientEl) {
    const clientId = askClientEl.getAttribute("data-ask-client");
    const dimension = askClientEl.getAttribute("data-dimension");
    const cand = (client(clientId).queue || [])[0] || candidate((state.candidates || [])[0].id);
    openAnswer(clientId, cand, dimension);
    return;
  }
  const sayNoEl = e.target.closest("[data-say-no]");
  if (sayNoEl) {
    const clientId = currentClientId;
    openReject(clientId, candidate(sayNoEl.getAttribute("data-say-no")));
    return;
  }
  const sayYesEl = e.target.closest("[data-say-yes]");
  if (sayYesEl) {
    const clientId = currentClientId;
    openAccept(clientId, candidate(sayYesEl.getAttribute("data-say-yes")));
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
