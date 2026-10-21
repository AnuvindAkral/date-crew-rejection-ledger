---
title: The Date Crew - Product Growth Assessment
status: submission response
created: 21 October 2026
---

# The Date Crew · Product Growth Assessment

The assessment of record for this repository. Section lengths follow the brief: Part 1 about 300 words, Part 2 about 500, Part 4 under 200.

## Part 1 · Diagnose the problem

### The three questions I would investigate

**1. Why are clients rejecting profiles, and how many rejections conflict with something already on the client's file?** It separates preventable errors from ordinary selectivity. Only the conflict subset is fixable.

**2. Where do clients drop off after they accept a profile?** 310 accepted became 42 completed meetings. Most of the loss sits downstream, which tells me whether to work on the first stage at all.

**3. Why does acceptance differ between matchmaker A at 44% and matchmaker B at 21%?** If the gap is case mix or sourcing, the fix is allocation. If it is practice, there is something worth codifying.

### The biggest problem in the funnel

The largest loss is the first stage: 690 rejections. The largest *addressable* problem is the slice where the profile conflicted with what the client had said. If the 35% is counted against all 690 rejections, that is roughly 242 profiles, about 24% of everything shared.

I assume the 35% is reliable enough to act on, that the denominator is rejections, not all shared profiles, and that the conflicts were knowable then. If the denominator is 1,000, the number is 350 and the case is stronger. If they were not knowable then, the problem is upstream and no check helps.

### The three metrics I would track

**1. Confirmed-criterion conflict rate at send time.** Profiles shared where the check found a conflict against a client-confirmed criterion, over profiles checked. Dealbreaker conflicts and preference mismatches are reported apart, and coverage alongside, so a rate that improves because the tool was used less is visible.

**2. Profile acceptance rate, segmented by client and matchmaker.** The outcome the business already tracks, and the check that metric one is not improving by sending less.

**3. Completed meetings per 100 profiles shared.** Baseline 4.2%. The only metric connecting the top of the funnel to the business outcome, and the guardrail against a tool that narrows the pool and looks like progress.

## Part 2 · Design a solution

### Problem

Matchmakers share profiles that conflict with what the client has already said. The information exists, but it lives in an onboarding call, email threads and memory, not where it is needed. Around 242 rejections a month were for reasons already in the client's preferences. Each one costs a message, a client, and some faith in the service.

### User

The matchmaker, on the sending side of the email. The client is the source of truth, not the user.

### Solution

A pre-send check inside the share flow the matchmaker already uses. Before anything goes out, the tool loads that client's recorded criteria, compares them with the candidate's attributes, and returns what it found.

- **Conflict.** A confirmed dealbreaker matches the candidate's value. Deterministic, and the only state treated as a firm no.
- **Preference mismatch.** The candidate's value does not match a stated preference. Advisory, not a warning.
- **Contradiction.** The client rejected on this dimension before and later accepted someone with it. A prompt to ask, not a rule.
- **Prior rejection.** The client rejected on this dimension before and has not accepted since. A pattern, not a rule.
- **Incomplete.** The client has a criterion here and the candidate's value is unknown. Never reported as "no conflict": missing information is not agreement.

When there is nothing to compare, the card says so rather than reporting no conflict.

Comparisons are on values, not on categories, so a vegetarian candidate does not trip a non-vegetarian dealbreaker. A preference and a dealbreaker stay visibly different, and the tool never upgrades one into the other: a preference is a criterion the client might trade against, a dealbreaker is one they will not move on.

Data entry is short and lives in the interface. Create or pick a client and name its matchmaker. Record the client's criteria: dimension, value, and whether it is a preference or an explicit no, in their words. Add a candidate with only the attributes known; blank means unknown, never no. Every change is recorded with what it replaced, and a criterion can be withdrawn without erasing it.

The matchmaker proceeds, holds, or asks the client. Nothing is blocked, no criterion changes without the client's words, and every override is logged.

### Data

Client criteria as dimension, value, kind and timestamp, with a change log. Candidate attributes as a value per dimension. Rejections with a coded dimension, severity, the value rejected and the original wording. Acceptances. Share events recording the check the server recomputed at send time, so the metric is a fact about the send, not a claim by the interface.

### Technology

Node and a small local store, with a plain browser interface and no dependencies. No model sits in the decision path, because every check that matters compares two known values. The one place AI helps is proposing a dimension from free text, and a matchmaker confirms it: "not based in Bangalore, won't relocate" should not mean picking from twelve.

### Success metric

Confirmed-criterion conflict rate at send time falls, while profile acceptance rate and completed meetings per 100 shared do not fall. The first moves because specific conflicts stop being sent; the other two guard against narrowing the pool and calling it progress.

## Part 3 · The prototype

A working Node app, no dependencies, synthetic data, 85 passing tests.

```bash
node src/server.js   # http://localhost:4321
node --test
```

