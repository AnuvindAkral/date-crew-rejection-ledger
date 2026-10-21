---
title: The Date Crew - Product Growth Assessment
status: submission response
created: 21 October 2026
---

# The Date Crew · Product Growth Assessment

The assessment of record for this repository. Section lengths follow the brief: Part 1 about 300 words, Part 2 about 500, Part 4 under 200.

## Part 1 · Diagnose the problem

### Three investigative questions

**1. Why do clients reject profiles, and how many rejections conflict with what is already on the client's file?** It separates preventable errors from selectivity, and the 35% is the only clue to an intervention.

**2. Where do clients drop off after accepting?** The funnel runs 1,000 shared, 310 accepted, 210 contact details, 150 conversations, 75 meetings fixed, 42 completed. Most loss is downstream, so the first stage may not be where to work.

**3. Why is matchmaker A at 44% and B at 21%?** Case mix means allocation; practice means codification. The brief does not say which.

### The biggest problem

The first stage loses most: 690 of 1,000 shared profiles are rejected. The addressable slice is where a profile conflicted with what the client had said: about 240 if the 35% is of rejections, 350 if of all shares.

I assume the 35% is reliable enough to act on, its denominator is rejections, and the conflicts were knowable at send time. If not, the problem is upstream. The brief also reports mostly unstructured rejection feedback, and clients who reject a profile then accept a similar one, so only the client can settle what that means, not the tool.

### Three metrics

**1. Confirmed-criterion conflict rate at send time.** Of all profiles shared in the period, the proportion that conflicted with a criterion on the client's file, decided by a review independent of whether the checker was used. Conflicts and mismatches apart, coverage alongside.

**2. Profile acceptance rate, by client and matchmaker.** The outcome the business tracks, and the check that metric one is not improved by sending less.

**3. Completed meetings per 100 profiles shared.** Baseline 4.2%. The only metric connecting the funnel to the outcome, and the guardrail against narrowing the pool.

## Part 2 · Design a solution

### Problem

Matchmakers share profiles that conflict with what the client has already said. The information exists, but it lives in an onboarding call, email threads and memory, not where it is needed when sending. Around 240 rejections a month were for reasons already on the client's file, and a matchmaker spends about two hours a week per client searching. Each one costs a message, a client, and some faith in the service.

### User

The matchmaker, on the sending side of the email. One person. The client is the source of truth.

### Solution

A check in the flow the matchmaker already works in. Before a profile goes to a client, the tool compares that client's criteria with it, and returns one of five findings: a conflict with a confirmed dealbreaker, a preference mismatch, a contradiction in the client's own file, a prior rejection, or missing information. Each finding names the criterion, the value, and where it came from.

Criteria record a direction and a firmness separately. "Must be vegetarian" and "must not be vegetarian" are opposite criteria, and comparisons are on values, so a vegetarian candidate does not trip a non-vegetarian dealbreaker. A preference is advice; a confirmed dealbreaker is a no, and only the client can give one.

Three things are kept apart. What the client said is a rule. What they did is history, never read as a preference. A pattern the matchmaker noticed is an observation, put to the client rather than used to rule a profile out.

The matchmaker holds the profile, asks the client, or shares it. Nothing is blocked and no criterion changes without the client's words. Sharing past a confirmed dealbreaker asks for a reason, and the reason is kept.

### Data

Client criteria as dimension, direction, values, firmness and timestamp, versioned so a past profile is judged against the file as it was. Candidate attributes as a value per dimension, where a blank means unknown, not no. Rejections with a dimension, a severity and the original wording. Share events recording the check the server recomputed when sending.

### Technology

Node and a small local store, a plain browser interface, no dependencies. No model sits in the decision path, because every check compares a known value against a known value in a recorded direction. The one place a model would help, proposing a dimension from free text, is stood in by a keyword heuristic a human confirms.

### Success Metric

Confirmed-criterion conflict rate at send time falls against a baseline measured the same way, while profile acceptance rate and completed meetings per 100 shared do not fall. Coverage is reported beside it, and overrides keep their reasons.

One person can build this in two weeks: one screen, one comparison, one file. That is a build estimate, not a claim matchmakers will use it. Whether they consult it when sending, and whether the criteria on file are accurate enough, are unvalidated, and they are what the pilot exists to find out.

