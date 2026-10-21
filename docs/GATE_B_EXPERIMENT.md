---
title: Gate B - Experiment design
status: closed, superseded by the final build
created: 21 October 2026
phase: 2B
depends_on: docs/GATE_B_METRICS.md
---

# GATE B: EXPERIMENT DESIGN

This replaces the Phase 1 before-and-after design, which sequenced everyone into the intervention in period two and called it randomisation. That design is confounded by time and is withdrawn.

---

## 1. Design

Concurrent, client-level, two-arm pilot.

**Control arm (no-surfacing control).** The matchmaker works as they do today. No rejection ledger, no pre-send card. The measurement layer still records structured reasons in the same vocabulary, so the control arm's outcomes are measurable. This is a deliberate decision and its trade-off is stated in section 4.

The control arm is a no-surfacing control, not a no-capture control. Structured capture is an active ingredient, not an inert measurement instrument, and a matchmaker who just typed a rejection reason carries that history in working memory whether or not a card renders. The pilot therefore estimates the incremental effect of surfacing over capture, which is a lower bound on the product's total effect. This is disclosed, not assumed away.

**Intervention arm.** The matchmaker gets the Rejection Ledger and the pre-send conflict/contradiction card, on top of the same structured capture.

The treatment difference is the *surfacing* of prior evidence at the send point. Capture runs in both arms because capture is required to measure the primary metric in both arms.

**Assignment unit.** The client. A matchmaker can hold clients in both arms, which is why contamination is addressed directly rather than assumed away.

**Allocation procedure.** Pre-registered seed, blocked randomisation. Blocks are matchmaker, and within matchmaker a coarse stratum of journey stage (new against ongoing). Assignment is fixed at pilot start and not re-randomised. The seed and the allocation list are written down before the first share, not after.

**Duration.** Proposed schedule:

| Period | Duration | What happens |
| --- | --- | --- |
| Setup | 1 week | Stage definitions frozen, vocabulary frozen, consent from matchmakers and clients with disclosure that structured feedback is recorded, matchmaker training, instrumented capture live in both arms |
| Observation | 2 weeks | Concurrent arms run |
| Analysis and decision | 1 week | Client-level comparison, guardrails checked, decision rule applied |

Total four weeks elapsed. The two-week observation window establishes feasibility and a directional signal only. It does not establish a causal effect on ARCR, for reasons set out in section 5.

---

## 2. Arms in detail

| | Control | Intervention |
| --- | --- | --- |
| Structured rejection capture | Yes, as a measurement instrument | Yes |
| Rejection ledger view | No | Yes |
| Pre-send conflict card | No, and it is not shown even if it would fire | Yes |
| AI-proposed dimension tag | Yes, same vocabulary | Yes |
| Client preference edits | Only via the existing portal, client-confirmed | Same, plus the ledger can record a client-confirmed rule only after a client answers the question |

The control arm's structured capture is a measurement instrument, not a workflow change. The matchmaker logs the rejection reason as they do today, and the dimension is tagged in the same sheet, but no history is shown back and no card fires. This keeps the arms comparable while preserving the "no surfacing" control.

---

## 3. Analysis

**Primary analysis.** Client-level. Each client contributes one ARCR over the observation window. Compare the distribution of client-level ARCR between arms with a two-sample permutation test or a Wilcoxon test, with the pooled rate reported as descriptive. The permutation test is preferred because ARCR is a bounded proportion and the sample is small.

**Secondary analyses.**

- The three ARCR sub-rates separately: hard-conflict, contradiction-conditional and plain-recurrence, so recurrence is not mistaken for avoidability.
- Capture rate, capture latency, flag action rate, contradiction surface rate, matchmaker minutes per profile, by arm.
- Rejection coding accuracy, from a blind second-coder audit of a sample of rejection dimensions against the verbatim free text, blind to arm. This gates interpretation of ARCR.
- A within-client paired sensitivity analysis for intervention-arm clients only, acknowledging the time confound and reporting it as exploratory.
- Report results per matchmaker, so a mix shift between arms is visible rather than hidden.
- Report eligibility counts per arm and test for differential attrition, since a client contributes to ARCR only if they reach an eligible share after assignment.

**Uncertainty disclosure.** All estimates carry confidence intervals. With the sample sizes this pilot can realistically reach, those intervals will be wide. The report states the width rather than smoothing it.

---

## 4. Threats, addressed

**Client-level clustering.** Profiles from one client are not independent. The primary analysis operates at the client level, which removes the within-client clustering problem from the test statistic. This is a correction to the Phase 1 analysis, which treated profiles as independent.

**Contamination.** A matchmaker holding clients in both arms may carry the intervention's habit into control clients, and may retain a client's history in working memory regardless of the card. Mitigations: the card is scoped per client and only renders for intervention clients; matchmakers are briefed that the card is client-specific; card exposure is logged per client so contamination can be estimated; whether control-arm matchmakers consult the capture sheet is itself measured, so the retains-the-history channel is observed rather than assumed; and a washout is considered if control behaviour shows treatment-like drift. The residual contamination is disclosed, not assumed away.

**Baseline uncertainty.** ARCR's baseline is unknown, since the brief only supplies the Metric A proxy and that has an ambiguous denominator. The pilot therefore treats the instrumented period as the baseline measurement and reports it, rather than comparing against an assumed number.