The core behaviour, in one path. Press **Reset demo** before each beat.

1. **Open Priya S.** Her ledger shows a contradiction on location: rejected 3, accepted 1.
2. **Send Aarav M.** The check fires before anything is sent, showing the earliest rejection in the matchmaker's own words next to the profile she later accepted. It also flags that Aarav is in Pune and she had asked for the Bangalore metro, so the mismatch and the contradiction both appear.
3. **Ask the client**, pick the value, type her answer, choose **Preference**. A rule is written, and only from her recorded words.
4. **Send Karan D.** The contradiction is gone. What remains says his education is unknown, which is a smaller and different point.
5. **Open Rahul M.** and send **Nikhil S.** The check fires a hard conflict, because he is non-vegetarian and that is a confirmed dealbreaker. Send **Dev P.** for the clean case: he is vegetarian, so the same dimension gives the opposite answer.
6. **Open Neha K.** and send **Varun J.** The check says his position on children is unknown. Send **Ishita P.** and it says she does not want children, which is a preference mismatch, and a preference is advice rather than a warning.

Matchmakers, clients and candidates are records with stable ids behind every dropdown, so nothing in the interface is a name typed into a box. The data entry is demonstrable without touching code. On **Clients**, **Add a client** creates one and names its matchmaker. Open the client, **Record what the client said** captures a criterion, and saving over one records the change. On **Candidates**, **Add a candidate** creates a profile with known attributes, and picking a client from the dropdown runs the same check without sending anything. The **Measurement** tab shows the primary metric, the two arms separately, and the override rate, computed from the checks the server recorded at send time.

Screenshots are in `screenshots/`. The full script is in `docs/DEMO_SCRIPT.md`.

Also built, and not part of the claim above: an acceptance debrief that captures what a client's yes taught the matchmaker, surfaced at the next send. It is the obvious next question after rejections, and it is a next step, not the thesis, because I have no evidence yet that matchmakers fail to capture it today.

## Part 4 · One curveball

**1. What I would check first.** Whether the check was used when profiles were sent. A tool nobody opens changes nothing, a cheaper explanation for a flat metric than the reasoning being wrong. I would instrument exposure separately from agreement: "shown" and "looked at" are different events.

**2. What data I would look at.** Conflict rate before and after by matchmaker, not pooled. How often the check was shown, consulted and overridden, and why. Whether the profiles it flagged were in fact rejected for the same reason, which tests the flagging. Whether the 35% was classified consistently, by re-coding a sample of the original rejections blind.

**3. Iterate, change, or kill.** If it was rarely consulted, that is a workflow problem, so I would move it earlier in the send flow. If it was consulted and conflicts did not fall, I would review the criterion records with matchmakers, since the data may be wrong. If conflicts fell and completed meetings did not, the problem is downstream and I would stop expanding the tool. One defined test window for the smallest iteration; if the behaviour still does not change, I would stop and ask whether this needs a tool at all.

## AI usage

- **Tools:** Claude for research synthesis, code and drafting, plus a separate fresh-context session used only as a red-team reviewer.
- **Used for:** reading The Date Crew's public material and the behavioural literature, writing and testing the Node prototype, and drafting these documents.
- **Where I disagreed:** the reviewer found that my check compared dimension categories, so a candidate tagged with any diet attribute tripped a non-vegetarian dealbreaker and any candidate in any city looked like a match for a preference for the Bangalore metro. I rebuilt the comparison to work on values, which also created the preference-mismatch state I had claimed but not built. An earlier draft of mine also overstated what a meta-analysis in the mate-preference literature found, and the review caught that too.
- **Not used for:** the decisions. The product direction, the scope cut after review, and these answers are mine.

## What I left out, and why

- **A sourcing-channel scorecard.** With two to five candidates per channel in the available data, any channel-level rate would be noise presented as insight, so I did not build one.
- **Client-facing prompts.** A matchmaker asking the client one question in a normal check-in does the same work without putting the service in the position of doubting a client who has a firm boundary.
- **Compatibility scoring or ranking.** It needs outcome labels this business will not have for a year, and it would put a model where the brand says a human must be.

## Limits of this answer

No matchmaker has been interviewed and no real client data has been seen, so every claim about workflow fit is a hypothesis. The prototype shows the mechanism works; it does not show the metric moves. The 35% denominator is unconfirmed, the funnel period and cohort are unknown, and the 44% against 21% gap is not interpretable without case-mix and channel control. The open questions and the cheapest way to answer them are in `docs/VALIDATION_PLAN.md`.

## Submission checklist

| Required | Where |
| --- | --- |
| Answers | This document |
| Prototype | Screenshots in `screenshots/`, run instructions above, code in the repository |
| Code | Local repository, no remote yet, publishing on approval |
| AI usage | The section above, four lines |
| Updated resume | Not done. It needs your actual resume and your sign-off, and I will not write one for you |
