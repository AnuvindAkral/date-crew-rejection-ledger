---
title: The Date Crew - Product Growth Assessment, Phase 1 Sitemap
status: complete
created: 21 October 2026
phase: product structure, no build
depends_on: EXPERIMENT.md
---

# SITEMAP

The smallest set of screens that demonstrates the core intervention. Nothing here is built in this phase. Four surfaces, three of them new, all of them on the matchmaker's side of the product. There is no client app, no onboarding app, no analytics dashboard and no AI assistant, because each of those would add surface area without testing the hypothesis.

---

## 1. Structure

```
Matchmaker workspace (existing CRM shell, prototype built as a standalone web app)
|
+-- Client list (existing pattern, unchanged)
|
+-- Client record
|   +-- [T] Reason Ledger          NEW, tab on the existing client record
|   +-- [T] Constraints             MERGE, existing preferences section, read only in the prototype
|   +-- [T] Match history           EXISTING, reused
|
+-- Shared profiles (existing flow, unchanged in shape)
    +-- [T] Reject Reason Sheet     NEW, modal, invoked from the reject action
    +-- [T] Send with Conflict Check NEW, sheet, invoked from the share action
```

---

## 2. Screen 1, Reject Reason Sheet

**Purpose.** Turn a rejection, the moment it happens, into a countable, comparable, reusable fact. This is the screen that makes every other screen possible, and it is the one worth demonstrating first.

**User action.** The matchmaker rejects a shared profile and picks one dimension, one severity, optionally a line of free text.

**Information displayed.**

- The candidate's name or Magic Link handle and photograph, so the matchmaker is looking at the right person.
- A fixed list of twelve dimensions: religion or community, age or stage, education, profession or seniority, income or financial situation, location or city tier, family situation or parents, diet or lifestyle, appearance or grooming, personality or temperament, values or intent, marital history. Each carries a one line definition on hover.
- A severity toggle, deal breaker or preference.
- A free text field, pre-filled with the model's proposed dimension when free text was typed first.
- A private checkbox, "not for the client", defaulted on for the note field. The matchmaker can turn it off for something the client should hear.

**Inputs and outputs.**

| Input | Output |
| --- | --- |
| Dimension, severity, optional free text, privacy flag | A `rejection_logged` event with client, profile, dimension, severity, text, timestamp and capture latency |
| | A line in the client's Reason Ledger |
| | A change to the candidate's dimension tags, so a later acceptance can be compared against a rejection |

**Important states.**

- Empty, first use for this profile, no prior rejections by this client.
- Suggested dimension awaiting confirmation, where the model proposed one and the matchmaker has not touched it.
- Dimension recorded and sent, the normal close.
- Escalating severity, where the matchmaker marks a dimension as a deal breaker on a client who has previously treated it as a preference. The sheet asks once whether the client has been asked. It does not write to the client.
- Overridden dimension, where the matchmaker picks something off the list. This is recorded, not punished, and off-list dimensions are reviewed once a month to see whether the list needs a new entry.
- Private note on, which is the default. The client never sees this state.

**Navigation.** Opens as a sheet over the shared profile view. Closes to the profile view with the ledger line visible in the client record. No new top level navigation.

**How it supports the hypothesis.** The hypothesis is about behaviour at the send point, which needs history. History needs capture. If capture does not happen, nothing downstream is real, so this screen is the load bearing part of the prototype.

---

## 3. Screen 2, Reason Ledger

**Purpose.** Show the matchmaker, per client, what has been rejected, on what dimension, how often, and where the client's own behaviour contradicts their own stated pattern. This is where the ledger earns its name.

**User action.** Open a client's ledger to read it before a search session or before a send.

**Information displayed.**

- **Dimension rows.** One per dimension the client has ever rejected on. Each row shows rejected count, the dates, the severity on the most recent occurrence, and the number of times the client has accepted a profile with that same dimension.
- **Contradiction markers.** On any dimension where the client rejected and later accepted, a marker states both facts in one line, with the two profiles visible on hover. Example: *"Rejected 3 on city tier, most recently 12 Aug. Accepted 1 on city tier on 02 Sep."*
- **Client confirmed rules.** A small, separate block for dimensions the client has explicitly settled, each with the date and the matchmaker who asked. Only these are treated as standing constraints.
- **Unconfirmed patterns.** Dimensions where rejections cluster but no client confirmation exists. Visually distinct from confirmed rules, and never applied automatically.
- **Recent rejections list.** The last ten with their free text, so the matchmaker can read the reasoning rather than the label.
- **Capture completeness.** A quiet line at the top, "18 of 21 rejections have a dimension", so the matchmaker knows how much the ledger is missing.

