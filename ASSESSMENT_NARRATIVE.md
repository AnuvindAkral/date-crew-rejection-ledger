# The Date Crew — Product Growth Assessment: Narrative

## The problem

The Date Crew sells a premium promise: a human matchmaker who understands you, curates introductions, and stays with you from onboarding to commitment. The funnel numbers I was given show where that promise strains.

| Stage | Count | Step rate |
| --- | --- | --- |
| Profiles shared | 1,000 | |
| Profiles accepted | 310 | 31.0% |
| Contact details shared | 210 | 67.7% |
| Conversations started | 150 | 71.4% |
| Meetings fixed | 75 | 50.0% |
| Meetings completed | 42 | 56.0% |

Overall: 42 of 1,000 shared profiles reach a completed meeting, 4.2%.

The biggest loss is the first step, 690 rejections. The number that matters more is narrower and needs its denominator stated plainly. About 35% of rejections were for reasons the client had already stated in their preferences. If that means 35% of the 690 rejections, it is roughly 242 profiles, or 24% of everything shared. If it means 35% of all 1,000 shared, it is 350. The two readings differ by more than a hundred profiles, so I never treated either as settled.

I also note the public site's own success figures conflict with each other: 1,000+ matches on one page, 10,000+ successful connections on another. So I anchored on the supplied funnel, not the marketing numbers. The two matchmakers' acceptance rates, 44% against 21%, are not interpretable as skill without controlling for the mix of clients and sources each handles, and I did not pretend they were.

## The hypothesis

The founder has written the core insight herself: she learns little from what a client says at onboarding and far more from what they reject. Rejection is the honest signal. My research, and a behavioural literature I checked, adds a caveat that changes the product. Stated preferences predict what people avoid more reliably than who they actually connect with. The rejection signal is real, but it is mostly an avoidance signal. The service was missing the other half: what a client's yes teaches.

## What I built

Two pieces. One existed, one is new.

The Rejection Ledger turns unstructured rejection reasons into structured, comparable records, keeps a per-client history, and surfaces a conflict or a contradiction at the moment the matchmaker is about to send the next profile. A confirmed dealbreaker is a deterministic check. A historical rejection is evidence, never a standing rule. The only way a preference changes is a recorded client answer. Missing information is never treated as a clean bill of health.

The acceptance debrief is the new piece. When a client accepts a profile or has a good experience, the matchmaker records what mattered and what surprised them. That insight surfaces at the next send review with a checkbox, and the matchmaker marks whether it informed the recommendation. The measurement view reports the proportion of insights that had a later recommendation and were explicitly consulted. That measures whether the learning loop is used, not whether matching improved. An insight with no later recommendation is not counted as unconsulted.

The two work together. The ledger preserves what the client has already told us. The debrief adds what the yes taught us. The next introduction is informed by both.

## The idea I rejected, and why

My first instinct for the debrief was to make it client-facing: show the client their own history, "you rejected three for location, then accepted one," and ask whether the next objection was about the profile or the person. I called it the Unexpected Yes.

I ran an independent red-team review with permission to kill it, and it did. It found three things. The mechanism I thought I was inventing already existed in the prototype as the contradiction card, so the only genuinely new part was making it client-facing. That client-facing part reversed our own earlier decision to keep everything matchmaker-side, and it risked the exact people a premium service protects: someone with a firm boundary gets the service doubting them, someone filtering for their family gets forced to either disclose the filter or fake consistency, someone who walked away from a bad experience gets nudged back across it. And the metric I had proposed, reconsideration rate, rewarded converting rejections into sends regardless of whether they became meetings.

So I narrowed it. The rejection stays with the matchmaker. The positive signal is captured matchmaker-side, at the moment of acceptance, with no client confrontation. The tempting client-facing idea is documented and rejected. That rejection is the point of showing this work: an attractive idea was challenged, a risky interaction was removed, and the scope was narrowed because of it.

## The scorecard I also rejected

I considered a per-sourcing-channel scorecard to show where unsuitable profiles come from. On the synthetic data, two to five candidates per channel, it would have been noise dressed as insight, exactly the kind of misleading dashboard I was trying to avoid. The source field stays on every candidate, ready if real data ever supports the comparison. The gate before any scorecard is a real question in the interview protocol: is channel even a meaningful axis to the people doing the work.

## The build

A zero-dependency Node 22 prototype. One local server, plain HTML, CSS and JavaScript, a JSON store, and 40 tests. Five matchmaker-side screens: workspace, rejection capture, the ledger, the send review, and an operator-only measurement view. All data is synthetic and labelled. No API key, no model call, no database, no deployment.

Run it with `node src/server.js` and open http://localhost:4321. Test it with `node --test`.

The demo is two beats. First, the ledger: open Priya S., whose history shows a contradiction on location (rejected three, accepted one); send Aarav M. and the card shows both sides; ask the client, record her answer, and the dimension settles; send Karan D. and the card fires clean. Second, the debrief: Priya's acceptance insight from Arjun T. surfaces at the next send with a checkbox, the matchmaker ticks it and sends, and the measurement view reports 1 / 1 consulted. The word-for-word script is in DEMO_SCRIPT.md.

## Metrics and guardrails

Primary for the debrief: the proportion of acceptance insights, among those with a later recommendation, that were explicitly consulted. It measures whether the loop is used, not whether matching improved.

Guardrails: a confirmed dealbreaker is never surfaced as a paper objection; a client-confirmed rule requires the client's recorded words; matchmaker time does not rise; no client reports feeling doubted. ARCR, the ledger's metric, stays, with the recurrence-not-avoidability correction applied.

## What is proven and what is not

The prototype proves the mechanism works technically: a rejection can be captured, a contradiction can be surfaced and settled, an acceptance can be debriefed and consulted. It does not prove any of it helps. Whether acceptance carries information rejection does not, whether the workflow fits a real matchmaker, and whether any of this moves retention or matches are open questions.

The five-conversation matchmaker interview protocol for those questions is prepared in docs/INTERVIEW_PROTOCOL.md and has not been run. I have no access to TDC matchmakers and I did not invent any interviews or results.

## AI usage

The only AI-shaped component is a keyword heuristic that proposes a dimension from a free-text reason, and a human confirms or changes it. The conflict and contradiction checks are deterministic field comparisons. No model scores compatibility, ranks people, or writes a preference. The brand is human-first, and the product is built to keep it that way.
