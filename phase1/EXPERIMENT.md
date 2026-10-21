---
title: The Date Crew - Product Growth Assessment, Phase 1 Experiment
status: complete
created: 21 October 2026
phase: experiment design
depends_on: DECISIONS.md
---

# EXPERIMENT

---

## 1. Problem statement

The matchmakers at The Date Crew send profiles to clients that conflict with something the client has already communicated, and the feedback that would prevent a repeat arrives as unstructured free text that cannot be counted, compared or acted on.

The waste is concrete. On the supplied funnel, 690 of 1,000 shared profiles are rejected. About 35% of those rejections, roughly 242 profiles, cite a reason the client had already mentioned in their preferences. Those profiles were sent despite the criterion being known. Separately, some clients reject profiles and later accept profiles with similar characteristics, so a rejection is not a stable rule and cannot be treated as one either. Matchmakers spend about two hours per client per week searching, and the richest signal in the business, which the founder has argued publicly is the reason a client rejects, is being produced and discarded as prose.

The problem is not that matchmakers choose badly. It is that a decision is made with information the system has not made available, at a moment when nobody checks.

---

## 2. Target user

**Primary:** the matchmaker, at the moment they are about to share a profile with a client, and at the moment they log a rejection.

**Secondary:** the client, who experiences the change only as fewer irrelevant profiles and fewer repeated rejections. The client does not use the product and does not see the ledger. No client-facing screen is built.

This is a deliberate choice. The business model absorbs the work so the client does not have to (S15), the brand sells client autonomy (S2), and the brief forbids silent changes to client preferences. A client-facing tool would work against all three.

---

## 3. Hypothesis

**Primary hypothesis.** If, at the moment of sharing a profile, the matchmaker is shown the client's recorded rejection history for the candidate's key dimensions, including any case where that same client later accepted a profile with a similar dimension, and is asked one specific question when the two conflict, then the share of shared profiles that clients reject for a reason already recorded in their own history falls, without a fall in the share of accepted profiles that turn into completed meetings.

**Secondary hypothesis.** If rejections are captured as a dimension plus a deal breaker or preference flag in under ten seconds, then at least 80% of rejections get captured with a usable dimension, and matchmaker time per client per week does not increase.

**Explicit non hypothesis.** That completed meetings or marriages will move. The prototype cannot establish that, and the design below does not claim it.

---

## 4. Intervention

The Rejection Ledger, in three parts. Build order matters, because the third part depends on the first two existing.

**Part 1, capture.** When the matchmaker rejects a shared profile, one sheet opens. It asks for one dimension from a fixed list of twelve, one severity flag (deal breaker or preference), and accepts an optional line of free text. The sheet is pre-filled with a dimension proposed by the model from the free text, which the matchmaker confirms or changes. The model proposes, the human decides, and the matchmaker can always type a dimension that is not on the list.

**Part 2, roll up.** Rejections aggregate per client by dimension, with counts and dates. Accepted profiles carry the same dimension tags, so the ledger can see that a client rejected on a dimension and later accepted on it.

**Part 3, the conflict check at send.** When the matchmaker is about to share a profile, the ledger compares the candidate against that client's recorded history and surfaces one of two states.

- **Conflict.** The candidate hits a dimension the client has rejected on, recorded as a deal breaker. The card names the dimension, shows how many earlier profiles were rejected on it, and shows the earliest one so the matchmaker can read the reason in full.
- **Contradiction.** The candidate hits a dimension the client rejected on before, but the client has since accepted a profile with that same dimension. The card shows both, side by side, and asks one question: *"You rejected three profiles for this and later accepted one with it. Is that a deal breaker, or a preference?"*

The question is asked by the matchmaker, in the normal check in, and the answer is recorded on the ledger as a client-confirmed rule. The card never blocks a send. It never writes to a client preference field. Every card shown and every override is logged.

---

## 5. Baseline

**Historical baseline from the brief, for orientation only.**

