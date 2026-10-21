---
title: Gate B - Metric definitions
status: closed, superseded by the final build
created: 21 October 2026
phase: 2B
depends_on: phase1/EXPERIMENT.md
---

# GATE B: METRIC DEFINITIONS

> **Superseded.** The primary metric in the final build is the confirmed-criterion conflict rate at send time, defined in [`../ASSIGNMENT_SUBMISSION.md`](../ASSIGNMENT_SUBMISSION.md) and implemented in `src/lib/metrics.js` as `computeSendTimeMetrics`. The two metrics below are kept as the working record of the design at Gate B, and Metric A survives as a post-hoc diagnostic. Read this file for the reasoning, not for the current definition.

This file resolves the two metrics and the guardrails. It supersedes the Phase 1 "Contradiction Rate" wording, which conflated stated preferences with rejection history and left the denominator ambiguous.

---

## 0. Why two metrics

| | Metric A | Metric B |
| --- | --- | --- |
| Concept | Share of rejections whose reason the client had already stated | Share of eligible shares rejected for a reason the client had already *rejected on before* |
| What it diagnoses | Process: are we sending what the client told us not to | Mechanism: is the ledger preventing a repeat the evidence could have caught |
| Role | Diagnostic, provisional baseline | Primary outcome |
| The intervention can move it | No, it is almost entirely determined by how preferences are recorded | Yes, this is what the ledger targets |

The two overlap but are not the same. A first rejection on a criterion the client stated on a call is a Metric A event and not a Metric B event, because there was no prior rejection on it. A repeat rejection on the same dimension is both.

---

## 1. Metric A: stated-preference conflict rate

**Concept.** The share of rejected profiles for which the rejection reason was already present in the client's recorded preferences at the time the profile was shared.

**Unit of analysis.** A rejection event, being one shared profile rejected by one client.

**Denominator.** Rejection events that have a coded dimension.

**Numerator.** Of those, rejections whose coded dimension was present in the client's recorded preference set as of the timestamp the profile was shared.

**Eligibility.**

- The rejection must carry a coded dimension.
- The client must have a recorded preference set that uses the same vocabulary and was present before the share timestamp.
- A preference recorded or edited after the share time does not count toward this rejection, because it was not available at send time.

**Time of measurement.** At rejection logging. Adjudicated against the preference snapshot at the share time, not the rejection time. This ordering matters because a client can edit preferences after a profile is shared.

**Missing data treatment.**

- Rejections with no coded dimension are excluded from the Metric A denominator and reported separately as the uncoded rejection rate. Dropping them silently would bias the rate, so the uncoded rate is a co-required number, not a footnote.
- A preference that exists only as free text and cannot be matched to a dimension is not treated as present. It is reported as an unmatched preference and is a signal to improve preference capture, not a Metric A event.

**Two sub-rates.**

| Sub-rate | Definition | Deterministic? |
| --- | --- | --- |
| Metric A-dealbreaker | The coded dimension matches a confirmed dealbreaker in the client's preferences at share time | Yes |
| Metric A-preference | The coded dimension matches a soft stated preference only | No |

**Preference conflict against dealbreaker violation.**

- A **stated preference** is a soft criterion the client expressed, such as "prefers a metro city". Sending a non-metro profile is a soft miss.
- A **confirmed dealbreaker** is a criterion the client has escalated to hard, recorded with client confirmation, such as "will not consider a smoker". Sending a smoker is a deterministic miss.

The ledger's hard, deterministic checks fire only on the dealbreaker subset. The preference subset is surfaced as information, not as a rule.

---

## 2. The 35% and its interpretations

The assessment reports "approximately 35%" of rejections were for reasons already mentioned in client preferences, with an ambiguous denominator. Three readings.

| Reading | Denominator | Computation | Result | As share of 1,000 shared |
| --- | --- | --- | --- | --- |
| R1 | 690 rejections | 0.35 x 690 | about 242 | 24.2% |
| R2 | 1,000 shared | 0.35 x 1,000 | 350 | 35.0% |
| R3 | unknown (clients, dimension events, or a period) | cannot compute | unknown | unknown |