## Part 3 · Working prototype

A working Node app, no dependencies, synthetic data, 139 passing tests.

```bash
node src/server.js   # http://localhost:4321
node --test
```

The core behaviour, in one path. Press **Reset demo** before each section.

1. **Open Priya S.** The page opens on what she wants: her dealbreaker first, then her preferences, each labelled with where the evidence came from, the client's own words, and when it was recorded, and a change log. It also flags that she confirmed she will not accept a smoker and later accepted one, which only she can settle.
2. **Send Aarav M.** The check opens before anything is sent, naming the criterion, the candidate's value and where each came from. **Hold the profile** dismisses it without sending anything; **Share this profile** sends it.
3. **Ask the client.** The sheet asks one question about one dimension, and takes a direction, the values, how firm it is, and the client's own words. A rule is written from what she said, and the version it replaced is kept with the date it was in force.
4. **Send Karan D.** His location matches what she wants, so there is no mismatch there. What is left is the contradiction on smoking, which only she can settle, and his education is not recorded, which is neither a match nor a mismatch.
5. **Open Rahul M.** and send **Nikhil S.** A confirmed dealbreaker, with the client's own words beside it. Sharing anyway asks for a reason.
6. **Open Neha K.** and send **Varun J.** The check says his position on children is not recorded. Send **Ishita P.** and it says she does not want children, which is advice rather than a warning.
7. **Check another profile** on the client, to pick from the profiles already in the workspace with what is known about each, without entering anything twice. A client, a criterion and a profile can all be created from the interface.
8. **Open How it's going.** Profiles sent, checked before sending, mismatches found, profiles with missing information, and dealbreaker conflicts that reached clients, each with its sample size. The measurement detail is behind a disclosure.

Screenshots are in `screenshots/`. The full script, five sections and twenty steps, is in `docs/DEMO_SCRIPT.md`.

The acceptance debrief, which captures what a client's yes taught the matchmaker, is built but sits outside the check, on the client page. It is a next step, not the claim, because there is no evidence matchmakers fail to capture it today.

## Part 4 · One curveball

**What I would check first.** Whether the check was consulted when profiles were sent. That is the adoption guardrail, not the outcome rate, and a tool nobody opens changes nothing, which is a cheaper explanation for a flat metric than wrong reasoning.

**What data I would inspect.** The audited rate before and after, by matchmaker not pooled, with coverage and the override rate beside it. Whether the flagged profiles were in fact rejected for that reason, which tests the flagging. Whether the criteria on file are still what the client would say, since the check is only as good as the file. Whether the 35% was classified consistently, re-coding a sample blind.

**Iterate, change, or stop.** If adoption was low, that is a workflow problem, so I would move the check earlier in the send flow. If it was used and the rate did not fall, the criteria are probably wrong, and I would rebuild them with the matchmakers. If the rate fell and completed meetings did not, the problem is downstream and I would stop. Two weeks cannot prove a business effect, so it ends the first iteration, not the question.

## AI usage

- **Tools:** AI coding agents for research synthesis, code and drafting, plus separate fresh-context sessions used only as red-team reviewers.
- **Used for:** reading The Date Crew's public material and the behavioural literature, building and testing the Node prototype, and drafting these documents.
- **Where I disagreed:** the reviewers found that my check compared dimension categories rather than values, so a candidate tagged with any diet attribute tripped a non-vegetarian dealbreaker, and any candidate in any city looked like a match for a preference for the Bangalore metro. I rejected the category comparison and rebuilt it to work on values in a recorded direction, which also produced the preference-mismatch state I had claimed but not built. A later review found my metric could improve if matchmakers stopped using the checker, and that is why the primary outcome is now reviewed over every profile sent rather than over the ones that were checked. A later pass found I was reading the client's history as their preference, so the client's answer now establishes a preference, their history is context, and a matchmaker's pattern is a hypothesis that never rules a profile out.
- **Not used for:** the decisions. The product direction, the scope cut after review, and these answers are mine.

## What I left out, and why

- **A sourcing-channel scorecard.** With two to five candidates per channel in the available data, any channel-level rate would be noise presented as insight, so I did not build one.
- **Client-facing prompts.** A matchmaker asking the client one question in a normal check-in does the same work without putting the service in the position of doubting a client who has a firm boundary.
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
