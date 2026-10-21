---
title: The Date Crew Rejection Ledger - Project Status
status: Phase 2, prototype complete
created: 21 October 2026
workspace: /Users/anuvindmac/Documents/DIY Setup/date-crew-rejection-ledger
---

# PROJECT STATUS

Phase 2 of The Date Crew product growth assessment. Phase 1 research and diagnosis is preserved unchanged in `phase1/`. This file tracks Phase 2.

**Do not read `phase1/PROJECT_STATUS.md` for current state.** This file supersedes it.

---

## 1. Where things are

| Path | Contents | State |
| --- | --- | --- |
| `phase1/` | Five Phase 1 files, preserved unchanged, sha256 verified | Preserved |
| `docs/` | Gate B specifications, review briefs and findings, interview protocol, curveball, AI usage, submission checklist, scorecard gate | Complete |
| `src/` | Prototype source, zero dependency | Built |
| `test/` | Rules, store, metrics, bootstrap, insights and UI regression tests | 43 passing |
| `screenshots/` | Clients, client detail, contradiction card, confirmed-dealbreaker conflict | Captured and checked |
| `README.md`, `PILOT_PLAN.md`, `ASSIGNMENT_SUBMISSION.md`, `docs/DEMO_SCRIPT.md` | Run, pilot, submission and demo documentation | Complete |
| `PROJECT_STATUS.md` | This file | Current |

Local git repository, no remote. gitleaks pre-commit hook active.

---

## 2. Approved direction

| Decision | Value |
| --- | --- |
| Product | Rejection Ledger |
| Primary user | Human matchmaker |
| AI role | Propose a structured dimension from free text; a human confirms; never decides |
| Hard constraints | Historical behaviour never silently overrides a confirmed client preference; missing data is never a clean result |
| Data | Synthetic only, labelled in UI, API and seed |

---

## 3. Gate status

| Gate | Scope | Status |
| --- | --- | --- |
| A | Workspace, Phase 1 preserved, git | Complete |
| B | Metrics, experiment, sitemap, data model, review | Complete |
| C | Prototype build, positive evidence, fixes | Complete |
| D | Tests reviewed, defects fixed and re-run | Complete |
| E | Independent critique, reconciled | Complete |
| F | External sharing, deployment, publication | Pending user approval |

---

## 4. What the prototype does

Five screens, matchmaker-side only: workspace, rejection capture, the rejection ledger, the send review with conflict, contradiction and clean states, and an operator-only measurement view.

The send review now shows both sides: what supports sending (source-labelled stated preferences and observed acceptances) and what warrants caution (conflict, contradiction, or prior rejection). A "Not sure" answer holds the send and writes no rule. A rule is written only from the client's recorded words. Control-arm clients compute warnings but never see them.

The acceptance debrief adds the positive half of the learning loop. When a client accepts a profile, the matchmaker records what mattered and what surprised them. That insight surfaces, with a checkbox, at the next send review, and the matchmaker marks whether it informed the recommendation. The measurement view reports the consultation rate: of captured insights, how many were explicitly consulted in a later recommendation. That measures whether the loop is used, not whether it improves matching.

The deterministic rules enforce the hard constraints: a confirmed dealbreaker fires a hard conflict; a historical rejection is never a standing rule; missing information is never "clean"; the only code path that writes a preference requires a recorded client answer.

### The sourcing scorecard is excluded

The scorecard was gated on data and did not pass. The synthetic dataset has roughly two to five candidates per source channel, far too few for a meaningful channel-level comparison, so no channel view is rendered. The `source` field remains on every candidate, ready if real data ever supports it. The reasoning is in `docs/SOURCING_SCORECARD_GATE.md`, and the interview protocol's question 3 is the correct next step before any scorecard.

---

## 5. Independent review outcome

Two review rounds. The first found seven material and six minor defects across the Gate B specs; all seven material ones were reconciled. The second reviewed the prototype and found the measurement code did not match the documented recurrence and avoidability definitions, plus a contradiction card that could not render its acceptance evidence. Those defects are fixed and covered by regression tests. The reviewer's overall judgement was that the direction survives scrutiny and the core honesty claim, that a two-week pilot cannot establish causal effect, is correct.

---

## 6. Decisions carried forward

1. Two metrics, not one: Metric A diagnostic, ARCR primary.
2. ARCR measures recurrence, not avoidability; three sub-rates (hard, contradiction, plain) plus a settled count.
3. Concurrent client-level control, with the control arm as a no-surfacing control.
4. The Phase 1 power claim withdrawn; sensitivity scenarios in its place.
5. AI only proposes a tag from free text; the decision is deterministic.
6. No client-facing surface; the one client question is asked by the matchmaker.
7. The independent red-team review narrowed the scope: the client-facing "Unexpected Yes" reframe was rejected, the ledger was kept unchanged, the acceptance debrief was chosen as the primary addition, and the sourcing scorecard was gated on data and excluded.

## 7. Validation plan

The five-conversation matchmaker interview protocol is prepared in `docs/INTERVIEW_PROTOCOL.md` and has not been run. It is the validation plan, not a research claim. Its four questions gate the build decisions: does acceptance carry new information, is it already captured and does it reach the next decision, is channel a meaningful axis, and is the recurring problem missing information or unused information.

## 8. Open questions

| # | Question | Why it matters |
| --- | --- | --- |
| 1 | Confirm the 35% denominator with the source when access exists | Changes Metric A baseline and the size of the opportunity |
| 2 | The real between-client variance of ARCR | Sizes a powered pilot |
| 3 | Whether the reject-then-accept pattern exists in TDC's population | The distinctive mechanism's target |
| 4 | Whether matchmakers accept capture in the control arm | The no-surfacing control depends on it |
| 5 | Whether acceptance carries information rejection data does not | Gates the acceptance debrief |
| 6 | Whether channel is a meaningful axis to matchmakers | Gates the sourcing scorecard |

## 9. Remaining limitations

- The prototype proves the mechanism, not the effect. No claim that the debrief improves matching, that ARCR falls, or that completed meetings or revenue move.
- The workflow-fit assumption is unvalidated: the debrief has not been tested with real matchmakers.
- Screenshots are genuine renders but were captured programmatically; this agent could not visually inspect them.
- The demo runs on synthetic data with a keyword heuristic standing in for the model.
- No resume was produced or updated, per instruction.

## 10. Next

Gate F. The submission response is written in `ASSIGNMENT_SUBMISSION.md`, restructured to the brief's own headings and word limits, with the pre-send check as the centrepiece and the acceptance debrief demoted to a next step. It keeps three claims separate: the red-team review as a scope-changing decision, the interview protocol as a validation plan, and the prototype as proof that the mechanism works technically. Nothing is deployed, published or emailed until the user approves external sharing.
