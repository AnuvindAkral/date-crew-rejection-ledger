---
title: The Date Crew - Product Growth Assessment
status: submission response
created: 21 October 2026
---

# The Date Crew · Product Growth Assessment

The assessment of record for this repository. Section lengths follow the brief: Part 1 about 300 words, Part 2 about 500, Part 4 under 200.

## Part 1 · Diagnose the problem

### Three investigative questions

**1. Why are clients rejecting profiles, and how many rejections conflict with something already on the client's file?** It separates preventable errors from selectivity. Only the conflict subset is fixable, and the 35% is the only clue pointing at a specific intervention.

**2. Where do clients drop off after they accept?** 310 accepted became 42 completed meetings, so most loss is downstream, which says whether to work on the first stage at all.

**3. Why is matchmaker A at 44% and matchmaker B at 21%?** Case mix means allocation; practice means something worth codifying. The brief does not say which.

### The biggest problem

The first stage loses most: 690 of 1,000 shared profiles are rejected. The addressable slice is where a profile conflicted with what the client had already said: about 240 profiles if the 35% is of rejections, 350 if of all shares.

I am assuming the 35% is reliable enough to act on, the denominator is rejections, the conflicts were knowable at send time, and the two hours a week per client is where the criteria live. If not, the problem is upstream.

### Three metrics

**1. Confirmed-criterion conflict rate at send time.** Of all profiles shared in the period, the proportion that conflicted with a criterion the client had on file at that moment, decided by an audit that does not depend on whether the checker was used. Dealbreaker conflicts and preference mismatches reported apart, coverage alongside.

**2. Profile acceptance rate, by client and matchmaker.** The outcome the business tracks, and the check that metric one is not improving by sending less.

**3. Completed meetings per 100 profiles shared.** Baseline 4.2%. The only metric connecting the funnel to the outcome, and the guardrail against narrowing the pool and looking like progress.

## Part 2 · Design a solution

### Problem

Matchmakers share profiles that conflict with what the client has already said. The information exists, but in an onboarding call, email threads and memory, so it is not there when sending. Around 240 rejections a month were for reasons already on the client's file. Each costs a message, a client, and some faith in the service.

### User

The matchmaker, on the sending side of the email. One person. The client is the source of the truth, not the user.

### Solution

A pre-send check inside the share flow the matchmaker already uses. Before anything goes out, the tool compares that client's criteria with the candidate's known attributes and returns what it found.

- **Conflict.** A confirmed dealbreaker matches the value. The only firm no.
- **Preference mismatch.** The value misses a stated or confirmed preference. Advice, not a warning.
- **Contradiction.** Rejected here before, accepted since. A prompt to ask, not a rule.
- **Prior rejection.** Rejected here before, not accepted since. A pattern, not a rule.
- **Incomplete.** A criterion exists and the value is unknown. Never "no conflict": unknown is not agreement.

A criterion records a direction and a firmness separately: "must be vegetarian" and "must not be vegetarian" are opposite criteria, and a stated preference is advice where a dealbreaker is a no. Comparisons are on values, not categories, so a vegetarian candidate does not trip a non-vegetarian dealbreaker.

Data entry is short and lives in the interface. Create or pick a client and name its matchmaker. Record the criteria: dimension, direction, values, and how firm it is, in the client's words. Add a candidate with only the attributes known; blank means unknown, never no.

The matchmaker proceeds, holds, or asks the client. Nothing is blocked, no criterion changes without the client's words, and overrides are logged with a reason.

### Data

Client criteria as dimension, direction, values, kind and timestamp, versioned so the file can be read as it was at any past moment. Candidate attributes as a value per dimension. Rejections with a dimension, severity, the value and the original wording. Acceptances. Shares recording the check the server recomputed at send time, and an audit of each.

### Technology

Node and a small local store, a plain browser interface, no dependencies. No model sits in the decision path, because every check that matters compares a known value against a known value in a recorded direction. The one place AI helps is proposing a dimension from free text, and a matchmaker confirms it.

### Success Metric

Confirmed-criterion conflict rate at send time falls against a baseline measured the same way, while profile acceptance rate and completed meetings per 100 shared do not fall. Coverage, the share of profiles checked before sending, is reported beside it, because a rate that improves while coverage collapses is not a result. Overrides come with their reasons. Two weeks shows whether the workflow is used and the rate moves, not a business effect.

## Part 3 · Working prototype

