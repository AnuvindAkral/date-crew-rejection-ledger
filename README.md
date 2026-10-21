# Rejection Ledger

A matchmaker-side tool built for The Date Crew's product growth assessment. It helps a matchmaker remember what they have already learned about a client, and brings that information back at the moment it can change the next decision. It supports human judgement. It does not replace it.

Zero dependencies. Synthetic data only. Runs locally.

## Why this exists

A matchmaker's work is built on conversations. A client says no to a profile and explains why, and that reason is valuable. It tells you what actually matters to them, often more than what they said during onboarding. But the reason usually lives in a message thread or a memory, and it disappears. A month later the same matchmaker, or a colleague covering the case, sends a profile that repeats the same mistake, and the client quietly loses a little faith.

The founder of The Date Crew has made this point herself: she learns little from what a client says at the start, and far more from what they reject. This tool makes that insight usable.

It does two things.

The Rejection Ledger turns a rejection into a structured record, a dimension, a severity, and the reason in the matchmaker's own words. It keeps a per-client history and, right before the matchmaker sends the next profile, surfaces a conflict or a contradiction. A confirmed dealbreaker is a hard check. A past rejection is evidence, never a standing rule.

The acceptance debrief adds the other half. When a client accepts someone, the matchmaker records what mattered and what surprised them. That insight shows up at the next send with a checkbox, and the matchmaker marks whether it informed the recommendation. Rejections tell you what to avoid. Acceptances tell you what actually works, and that signal was usually being thrown away.

Neither piece decides anything. They surface what is already known, at the point it is useful, and leave the judgement where it belongs.

## What is implemented

- Structured rejection capture: a dimension, a severity, and the reason, with a keyword suggestion for the dimension.
- A per-client rejection ledger: history by dimension, contradiction markers, and client-confirmed rules.
- A send review that fires a conflict, a contradiction, or a plain prior-rejection note before a profile is shared, plus a strip showing what supports the send.
- Client clarification: a rule is written only from a recorded client answer, never silently.
- The acceptance debrief: capture what mattered and what surprised at the moment of a yes.
- The learning-loop metric: of captured insights that had a later recommendation, how many were explicitly consulted.
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

Two beats, about two minutes total. Reset the demo before each beat.

1. Open **Priya S.** Her ledger shows a contradiction on *Location or city tier*: rejected 3, then accepted 1. Send **Aarav M.** and the card shows both sides. Ask the client, record her answer, and the dimension settles. Send **Karan D.** and the card fires clean.
2. Priya's acceptance insight from Arjun T. ("warmer in person, location mattered less") surfaces at the next send with a checkbox. Tick it and send, and the measurement view reports it consulted.

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
