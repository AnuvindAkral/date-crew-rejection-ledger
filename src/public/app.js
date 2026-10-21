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
  if (!res.ok) {
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
              <span class="pref-tag ${p.kind === "confirmed_dealbreaker" ? "dealbreaker" : ""}">${esc(dimLabel(p.dimension))} · ${p.kind === "confirmed_dealbreaker" ? "confirmed dealbreaker" : "preference"}${p.value ? " · " + esc(p.value) : ""}</span>
              <button class="link-btn" data-rm-pref="${esc(p.id)}" data-dim="${esc(p.dimension)}">Remove</button>
            </div>
            ${p.note ? `<div class="pref-note">“${esc(p.note)}”</div>` : `<div class="pref-note muted small">No note recorded. Add the client's own words.</div>`}
            <div class="pref-meta">${p.source === "client_answer" ? "confirmed by the client" : "recorded at intake"} · ${p.recordedBy ? esc(p.recordedBy) : "unknown"}${p.recordedAt ? " · " + relTime(p.recordedAt) : ""}</div>
          </div>`
        )
        .join("")
    : `<p class="muted small">Nothing recorded for this client yet. Without a criterion, the check has nothing to compare against and says so rather than reporting no conflict.</p>`;

  const withdrawnHtml = withdrawn.length
    ? `<div class="pref-meta withdrawn-note">Withdrawn: ${withdrawn
        .map((p) => `${esc(dimLabel(p.dimension))} · ${esc(p.value || "")}`)
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
                : `${e.before && e.before.value !== e.after.value ? `changed from ${esc(e.before.value)} to ` : ""}${e.after.kind === "confirmed_dealbreaker" ? "confirmed dealbreaker" : "preference"} · ${esc(e.after.value)}`
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
        <span class="muted small">${esc(c.city)} · ${esc(c.journey)} · ${c.matchmakerName ? esc(c.matchmakerName) : "unassigned"} · ${c.arm === "intervention" ? "ledger on" : "control arm"}</span>
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
  const st = s.sendTime;
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
      <p class="note">Supplied scenario figures from the assessment brief. About 35% of rejections were for reasons already stated in client preferences, denominator ambiguous. This is reference context, not this session's data.</p>
    </div>`;

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

  const armRows = `
    <tr>
      <th>Arm</th><th>Profiles shared</th><th>Checked</th><th>Not checked</th><th>With a confirmed conflict</th><th>Dealbreaker / preference</th><th>Unknown, not clean</th><th>Rate</th>
    </tr>
    <tr>
      <td>Intervention (the check is shown)</td>
      <td>${st.intervention.shared}</td>
      <td>${st.intervention.checked}</td>
      <td>${st.intervention.notChecked}</td>
      <td>${st.intervention.conflictShares}</td>
      <td>${st.intervention.dealbreakerConflictShares} / ${st.intervention.preferenceConflictShares}</td>
      <td>${st.intervention.unknownShares}</td>
      <td>${pct(st.intervention.rate)}</td>
    </tr>
    <tr>
      <td>Control (the check is computed but not shown)</td>
      <td>${st.control.shared}</td>
      <td>${st.control.checked}</td>
      <td>${st.control.notChecked}</td>
      <td>${st.control.conflictShares}</td>
      <td>${st.control.dealbreakerConflictShares} / ${st.control.preferenceConflictShares}</td>
      <td>${st.control.unknownShares}</td>
      <td>${pct(st.control.rate)}</td>
    </tr>`;

  const clientRows = st.perClient
    .map(
      (c) => `<tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.arm)}</td>
        <td>${c.shared}</td>
        <td>${c.checked}</td>
        <td>${c.conflictShares}</td>
        <td>${c.unknownShares}</td>
        <td>${pct(c.rate)}</td>
        <td>${c.overrideRate == null ? "n/a" : pct(c.overrideRate)}</td>
      </tr>`
    )
    .join("");

  $app.innerHTML = `
    <h1>Measurement</h1>
    <p class="lead">Pilot operator view. The primary metric is measured at the moment of sending, and the check is recomputed on the server at that moment, so these are facts about the sends rather than claims by the interface.</p>

    <h2>Primary · confirmed-criterion conflict rate at send time</h2>
    <div class="panel">
      <table class="metrics">${armRows}</table>
      <p class="note"><strong>Definition.</strong> Profiles shared where the send-time check reported a conflict against a client-confirmed criterion, divided by the profiles that were checked, times 100. The numerator keeps dealbreaker conflicts and confirmed-preference mismatches apart. Ordinary stated preferences and prior-rejection history are advisory and are not in the numerator.</p>
      <p class="note"><strong>Denominator.</strong> The profiles that were checked. A share with no check has an unknown conflict status, so it is reported in its own column rather than folded in. Coverage is ${pct(st.intervention.coverage)} on the intervention arm. A share where the check could not be made because a candidate attribute is missing is reported as unknown and is never counted as a clean result.</p>
      <p class="note"><strong>Override.</strong> Of the conflicts the tool put in front of the matchmaker, the share that still went to the client: ${pct(st.intervention.overrideRate)} on the intervention arm. The control arm's rate is what the same check would have found without being shown, which is the comparison the pilot is built around.</p>
      <p class="note">Synthetic data. These numbers describe this demo session, not The Date Crew's business. A working demo is evidence that the workflow exists, not evidence that any business metric moved.</p>
    </div>

    <h2>Per client</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Client</th><th>Arm</th><th>Shared</th><th>Checked</th><th>Conflicts</th><th>Unknown</th><th>Rate</th><th>Override</th></tr>
        ${clientRows || `<tr><td colspan="8" class="muted">No shares yet.</td></tr>`}
      </table>
    </div>

    <h2>Session counts</h2>
    <div class="metric-grid">
      <div class="metric-card"><div class="metric-value">${s.shares}</div><div class="metric-label">Shares</div></div>
      <div class="metric-card"><div class="metric-value">${s.codedRejections}</div><div class="metric-label">Coded rejections</div></div>
      <div class="metric-card"><div class="metric-value">${s.uncodedRejections}</div><div class="metric-label">Uncoded rejections</div></div>
      <div class="metric-card"><div class="metric-value">${s.acceptances}</div><div class="metric-label">Acceptances</div></div>
      <div class="metric-card"><div class="metric-value">${s.insights}</div><div class="metric-label">Acceptance insights</div></div>
      <div class="metric-card"><div class="metric-value">${s.confirmations}</div><div class="metric-label">Client confirmations</div></div>
      <div class="metric-card"><div class="metric-value">${s.resolutions}</div><div class="metric-label">Card resolutions</div></div>
    </div>

    <h2>Diagnostic · historical conflict rate</h2>
    <div class="panel"><div class="muted small">Coded rejections whose reason was already in the client's recorded preferences at rejection time. This is the post-hoc version of the brief's 35% figure, and its denominator is the rejections, not the shares. Use the primary metric above to judge the intervention.</div></div>

    <h2>Diagnostic · repeat-conflict rate (recurrence)</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Client</th><th>Historical (coded)</th><th>Conflicts</th><th>ARCR eligible / repeat</th><th>ARCR sub-rates</th><th>ARCR</th></tr>
        ${rows}
      </table>
      <p class="note">ARCR measures recurrence, not avoidability. Sub-rates split the numerator by the evidence available at share time: hard (a confirmed dealbreaker existed), settled (a confirmed preference, so the card is silent), contradiction (a prior rejection then a later acceptance), plain (a prior rejection only). Synthetic, illustrative data.</p>
    </div>

    <h2>Learning loop · acceptance insight consultation</h2>
    <div class="panel">
      <div class="metric-value">${s.insightConsultation.consulted} / ${s.insightConsultation.eligible}${s.insightConsultation.rate == null ? " · no opportunity yet" : ` = ${Math.round(s.insightConsultation.rate * 100)}%`}</div>
      <p class="note">Of the acceptance insights that had a subsequent recommendation to inform, how many were explicitly consulted.${s.insightConsultation.noOpportunity ? ` ${s.insightConsultation.noOpportunity} insight${s.insightConsultation.noOpportunity === 1 ? "" : "s"} with no subsequent recommendation yet ${s.insightConsultation.noOpportunity === 1 ? "is" : "are"} not counted as unconsulted.` : ""} This measures whether the learning loop is used, not whether it improves matching. Recommendation quality and accepted-to-meeting outcomes are later-validation questions, not two-week claims.</p>
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
      if (p.source === "stated_preference") {
        return `<span class="pos-item"><span class="pos-source">matches stated preference</span> ${esc(dimLabel(p.dimension))}${p.detail ? `: ${esc(p.detail)}` : ""}</span>`;
      }
      return `<span class="pos-item"><span class="pos-source">accepted before</span> ${esc(dimLabel(p.dimension))}${p.detail ? ` · ${esc(p.detail)}` : ""}</span>`;
    })
    .join("");
  return `<div class="evidence-strip"><span class="strip-label">Supports sending</span>${items}</div>`;
}

