---
title: The Date Crew Rejection Ledger - Project Status
status: Phase 2, Gate B complete
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
| `phase1/` | Five Phase 1 files, copied unchanged, sha256 verified | Preserved |
| `docs/` | Gate B specification documents | Complete |
| `src/` | Prototype source | Not started |
| `test/` | Prototype tests | Not started |
| `PROJECT_STATUS.md` | This file | Current |

Local git repository, no remote. gitleaks pre-commit hook copied from the brain vault and `core.hooksPath` set to `.githooks`.

---

## 2. Approved direction

| Decision | Value |
| --- | --- |
| Product | Rejection Ledger |
| Primary user | Human matchmaker |
| AI role | Propose a structured dimension from free text; a human confirms; never decides |
| Hard constraint | Historical behaviour must never silently override a client's explicitly confirmed preference |
| Access to TDC | None |
| Data | Synthetic only in the prototype |

---

## 3. Gate status

| Gate | Scope | Status |
| --- | --- | --- |
| A | Workspace created, Phase 1 files safely copied | Complete |
| B | Metric definitions, experiment design, sitemap, data model, independent review | Complete |
| C | Sitemap and core interaction approved, prototype build | Awaiting approval |
| D | Prototype demonstrated and tests reviewed | Not started |
| E | Independent critique of the prototype | Not started |
| F | Final deliverables approved for external sharing | Not started |

---

## 4. Gate B outcomes

**Documents created.**

- `docs/GATE_B_METRICS.md` - Metric A and Metric B, the 35% interpretations, guardrails.
- `docs/GATE_B_EXPERIMENT.md` - concurrent client-level design, power audit, decision rule.
- `docs/GATE_B_SITEMAP.md` - five screens with states and acceptance criteria, the demo journey.
- `docs/GATE_B_DATA_MODEL.md` - entities, state distinctions, the seven rules.
- `docs/GATE_B_DECISIONS.md` - decisions and trade-offs.
- `docs/REVIEW_BRIEF.md` - self-contained brief for an independent reviewer.
- `docs/REVIEW_FINDINGS.md` - the reviewer's findings and their reconciliation.

**Primary metric.** Avoidable repeat-conflict rate (ARCR), at the client level. Numerator: eligible shared profiles rejected for a dimension with a prior coded rejection before the share. Denominator: eligible shared profiles, being shares for a client with prior coded history where the candidate carries objective dimension tags.

**Experiment.** Concurrent, client-level, blocked randomisation. The control arm is a no-surfacing control. A two-week pilot establishes feasibility only; causal evidence on ARCR needs a longer, larger run.

**Independent review.** A fresh-context reviewer found seven material and six minor defects. The material ones were fixed: a wrong power figure, a mislabelled variance bound, a gameable metric, a missing candidate-tag source, an understated contamination channel, a client-confirmation hole, and a metric decoupled from the distinctive mechanism.

---

## 5. Decisions recorded in Gate B

1. Two metrics, not one. Metric A diagnostic, Metric B primary.
2. Both arms record structured reasons; the treatment difference is the surfacing.
3. Client-level assignment and analysis, blocked by matchmaker and journey stage.
4. The Phase 1 power claim is withdrawn; sensitivity scenarios stand in its place.
5. ARCR over raw acceptance rate.
6. Dealbreakers are deterministic; AI sits only on the capture edge.
7. Historical rejection is never a standing rule.
8. No client-facing surface.
9. Missing data is never evidence of compatibility.
10. Zero-dependency local stack with a no-model path.

---

## 6. Open questions carried to Gate C

| # | Question | Why it matters |
| --- | --- | --- |
| 1 | Confirm the 35% denominator with the source when access exists | Changes the Metric A baseline and the size of the opportunity |
| 2 | The real between-client variance of ARCR | The single input that would size a powered pilot |
| 3 | Whether the reject-then-accept pattern exists in TDC's population | If not, the distinctive mechanism has no target |
| 4 | Whether matchmakers accept capture in the control arm as measurement only | The no-surfacing control depends on it |

---

## 7. Next phase

Gate C: approve the metric definitions, experiment design and sitemap, then build the prototype. No source code has been written, no dependency installed, no server started, no screenshot taken, nothing deployed or published.

**Prototype implementation is awaiting approval.**
