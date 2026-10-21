"use strict";

let state = null; // bootstrap
let view = "clients";
let currentClientId = null;
let modal = null; // {type, clientId, candidateId, ...}
let suggestTimer = null;

const $app = document.getElementById("app");
const $modal = document.getElementById("modal-root");

const SEV_LABEL = {
  likely_dealbreaker: "Likely dealbreaker",
  preference: "Preference",
  uncertain: "Uncertain",
};

const REVIEW_LABEL = {
  conflict: "Conflict",
  contradiction: "Contradiction",
  repeat: "Prior rejection",
  clean: "No conflict",
  untagged: "Untagged candidate",
  no_history: "No feedback yet",
  uncoded_only: "History uncoded",
};

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

async function fetchBootstrap() {
  const res = await fetch("/api/bootstrap");
  state = await res.json();
}

async function action(type, payload) {
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });
  state = await res.json();
  return state;
}

// ---- rendering ----

function render() {
  if (view === "measurement") return renderMeasurement();
  if (view === "client" && currentClientId) return renderClient(currentClientId);
  renderClients();
}

function clientStatusChip(c) {
  const led = c.ledger;
  if (led.rows.some((r) => r.contradiction)) {
    return `<span class="chip contradiction">contradiction to resolve</span>`;
  }
  if (c.preferences.some((p) => p.kind === "confirmed_dealbreaker")) {
    return `<span class="chip conflict">confirmed dealbreaker</span>`;
  }
  if (led.total === 0) return `<span class="chip quiet">no feedback yet</span>`;
  return `<span class="chip clean">${led.codedCount} coded rejection${led.codedCount === 1 ? "" : "s"}</span>`;
}

function renderClients() {
  $app.innerHTML = `
    <h1>Clients</h1>
    <p class="lead">Your active clients. Open one to review feedback and send profiles. Synthetic data.</p>
    <div class="client-list">
      ${state.clients
        .map(
          (c) => `
        <button class="client-card" data-open="${c.id}">
          <div style="flex:1; text-align:left">
            <div class="client-name">${esc(c.name)}</div>
            <div class="client-sub">${esc(c.city)} · ${esc(c.journey)} · ${c.arm === "intervention" ? "ledger on" : "control"}</div>
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

  const prefsHtml = prefs.length
    ? prefs
        .map(
          (p) => `<span class="pref-tag ${p.kind === "confirmed_dealbreaker" ? "dealbreaker" : ""}">${esc(dimLabel(p.dimension))} · ${p.kind === "confirmed_dealbreaker" ? "confirmed dealbreaker" : "preference"}${p.note ? " · " + esc(p.note) : ""}</span>`
        )
        .join("")
    : `<span class="muted small">No recorded preferences.</span>`;

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
              <span class="chip ${rv.state === "clean" ? "clean" : rv.state === "untagged" || rv.state === "no_history" ? "quiet" : rv.state === "conflict" ? "conflict" : "contradiction"}">${REVIEW_LABEL[rv.state]}</span>
            </div>
            <div class="taglist">
              ${cand.dimensions.length ? cand.dimensions.map((d) => `<span class="tag">${esc(dimLabel(d))}</span>`).join("") : `<span class="tag muted">no tags</span>`}
            </div>
            <div class="candidate-actions">
              <button class="btn" data-send="${cand.id}">Send</button>
              <button class="btn secondary" data-accept="${cand.id}">Accept</button>
              <button class="btn ghost" data-reject="${cand.id}">Reject</button>
            </div>
          </div>`;
        })
        .join("")
    : `<p class="muted small">No candidates in this client's queue.</p>`;

  $app.innerHTML = `
    <button class="back-link" data-back>← Back to clients</button>
    <div class="client-header">
      <h1>${esc(c.name)}</h1>
      <span class="muted small">${esc(c.city)} · ${esc(c.journey)} · ${c.arm === "intervention" ? "ledger on" : "control"}</span>
    </div>

    <h2>Preferences</h2>
    <div class="panel"><div class="preflist">${prefsHtml}</div></div>

    <h2>Rejection ledger</h2>
    <div class="panel">
      <div class="completeness">${c.ledger.codedCount} of ${c.ledger.total} rejections coded${c.ledger.uncoded ? ` · ${c.ledger.uncoded} uncoded` : ""}</div>
      ${ledgerHtml}
    </div>

    <h2>Acceptance insights</h2>
    <div class="panel">
      ${insightsHtml}
    </div>

    <h2>Shared profiles</h2>
    <div class="panel">
      ${queueHtml}
    </div>`;
}

