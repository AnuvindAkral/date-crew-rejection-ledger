# Pilot plan

This is a proposed plan for a live pilot of the Rejection Ledger at The Date Crew. It is **not** an authorised study, and no part of it has been run. There is no access to TDC staff, clients or systems, so every number below is a placeholder that a real deployment would replace.

The pilot answers one feasibility question and one directional question. It does not, by itself, establish a causal effect on the primary metric.

---

## 1. Objective and hypothesis

**Objective.** Establish whether matchmakers can capture structured rejection reasons quickly and consistently, whether the ledger surfaces genuine contradictions, and whether the pre-send card changes behaviour at the moment a profile is shared.

**Primary hypothesis.** Shown the client's recorded rejection history at send time, a matchmaker shares fewer profiles that repeat a dimension the client has already rejected, without reducing the share of accepted profiles that reach a completed meeting.

**Explicit non-hypothesis.** That completed meetings, marriages or revenue move. The pilot is not sized for that and does not claim it.

---

## 2. Eligible population

- Partner Search clients with an active journey, in either the new or ongoing stage.
- Excluded: clients who have paused their search, clients in the final commitment stage, and clients who have not yet had a first introduction.
- Matchmakers: those assigned to Partner Search clients during the pilot window.

The exact counts of eligible clients and matchmakers are not known and are not invented. The pilot requires a minimum that section 8 states; a smaller population means the pilot is feasibility-only, which is still a valid outcome.

---

## 3. Client-level assignment

- Unit of assignment is the client.
- Blocked randomisation: blocks are matchmaker, and within matchmaker a stratum of journey stage (new or ongoing).
- Allocation is fixed at pilot start, generated from a pre-registered seed written down before the first share. No re-randomisation mid-pilot.
- Both arms record structured rejection reasons through the same capture sheet. The treatment difference is the surfacing of prior evidence at send time.

---

## 4. Control and intervention workflows

| | Control (no-surfacing) | Intervention (ledger on) |
| --- | --- | --- |
| Structured rejection capture | Yes, same vocabulary | Yes |
| Rejection ledger view | No | Yes |
| Pre-send conflict and contradiction card | No, not rendered | Yes |
| Client clarification question | Matchmaker asks as they do today | Matchmaker asks, answer recorded on the ledger |
| Preference edits | Client portal only | Same, plus a confirmed rule recorded only after a client answer |

The control arm is a no-surfacing control, not a no-capture control. Structured capture is an active ingredient, so the pilot estimates the incremental value of surfacing over capture, which is a lower bound on the product's total effect. Whether control matchmakers consult the capture sheet is measured.

---

## 5. Matchmaker training and adoption

- One training session before the window: the vocabulary, the severity values, the capture sheet, and the rule that a dealbreaker is only confirmed by the client.
- The card is advisory, never blocking. Training states this once and the tool enforces it.
- Adoption is measured as capture rate, capture latency, card action rate and override rate. A low capture rate is a training or design problem, not a client problem.

---

## 6. Consent and client communication

- Matchmakers consent to having their capture and send-time behaviour measured.
- Clients consent to having structured feedback recorded, and are told that a matchmaker may ask a clarifying question when their feedback is unclear. Client communication is kept to the existing check-in rhythm; no new client-facing surface or message is added.
- Clients are told they can decline recording at any time, in which case their rejection is captured as free text only.
- The pilot does not assume a client has agreed to AI processing merely because the company uses a CRM. In this pilot the classification is deterministic and human-confirmed, so no model processes client data at all. If a model were introduced, separate, specific consent would be required before it touched client data.

---

## 7. Data minimisation and access control

- Raw rejection free text is visible only to the owning client's matchmaker.
- Reports and analysis use counts and rates only. No client is identifiable in any report.
- Retention: raw feedback is held for the pilot window plus the analysis period, then reviewed for deletion. No retention beyond what the pilot needs.
- Access: the pilot operator and the matchmakers on the owning client's case. No cross-client access, enforced at the query level and verified by a test.
- Audit events are redacted of client-identifying free text.

---

## 8. Event instrumentation

Every event is timestamped and carries a client id and actor id.

