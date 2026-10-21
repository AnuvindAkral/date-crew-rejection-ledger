# Measurement model

What the pilot would measure, and why it is built the way it is. The implementation is in `src/lib/metrics.js`, in `computeOutcomeMetrics`.

## The rule the measurement rests on

> A client's explicit answer establishes their preference. Historical behaviour is context, not proof. A matchmaker's inference is a hypothesis, not a confirmed rule.

The measurement follows the same rule the check does, because a metric that counted history as preference would be measuring the matchmaker's memory rather than the client's file.

- **Only what the client confirmed or stated is audited.** An observation is a hypothesis. It never fires a finding, so it never produces a conflict, so it never changes a rate.
- **A contradiction is a decision that disagrees with a criterion on file.** It is a finding in its own right, shown with both sides, and it decides nothing. It is not the old "rejected once then accepted once" pattern, which is history rather than a disagreement, and which is not audited as a conflict.
- **A decision made before the criterion existed cannot contradict it.** The audit reads the criteria that were in force at the moment of the share, and a decision that predates a criterion is where the criterion came from, not a disagreement with it.

## The problem this is solving

The first version of this measurement was the conflict rate among the profiles a matchmaker chose to check. It was wrong in a way that only shows up when you ask how to game it. A matchmaker who stops using the checker has fewer checked profiles, and if the rate is computed over checked profiles, the number can improve by the matchmaker doing less.

Reporting coverage alongside the rate does not fix that. Coverage is a second number that a reader has to combine with the first by hand, and the first number is still the one that gets quoted.

## The primary outcome

> **Confirmed-criterion conflict rate at send time** = the proportion of all profiles shared in the measurement period that contained a conflict with a criterion the client had on file at the moment of sending, determined by an audit that does not depend on whether the checker was used.

| Piece | Definition |
| --- | --- |
| **Denominator** | Every profile shared in the period. Not every profile checked, not every profile recommended, and not every rejection. |
| **Numerator** | Profiles whose audit found at least one violated criterion. |
| **Conflict classification** | **Hard**: a confirmed dealbreaker was violated. **Soft**: a confirmed or stated preference was violated. A profile that breaks both is counted under the firmer one, so the two components are disjoint and add up to the numerator. |
| **Missing information** | A criterion could not be checked because the candidate's value is not recorded. Counted in the denominator and reported on its own row. Never counted as clean. Measured independently of whether there was also a conflict, so a profile with a confirmed dealbreaker broken **and** an unrecorded attribute is counted as a hard conflict and as a profile with missing information. |
| **Nothing to compare against** (`no_criteria`) | The client had no criterion that a profile could be checked against at the time, so there was nothing to check. That includes a client whose only record is an observation, because a hypothesis is not something to check a profile against. Counted in the denominator and reported on its own row. This is not a clean result, and it is not a conflict either. |
| **Measurement window** | Fourteen days from the pilot start. The window is recorded in `meta.pilotStart`. |
| **Audit process** | Every share is re-evaluated after the fact against the criteria that were in force at that moment, by the same deterministic rules, whichever arm the client is on and whether or not the card was ever opened. |

## Why the denominator is every share

If the denominator is every share, then sending fewer profiles makes the numerator and the denominator fall together, and the rate does not move. A matchmaker cannot improve the number by sending less.

The rate can still be moved by changing what is on a client's file, which is the point: the only thing that should move it is the criteria being right and the conflicts being caught before the profile goes out.

## Why the audit is separate from the check

The card and the audit run the same rules, but they answer different questions.

The card asks: *should this profile go out right now, given what the matchmaker can see?* It is deliberately interruptive, it is only shown on the intervention arm, and it depends on the criteria being current.

The audit asks: *did this profile conflict with what the client had on file when it went out?* It is not interruptive, it runs on every share on every arm, and it reads the file as it was at the moment of the share rather than as it is now.

That difference is what makes the baseline comparable. A criterion recorded today cannot reach back and change how a share from last month is judged, because criteria are versioned and the audit reads the version that was in force at the time.

It also means the control arm is measured properly. A control client never sees the card, but the same audit runs on their shares, so their rate is what the check would have found without ever being shown. That is the comparison the pilot is built around.

## The human step

The audit is automated, and an automated audit can inherit the rule engine's mistakes. It is consistent, which is what a measurement needs, but consistency is not the same as being right.

So every audit is a row a reviewer can confirm or dispute, and the human-confirmed rate is reported separately from the automated one. Disputing an audit does not remove the share from the denominator, because a dispute is a disagreement about the classification, not evidence that the profile was fine.

