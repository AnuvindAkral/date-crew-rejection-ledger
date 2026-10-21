# Rejection Ledger

A matchmaker-side prototype for The Date Crew product growth assessment. It captures structured rejection reasons, aggregates a client's feedback history, and surfaces conflicts or contradictions before a matchmaker shares a profile.

Zero dependencies. Synthetic data only. Runs locally.

## What it is and why

The Date Crew's matchmakers source and screen profiles by hand, and the richest signal in the business, the reason a client rejects a profile, arrives as unstructured free text. The ledger turns that signal into a structured record and puts it back in front of the matchmaker at the moment the next profile is chosen.

The mechanism is the contradiction card. When a client has rejected profiles on a dimension and later accepted a profile on the same dimension, the send review shows both and asks one question: is it a dealbreaker, or a preference? The matchmaker asks the client, records the answer, and the dimension is settled.

The acceptance debrief captures the other half of the loop. When a client accepts a profile or has a positive experience, the matchmaker records what mattered and what surprised them. That insight then surfaces, with a checkbox, at the next send review, and the matchmaker marks whether it informed the recommendation. The measurement view reports the proportion of captured insights that were explicitly consulted, which measures whether the learning loop is used, not whether it improves matching.

What it is not: an AI matcher, a chatbot, a ranking model or a dashboard. The conflict check is a deterministic field comparison. The only AI-shaped thing is a keyword heuristic that proposes a dimension from free text, which a human confirms or changes.

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

39 tests cover the send-review rules, the metric computations, the store, the missing-data handling, and the acceptance-debrief loop. No build step, no install.

## The 90 second demo

1. Open **Priya S.** Her ledger shows a contradiction on *Location or city tier*: rejected 3, then accepted 1.
2. Send **Aarav M.** The card fires in the contradiction state, with the rejected and accepted profiles side by side, and a "Supports sending" strip showing what the client stated and what she accepted before.
3. **Ask the client**, type what she said, answer **Preference**. The share proceeds and the dimension is now a confirmed preference.
4. Send **Karan D.** The card fires clean. No prompt.

The point is step 4. The intervention did not filter the candidate out. It turned a repeated contradiction into a settled question, then stopped asking.

To see the other states, open **Rahul M.** (a confirmed dealbreaker, a clean candidate, and an untagged candidate) and **Meera J.** (no feedback yet).

See `DEMO_SCRIPT.md` for the full word-for-word run.

## Stack

Node 22, `node:http` server, `node:test` test runner, plain HTML/CSS/JS. No npm dependencies, no database, no authentication, no API key, no external service. The development store is a JSON file under `_store/` (gitignored), written only so decisions survive a restart.

## Repo layout

```
src/
  server.js            local HTTP server and action API
  lib/
    dimensions.js      the 12-dimension vocabulary
    store.js           synthetic seed data and the in-memory store
    rules.js           deterministic send-review logic
    metrics.js         Metric A, ARCR and the three sub-rates
    suggest.js         keyword heuristic standing in for the model
    bootstrap.js       assembles the payload the UI renders
  public/              index.html, app.css, app.js
test/                  rules, store and metrics tests
docs/                  Gate B specification documents
phase1/                the preserved Phase 1 files
```

## Data

Every name, city, profession and note is invented. No real client, matchmaker or contact detail appears anywhere. The prototype is labelled synthetic in the UI, in the API payload and in the seed.

## What is deliberately missing

- No AI model call. The core workflow runs with no model and no key.
- No client-facing surface. The only client interaction is a question the matchmaker asks in a normal check-in.
- No silent preference writes. A confirmed rule can only be created from a recorded client answer.
- No deployment, no remote, no publishing. Local only.