| Event | Fields | Purpose |
| --- | --- | --- |
| `profile_shared` | client, candidate, source, shared_at | Denominator for ARCR |
| `rejection_logged` | client, candidate, dimension, severity, free_text, capture latency | Numerator and the ledger |
| `profile_accepted` | client, candidate, accepted_at | Second half of a contradiction |
| `card_shown` | client, candidate, dimension, state, evidence profile, shown_at | Exposure |
| `card_resolved` | card, action, rationale, resolved_at | Behaviour change |
| `preference_confirmed` | client, dimension, answer, confirmed_at | The autonomy constraint |

Stage definitions are written once, before the window, and applied identically by both matchmakers.

---

## 9. Metrics

**Primary.** Avoidable repeat-conflict rate (ARCR), client level. Numerator: eligible shared profiles rejected for a dimension with a prior coded rejection before the share. Denominator: eligible shared profiles. Reported with three sub-rates: hard-conflict, contradiction-conditional and plain-recurrence. ARCR measures recurrence, not avoidability.

**Diagnostic.** Metric A, stated-preference conflict rate, using the assessment's 35% as a provisional baseline only.

**Guardrails (safety, gate the primary).**

- Accepted profiles progressing to completed meetings, must not fall materially.
- Shared-to-accepted rate, must not fall materially.
- Client effort or frustration, no directional worsening.
- Incorrect conflict flags, kept low, counted via override reason "flag incorrect".
- Preference changes without client confirmation, must be zero.

**Secondary.** Capture rate (target 80%), capture latency (target 10s, guardrail median 15s), flag action rate, contradiction surface rate, matchmaker minutes per profile (not to rise more than 10%), blind second-coder agreement on rejection dimensions.

---

## 10. Observation period

- Week 0: setup, training, consent, definitions frozen, instrumented capture live.
- Weeks 1 to 2: concurrent observation.
- Week 3: analysis and decision.

A two-week window establishes feasibility and a directional signal only. Causal evidence on ARCR needs a longer run and a larger cohort. The power audit in `docs/GATE_B_EXPERIMENT.md` shows that detecting a realistic 10-point ARCR change needs roughly 290 clients per arm, so the two-week pilot is explicitly a feasibility study.

---

## 11. Analysis plan

- Client-level comparison of ARCR between arms, permutation or Wilcoxon test, pooled rate as descriptive.
- Sub-rates reported separately so recurrence is not mistaken for avoidability.
- Blind second-coder audit of a sample of rejection dimensions against free text, blind to arm.
- Eligibility counts per arm and a test for differential attrition.
- Report per matchmaker, so a mix shift is visible.
- All estimates carry confidence intervals, reported wide rather than smoothed.

---

## 12. Stop, iterate, continue, kill

**Continue toward a powered pilot** if capture reaches 80% at the latency target, the contradiction surface rate is above zero with real evidence, the card changes at least one decision, no guardrail breaks, and the ARCR point estimate is lower in the intervention arm (reported with its wide interval, no significance claim).

**Iterate** if capture or latency misses, false-positive flags are high, matchmaker time rises, or the card is ignored.

**Change direction** if no genuine contradiction ever surfaces, meaning the reject-then-accept pattern the ledger targets does not exist in this population, or if ARCR does not move and matchmakers report the card is not the constraint.

**Stop** if any safety guardrail breaks, a preference changes without client confirmation, a client reports feeling processed, a cross-client leak occurs, or the matchmakers ask for the tool to be removed.

---

## 13. Operational owner and weekly review

- One named pilot operator owns the run, holds the seed and the allocation list, and reviews the guardrails weekly.
- Weekly review covers: capture rate and latency, card action and override rate, guardrail status, and any client- or matchmaker-reported friction.
- The decision rule is fixed before data collection and is not revised after results are seen.

---

## 14. Requirements before a real TDC deployment

1. Confirm the 35% denominator and the reject-then-accept pattern exist in TDC's population.
2. Written consent from matchmakers and clients, and a data protection review against the DPDP Act 2023 and IT Act 2000 basis the company already relies on.
3. Access to the existing CRM to read match histories and write the structured fields, or a side-by-side capture surface accepted by the matchmakers.
4. A named operator and a pre-registered allocation list.
5. Agreement on retention and deletion of raw feedback after the analysis period.

Until those five hold, this remains a proposal.