**Inputs and outputs.**

| Input | Output |
| --- | --- |
| Nothing. This screen is read only in the prototype | The matchmaker's decision about whether to send, question the client, or dismiss |
| The client's confirmed rule, recorded from Screen 3 | A `card_resolved` event with action `client rule recorded` |

**Important states.**

- Empty client, no rejections logged yet. Shows a prompt to log rejections, not a blank grid.
- Partial, where capture is incomplete. The completeness line is visible.
- Contradiction present, which is the state the whole design is for.
- Confirmed rules present, which is the state where the ledger has earned trust.
- Long client history, where the dimension list is long and the screen risks becoming a report. Cap the visible rows and collapse the rest behind a count, so the screen stays scannable.

**Navigation.** A tab on the existing client record, next to the existing preferences and match history sections. The Match History tab is reused as is.

**How it supports the hypothesis.** It is the evidence surface for the conflict check. The check on Screen 3 is only credible if the matchmaker can go and see the underlying history in one click. A conflict card with no way to inspect its evidence is a nag with a badge on it.

---

## 4. Screen 3, Send with Conflict Check

**Purpose.** Stop one specific, avoidable waste at the moment it is caused: sharing a profile that conflicts with something this client has already said or already rejected. This is the only screen where the intervention actually changes behaviour.

**User action.** The matchmaker selects a candidate for a client and chooses to share. The check runs before the share completes.

**Information displayed.**

**State A, conflict.** The candidate hits a dimension the client rejected on and last marked as a deal breaker.

- The dimension, stated plainly.
- How many earlier profiles were rejected on it, and the date of the most recent.
- The earliest rejected profile on that dimension, with its reason in the matchmaker's own words, so the check is not just a label.
- A line naming the client's confirmed rule, if there is one.
- Two actions: Share anyway, with a reason code, or Do not share.
- A third action, Ask the client, which drafts the question into the matchmaker's next check in note.

**State B, contradiction.** The candidate hits a dimension the client rejected on, but the client has since accepted a profile with that dimension.

- Both facts side by side. The rejected profile and the accepted profile, each with its date and the dimension highlighted.
- One question, in the matchmaker's voice: *"You rejected three profiles for city tier and later accepted one with it. Is that a deal breaker, or a preference?"*
- Three answers: Deal breaker, Preference, Not sure. Not sure produces a note to bring to the client rather than a rule.
- A visible reminder that the answer is recorded as the client's rule and that the client's preference field is not changed without their confirmation.

**State C, no conflict.** The candidate is clean. The screen shows a single quiet line, "no conflict against 3 recorded dimensions", and gets out of the way. A screen that appears every time and says nothing most of the time is how you train people to ignore it.

**Inputs and outputs.**

| Input | Output |
| --- | --- |
| Client identifier, candidate, the client's Reason Ledger | A `card_shown` event with state, dimension and the evidence profile |
| Matchmaker action | A `card_resolved` event with action and timestamp |
| The client's answer to the question | A confirmed rule on the ledger, and a note attached to the client's next check in |

**Important states.**

- Conflict, as above.
- Contradiction, as above.
- Clean.
- Suppressed, where this client is in the control arm of the experiment, or the matchmaker has dismissed the card for this client this week. The card still fires and is logged, it just does not display.
- Ledger incomplete, where the matchmaker has never logged a rejection for this client. The card says so rather than implying a clean bill of health that the data does not support.
- Overridden, where the matchmaker shared anyway. The override is logged with its reason code, and it is not shown to anyone except in the matchmaker's own quality view. No penalty, no leaderboard.

**Navigation.** Opens as a sheet over the existing share action. Closes back to the shared profiles view. No new navigation.

**How it supports the hypothesis.** This is the intervention. Everything else exists to make this screen accurate and worth reading.

---

## 5. Screen 4, the client side, deliberately not built

There is no client-facing screen in this prototype, and that is a design decision rather than an omission.

The candidate client surfaces were considered and set aside for specific reasons.

| Surface | Why not in the prototype |
| --- | --- |
| Client rejections as a structured form | Adds friction to the person the business model exists to protect. The matchmaker already hears the reason in conversation. Capturing it twice buys nothing |
| Client preference editor | The client already has one in the member portal. A second one creates two sources of truth and a silent-change risk |
| Client contradiction review | Asking the client to adjudicate their own contradiction is the highest friction, lowest trust option, and the matchmaker can ask the same question in their normal check in |
| Client facing dashboard of their rejections | Turns the service into a self-service product and breaks the promise of a managed journey |