R1 is the plain reading and is treated as the provisional baseline for Metric A, with the denominator assumption stated. R2 is a live alternative that would make the problem roughly half again as large. R3 cannot be resolved without the source. The two computable readings differ by about 108 profiles, which is large enough to change the conclusion, so the denominator must be confirmed before any number is treated as a confirmed baseline.

**What the 35% is not.** It is not a count of Metric B events. Metric B requires a *prior rejection on the same dimension*, which is a subset that the brief does not supply and that must be measured. The 35% bounds the opportunity; it does not equal the primary metric's baseline.

---

## 3. Metric B: avoidable repeat-conflict rate

The primary outcome. This is the metric the Rejection Ledger is built to move.

**Concept.** The share of eligible shared profiles that the client subsequently rejected for a dimension on which the client had already given rejection feedback before the profile was shared.

**Exact definition.**

> ARCR = (eligible shared profiles rejected for a dimension with at least one prior rejection observation before the share) / (eligible shared profiles)

**Unit of analysis.** The client. Each client contributes one ARCR over the observation window. The raw observation is the share event.

**Denominator: eligible shared profiles.** A shared profile is eligible when both hold at the share time:

1. The client has at least one coded rejection observation on any dimension before the share timestamp.
2. The candidate profile carries at least one dimension tag, so a comparison could have been made.

If the client has no prior rejection history, the ledger had nothing to surface and the share is not eligible. If the candidate is untagged, no comparison was possible and the share is not eligible.

**Numerator: repeat-conflict rejections.** An eligible shared profile is in the numerator when it was rejected, and the rejection's coded dimension matches a dimension on which the client has at least one coded rejection observation with a timestamp earlier than the share timestamp.

**Recurrence against avoidability.** ARCR measures recurrence, not avoidability. A prior rejection on a dimension does not by itself mean the next profile on that dimension should have been withheld. Avoidability is a stricter overlay, reported only where evidence available before sending establishes a plausible opportunity to act differently, and is never inferred from the eventual rejection alone. ARCR stays the primary outcome because it is measurable; it is not claimed to be avoidability.

**Three reporting sub-rates.** The ARCR numerator is reported as three sub-rates, so a recurrence is not mistaken for a proved avoidable miss.

| Sub-rate | Definition | Avoidability |
| --- | --- | --- |
| Hard-conflict rate | Eligible shares rejected on a dimension where a client-confirmed dealbreaker existed at send time | Strongest. The deterministic check would have fired |
| Contradiction-conditional rate | Eligible shares rejected on a dimension with both a prior rejection and a later acceptance before the share | A prompt, not a block, so avoidability is weaker |
| Plain-recurrence rate | Eligible shares rejected on a dimension with a prior rejection but neither a confirmed dealbreaker nor a later acceptance | Weakest. Prior preference or uncertain feedback |

The sub-rates are reported separately. They overlap where a share is both hard and contradictory, which is rare; overlaps are reported as such rather than forced into one bucket. Primary remains the combined ARCR.

**Lookback window.** All coded rejection observations for the client with a timestamp before the share. No hard expiry by default, because a client's dealbreakers do not expire automatically. A 180-day cap is run as a sensitivity check to confirm the result is not driven by stale history.

**Repeated profiles.** Each share event is one row. Re-sharing the same candidate to the same client after a prior rejection of that candidate is the most avoidable case and is flagged as a direct re-send sub-case, still counted in the numerator when it is rejected again.

**Repeated observations.** The numerator counts events, not unique dimensions. A client who rejects five profiles on city tier after prior city-tier feedback contributes five numerator events, which is correct, because each was a preventable repeat.

**Missing and ambiguous feedback.**

- A rejection with no coded dimension is not usable as prior evidence and is not a numerator event, because its dimension is unknown.
- It still sits in the denominator as a shared profile if the share was otherwise eligible.
- The uncoded rejection rate is reported alongside ARCR, and ARCR is only interpretable when that rate is stable and low.

**Avoidability overlay.** A rejection is reported as avoidable only when both conditions held at send time:

1. Prior evidence on the same dimension was coded before the share time.
2. The candidate carried that dimension tag at share time, from an objective sourcing or onboarding record, so the ledger's check could plausibly have fired. Rejection-derived dimensions are client-scoped and never become a candidate's objective tags.