A working Node app, no dependencies, synthetic data, 104 passing tests.

```bash
node src/server.js   # http://localhost:4321
node --test
```

The core behaviour, in one path. Press **Reset demo** before each beat.

1. **Open Priya S.** Her ledger shows a contradiction on location: rejected 3, accepted 1.
2. **Send Aarav M.** The check fires before anything is sent, showing the earliest rejection in the matchmaker's own words next to the profile she later accepted. It also flags that Aarav is in Pune and she had asked for the Bangalore metro.
3. **Ask the client**, pick the value, type her answer, choose **Preference**. A rule is written, and only from her recorded words.
4. **Send Karan D.** The contradiction is gone. What remains says his education is unknown.
5. **Open Rahul M.** and send **Nikhil S.** The check fires a hard conflict: he is non-vegetarian and that is a confirmed dealbreaker. Send **Dev P.** for the clean case: he is vegetarian, so the same dimension gives the opposite answer.
6. **Open Neha K.** and send **Varun J.** The check says his position on children is unknown. Send **Ishita P.** and it says she does not want children, which is advice rather than a warning.
7. **Open the Candidates view**, pick a client and press **Check against this client** to run the same check with nothing sent. Add a client, a criterion and a candidate there or on the client, and the check uses them immediately.
8. **Open Measurement.** The baseline, audited by the same process as the window, sits beside the measurement window, the coverage, the overrides and their reasons. Every share has a row in the audit, and a reviewer can confirm or dispute each one.

Screenshots are in `screenshots/`. The full script is in `docs/DEMO_SCRIPT.md`.

## Part 4 · One curveball

**What I would check first.** Whether the check was consulted when profiles were sent. That is the adoption guardrail, not the outcome rate, and a tool nobody opens changes nothing, a cheaper explanation for a flat metric than bad reasoning. Exposure and agreement are different events.

**What data I would inspect.** The audited conflict rate before and after, by matchmaker not pooled, with coverage and the override rate beside it. Whether the flagged profiles were in fact rejected for that reason. Whether the criteria on file are still what the client would say, since the check is only as good as the file. Whether the 35% was classified consistently.

**Iterate, change, or stop.** If adoption was low, that is a workflow problem, so I would move the check earlier in the send flow. If the check was used and conflicts did not fall, the criteria are probably wrong, and I would rebuild them with the matchmakers. If conflicts fell and completed meetings did not, the problem is downstream and I would stop. Two weeks cannot prove a business effect, so it ends the first iteration.

## AI usage

- **Tools:** Claude for research synthesis, code and drafting, plus separate fresh-context sessions used only as red-team reviewers.
- **Used for:** reading The Date Crew's public material and the behavioural literature, writing and testing the Node prototype, and drafting these documents.
- **Where I disagreed:** the reviewers found that my check compared dimension categories rather than values, so a candidate tagged with any diet attribute tripped a non-vegetarian dealbreaker, and a candidate in any city looked like a match for a preference for the Bangalore metro. I rebuilt the comparison to work on values and in a recorded direction, which also produced the preference-mismatch state I had claimed but not built. A later review found my metric could improve if matchmakers stopped using the checker, and that is why the primary outcome is now audited over every share instead.
- **Not used for:** the decisions. The product direction, the scope cut after review, and these answers are mine.

## What I left out, and why

- **A sourcing-channel scorecard.** With two to five candidates per channel, any channel-level rate would be noise presented as insight.
- **Client-facing prompts.** A matchmaker asking one question in a normal check-in does the same work without doubting a client who has a firm boundary.
- **Compatibility scoring or ranking.** It needs outcome labels this business will not have for a year, and it would put a model where the brand says a human must be.

## Limits of this answer

No matchmaker has been interviewed and no real client data has been seen, so every claim about workflow fit is a hypothesis. The prototype shows the mechanism works; it does not show the metric moves. The 35% denominator is unconfirmed, and the 44% against 21% gap is not interpretable without case-mix and channel control. The open questions and the cheapest way to answer them are in `docs/VALIDATION_PLAN.md`.

## Submission checklist

| Required | Where |
| --- | --- |
| Answers | This document |
| Prototype | Screenshots in `screenshots/`, run instructions above, code in the repository |
| Code | Local repository, no remote yet, publishing on approval |
| AI usage | The section above, four lines |
| Updated resume | Not done. It needs your actual resume and your sign-off, and I will not write one for you |
