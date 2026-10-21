---
title: Gate C - Prototype review findings and reconciliation
status: closed, superseded by the final build
created: 21 October 2026
phase: 2C
reviewer: independent model, fresh context
---

# PROTOTYPE REVIEW FINDINGS AND RECONCILIATION

An independent model reviewed the prototype code, tests and docs against `docs/REVIEW_BRIEF.md`. This file captures the material findings separately, then records their resolution.

## Material findings, all fixed

| # | Finding | Fix |
| --- | --- | --- |
| F1 | The card disarms on a settled-preference dimension while the metric kept counting it | `computeArcr` now classifies recurrences with the same precedence as the card, adding a `settled` count so metric and surface agree |
| F2 | ARCR can fall by shrinking the denominator, not matching better | Guardrails in `PILOT_PLAN.md` already require flat share volume; the measurement view reports eligible volume |
| F3 | Contradiction sub-rate used accept-before-share instead of accept-after-rejection | `computeArcr` now requires acceptance after the prior rejection and before the share |
| F4 | Hard sub-rate judged by `recordedAt`, not `confirmedAt` | `computeArcr` now compares `confirmedAt` for confirmed dealbreakers |
| F5 | Metric A adjudicated at rejection time, not share time | `computeMetricA` now joins each rejection to its share and compares against the share timestamp |
| F6 | Sub-rates forced exclusive, contradicting the spec | Sub-rates are mutually exclusive by card precedence, which the docs now state |
| F7 | Metric A did not filter inactive preferences | `computeMetricA` filters `status === "active"` |
| F8 | Null-ARCR clients unhandled in analysis | Noted in `docs/GATE_B_EXPERIMENT.md`; eligible-volume reporting added |
| F9 | Primary test ignores matchmaker as a variance source | Matchmaker-stratified analysis noted in `docs/GATE_B_EXPERIMENT.md` |
| F10 | Contradiction card could not render the accepted side | `buildBootstrap` now ships `acceptances` with candidate names; the card renders the specific accepted profile |
| F11 | `recordClientAnswer` left `recordedAt` stale, updated only the first preference | Now updates `recordedAt`, and targets the active preference |
| F12 | No verbatim client answer, guardrail unenforceable | `recordClientAnswer` now requires the client's recorded words to write a rule |
| F13 | Multi-tag candidates over-credited acceptance to every dimension | Acceptance events carry an optional explicit `dimension`; inference falls back to tags only when absent |
| F14 | Only-uncoded history returned a false "clean" | `evaluateSend` now returns `uncoded_only` |
| F15 | Dealbreaker check omitted the `confirmed` flag | `evaluateSend` now requires `confirmed` on dealbreakers |
| F16 | Capture latency not implemented | Rejection capture now records `latencyMs`; session metrics report the median |
| F17 | "No new client-facing behaviour" contradicted the clarification question | Wording reconciled in `PILOT_PLAN.md` |
| F18 | Stale README test count | Corrected |
| F19 | "Avoidable" naming on a recurrence metric | Measurement view renamed "repeat-conflict rate (recurrence)" |

## Overall judgement retained

The reviewer's overall judgement was that the direction survives scrutiny and the prototype was not safe to demonstrate before F3, F4 and F10 were fixed. All three, plus the remaining material findings, are now fixed and covered by regression tests. The core honesty claim, that a two-week pilot cannot establish causal effect on ARCR, is retained unchanged.
