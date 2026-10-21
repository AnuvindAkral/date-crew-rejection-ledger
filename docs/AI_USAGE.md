# How AI is used, and where it is not

A standalone explanation, so the AI story is stated in one place instead of scattered across the metrics and code.

## The one line

The model, if one were wired in, proposes a structured dimension from a free-text rejection reason. A human confirms it. The model never decides who meets whom, never writes a preference, and never treats missing data as a match.

## The decision path, end to end

| Step | Who decides | AI involved? |
| --- | --- | --- |
| Capture a rejection reason | Matchmaker picks a dimension and severity | Yes, as a suggestion only |
| Propose a dimension from free text | Model proposes, matchmaker confirms or changes | Yes, the only AI step |
| Conflict check (confirmed dealbreaker) | Deterministic field comparison | No |
| Contradiction check (reject then accept) | Deterministic, requires evidence from both events | No |
| Write a confirmed rule | Client's recorded words, recorded by the matchmaker | No |
| Proceed, hold or resolve | Matchmaker | No |

## Why the model is only a tag suggester

The brand already draws the line. The public site says "No AI. No App. No Endless Swiping", and its comparison table contrasts "by expert matchmakers" with "through AI or low-EQ relationship managers". The same company already uses AI in Magic Link to draft personal descriptions.

So the line is narrow and real: AI may draft and summarise what a person already decided. It may not decide. The tag suggester is the one place inside that line where AI earns its keep, because normalising prose into a fixed vocabulary is what keeps rejection capture at a few seconds instead of a minute.

## The model in this prototype

There is no model call. `src/lib/suggest.js` is a keyword heuristic that stands in for the model and is labelled as such. The full core workflow runs with no model and no API key, which is deliberate: the mechanism being demonstrated is the ledger, not the model, and the demo cannot fail on a missing key.

## What is explicitly not done

- No compatibility score. Rejected in `phase1/DECISIONS.md` section 4.3: it needs outcome labels that will not exist for a year, and it puts the algorithm where the brand says a human must be.
- No opaque ranking.
- No AI-written client messages. Intro messages are the most trust-sensitive thing a matchmaker sends.
- No cross-client precedent search. It has a real privacy cost that does not fit a two-week prototype.
- No silent preference changes. The only code path that writes a preference requires the client's recorded words (`src/lib/store.js` `recordClientAnswer`), and it is tested.

## The consent point

The pilot does not assume a client agreed to AI processing merely because the company uses a CRM. In this design, classification is deterministic and human-confirmed, so no model touches client data at all. If a model were introduced later, separate and specific consent would be required before it touched client data. That is written into `PILOT_PLAN.md` section 6.

## What to say if asked to make the AI bolder

Ask which brand promise is being given up first. A semantic pre-send check that reads notes and flags conflicts would catch more soft cases, but it would also confidently say wrong things about people, which is the exact failure the founder's own writing warns against, where a label gets read as a prediction.