**Small samples.** TDC's client count and pilot volume are not known and are not invented. The pilot is sized as a feasibility study. If enrolment is below the minimum in section 5, the pilot is reported as feasibility only, with no causal claim.

**Differences in profile volume and activity.** Client-level rates normalise for volume. Remaining imbalance in activity is handled by the blocked allocation and by reporting per-matchmaker and per-stratum.

**Missing feedback.** Rejections without a coded dimension are reported as the uncoded rate and are excluded from the numerator but not silently dropped from the denominator. The pilot stops early if the uncoded rate is high, because the metric is not interpretable.

**Observation effects, Hawthorne.** Matchmakers change behaviour when watched, in both arms. The control arm is the guard against this, which is the main reason a concurrent control is required rather than a before-and-after.

---

## 5. Power audit

The Phase 1 claim, withdrawn. Phase 1 reported that 180 profiles per period would detect a fall from 25% to 15% with p about 0.02 and around 70% power. That calculation treated profiles as independent Bernoulli trials, used a baseline that was assumed rather than measured, and never justified the effect size. It is wrong and is not reused.

**What a correct calculation requires.**

1. Number of clients per arm.
2. Profiles per client per window.
3. The between-client variance of client-level ARCR, which depends on the base rate and the intra-client correlation, both unknown.

None of the three is available, and TDC's actual client count is not invented. A reliable power calculation is therefore not possible now. Sensitivity scenarios are provided instead.

**Sensitivity scenarios.** Minimum detectable difference in client-level ARCR at 80% power and a two-sided 5% level, for a two-sample comparison of client-level means. The between-client standard deviation s is genuinely unknown and is not asserted as a bound in either direction. A client-level ARCR is a mean over that client's eligible shares, so s can be smaller than sqrt(p(1-p)) when a client has many shares and little between-client heterogeneity, or larger when heterogeneity dominates. The table uses s = sqrt(p(1-p)) purely as a reference point, not a bound, so it is illustrative rather than optimistic.

| Clients per arm | Baseline p | s | MDD in percentage points |
| --- | --- | --- | --- |
| 12 | 0.25 | 0.433 | about 50 |
| 20 | 0.25 | 0.433 | about 38 |
| 40 | 0.25 | 0.433 | about 27 |
| 100 | 0.25 | 0.433 | about 17 |

MDD formula: 2.802 x s x sqrt(2 / n), where 2.802 is the sum of the 80% and 97.5% normal quantiles. The normal approximation is itself a loose model, because a client with one to three eligible shares has a highly discrete ARCR, and the intended permutation test does not assume normality.

Reading the table. Even 100 clients per arm detects only roughly a 17 point absolute change under this reference s. A plausible effect is a fraction of the baseline, say a 25% ARCR cut to around 15%, which is a 10 point absolute change. Detecting that needs roughly 290 clients per arm under the reference s, and the discreteness of the client-level variable only makes it harder. That is a real, long pilot, not this phase.

**Conclusion, stated plainly.** A two-week pilot with a small number of clients cannot establish a causal effect on ARCR at any reasonable power. It can establish feasibility: whether capture reaches the 80% target at the ten second latency, whether the ledger surfaces genuine contradictions, whether the card changes send-time behaviour, whether matchmaker time stays flat, and whether any safety guardrail breaks. Causal evidence on ARCR requires a longer run and tens to hundreds of clients per arm.

This is the honest frame for the whole deliverable. The prototype proves the mechanism can be built and used. A real pilot proves it helps. These are different claims and the report keeps them apart.

---

## 6. Decision rule, set before data

**Continue** toward a powered pilot if all feasibility bars hold and the directional signal is consistent.

1. Capture rate at least 80% and median latency at or under 15 seconds.
2. Contradiction surface rate greater than zero, with each surfaced contradiction carrying evidence from both a rejection and a later acceptance.
3. Flag action rate greater than zero, meaning the card changed at least one decision or prompted one clarification.
4. No safety guardrail breached.
5. ARCR point estimate lower in the intervention arm, reported with its wide confidence interval and no claim of significance.

**Iterate** if capture or latency misses, if the false-positive flag rate is high, if matchmaker time rises, or if the card is ignored, meaning action rate near zero or override rate above 80%.

**Change direction** if no genuine contradiction ever surfaces, meaning the repeat-with-later-accept pattern the ledger was built for does not exist in this population, or if ARCR does not move and matchmakers report the card is not the constraint. Pivot options, in order: the one-question process change, asked at the first rejection, with no ledger; then downstream work on the conversation to meeting stage.

**Stop** if any safety guardrail breaks, a preference is changed without client confirmation, a client reports feeling processed or managed, a cross-client privacy leak occurs, or the matchmakers ask for the tool to be removed, which in a human-led business is the strongest signal available.

---

## 7. Feasibility evidence against causal evidence

| Claim | Kind | Established by |
| --- | --- | --- |
| Matchmakers can capture structured reasons quickly and consistently | Feasibility | The two-week run, this phase |
| The ledger surfaces genuine contradictions with evidence | Feasibility | The two-week run, this phase |
| The card changes send-time behaviour | Feasibility, directional | The two-week run, weak signal |
| The ledger reduces ARCR | Causal | A powered pilot, not this phase |
| Any change in completed meetings, marriages or revenue | Causal, distant | Out of scope for any short pilot |
