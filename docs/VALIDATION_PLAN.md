# Validation plan

Everything below is proposed validation work. None of it has been done. No matchmaker has been interviewed, no real client data has been seen, and no outcome has been measured with a real user.

The point of this document is to be specific about what is assumed, so that the five conversations that would settle it can be run deliberately rather than improvised.

## The assumptions that need real matchmaker validation

| # | Assumption | Why it is unproven |
| --- | --- | --- |
| A1 | The reject-then-accept pattern exists in TDC's population | It comes from the supplied brief and the founder's writing. It has never been counted |
| A2 | Acceptance carries information that rejection does not | The debrief's entire premise. No data supports it |
| A3 | The debrief fits a matchmaker's workflow without adding admin | Every capture feature risks becoming a form to fill |
| A4 | Surfacing the rejection history at send time changes a decision | The mechanism was designed from first principles and research, not observation |
| A5 | The learning-loop metric, consultation rate, is a meaningful proxy | It measures use, not effect. Whether use predicts effect is unknown |
| A6 | The 35% stated-preference figure means what reading A suggests | The denominator is ambiguous and the source has not been checked |
| A7 | Channel is a meaningful axis for unsuitable introductions | Never tested, which is why the scorecard was excluded |
| A8 | The criteria on file match what the client would say today | The check compares against them. A stale or wrong criterion produces a wrong check, and the tool has no way to tell |
| A9 | A matchmaker will keep the criteria on file current | Nothing in the system reminds them. The change log records drift after the fact, it does not prevent it |
| A10 | Enough shares are checked for the rate to mean anything | The rate is measured on checked shares only, and coverage is reported beside it. A pilot with low coverage would produce a number that looks precise and is not |
| A11 | The automated audit agrees with what a person would code from the same file | The audit uses the same rule engine as the card, so it can inherit the engine's mistakes. It is consistent, which is what a measurement needs, and consistent is not the same as right. A blind human re-code of a sample is the check |
| A12 | A criterion's direction is recorded the way the client meant it | A criterion says "must be vegetarian" or "must not be vegetarian", and only the client can say which. A misrecorded direction produces a check that is confidently wrong, and nothing in the tool can detect it |

## Proposed validation steps

### Step 1: five matchmaker conversations

The instrument is in [INTERVIEW_PROTOCOL.md](INTERVIEW_PROTOCOL.md). Five matchmakers, thirty minutes each, using recent examples rather than general impressions, capturing verbatim answers and separating observed behaviour from interpretation.

Do not pitch the debrief or the scorecard before question five. The point is to hear the current workflow and the workarounds, not to collect reactions to a proposal.

**What each question would settle.**

| Question | Settles |
| --- | --- |
| 1. When a client accepts someone, what do you learn that you did not know before? | A2, and partly A3 |
| 2. Where do you record that, and does it influence the next recommendation? | A2, and whether the gap is capture or surfacing |
| 3. How do you know whether a disappointing profile came from poor sourcing, incomplete information, or a mismatch in expectations? | A7, and therefore whether a scorecard is worth anything |
| 4. Which mistakes recur despite the information already being available? | A4, and whether the problem is missing information or unused information |
| 5. What would save you time or improve the next recommendation without adding another administrative step? | A3, and whether a capture feature is the wrong shape |

### Step 2: a short workflow test

With two or three matchmakers and synthetic candidates, run the send review on cases they bring themselves. Measure how long the review takes, whether they look at the ledger, and whether it changes what they would send.

**What it settles.** A3, A4 and A9, and it produces the capture latency figure the feasibility bar needs, which the prototype cannot produce because it runs on synthetic data. It should also cover the two steps the prototype makes easy and reality makes hard: keeping the client's criteria on file, and looking at the check at the moment of sending. If the matchmaker is asked to look at a criterion the prototype already recorded, the review is testing the thing that matters: whether the direction they record is the one the client meant.

### Step 3: check the denominator of the 35%

One conversation with whoever owns the funnel numbers, to establish whether the figure is 35% of rejections or 35% of all shared profiles.

**What it settles.** A6, and the size of the opportunity.

### Step 4: blind re-code a sample

Take a sample of shared profiles from the baseline period, and have a second person who does not know which arm the client was in, and does not know what the automated audit said, re-code them by hand from the client's file and the shared profile. Compare the two.

**What it settles.** A11, and the confidence interval on everything else. Without it the primary outcome is a number produced by the same rules as the thing it is measuring.

### Step 5: the proposed pilot

Only if steps 1 to 3 support the direction. The concurrent client-level design, metrics, guardrails, and stop conditions are in [PILOT_PLAN.md](../PILOT_PLAN.md).

## What the prototype can and cannot tell us

The prototype establishes that the mechanism works technically. A rejection can be captured and compared, a contradiction can be surfaced and settled with a client answer, an acceptance can be debriefed and consulted at the next send, and the consultation rate can be computed without counting an insight as unconsulted when no later recommendation was possible.

It establishes nothing about whether any of that matters to a matchmaker or a client. Every assumption in the table above is still open.

## Proxy testing if access is not possible

If no matchmaker can be reached, the honest fallback is to label the work as a mechanism demonstration only, and to keep every claim in the submission at that level. A proxy written by someone who has not done the work would be worse than no proxy, because it would look like evidence.

## What would abandon the idea

- The conversations show acceptance carries no information rejection does not already carry. The debrief goes.
- The reject-then-accept pattern does not exist in the population. The contradiction card goes.
- Matchmakers report the ledger surfaces things they already knew and would have checked anyway. Then the value is in the debrief alone, or nowhere.
- Clients report the workflow makes them feel processed. The product stops.