function findingLine(f) {
  const label = dimLabel(f.dimension);
  if (f.type === "conflict") {
    return `<strong>Conflict on ${esc(label)}:</strong> this candidate is ${esc(f.value)}, and the client confirmed ${esc(f.value)} is a dealbreaker.`;
  }
  if (f.type === "preference_mismatch") {
    return `<strong>Preference mismatch on ${esc(label)}:</strong> this candidate is ${esc(f.value)}, the client prefers ${esc(f.preference.value)}.`;
  }
  if (f.type === "incomplete") {
    return `<strong>Missing information on ${esc(label)}:</strong> ${esc(f.detail)}.`;
  }
  if (f.type === "contradiction") {
    return `<strong>Contradiction on ${esc(label)}:</strong> rejected ${f.rejections.length} here, then accepted one on the same dimension.`;
  }
  return `<strong>Prior rejection on ${esc(label)}:</strong> ${f.rejections ? f.rejections.length : 0} earlier rejection${f.rejections && f.rejections.length === 1 ? "" : "s"} on this dimension.${f.note ? " " + esc(f.note) + "." : ""}`;
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

function openSend(clientId, cand, reviewOverride) {
  const rv = reviewOverride || cand.review;
  const cl = client(clientId);

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
      ? `<div class="also-flagged">${others.map((f) => `<div>${findingLine(f)}</div>`).join("")}</div>`
      : "";

    if (rv.state === "conflict") {
      const pref = (clientRec.preferences || []).find(
        (p) => p.kind === "confirmed_dealbreaker" && p.dimension === finding.dimension
      );
      body = `
        <div class="card-state conflict"><h3>Conflict · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>This client has a <strong>confirmed dealbreaker</strong> on ${esc(dim)}${pref && pref.note ? `: <span class="q">“${esc(pref.note)}”</span>` : "."}</p>
          <p>The candidate is <strong>${esc(finding.value)}</strong>${pref && pref.value ? `, and the client confirmed <strong>${esc(pref.value)}</strong> is a dealbreaker` : ""}. The comparison is on the value, not on the category.</p>
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
          <p>This candidate is <strong>${esc(finding.value)}</strong>. The client's stated preference is <strong>${esc(finding.preference.value)}</strong>${finding.preference.note ? `: <span class="q">“${esc(finding.preference.note)}”</span>` : "."}</p>
          <p>${finding.advisory ? "This is a stated preference, not a confirmed dealbreaker, so it is advice rather than a warning." : "This is a client-confirmed preference."} It does not block a send.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-ask>Ask the client</button><button class="btn ghost" data-hold>Hold</button>`;
    } else if (rv.state === "incomplete") {
      body = `
        <div class="card-state no_history"><h3>Information missing · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>${esc(finding.detail)}.</p>
          <p>The client has something recorded here, and we cannot check the candidate against it. Unknown is not the same as compatible, so it is worth a moment before sending.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-close>Hold</button>`;
    } else {
      // repeat
      body = `
        <div class="card-state repeat"><h3>Prior rejection · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>This client has rejected this dimension before${finding.severity ? `, most recently as <strong>${SEV_LABEL[finding.severity]}</strong>` : ""}.</p>
          <p>This is an unconfirmed pattern, not a confirmed dealbreaker. It does not block a send.</p>
        </div>${alsoHtml}`;
      actions = `<button class="btn" data-proceed>Send anyway</button><button class="btn secondary" data-ask>Ask the client</button><button class="btn ghost" data-hold>Hold</button>`;
    }
  }

  openModal(`
    <h2>Send review · ${esc(cand.name)} → ${esc(cl.name)}</h2>
    ${body}
    ${positiveHtml}
    ${insightsHtml}
    <div class="modal-actions">${actions}</div>`);

  const send = () => {
    const consulted = [...$modal.querySelectorAll(".consult-check:checked")].map((el) => el.getAttribute("data-insight"));
    sendAndResolve(clientId, cand.id, "proceed", "Send reviewed", consulted);
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

  openModal(`
    <h2>Record what ${esc(cl.name)} said</h2>
    <p class="muted small">A preference is advice you can still trade against. A dealbreaker is an explicit no, and only the client can give one. Changing a criterion here is recorded with what it replaced.</p>
    <form id="pref-form" novalidate>
      <div class="field">
        <label for="p-dim">Which dimension</label>
        <select id="p-dim">
          ${dims.map((d) => `<option value="${esc(d.key)}">${esc(d.label)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="p-val">Which value</label>
        <select id="p-val"></select>
      </div>
      <div class="field">
        <label>What did the client say it is</label>
        <div class="severity-row">
          <label><input type="radio" name="kind" value="stated_preference" checked /> Preference</label>
          <label><input type="radio" name="kind" value="confirmed_dealbreaker" /> Confirmed dealbreaker</label>
        </div>
        <div class="muted small">An ordinary preference is advice. A confirmed dealbreaker stops the profile going out.</div>
      </div>
      <div class="field">
        <label for="p-note">The client's own words <span class="muted small">(recommended)</span></label>
        <input id="p-note" type="text" placeholder="e.g. She won't consider anyone outside Bengaluru" autocomplete="off" />
      </div>
      ${
        existing.length
          ? `<div class="field"><label>Already on file</label>${existing
              .map(
                (p) =>
                  `<div class="muted small">${esc(dimLabel(p.dimension))} · ${p.kind === "confirmed_dealbreaker" ? "confirmed dealbreaker" : "preference"} · ${esc(p.value || "")}</div>`
              )
              .join("")}<div class="muted small">Saving over one of these replaces it and records the change.</div></div>`
          : ""
      }
      <div class="form-error" role="alert" hidden></div>
      <div class="modal-actions">
        <button class="btn secondary" type="button" data-close>Cancel</button>
        <button class="btn" type="submit">Save criterion</button>
      </div>
    </form>`);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-close]").addEventListener("click", closeModal);
  wireDimensionValue(root.querySelector("#p-dim"), root.querySelector("#p-val"));
  root.querySelector("#pref-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await action("set_preference", {
      clientId,
      dimension: root.querySelector("#p-dim").value,
      value: root.querySelector("#p-val").value,
      kind: root.querySelector('input[name="kind"]:checked').value,
      note: root.querySelector("#p-note").value,
    });
    if (!res.ok) return showFormError(root, res.message);
    const dim = root.querySelector("#p-dim").value;
    const val = root.querySelector("#p-val").value;
    closeModal();
    showToast(`Saved: ${dimLabel(dim)} · ${val}.`);
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
    openSend(clientId, candidate(candId), review);
    return;
  }
  const sendEl = e.target.closest("[data-send]");
  if (sendEl) {
    const cand = client(currentClientId).queue.find((q) => q.id === sendEl.getAttribute("data-send"));
    openSend(currentClientId, cand);
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