A rejection is not avoidable merely because the client rejected a similar-looking profile. Similarity without a shared coded dimension is not evidence, and the eventual rejection is not, by itself, proof that the matchmaker could have acted differently. Avoidability is a separate report layered on top of ARCR, not the definition of ARCR.

**Aggregation across clients.**

- Per-client ARCR = client numerator / client denominator.
- Pooled ARCR = sum of numerators / sum of denominators, reported as descriptive.
- The primary analysis compares client-level ARCR between arms, because the client is the unit of assignment and the unit on which the intervention operates.

**Attribution.** ARCR falls when the deterministic dealbreaker check catches a repeat, or the contradiction prompt does, or a plain repeat is avoided. The three sub-rates show which. A fall driven only by plain recurrence is a valid but least distinctive win; a fall in the contradiction-conditional sub-rate is the distinctive mechanism working.

---

## 4. Why Metric B instead of raw acceptance rate

Raw acceptance rate is a composite. It moves with candidate quality, client mood, send volume, seasonality and journey stage, and it cannot distinguish a matchmaker who sends fewer wrong profiles from one who simply sends fewer profiles.

ARCR isolates the specific waste the ledger exists to remove: a repeat of feedback the client already gave. A fall in ARCR is traceable to the mechanism, meaningful at low volume, and cannot be produced by merely cutting sends, because the denominator is eligible shares and the guardrails penalise under-sending.

The trade is that ARCR is harder to measure, because it requires coded history and a correct time ordering. That cost is accepted, and it is exactly why capture quality and timestamp discipline are co-required numbers.

---

## 5. Guardrails

Separated into primary outcome, secondary outcomes and safety guardrails.

**Primary outcome.**

| Metric | Direction | Why |
| --- | --- | --- |
| Avoidable repeat-conflict rate (Metric B) | Lower is better | The thing the ledger is built to reduce |

**Secondary outcomes.**

| Metric | Direction | Why |
| --- | --- | --- |
| Reason capture rate, share of rejections with a coded dimension | Target at least 80% | Without it the ledger is built on sand |
| Capture latency, median seconds per rejection | Target 10s, guardrail median at or under 15s | The ten second capture target, verified |
| Flag action rate, share of cards that changed the send, prompted a question, or were explicitly dismissed | Observed | Whether the card does work or is ignored |
| Contradiction surface rate, share of eligible shares where the ledger showed a genuine contradiction | Observed | Whether the distinctive mechanism fires at all |
| Rejection coding accuracy, blind second-coder agreement against free text | Measured, gates ARCR interpretation | A matchmaker who codes repeats to fresh dimensions could lower ARCR without changing behaviour |
| Matchmaker minutes per profile shared | Not to rise more than 10% | The 2 hour per client per week cost must not grow |

**Safety guardrails.**

| Guardrail | Failure it catches | Threshold |
| --- | --- | --- |
| Accepted profiles progressing to completed meetings | The tool raising the bar and shrinking the funnel | Must not fall more than 3 percentage points from the 13.5% baseline |
| Shared to accepted rate | Matchmakers over-filtering under the tool | Must not fall more than 3 percentage points from the 31.0% baseline |
| Client effort or frustration, asked in the normal check-in | The tool making clients work harder or feel processed | No directional worsening |
| Incorrect conflict flags | The rule set or the AI tag being wrong | False-positive flag rate kept low; each false flag counted via matchmaker override with reason "flag incorrect" |
| Preference changes without client confirmation | The hard autonomy constraint | Must be zero |

The safety guardrails gate the primary outcome. If ARCR falls while the first two guardrails break, the result is a loss dressed as a win: fewer avoidable repeats achieved by sending fewer and lower-converting profiles.

---

## 6. What Metric A and Metric B require that the brief does not supply

| Unknown | Needed for | Consequence if missing |
| --- | --- | --- |
| The 35% denominator | Metric A baseline | Use R1 as provisional, flag R2 |
| Set of rejections that repeat a prior rejection on the same dimension | Metric B baseline | Must be measured in the pilot's instrumented period |
| Clients and profiles per client | Pilot sample and power | Feasibility study, not a powered test |
| Between-client variance of ARCR | Power | Provided as sensitivity scenarios only |
