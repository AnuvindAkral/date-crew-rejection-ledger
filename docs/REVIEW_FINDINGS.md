---
title: Gate B - Independent review findings and reconciliation
status: closed, superseded by the final build
created: 21 October 2026
phase: 2B
reviewer: independent model, fresh context
---

# REVIEW FINDINGS AND RECONCILIATION

An independent model reviewed the Gate B documents in a fresh context against the brief in `docs/REVIEW_BRIEF.md`. This file captures the findings separately from the source documents, then records which were fixed, which were fixed with a caveat, and which were deferred.

---

## Material findings

| # | Finding | Disposition |
| --- | --- | --- |
| M1 | Power narrative claimed "190 clients per arm" to detect a 10-point ARCR change; the formula gives about 294 | Fixed. Corrected to roughly 290 per arm, recomputed from the stated MDD formula |
| M2 | "s = sqrt(p(1-p)) is a lower bound" is not a lower bound; client-level ARCR can be smaller via within-client averaging, and is highly discrete | Fixed. Rewrote the section to state s is unknown in both directions and the normal approximation is a loose model |
| M3 | ARCR is gamed by the same matchmaker it measures, via coding drift and denominator control, with no coding-accuracy audit | Fixed. Added a blind second-coder audit of rejection dimensions against free text, blind to arm, as a co-required gate |
| M4 | Candidate dimension tags had no source other than rejection capture, disabling the deterministic check on first presentation and leaking one client's coding into another | Fixed. Candidate tags are now objective sourcing/onboarding records; rejection-derived dimensions are client-scoped |
| M5 | Control arm does not isolate the mechanism, because capture is an active ingredient and the matchmaker retains history in working memory | Fixed with caveat. Renamed to no-surfacing control, stated the estimate is a lower bound, and added a measurement of whether control matchmakers consult the sheet |
| M6 | A matchmaker could create a client-confirmed rule or dealbreaker without client confirmation | Fixed. Severity vocabulary changed to likely-dealbreaker; added a ClientConfirmation entity; no confirmed rule can be written without a client's verbatim answer |
| M7 | Primary metric is decoupled from the distinctive contradiction mechanism | Fixed. Added a contradiction-conditional sub-rate to attribute any ARCR movement to the mechanism rather than to simple repeat surfacing |

## Minor findings

| # | Finding | Disposition |
| --- | --- | --- |
| m1 | Screen 5 contradicts "no analytics dashboard" and exposes the metric to the measured subject | Fixed. Screen 5 is now pilot-operator-only, not matchmaker-facing |
| m2 | No screen captures the client's clarification answer | Fixed. The ledger records the client's answer through a record-client-answer affordance |
| m3 | Consent is unqualified and clients are the experiment unit | Partially fixed. Consent from matchmakers and clients now noted in the setup; full detail deferred to PILOT_PLAN.md at Gate D |
| m4 | Differential attrition to eligibility is unaddressed | Fixed. Eligibility counts per arm and an attrition test added to the analysis |
| m5 | Capture-latency thresholds inconsistent (10s and 15s) | Fixed. Target 10s, guardrail median at or under 15s, stated once |
| m6 | "Redact where possible" is a weak redaction rule | Fixed. Audit payload redaction is unconditional, and free-text access is scoped to the owning client's matchmaker |

---

## Deferred items

| # | Item | Reason |
| --- | --- | --- |
| D1 | Full client consent and disclosure wording | Belongs to the pilot plan, which is a Gate D deliverable. The setup line now names the requirement |
| D2 | A powered pilot's real sample size | Cannot be computed without TDC's client count, profile volume and between-client variance, none of which exist. Sensitivity scenarios stand in their place |

---

## What the review did not overturn

The reviewer's overall judgement confirmed the direction: the withdrawal of the Phase 1 power claim, the split into Metric A and Metric B, the disclosure of the capture-in-control trade, and the feasibility framing all survived. The headline conclusion, that a two-week pilot cannot establish a causal effect on ARCR, was judged correct and retained unchanged.