In a real pilot the automated audit would not be enough on its own. The stronger design is a periodic blind re-code: a second person, who does not know which arm a client was in and does not know what the automated audit said, re-codes a sample of the shares by hand from the client's file and the shared profile. The automated audit is then checked against the human one, and the gap between them is a measure of how much the rule engine is missing.

## The adoption guardrail

> **Adoption** = the proportion of eligible profiles shared that had the check open before they went out.

This is reported on its own row, next to the primary outcome, and it is never combined into it.

The reason is that adoption is the thing that can move on its own. A primary rate that falls while adoption falls is not a result, and a reader who has to notice that for themselves will sometimes not. Putting the two side by side makes the failure visible.

A card view is recorded when the matchmaker opens the card, and it carries whether the check was on it. The control arm records card views with the check suppressed, so its adoption is zero by design rather than by neglect.

## What each measure counts

Every measure counts **profiles**, not criteria or attributes. A profile with three unrecorded attributes is one profile with missing information, not three. The denominator is always the profiles sent in the period, and every measure says so where it is shown.

A profile can be in more than one bucket. A profile with a confirmed dealbreaker broken and a second criterion that could not be checked is counted as a hard conflict **and** as a profile with missing information. The two are separate measures and the overlap is the point: the conflict is real, and there is also a gap in what could be checked.

The same is true of "nothing to compare against". It is its own bucket, and a profile in it is never counted in the conflict rate or in the clean count.

## The pooled figure

`computeOutcomeMetrics` also returns a pooled figure across both groups. It is a description of the whole period and nothing more. It is not shown as a headline and it is not the result of either group, because pooling a treated and an untreated group tells you about the mixture rather than about either. The baseline, the intervention group and the control group are always shown apart.

## The diagnostics

Reported alongside, never instead of:

| Measure | What it is for |
| --- | --- |
| Confirmed dealbreaker conflicts reaching the client | The firmest category, and the one a client is most likely to be upset about |
| Softer preference mismatches reaching the client | The larger and softer category, kept apart from the firm one |
| Override rate, with reasons | A matchmaker who overrides every warning has a tool that is not working, and a tool that is not working should not be defended as a success. The reason is what makes the override reviewable |
| Missing information | How many profiles had at least one value that was not recorded, whether or not there was also a conflict |
| Nothing to compare against | How many profiles went to a client with no criterion on file. These are not clean results |
| Per matchmaker and per client | For reading the result, with the caveat below |

## What the pilot would compare, and how

1. **Baseline first.** The window before the intervention opens, audited by the same process, so the two periods are judged the same way. A baseline audited differently is not a baseline.
2. **Both arms, audited identically.** The intervention arm and the control arm are both audited. The comparison is between arms within the same window, not between a treated period and an untreated one from a different period with a different mix of clients.
3. **Client-level allocation, not a comparison of matchmakers.** A client is allocated to an arm, and the analysis is by client. Matchmaker-level breakdowns are descriptive. The 44% and 21% acceptance rates in the brief are not interpretable as a difference in skill without case-mix and channel control, and the same caution applies to any rate computed per matchmaker here.
4. **A sample, not everything, if volume is low.** Forty-two completed meetings a month is the whole business. If the pilot produces a few dozen shares, the honest report is the number with its denominator attached and a statement of what a few dozen observations can and cannot show.

## What two weeks can and cannot show

Two weeks can show whether matchmakers open the check when they send, whether the criteria on file are usable, and whether the conflict rate moves in the right direction against a baseline measured the same way.

Two weeks cannot show that completed meetings rose. That needs far more volume and a longer period, and the acceptance and completed-meeting guardrails exist so that a fall in the conflict rate bought by narrowing the pool is caught rather than celebrated.

Any pilot would also be observational. Clients are not randomly assigned if the operator is choosing allocations, and matchmakers who choose to use the tool may differ from those who do not. A fall in the conflict rate alongside a rise in acceptance would be encouraging, and it would still not be a causal claim.

## Where this is implemented

| Piece | Where |
| --- | --- |
| The audit | `store.auditShare` and `store.runAudit` in `src/lib/store.js` |
| The metric | `computeOutcomeMetrics` in `src/lib/metrics.js` |
| The edge cases | `test/measurement-edges.test.js` |
| The truth rule, through the store and the action layer | `test/truth.test.js` |
| The operator view | The Measurement tab in `src/public/app.js` |
| The tests | `test/measurement.test.js` |

The prototype runs the audit over its synthetic history so there is a baseline to look at. Those numbers describe the synthetic data. No pilot has been run and no business metric has moved.
