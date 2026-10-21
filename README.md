# Rejection Ledger

A matchmaker-side tool built for The Date Crew's product growth assessment. It helps a matchmaker remember what they have already learned about a client, and brings that information back at the moment it can change the next decision. It supports human judgement. It does not replace it.

Zero dependencies. Synthetic data only. Runs locally.

## Why this exists

A matchmaker's work is built on conversations. A client says no to a profile and explains why, and that reason is valuable. It tells you what actually matters to them, often more than what they said during onboarding. But the reason usually lives in a message thread or a memory, and it disappears. A month later the same matchmaker, or a colleague covering the case, sends a profile that repeats the same mistake, and the client quietly loses a little faith.

The founder of The Date Crew has made this point herself: she learns little from what a client says at the start, and far more from what they reject. This tool makes that insight usable.

The main thing it does happens before an email goes out. When a matchmaker is about to share a profile, the tool loads that client's recorded preferences and confirmed dealbreakers, compares them against the candidate's known attributes, and returns one of four states: a conflict against a confirmed dealbreaker, a softer preference mismatch, a contradiction where the client rejected this dimension before and later accepted it, or incomplete because there is nothing to compare against. The matchmaker proceeds, holds, or resolves. Nothing is blocked automatically and no preference changes without a recorded client answer.

The second thing it does is make the rejection itself reusable. A rejection becomes a structured record, a dimension, a severity, and the reason in the matchmaker's own words, so the next send has history to work from.

Neither decides anything. Both surface what is already known, at the point it is useful, and leave the judgement where it belongs.

## What is implemented

- **The pre-send check.** Conflict against a confirmed dealbreaker, preference mismatch, contradiction, and incomplete, each with its evidence. Deterministic field comparisons, no model in the decision path.
- Structured rejection capture: a dimension, a severity, and the reason, with a keyword suggestion for the dimension.
- A per-client rejection ledger: history by dimension, contradiction markers, and client-confirmed rules.
- Client clarification: a rule is written only from a recorded client answer, never silently.
- A learning loop, built but presented as a next step: an acceptance debrief that captures what a client's yes taught the matchmaker, surfaced at the next send with a checkbox, and a metric for whether captured insights get consulted.
- An operator-only measurement view, kept away from the matchmaker it would otherwise measure.

## Run it

```bash
node src/server.js
# or
npm start
```

Open http://localhost:4321

## Test it

```bash
node --test
# or
npm test
```

40 tests cover the send-review rules, the metric computations, the store, the missing-data handling, and the acceptance-debrief loop. No build step, no install.

## Demo

Three short beats, about two minutes total. Reset the demo before each beat.

1. Open **Priya S.** Her ledger shows a contradiction on *Location or city tier*: rejected 3, then accepted 1. Send **Aarav M.** and the check fires before anything goes out, showing the earliest rejection next to the profile she later accepted. Ask the client, record her answer, and the dimension settles. Send **Karan D.** and the check is clean.
2. Open **Rahul M.** and send **Nikhil S.** The check fires a hard conflict against his confirmed dealbreaker on diet. A field comparison, no model, and the matchmaker still decides.
3. Open **Meera J.** and send **Sam K.** The check says it has nothing to compare against, rather than implying no conflict.

The word-for-word script is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Stack

Node 22, `node:http` server, `node:test` test runner, plain HTML, CSS and JavaScript. No npm dependencies, no database, no authentication, no API key, no external service. The development store is a JSON file under `_store/` (gitignored), written only so decisions survive a restart.

## Repo layout

```
src/
  server.js            local HTTP server and action API
  lib/
    dimensions.js      the 12-dimension vocabulary
    store.js           synthetic seed data and the in-memory store
    rules.js           deterministic send-review logic
    metrics.js         Metric A, ARCR and the learning-loop metric
    suggest.js         keyword heuristic standing in for the model
    bootstrap.js       assembles the payload the UI renders
  public/              index.html, app.css, app.js
test/                  the test suite
docs/                  product thinking, decisions, demo script, validation, AI usage
phase1/                the preserved Phase 1 research and decisions
```

## Data

Every name, city, profession and note is invented. No real client, matchmaker or contact detail appears anywhere. The prototype is labelled synthetic in the UI, in the API payload and in the seed.

## The submission

The full assessment response is in [ASSIGNMENT_SUBMISSION.md](ASSIGNMENT_SUBMISSION.md). The reasoning behind the approach is in [docs/PRODUCT_THINKING.md](docs/PRODUCT_THINKING.md), and the decisions and trade-offs are in [docs/PRODUCT_DECISIONS.md](docs/PRODUCT_DECISIONS.md).

## What is deliberately missing

- No AI model call. The core workflow runs with no model and no key.
- No client-facing surface. The only client interaction is a question the matchmaker asks in a normal check-in.
- No ranking, compatibility scoring, or automatic rejection.
- No silent preference writes. A confirmed rule can only be created from a recorded client answer.
- No sourcing scorecard. The synthetic data cannot support a channel-level comparison, and one was not manufactured.
