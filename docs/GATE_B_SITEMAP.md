---
title: Gate B - Sitemap
status: closed, superseded by the final build
created: 21 October 2026
phase: 2B
depends_on: phase1/SITEMAP.md
---

# GATE B: SITEMAP

Five screens, all matchmaker-side, all necessary for the minimum journey. No client app, no admin console, no analytics dashboard. This refines the Phase 1 sitemap by adding the workspace entry screen and a measurement view, and by specifying empty, missing-data and error states per screen.

```
Matchmaker workspace
  +-- Client list
  +-- Client record
        +-- Rejection Ledger        (screen 3)
        +-- Match history           (existing pattern)
  +-- Share flow
        +-- Send review             (screen 4, conflict/contradiction card)
  +-- Rejection flow
        +-- Reject capture          (screen 2, structured reason)
  +-- Measurement                  (screen 5, labelled pilot metrics)
```

---

## Screen 1: Matchmaker workspace

**Purpose.** Entry point. Pick a client and see the active work in one place.

**Main user action.** Select a client from the list.

**Information displayed.** A client list with a short status line per client: name or handle, journey stage, count of pending shares, count of captured rejections, and a quiet flag when the ledger shows an unresolved contradiction. Synthetic data only.

**Inputs and outputs.** Input: none. Output: a selected client, which routes to the client record.

**State transitions.** Idle list, to client record on select.

**Empty state.** No clients, shows the seeded demo list only.

**Missing-data state.** A client with zero captured rejections shows "no feedback logged" rather than an empty ledger summary.

**Error state.** A failed client load shows a retry and never shows a fabricated client.

**Acceptance criteria.** A matchmaker reaches any seeded client in one click. The list never renders cross-client detail.

---

## Screen 2: Reject capture

**Purpose.** Turn a rejection, at the moment it happens, into a coded, comparable fact. This screen makes every other screen possible.

**Main user action.** Reject a shared profile and record one dimension, one severity, and optional free text.

**Information displayed.** The candidate's name or handle and photo, the client name, the fixed dimension vocabulary (twelve dimensions with a one-line definition), a severity control with three values (likely-dealbreaker, preference, uncertain), and a free-text field. A likely-dealbreaker is the matchmaker's read and never becomes a confirmed dealbreaker until the client confirms it. When free text is entered first, a suggested dimension appears as a proposal marked "suggested, confirm to apply".

**Inputs and outputs.**

| Input | Output |
| --- | --- |
| Dimension, severity, optional free text, privacy flag | A rejection event with client, profile, dimension, severity, text, timestamp, capture latency |
| | A row on the client's ledger |
| | A dimension tag on the candidate, so a later acceptance can be compared |

**State transitions.**

- Untouched, dimension not selected.
- Suggested, the model proposed a dimension and the matchmaker has not confirmed or changed it.
- Confirmed, dimension and severity recorded and saved.
- Off-list, the matchmaker types a dimension outside the vocabulary. Recorded, not punished, reviewable.

**Empty state.** First rejection for this client, no prior history to show.

**Missing-data state.** A rejection saved with severity but no dimension is allowed only as "uncoded", and it increments the uncoded rate, never a dimension row.

**Error state.** A save that fails is recoverable and the original text is never discarded on failure.

**Acceptance criteria.** A rejection can be captured in ten seconds or less. Free text never blocks save. The suggested dimension requires confirmation before it becomes a fact. The original text is always preserved verbatim.

---

## Screen 3: Rejection ledger

**Purpose.** Show, per client, what was rejected, on what dimension, how often, and where the client's own behaviour contradicts their own pattern.

**Main user action.** Read the ledger before a search session or a send.

**Information displayed.**

- One row per dimension the client has rejected on: rejected count, dates, latest severity, and accepted count on that dimension.
- Contradiction markers: a dimension with at least one rejection and one later acceptance shows both, with the two profiles and dates visible without a further click.
- Client-confirmed rules, visually distinct, each with date and confirming matchmaker. Only these are standing constraints.
- Unconfirmed patterns, visually distinct, never applied automatically.
- Recent rejections with free text, so the matchmaker reads reasoning rather than labels.
- Capture completeness, one quiet line, such as "18 of 21 rejections coded".

**Inputs and outputs.** Input: none, read-only in the prototype. Output: the matchmaker's decision about whether to send, question the client, or hold.

**State transitions.** Empty to populated as rejections are captured. A contradiction marker appears when a later acceptance lands on a previously rejected dimension. A client-confirmed rule appears only when a client answers the clarification question and the matchmaker records the answer through the record-client-answer affordance.

**Empty state.** No rejections logged, shows "no feedback yet" and a prompt to log rejections, not a blank grid.

**Missing-data state.** Incomplete capture shows the completeness line prominently, and the ledger never implies a clean bill of health when capture is incomplete.

**Error state.** A client with more than 50 logged rejections collapses long dimension lists behind counts so the screen stays scannable rather than erroring or overflowing.