| Measure | Value | Note |
| --- | --- | --- |
| Shared to accepted | 31.0% | 310 of 1,000 |
| Accepted to completed meeting | 13.5% | 42 of 310 |
| Conversation to meeting fixed | 50.0% | 75 of 150 |
| Meeting fixed to completed | 56.0% | 42 of 75 |
| Rejections citing a reason already in stated preferences | 35% of 690, about 242 profiles, which is 24.2% of all 1,000 shared | Denominator stated explicitly, see below |
| Matchmaker search time | about 2 hours per client per week | Not separated into search versus admin versus coaching |

**Measured baseline, which is what the experiment actually uses.** Two weeks of structured capture with no conflict card visible (Phase 0), on the same clients and the same matchmakers. This is required rather than optional, because the primary metric needs a denominator and numerator that the brief does not supply.

---

## 6. Metric

### 6.1 Primary metric

**Contradiction Rate (CR)**, per client, then aggregated.

> CR = (profiles shared with a client that the client rejects for a reason already recorded in that client's own history, whether from stated preferences or from an earlier rejection) / (total profiles shared with that client)

Lower is better. It is measured per client and compared per client, because the ledger is per client and the unit of change is the client.

The numerator deliberately includes both sources of "already known". A first rejection on a criterion the client stated on a call is a violation of a known criterion and should count. A repeat rejection on a dimension the client rejected before should also count.

### 6.2 The denominators, stated plainly

The brief's 35% and the experiment's CR are not the same number and must not be conflated.

| Set | Definition | Size | Source |
| --- | --- | --- | --- |
| Set 1 | Rejections citing a reason already stated in client preferences | about 242 profiles, 35% of the 690 rejections, 24.2% of all 1,000 shared | Supplied, denominator assumed to be rejections |
| Set 2 | Rejections citing a reason already rejected on before for that same client | Not supplied | Must be measured in Phase 0 |
| CR | Set 1 plus Set 2, over all profiles shared | Must be measured in Phase 0 | Experiment |

Two consequences. First, the supplied 35% bounds the opportunity but is not the baseline for the primary metric. Second, if Set 2 turns out to be small, the intervention has little to prevent and the experiment will show it, which is a legitimate and cheap finding. Phase 0 exists to find out.

An alternative reading of the 35%, namely 35% of all 1,000 shared profiles rather than of the 690 rejections, changes Set 1 to about 350 profiles and changes the conclusion. Confirm the denominator with the source before anything is built.

### 6.3 Secondary metrics

| Metric | Why |
| --- | --- |
| Reason capture rate, share of rejections logged with a dimension | If this is below about 80%, the ledger is built on sand and nothing else in the experiment means anything |
| Capture latency, seconds per rejection | Confirms the ten second target is real |
| Repeat rejection rate, Set 2 only, over profiles shared | The stricter version of CR, and the one the conflict card actually targets |
| Matchmaker minutes per profile shared | Against the two hour per client per week baseline |
| Flag action rate, share of cards that led to a send change, a question to the client, or an explicit dismiss | Tests whether the card is doing work or being ignored |
| Override rate with a reason code | A high override rate means the rule set is noisy, which is a rule set problem, not a behaviour problem |

### 6.4 Guardrail metrics

These are not secondary. A prototype that improves CR by making the matchmaker send fewer, lower quality profiles has failed.

| Guardrail | Baseline | Failure it catches |
| --- | --- | --- |
| Accepted to completed meeting rate | 13.5% | The central risk. If accepted profiles stop converting, the tool has simply raised the bar and shrunk the funnel |
| Shared to accepted rate | 31.0% | The intervention should reduce contradictions, not reduce sends. A drop here means matchmakers are over filtering |
| Completed meetings per 100 profiles shared | 4.2 | The end to end version of the same risk |
| Client reported effort and frustration, asked in the normal check in | Not measured today | Rejection fatigue and the feeling of being processed. This is the metric that catches a tool that makes clients work harder |
| Matchmaker minutes per profile shared | Not measured today | Whether the intervention is adding more admin than it removes |
| Preference field changes without a client confirmation | Must be zero | A hard constraint from the brief |
| Cards overridden by matchmakers | No target, measured | Rule quality |

**The guardrail that matters most is the first one.** Fewer rejections is not better matches. If CR falls and accepted to completed meeting rate falls by more than the pre-agreed margin, the intervention has optimised the wrong thing and the result is a smaller, better filtered funnel with fewer conversations, which for a business that charges a success bonus on marriage is a loss dressed as a win.

---

## 7. Event instrumentation

Five events, all timestamped, all recorded against client and matchmaker identifiers.

| Event | Fields | Why |
| --- | --- | --- |
| `profile_shared` | client, matchmaker, profile, source channel, shared_at, candidate dimension tags | Denominator for CR |
| `rejection_logged` | client, profile, dimension, severity, free text, logged_at, capture latency | Numerator for CR and the whole ledger |
| `profile_accepted` | client, profile, accepted_at, dimension tags | Needed to detect contradiction, since acceptance after rejection on the same dimension is the signal |
| `card_shown` | client, profile, dimension, state (conflict or contradiction), evidence profile id, shown_at | Measures exposure and whether the card fires at all |
| `card_resolved` | card, action (sent anyway, question asked, client rule recorded, client preference updated with confirmation), resolved_at | Measures behaviour change |

Plus the funnel events the brief's stages need, since none of the current stage definitions are written down: `contact_details_shared`, `conversation_started`, `meeting_fixed`, `meeting_completed`. These do not need new product work, they need a written definition per stage and a timestamp. Doing this in Phase 0 is what makes any statement about the 44% against 21% gap defensible.

Two measurement rules. Stage definitions are written once, before Phase 0 starts, and applied identically by both matchmakers. Every card exposure is logged even when the matchmaker dismisses it in under a second, because card exposure is the denominator for the action rate.

---

## 8. Sample and observation requirements

**Design.** Client-level randomisation, with structured capture running for everyone in every period.

| Period | Duration | What runs |
| --- | --- | --- |
| Build and instrument | Week 1 | Prototype built, stage definitions written, capture sheet live |
| Phase 0, baseline | Week 2 to 3 | Structured capture for all clients. Conflict card exists but is hidden |
| Phase 1, test | Week 4 to 5 | Capture for all clients. Conflict card visible for the randomised treatment clients only |

**Sample.** Minimum 12 clients in Partner Search across both matchmakers, minimum 6 per arm after randomisation, minimum 10 shared profiles per client per period. If fewer than 12 clients are available, run a within-client before and after design with no control arm, and accept the weaker inference.

**Power, stated plainly.** With roughly 180 profiles per period, treating the two periods as independent, a fall from 25% to 15% CR gives p of about 0.02 and around 70% power. A fall to 12% gives p of about 0.001 and around 95% power. A fall from 25% to 19% is not detectable in this window. So the design is powered for a large effect. Any result smaller than roughly a 40% relative reduction will not be distinguishable from noise, and the report must say so rather than presenting a non-significant result as encouraging.

Clustering makes this worse, not better. Profiles from the same client are not independent. The client-level paired analysis removes between-client variance and is the primary test, with the unpaired calculation above as the optimistic bound.

**What the prototype can validate.**

- That matchmakers will capture structured rejection reasons at a usable rate, and that the ten second target holds in practice.
- That the ledger detects contradictions, meaning cases where a client rejected on a dimension and later accepted on it, at a rate worth acting on.
- That the card changes behaviour at the send point, measured by action rate and override rate.
- That CR moves, in the direction the theory predicts, with the caveats above.
- That matchmaker time per profile does not increase.

**What a real pilot would need to establish, and cannot be established here.**

- Any change in completed meetings. That needs three to six months of steady state, a defined cohort, and enough clients per arm to detect a change of a few percentage points on the 13.5% accepted to completed rate. On the supplied funnel that cohort is on the order of hundreds of clients.
- Any change in marriages or in success bonus revenue. The journey runs six to nine months and the bonus attaches to marriage (S4), so no two week observation can touch it.
- Any change in client retention or willingness to pay.
- Whether the tool works for matchmakers other than the two in the sample, and whether it works at the sourcing stage, which the brief does not cover.
- Whether the contradiction pattern is systematic across the client base or specific to these clients.

---

## 9. Decision rule

Set before data collection, so the rule cannot be written after the result.

**Continue and scale the pilot** if all four hold.

1. CR falls by at least 40% relative from the Phase 0 baseline, at 95% confidence on the client-level paired test.
2. Accepted to completed meeting rate does not fall by more than 3 percentage points, and completed meetings per 100 profiles shared does not fall by more than 1.
3. Reason capture rate is at least 80%, and median capture latency is at or under 15 seconds.
4. Matchmaker minutes per profile shared does not increase by more than 10%.

**Iterate** if the CR falls but any guardrail fails, or if the fall comes entirely from one matchmaker, or if capture latency runs long and the sheet needs redesigning.

**Change direction** if CR does not move, which means the constraint is not what the ledger assumed. Two specific pivots, in order of preference: drop the ledger and run only the one-question process change from idea 2, which asks the client whether a dimension is a deal breaker or a preference at the first rejection; or move downstream to the conversation to meeting stage, where the 50% drop sits and where the expectation and briefing ideas live.

**Stop** if any of these occur. Clients report feeling managed or processed. Any cross client data leak. Matchmakers override more than 80% of cards, which means the rule set is noise. A client preference field is changed without confirmation. Or the matchmakers themselves ask for the tool to be removed, which for a human-led business is the most meaningful signal available.

---

## 10. Confounders

| Confounder | Why it matters | Control |
| --- | --- | --- |
| Wedding season | Indian wedding season runs roughly October to February and moves response rates, intro acceptance and meeting rates hard. A two week window that straddles it means nothing | Extend to four weeks and compare with the same calendar weeks a year earlier, or run in a period outside the season. Flag any window that touches it |
| Matchmaker learning | A matchmaker in a pilot improves their own judgement over time regardless of the tool | Control arm on the same matchmakers, with the card hidden, which is why Phase 1 is randomised within matchmakers rather than split by matchmaker |
| Contamination between arms | A matchmaker who sees a card for one client may change behaviour for another | Explicit instruction that the card is per client. Log card exposure per client so contamination can be estimated. If contamination looks serious, switch to matchmaker-level assignment and accept the case mix problem |
| Case mix | Client segment, gender split, city tier, relationship history and journey stage all move acceptance | Client-level randomisation plus per client paired analysis. Report results per matchmaker so a mix shift is visible |
| Regression to the mean | A client who rejected eight in a row may have been in a bad patch, and their next acceptance is not caused by the intervention | Track whether the accepted profile shared the rejected dimension both before and after the intervention. Only the after case is informative |
| Novelty effect | Matchmakers try harder for two weeks because something is new | Measure again in weeks 5 and 6. If the effect decays, say so rather than reporting the peak |
| Measurement drift | A new capture field can change how a rejection gets described between periods | Same capture sheet, same vocabulary, same capture latency target in both periods. Audit 30 rejections blind for coding consistency |
| Confound from the intervention itself | Client confidence changes when rejections start being recorded properly, independent of the card | The control arm isolates the card from the capture. Capture alone is not expected to change behaviour |
| Simultaneous business change | A sales push, a new matchmaker, a price change or a new sourcing platform during the window | Log all operational changes weekly. Do not start a test period in a week with a known change |
| Sampling of the clients in the pilot | The first 12 clients may be unusually active or unusually high intent | Compare the pilot cohort's baseline CR and acceptance rate against the business baseline. If they differ, report the pilot as a learning exercise, not a business result |

---

## 11. What gets shown to the hiring team

Not a funnel dashboard. Three artefacts, in this order.

1. **The measured baseline**, built from four weeks of real capture, with the two matchmakers' numbers compared on a like for like mix. This alone answers the 44% against 21% question that the brief asks, and it answers it with data rather than with a ranking of people.
2. **The conflict card in action**, on a real anonymised client, showing a contradiction the ledger caught. This is the demonstration, and it takes about ninety seconds.
3. **The decision rule from section 9, with the actual result written against it**, whatever the result is. A prototype that reports a null result straight is a stronger signal than one that reports a favourable number.

The written brief accompanies the three, and it states in its first paragraph that no business metric is claimed to move.
