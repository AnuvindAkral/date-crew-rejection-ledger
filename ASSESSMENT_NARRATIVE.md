# The Date Crew: Product Growth Assessment

Canonical submission response. The detailed research, decisions, tests and supporting documents live in `phase1/` and `docs/`; this file is the answer.

## Diagnosis

The brief gave me a funnel: 1,000 profiles shared, 310 accepted, 210 contact details shared, 150 conversations, 75 meetings fixed, 42 completed. That is 4.2% of shared profiles ending in a completed meeting.

The obvious headline is the 690 rejections at the first step. But the number worth acting on is narrower, and its denominator is ambiguous. About 35% of rejections were for reasons the client had already stated in their preferences. If that means 35% of the 690, it is about 242 profiles, or 24% of everything shared. If it means 35% of all 1,000, it is 350. The two readings differ by more than a hundred profiles, so I never treated either as settled.

Two other things I refused to lean on. The public site's own success figures conflict with each other, 1,000+ matches on one page and 10,000+ connections on another, so I anchored on the supplied funnel rather than marketing numbers. And the two matchmakers' acceptance rates, 44% against 21%, cannot be read as skill without controlling for the clients and sources each one handles.

The problem I chose is not "matchmakers send too many bad profiles." It is narrower and more tractable: rejection feedback, the signal the founder herself says matters most, arrives as unstructured free text and cannot be reused, and the positive half of the loop, why a client said yes, was never captured at all.

## Solution

I built two pieces on one prototype.

The Rejection Ledger turns a rejection into a structured record: a dimension, a severity, and the reason in the matchmaker's own words. It keeps a per-client history and, at the moment the matchmaker is about to send the next profile, surfaces either a conflict or a contradiction. A confirmed dealbreaker is a deterministic check. A historical rejection is evidence, never a standing rule; the only thing that can change a preference is a recorded client answer. Missing information is never shown as a clean bill of health.

The acceptance debrief adds the missing positive signal. When a client accepts someone, or a date goes well, the matchmaker records what mattered and what surprised them. That insight appears at the next send review with a checkbox, and the matchmaker marks whether it informed the recommendation. The metric is the proportion of captured insights, among those with a later recommendation to inform, that were explicitly consulted. It measures whether the loop is used, not whether matching improved. An insight with no later recommendation is not counted as unconsulted.

My first instinct was to make the debrief client-facing: show the client "you rejected three for location, then accepted one," and ask if the next objection was about the profile or the person. I ran an independent red-team review with permission to kill it, and it did. The mechanism I thought I was inventing already existed as the contradiction card, so the only new part was making it client-facing, which reversed our own decision to keep everything matchmaker-side. Worse, it risked the exact clients a premium service protects: someone with a firm boundary gets the service doubting them, someone filtering for their family gets forced to disclose the filter or fake consistency. So I dropped the client-facing idea and kept the positive signal matchmaker-side.

I also considered a per-sourcing-channel scorecard and rejected it. The synthetic data has two to five candidates per channel, so any channel-level rate would be noise presented as insight. The source field stays on every candidate, ready if real data ever supports it.

The prototype is a zero-dependency Node app: five matchmaker-side screens, 40 passing tests, synthetic data throughout, no model call, no API key.

What remains unvalidated is whether acceptance carries information rejection does not, and whether the debrief fits a real matchmaker's workflow. The five-conversation interview protocol for those questions is prepared in `docs/INTERVIEW_PROTOCOL.md` and has not been run.

## Curveball

**"Your red-team review showed the client-facing idea was dangerous and the ledger already existed. What did you add that a thoughtful matchmaker with a notebook can't already do?"**

Not much, for one excellent matchmaker with a perfect memory. The product does not replace judgement; it keeps judgement from degrading as the caseload grows.

A matchmaker with eight clients cannot keep every rejection, every reason, every yes in their head. TDC's own pitch is "people who remember your story by heart, not from a database," which is exactly what breaks under load. A notebook works for one person and fails the moment a client changes hands or a matchmaker has a busy week.

The two pieces add two things. The ledger makes rejection history retrievable at the moment of a send. The debrief captures the one thing a notebook usually skips, the reason a client said yes. The consultation metric is the honest part: it measures whether the captured learning is actually used, not whether it works.

The claim is small: it reduces the cost of remembering and makes forgetting visible. If that is not worth building, the answer is more matchmakers, a real option, just more expensive.

## What is included and what is not

- **Working prototype:** yes. Run `node src/server.js`, open http://localhost:4321. Demo script in `DEMO_SCRIPT.md`.
- **Tests:** `node --test`, 40 pass.
- **Screenshots:** three captured in `screenshots/`, not visually inspected by me; a human should glance before sharing.
- **Code repository:** local git only, no remote yet.
- **AI usage:** disclosed in `docs/AI_USAGE.md`. The only AI-shaped part is a keyword heuristic that proposes a dimension from free text, and a human confirms it. No scoring, ranking, or preference writes.
- **Updated resume:** not done. Requires my actual resume and review.