**Acceptance criteria.** Every coded rejection appears within the same session. A contradiction shows both relevant events and their dates. Confirmed rules and unconfirmed patterns are visually distinct and only the former are applied. No cross-client data renders.

---

## Screen 4: Send review, conflict and contradiction

**Purpose.** Stop one avoidable waste at the moment it is caused: sharing a profile that repeats feedback the client already gave.

**Main user action.** Choose to share a candidate, review the card if it fires, and proceed, hold, or resolve.

**Information displayed.** Three states.

**State A, conflict.** The candidate hits a dimension with a confirmed dealbreaker or a prior rejection classified as a dealbreaker. The card names the dimension, shows the count and date of prior rejections, shows the earliest rejection in the matchmaker's own words, and names the confirmed rule if one exists.

**State B, contradiction.** The candidate hits a dimension the client rejected on, and the client later accepted a profile on that dimension. The card shows the rejected profile and the accepted profile side by side, with dates and the dimension highlighted, and one question in the matchmaker's voice. Three provisional answers: dealbreaker, preference, not sure. A dealbreaker or preference answer queues a question for the client; it does not write a rule. A rule is recorded only after the client answers, via the record-client-answer affordance.

**State C, clean.** No conflict and no contradiction. One quiet line, then the share proceeds. A card that says nothing most of the time trains people to ignore it.

**Inputs and outputs.**

| Input | Output |
| --- | --- |
| Client, candidate, the client's ledger | A card-shown event with state, dimension, and evidence profile |
| Matchmaker action: proceed, hold, or resolve | A card-resolved event with action and timestamp |
| A client's answer to the clarification question | A client-confirmed rule on the ledger |

**State transitions.** The card fires or is suppressed. Suppression happens for control-arm clients, where the card is logged but not rendered. On resolution, the share proceeds or is held, and the resolution is logged with the matchmaker's rationale.

**Empty state.** Client with no recorded rejection, the card does not fire and the share proceeds without a card.

**Missing-data state.** Ledger incomplete, the card says so rather than implying a clean bill of health. A candidate with no dimension tags is treated as untagged, which is never read as compatible.

**Error state.** If evidence for a contradiction cannot be resolved to two real events, the card falls back to "no conflict" and never shows a contradiction on partial evidence.

**Acceptance criteria.** The check runs on every share for a client with any recorded rejection. It never blocks a share. Every bypass is logged with a reason code. No client preference field is written by this screen, verified by a test rather than by intention. The clean state occupies one line.

---

## Screen 5: Measurement

**Purpose.** Show illustrative event counts and the pilot metrics to pilot operators, clearly labelled as demonstration data where they are seeded. This screen is for the pilot operator, not the matchmaker, because showing the metric to the subject it measures invites gaming.

**Main user action.** View the counts, no editing.

**Information displayed.** Event counts: shares, rejections, coded rejections, uncoded rejections, contradictions surfaced, cards fired, cards resolved by action type. The two metrics, Metric A and ARCR, with their denominators stated. A clear label separating actual application events from seeded demonstration data.

**Inputs and outputs.** Input: none. Output: a read-only view of counts and rates.

**State transitions.** Static per session.

**Empty state.** No events, shows zeros with the metric definitions, not an error.

**Missing-data state.** The uncoded rejection count is shown next to the coded count, so the metric's denominator is visible.

**Error state.** A division by zero is shown as "no eligible shares", never as a fabricated rate.

**Acceptance criteria.** Every displayed rate has its numerator and denominator stated. Seeded data is labelled as seeded. No client is identifiable in the view.

---

## Core demo journey

One complete scenario, from rejection capture to a later pre-send decision, about ninety seconds.

1. Matchmaker selects a client from the workspace. The ledger shows a contradiction: rejected three profiles on city tier, accepted one on city tier later.
2. Matchmaker opens a candidate who is relocating for work. Choosing share fires the card in the contradiction state, showing the rejected and accepted profiles side by side.
3. Matchmaker answers "not sure". The card resolves, the share proceeds, and a note is queued for the next check-in.
4. In the next check-in, the client answers the question. The matchmaker records "city tier is a preference, not a dealbreaker" as a client-confirmed rule.
5. Two weeks later, a relocating candidate is shared and the card fires clean, because the dimension is now a confirmed preference rather than an open contradiction. The share proceeds without a prompt.

Step 5 is the point. The intervention did not filter the candidate out. It turned a repeated contradiction into a settled question, then stopped asking.

---

## Explicitly out of scope

| Excluded | Why |
| --- | --- |
| Profile ranking or compatibility scoring | Rejected in phase1/DECISIONS.md section 4.3, and no outcome labels exist to train or validate on |
| AI writing client messages | The brand reserves human authorship for introductions |
| Cross-client precedent search | High privacy cost, needs de-identification review outside this phase |
| Client-facing surface | Against the managed-journey promise and the autonomy constraint |
| Sourcing-team tooling | Upstream of the profiles-shared stage this intervention targets |
