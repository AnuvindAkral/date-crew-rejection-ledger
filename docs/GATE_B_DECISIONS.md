---
title: Gate B - Decisions and trade-offs
status: closed, superseded by the final build
created: 21 October 2026
phase: 2B
depends_on: docs/GATE_B_METRICS.md, docs/GATE_B_EXPERIMENT.md
---

# GATE B: DECISIONS AND TRADE-OFFS

The decisions made at Gate B, each with the alternative rejected and the trade accepted.

---

## D1. Two metrics, not one

**Decision.** Metric A, stated-preference conflict rate, is diagnostic. Metric B, avoidable repeat-conflict rate, is the primary outcome.

**Alternative rejected.** The Phase 1 single "contradiction rate" that mixed stated preferences and rejection history into one number.

**Trade accepted.** Two metrics cost more to measure and to explain. The split is necessary because one of them (A) is almost entirely determined by preference capture, while the other (B) is what the ledger can actually move. Conflating them would let a capture improvement masquerade as an intervention effect.

---

## D2. The control arm still runs structured capture

**Decision.** Both arms record structured rejection reasons in the same vocabulary. The treatment difference is the surfacing, not the capture.

**Alternative rejected.** A fully free-text control arm with retrospective coding. Rejected because a coder who sees the outcome can be biased, and the time ordering of "available at send time" becomes impossible to reconstruct cleanly.

**Trade accepted.** The control arm is a "no surfacing" control, not a "no capture" control. If capture itself changes matchmaker behaviour, that effect is present in both arms and cannot be isolated. This is a real limitation, disclosed rather than hidden. The capture effect is unlikely to drive the metric, but it is not measured away.

---

## D3. Client-level assignment and analysis

**Decision.** Assign at the client level, analyse at the client level, block by matchmaker and journey stage.

**Alternative rejected.** Profile-level randomisation, which would break the ledger's per-client model, and matchmaker-level assignment, which would leave the case-mix confound unresolved.

**Trade accepted.** Client-level assignment means matchmakers handle both arms, so contamination is possible. It is mitigated by per-client card scoping, logging exposure, and a washout option, and the residual is disclosed.

---

## D4. Withdraw the Phase 1 power claim

**Decision.** Retract the "70% and 95% power" figures. Replace with sensitivity scenarios that show a two-week pilot cannot detect a realistic ARCR effect.

**Alternative rejected.** Restating or softly revising the Phase 1 numbers.

**Trade accepted.** The deliverable is framed as a feasibility and directional-learning pilot, not a powered experiment. This is less impressive and more honest. The prototype validates mechanism; a real pilot validates effect.

---

## D5. Metric B over acceptance rate

**Decision.** Primary metric is ARCR, not raw acceptance rate.

**Alternative rejected.** Acceptance rate, which is the more familiar growth metric.

**Trade accepted.** ARCR is harder to compute and needs coded history and timestamp discipline. It is chosen because it is traceable to the mechanism, meaningful at low volume, and cannot be gamed by cutting sends, which acceptance rate can.

---

## D6. Dealbreakers are deterministic, AI is on the capture edge only

**Decision.** The conflict check is a pure field comparison. The model only proposes a dimension tag from free text, and a human confirms.

**Alternative rejected.** An AI compatibility or similarity model doing the flagging.

**Trade accepted.** A deterministic check catches fewer soft conflicts than a semantic model would. That is intended, because the brand forbids AI in the matching decision, the deterministic check is auditable, and the soft cases are surfaced as information rather than as rules.

---

## D7. Historical rejection is never a standing rule

**Decision.** A rejection, even one the matchmaker labels a dealbreaker, stays an unconfirmed pattern until the client confirms it.

**Alternative rejected.** Treating a matchmaker-recorded dealbreaker as enforceable immediately.

**Trade accepted.** Some conflicts will repeat because the client has not confirmed. This is correct, because the brief's own data shows clients accept later what they rejected earlier, and silently enforcing a rejection as a rule would encode a rationalisation.

---

## D8. No client-facing surface

**Decision.** The only client interaction is a single question asked by the matchmaker in the normal check-in.

**Alternative rejected.** A client-facing rejection form, preference editor, or contradiction review.

**Trade accepted.** The client cannot self-correct in the tool, so the matchmaker must carry the conversation. This keeps the managed-journey promise and the autonomy constraint intact, at the cost of not capturing the client's answer in a client-facing screen.

---

## D9. Missing data is never compatibility

**Decision.** Untagged candidates, uncoded rejections and empty ledgers are neutral, never evidence of compatibility.

**Alternative rejected.** Defaulting an untagged candidate to "no conflict".

**Trade accepted.** The clean state fires less often, so the card appears more frequently as "ledger incomplete". That is the point, because a clean state built on missing data is a false assurance.

---

## D10. Local zero-dependency stack, with a no-model path

**Decision.** The prototype runs the full core workflow with no model and no API key. The model is an optional capture convenience whose absence must not change any decision.

**Alternative rejected.** A richer stack with a model call required in the loop.

**Trade accepted.** Less impressive demos of the AI part. The payoff is a demo that cannot fail on a missing key, and a clean demonstration that the mechanism is the ledger, not the model.

---

## D11. Where AI earns its place, stated once

The model is justified in exactly one spot: normalising unstructured free-text rejection notes into a proposal from a fixed vocabulary, which keeps capture at a few seconds. Every other AI use was considered and set aside. Compatibility scoring was rejected in Phase 1. Auto-writing intro messages was rejected for trust. Cross-client precedent search was rejected on privacy cost. This is deliberate, not a gap.

---

## Open questions carried to Gate C

| # | Question | Why it matters |
| --- | --- | --- |
| 1 | Confirm the 35% denominator with the source when access exists | Changes Metric A baseline and the size of the opportunity |
| 2 | The real between-client variance of ARCR | The single input that would let a powered pilot be sized |
| 3 | Whether the repeat-with-later-accept pattern exists in TDC's population at all | If it does not, the ledger's distinctive mechanism has no target |
| 4 | Whether matchmakers accept capture in the control arm as measurement only | The D2 trade depends on it |

---

## D12. Recurrence is not avoidability

**Decision.** ARCR stays the primary outcome as a recurrence measure. Avoidability is a separate overlay, reported only where pre-send evidence establishes a plausible opportunity to act differently, never inferred from the eventual rejection alone. The numerator is reported as three sub-rates: hard-conflict, contradiction-conditional and plain-recurrence.

**Alternative rejected.** Presenting ARCR as "avoidable" rejections, which overstates what a prior rejection on the same dimension proves.

**Trade accepted.** The primary metric is now plainly a recurrence count rather than a proved-waste count, which is less punchy but does not overclaim. The hard-conflict sub-rate is where avoidability is strongest, because a client-confirmed dealbreaker is a deterministic rule the ledger could have caught at send time.