The one client interaction the design needs is a single question, asked by the matchmaker, in the existing check in, and recorded on the ledger. That is a process change with a screen to record it, and it needs no client software at all.

---

## 6. Primary user journey

The journey below is the one to demo. It runs about ninety seconds.

1. **Matchmaker opens a client's shared profiles** and sees a candidate. They open the Reason Ledger tab. One line reads: *"Rejected 4 on city tier, most recently 12 Aug. Accepted 1 on city tier on 02 Sep."* The client had rejected this candidate for relocation. The matchmaker now knows that this client is inconsistent on relocation, not settled.

2. **The matchmaker is about to share a candidate who is relocating for work.** They choose share. The conflict check fires in the contradiction state, showing the rejected profile and the accepted profile side by side, with the question on screen.

3. **The matchmaker picks Not sure** and adds it to the next check in note. The card resolves, the candidate is shared, and the override is logged.

4. **In the next check in,** the matchmaker asks the client one question. The client says relocation is a preference, not a deal breaker, as long as the other person is settled about it. The matchmaker records that as a client confirmed rule on the ledger.

5. **Two weeks later,** the matchmaker is about to send another relocating candidate. The card fires in the clean state, because the rule now says preference, not deal breaker. The matchmaker sends it. The client engages, because they were never going to say no to relocation.

Step 5 is the point of the whole thing. The intervention did not filter the candidate out. It turned a repeated contradiction into a settled question, and then it stopped asking.

---

## 7. Acceptance criteria

**Capture, Screen 1.**

- A matchmaker can reject a shared profile and record a dimension and severity in 10 seconds or less, measured as median capture latency.
- At least 80% of rejections get a dimension, measured across Phase 0.
- Free text is optional and never blocks the save.
- An off-list dimension can be chosen without a penalty, and the off-list options are reviewable monthly.

**Ledger, Screen 2.**

- Every rejected profile with a dimension appears on the client's ledger within the same session.
- A dimension where the client rejected and later accepted is marked as a contradiction, and the two profiles and dates are visible without a further click.
- Confirmed rules and unconfirmed patterns are visually distinct, and no unconfirmed pattern is ever applied automatically.
- Capture completeness is visible on the screen.
- The screen stays usable for a client with 50 logged rejections, with long dimensions collapsed behind counts.

**Conflict check, Screen 3.**

- The check runs on every share attempt for a client with at least one recorded rejection.
- The check never blocks a share. Every share path is reachable, and every bypass is logged with a reason code.
- In the contradiction state, the question is one question with three answers, and "Not sure" produces a next step note rather than a rule.
- No client preference field is written by this screen, in any state, under any code path. This is verified by a test, not by intention.
- The card fires and is logged even when it is suppressed in the control arm, so exposure is measurable.
- The clean state occupies one line and does not interrupt the share.

**Data and privacy, across all screens.**

- No client data crosses between client records. The ledger is scoped by client id at the query level, not at the display level.
- No client detail is exposed to the model. The model receives the free text of a single rejection and a fixed vocabulary, and returns one proposed dimension.
- The model output is stored as a proposal until a human confirms it.
- Every card exposure, override and rule change is written to an event log with an actor id.

**Scope.**

- Four surfaces, two of them new views and one new modal, inside a prototype shell that mimics the existing CRM.
- No changes to the member portal, no changes to Magic Link, no client facing surface, no analytics dashboard, no admin console.
- The prototype runs on synthetic or heavily redacted data during the demo, and on real data only under an explicit data access agreement during the measurement phase.

---

## 8. Explicitly out of scope for the prototype

| Excluded | Why |
| --- | --- |
| Profile ranking or compatibility scoring | Rejected in DECISIONS.md section 4.3, and the data to validate it will not exist for a year |
| AI writing intro emails or client messages | The brand already has AI in Magic Link descriptions, but intro messages are the most trust sensitive thing a matchmaker sends. Out of scope for a two week prototype |
| Cross client precedent search | High value and high privacy cost. It needs a de identification review that does not fit in two weeks |
| Sourcing team tooling | The brief's funnel starts at profiles shared, which is upstream of the matchmaker. A later phase, once the ledger is trusted |
| Anything touching client preference fields, even read through | Read access is fine and already exists. Write access is forbidden without client confirmation, and no prototype screen writes to it |