function renderMeasurement() {
  const s = state.session;
  const ref = `
    <h2>Reference scenario</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Stage</th><th>Count</th><th>Step rate</th></tr>
        <tr><td>Profiles shared</td><td>1,000</td><td>—</td></tr>
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
          <td>${b.rate == null ? "—" : Math.round(b.rate * 100) + "%"}</td>
        </tr>`;
    })
    .join("");

  $app.innerHTML = `
    <h1>Measurement</h1>
    <p class="lead">Pilot operator view. Live session counts and the two metrics with their denominators.</p>

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

    <h2>Metric A · stated-preference conflict rate</h2>
    <div class="panel"><div class="muted small">Coded rejections whose reason was already in the client's recorded preferences at rejection time.</div></div>

    <h2>Metric B · repeat-conflict rate (recurrence)</h2>
    <div class="panel">
      <table class="metrics">
        <tr><th>Client</th><th>Metric A (coded)</th><th>Metric A conflicts</th><th>ARCR eligible / repeat</th><th>ARCR sub-rates</th><th>ARCR</th></tr>
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

function openModal(html) {
  $modal.innerHTML = `<div class="modal-backdrop"><div class="modal">${html}</div></div>`;
}

function closeModal() {
  modal = null;
  $modal.innerHTML = "";
}

function positiveStrip(rv) {
  const pos = rv.positive || [];
  if (!pos.length) {
    return `<div class="evidence-strip"><span class="strip-label">Supports sending</span><span class="muted">no positive signal recorded</span></div>`;
  }
  const items = pos
    .map((p) => {
      const src = p.source === "stated_preference" ? "stated preference" : "accepted before";
      const extra =
        p.source === "stated_preference"
          ? p.detail
            ? `: ${esc(p.detail)}`
            : ""
          : p.detail
            ? ` · ${esc(p.detail)}`
            : "";
      return `<span class="pos-item"><span class="pos-source">${src}</span> ${esc(dimLabel(p.dimension))}${extra}</span>`;
    })
    .join("");
  return `<div class="evidence-strip"><span class="strip-label">Supports sending</span>${items}</div>`;
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

function openSend(clientId, cand) {
  const rv = cand.review;
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

    if (rv.state === "conflict") {
      const pref = (clientRec.preferences || []).find(
        (p) => p.kind === "confirmed_dealbreaker" && p.dimension === finding.dimension
      );
      body = `
        <div class="card-state conflict"><h3>Conflict · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>This client has a <strong>confirmed dealbreaker</strong> on ${esc(dim)}${pref && pref.note ? `: <span class="q">“${esc(pref.note)}”</span>` : "."}</p>
          <p>The deterministic check fires because the candidate is tagged ${esc(dim)}.</p>
        </div>`;
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
        </div>`;
      actions = `<button class="btn" data-ask>Ask the client</button><button class="btn secondary" data-proceed>Send anyway</button><button class="btn ghost" data-hold>Hold</button>`;
    } else {
      // repeat
      body = `
        <div class="card-state repeat"><h3>Prior rejection · ${esc(dim)}</h3></div>
        <div class="evidence">
          <p>This client has rejected this dimension before, most recently as <strong>${SEV_LABEL[finding.severity]}</strong>.</p>
          <p>This is an unconfirmed pattern, not a confirmed dealbreaker. It does not block a send.</p>
        </div>`;
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
  const ask = () => openAnswer(clientId, cand, cand.review.findings[0] ? cand.review.findings[0].dimension : null);
  const hold = () => holdSend(clientId, cand.id);

  const root = $modal.querySelector(".modal");
  root.querySelector("[data-proceed]") && root.querySelector("[data-proceed]").addEventListener("click", send);
  root.querySelector("[data-ask]") && root.querySelector("[data-ask]").addEventListener("click", ask);
  root.querySelector("[data-hold]") && root.querySelector("[data-hold]").addEventListener("click", hold);
  root.querySelector("[data-close]") && root.querySelector("[data-close]").addEventListener("click", closeModal);
}

async function sendAndResolve(clientId, candidateId, actionName, rationale, consultedInsightIds) {
  await action("share", { clientId, candidateId, consultedInsightIds });
  await action("resolve", { clientId, candidateId, action: actionName, rationale });
  closeModal();
  render();
}

async function holdSend(clientId, candidateId) {
  await action("resolve", { clientId, candidateId, action: "hold", rationale: "Held for review" });
  closeModal();
  render();
}

function openAnswer(clientId, cand, dimension) {
  openModal(`
    <h2>Ask the client · ${esc(dimLabel(dimension))}</h2>
    <div class="evidence">
      <p class="q">“You rejected profiles for ${esc(dimLabel(dimension))} and later accepted one with it. Is it a dealbreaker, or a preference?”</p>
      <p class="muted small">Recording the client's answer settles this dimension. Only the client's answer writes a rule.</p>
    </div>
    <div class="field">
      <label>What did the client say, in their words? <span class="muted small">(required to settle a rule)</span></label>
      <textarea id="verbatim" placeholder="e.g. Location is a preference, not a dealbreaker, as long as they're settled about it"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn" data-ans="preference">Preference</button>
      <button class="btn" data-ans="dealbreaker">Dealbreaker</button>
      <button class="btn ghost" data-ans="uncertain">Not sure</button>
    </div>`);

  const root = $modal.querySelector(".modal");
  const verbatimEl = root.querySelector("#verbatim");
  root.querySelectorAll("[data-ans]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const answer = btn.getAttribute("data-ans");
      await action("record_client_answer", {
        clientId,
        dimension,
        answer,
        verbatim: verbatimEl.value,
      });
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
    await action("reject", {
      clientId,
      candidateId: cand.id,
      dimension: selectedDim,
      severity,
      freeText: freeText.value,
      latencyMs: Date.now() - openedAt,
    });
    closeModal();
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
    await action("accept", {
      clientId,
      candidateId: cand.id,
      dimensions: [...selected],
      surprise: $modal.querySelector("#accept-surprise").value,
    });
    closeModal();
    render();
  });
}

// ---- events ----

$app.addEventListener("click", (e) => {
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
    if (view === "measurement") {
      currentClientId = null;
    }
    render();
  })
);

document.getElementById("reset-btn").addEventListener("click", async () => {
  await action("reset", {});
  currentClientId = null;
  view = "clients";
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === "clients"));
  render();
});

// ---- boot ----

(async function boot() {
  await fetchBootstrap();
  document.querySelector(".nav-btn[data-view='clients']").classList.add("active");
  render();
})();
