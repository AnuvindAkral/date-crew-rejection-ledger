---
title: The Date Crew - Product Growth Assessment
status: submission response
created: 21 October 2026
---

# The Date Crew · Product Growth Assessment

Answers to the assessment brief. Section lengths follow the brief: Part 1 about 300 words, Part 2 about 500, Part 4 under 200.

## Part 1 · Diagnose the problem

### The three questions I would investigate

**1. Why are clients rejecting profiles, and how many rejections conflict with something already on the client's file?** It separates preventable errors from ordinary selectivity. Only the conflict subset is fixable.

**2. Where do clients drop off after they accept a profile?** 310 accepted became 42 completed meetings. Most of the loss sits downstream of acceptance, which tells me whether to work on the first stage at all.

**3. Why does acceptance differ between matchmaker A at 44% and matchmaker B at 21%?** If the gap is case mix or sourcing, the fix is allocation. If it is practice, there is something worth codifying.

### The biggest problem in the funnel

The largest loss is the first stage: 690 rejections. The largest *addressable* problem is the slice where the profile conflicted with what the client had already said. If the reported 35% is counted against all 690 rejections, that is roughly 242 profiles, about 24% of everything shared.

I am assuming the 35% is reliable enough to act on, that the denominator is rejections rather than all shared profiles, and that the conflicts were knowable at send time. If the denominator is 1,000, the number is 350 and the case is stronger. If they were not knowable then, the problem is upstream and no pre-send check helps.

### The three metrics I would track

**1. Preference-conflict rate at send time.** Conflicts per 100 profiles shared, confirmed-dealbreaker conflicts reported separately from softer preference mismatches. The number the work can move, and it moves before the expensive stages.

**2. Profile acceptance rate, segmented by client and matchmaker.** The outcome the business already tracks, and the check that metric one is not being improved by sending less.

**3. Completed meetings per 100 profiles shared.** Baseline 4.2%. The only metric connecting the top of the funnel to the business outcome, and the guardrail against a tool that narrows the pool and looks like progress.

## Part 2 · Design a solution

### Problem

Matchmakers share profiles that conflict with what the client has already said. The information exists, but it lives in an onboarding call, email threads and memory, so it is not available at the moment of sending. Around 242 rejections a month were for reasons already in the client's preferences. Each one costs a message, a client, and some faith in the service.

### User

The matchmaker, on the sending side of the email. One person.

### Solution

A pre-send check inside the share flow the matchmaker already uses. When they are about to share a profile, the tool loads that client's recorded preferences and confirmed dealbreakers, compares them with the candidate's known attributes, and returns one of four states before anything goes out.

- **Conflict.** A confirmed dealbreaker matches. A deterministic field comparison, and the only state treated as a firm no.
- **Preference mismatch.** A stated preference matches. Advisory.
- **Contradiction.** The client rejected on this dimension before and later accepted someone with it. A prompt to ask, not a rule.
- **Incomplete.** No preferences on file, or the candidate has no attributes. Never reported as "no conflict", because missing information is not agreement.

A preference and a dealbreaker stay visibly different. A preference is a stated criterion the client might still trade against. A dealbreaker is one the client has confirmed they will not move on, and only the client can confirm that. The tool never upgrades one into the other.

The matchmaker proceeds, holds, or resolves. Nothing is blocked automatically, no preference changes without a recorded client answer, and every override is logged with a reason.

When a client rejects a shared profile, the reason is captured as a dimension, a severity, and the original wording, so the next send has history to work from.

### Data

Client preferences and confirmed dealbreakers, each with its confirmation status and timestamp. Candidate attributes. Past rejections with coded dimension, severity and verbatim text. Past acceptances. Share events recording what was checked, what was flagged and what was sent, so the first metric can be read per client and per matchmaker rather than pooled.

### Technology

Node and a small local store, with a plain browser interface. No model sits in the decision path, because the two checks that matter are comparisons of a known preference against a known attribute. The one place AI helps is normalising a free-text rejection into a proposed dimension, and a human confirms it, because that is what keeps capture to a few seconds. A matchmaker typing "not based in Bangalore, won't relocate" should not have to pick a dimension from a list of twelve.

### Success metric

Preference-conflict rate at send time falls, while profile acceptance rate and completed meetings per 100 shared do not fall. The first moves because specific conflicts stop being sent. The other two are the guardrail that it stopped by narrowing rather than by improving.

## Part 3 · The prototype

A working Node app, no dependencies, synthetic data, 43 passing tests.

```bash
node src/server.js   # http://localhost:4321
node --test
```

The demo, about two minutes. Press **Reset demo** before each beat.

1. **Open Priya S.** Her rejection ledger shows a contradiction on location: rejected 3, accepted 1.
2. **Send Aarav M.** The check fires before anything is sent, showing the earliest rejection in the matchmaker's own words next to the profile she later accepted, and asks one question: dealbreaker or preference?
3. **Ask the client**, type her answer, choose **Preference**. A rule is written, and only from her recorded words.
4. **Send Karan D.** The check is clean, because the dimension is settled.
5. **Open Rahul M.** and send **Nikhil S.** The check fires a hard conflict against his confirmed dealbreaker on diet, which is the deterministic case.
6. **Open Meera J.** and send **Sam K.** The check says it has nothing to compare against, rather than implying no conflict.

Screenshots are in `screenshots/`. The full script is in `docs/DEMO_SCRIPT.md`.

Also built, and not part of the claim above: an acceptance debrief that captures what a client's yes taught the matchmaker, surfaced at the next send. It is the obvious next question after rejections, since the literature on mate preferences is consistent that stated preferences predict what people avoid better than what they choose. It is a next step, not the thesis, and I have no evidence yet that matchmakers fail to capture it today.

## Part 4 · One curveball

**1. What I would check first.** Whether the check was used when profiles were sent. A tool nobody opens changes nothing, a cheaper explanation for a flat metric than the reasoning being wrong. I would instrument exposure separately from agreement: "shown" and "looked at" are different events.

**2. What data I would look at.** Conflict rate before and after by matchmaker, not pooled. How often the check was shown, consulted and overridden, and why. Whether the profiles it flagged were in fact rejected for the same reason, which tests the flagging. Whether the 35% was classified consistently, by re-coding a sample of the original rejections blind.

**3. Iterate, change, or kill.** If it was rarely consulted, that is a workflow problem, so I would move it earlier in the send flow. If it was consulted and conflicts did not fall, I would review the preference records with matchmakers, since the data may be wrong. If conflicts fell and completed meetings did not, the problem is downstream and I would stop expanding the tool. One defined test window for the smallest iteration; if the behaviour still does not change, I would stop and ask whether this needs a tool at all.

## AI usage

- **Tools:** Claude for research synthesis, code, and drafting, plus a separate fresh-context Claude session used only as a red-team reviewer.
- **Used for:** reading The Date Crew's public material and the behavioural literature, writing and testing the Node prototype, and drafting these documents.
- **Where I disagreed:** an early draft of mine overstated what a meta-analysis in the mate-preference literature found, and my own first proposal was a client-facing feature that showed clients their own rejection history. The independent review caught both. I corrected the citation, and I kept the rejection history on the matchmaker's side of the screen.
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
