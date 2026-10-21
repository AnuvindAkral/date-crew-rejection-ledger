# Rejection Ledger

A matchmaker-side tool built for The Date Crew's product growth assessment. It puts a client's recorded criteria in front of the matchmaker at the moment a profile is about to go out, and it leaves the decision with the matchmaker.

Zero dependencies. Synthetic data only. Runs locally.

## The problem

The assessment says around 35% of rejected profiles were rejected for reasons already stated in the client's preferences. A matchmaker's work is built on conversations: a client says no to a profile and explains why, and that reason tells you what actually matters to them. But it usually lives in a message thread or a memory. A month later the same matchmaker, or a colleague covering the case, sends a profile that repeats the same mistake.

The information is not missing. It is unavailable at the moment it would change the next decision.

## Why this direction

Storing rejection reasons is only worth doing if it changes a matchmaker's next action. That rules out a client-facing feature that shows clients their own rejection history, and it rules out a dashboard nobody opens. It points at one thing: a check that runs immediately before a profile is shared, while the matchmaker can still do something about it.

So the pre-send check is the product. The rejection ledger is the supporting mechanism that gives it history to work from. Acceptance capture is built but treated as a next step, because there is no evidence that matchmakers fail to capture it today.

## What the prototype does

When a matchmaker is about to share a profile, the tool loads that client's recorded criteria, compares them with the candidate's known attributes, and returns one of five findings:

- **Conflict.** A confirmed dealbreaker matches the candidate's value.
- **Preference mismatch.** The candidate's value does not match a stated preference. Advice, not a warning.
- **Contradiction.** The client rejected on this dimension before and later accepted someone with it. A prompt to ask, not a rule.
- **Prior rejection.** The client rejected on this dimension before and has not accepted since. A pattern, not a rule.
- **Incomplete.** The client has a criterion here and the candidate's value is unknown. Never reported as "no conflict", because missing information is not agreement.

When there is nothing to compare, the card says that instead of reporting a clean result: no feedback yet, untagged candidate, history present but uncoded, or no conflict.

Comparisons are on values, not on categories. A candidate who is vegetarian does not trip a non-vegetarian dealbreaker, and a candidate in Pune does not look like a match for a stated preference for the Bangalore metro. That distinction was not in the first version and the independent review found it.

The matchmaker proceeds, holds, or asks the client. Nothing is blocked automatically, no criterion changes without the client's own words, and every override is logged with the check that preceded it.

## How a matchmaker uses it

Everything happens in the interface. No source file needs editing.

1. **Pick who you are.** The header selector picks the matchmaker record you are acting as, and new records are attributed to it.
2. **Create or open a client.** **Add a client** on the Clients view takes a name, a city, the journey stage, and the matchmaker who looks after them.
3. **Record the client's criteria.** On the client, **Record what the client said** takes a dimension, a value, and whether it is an ordinary preference or an explicit no, plus the client's words. Saving over an existing criterion records what it replaced, and a criterion can be withdrawn without erasing what was once believed.
4. **Add a candidate.** On the Candidates view, **Add a candidate** takes the profile details and the attributes actually known. A blank attribute means unknown, never no.
5. **Check before sending.** Put a candidate on a client's shortlist and open it, or use the **Check against this client** dropdown on the Candidates view to run the same check without sending anything.
6. **Decide and record.** Send, hold, or ask the client. Rejections are captured as a dimension, a severity and the reason in the matchmaker's own words.

## What is implemented

- **The pre-send check.** Four states, each with the evidence that produced it, and the recorded criterion and candidate attribute named.
- **Data entry in the interface.** Clients, candidates, matchmakers and client criteria, all with stable ids, all validated, all with dropdowns backed by the records themselves.
- **Structured rejection capture.** A dimension, a severity, the value that was rejected, and the original wording, with a keyword suggestion for the dimension that a human confirms.
- **A per-client rejection ledger.** History by dimension, contradiction markers, client-confirmed rules, and a change log of every criterion edit.
- **Client clarification.** A rule is written only from a recorded client answer with the client's own words, never silently. A settled dimension does not silence the dimension forever: a later rejection on it is surfaced again.
- **A send-time metric.** The server recomputes the check at the moment of sending and records it on the share, so the conflict rate is a fact about the send rather than a claim by the interface. The measurement view reports the two arms separately, the two conflict components separately, the coverage, and the override rate.
- **A learning loop, built but presented as a next step.** An acceptance debrief that captures what a client's yes taught the matchmaker, surfaced at the next send with a checkbox, and a metric for whether captured insights get consulted.
- **An operator-only measurement view**, kept away from the matchmaker it would otherwise measure.

## What is not implemented

- No AI model call. The core workflow runs with no model and no key. The one place a model would help, proposing a dimension from free text, is stood in by a keyword heuristic that a human confirms.
- No client-facing surface. The only client interaction is a question the matchmaker asks in a normal check-in.
- No ranking, compatibility scoring, or automatic rejection.
- No silent preference writes.
- No sourcing scorecard. The synthetic data cannot support a channel-level comparison, and one was not manufactured.
- No database, no authentication, no email integration, no deployment. The store is a JSON file on disk.

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

85 tests cover the send-review rules and the ten decision-logic scenarios, the data-entry workflow and its validation, the metric computations, the store, the missing-data handling, and the acceptance-debrief loop. No build step, no install.

## Demo

Six short beats, about four minutes. Reset the demo before each beat.

1. Open **Priya S.** Her ledger shows a contradiction on *Location or city tier*: rejected 3, then accepted 1. Send **Aarav M.** and the check fires before anything goes out, showing both the contradiction and the fact that he is in Pune when she had asked for the Bangalore metro.
2. Open **Rahul M.** and send **Nikhil S.** The check fires a hard conflict, because he is non-vegetarian and that is a confirmed dealbreaker. Send **Dev P.** for the clean case: he is vegetarian, so the same dimension gives the opposite answer.
3. Open **Neha K.** and send **Varun J.** The check says his position on children is unknown, rather than implying no conflict. Send **Ishita P.** and it says she does not want children, which is advice rather than a warning.
4. Open the **Candidates** view, pick a client from the dropdown and press **Check against this client**. The same check runs with nothing sent.
5. On **Clients**, press **Add a client**, then open that client and **Record what the client said**. Save over the same criterion and the change is recorded with what it replaced.
6. Open **Meera J.** and send **Sam K.** She is on the control arm, so the check is computed but not surfaced.

The word-for-word script is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md), and the screenshots in [screenshots/](screenshots/).

## Stack

Node 22, `node:http` server, `node:test` test runner, plain HTML, CSS and JavaScript. No npm dependencies, no database, no authentication, no API key, no external service. The development store is a JSON file under `_store/` (gitignored), written only so records survive a restart.

## Repo layout

```
src/
  server.js            local HTTP server, action API and the ad-hoc check endpoint
  lib/
    dimensions.js      the 12-dimension vocabulary and the values on each
    store.js           synthetic seed data, the in-memory store and record creation
    rules.js           deterministic send-review logic
    metrics.js         the send-time conflict rate, the diagnostics and the learning-loop metric
    suggest.js         keyword heuristic standing in for the model
    bootstrap.js       assembles the payload the UI renders
  public/              index.html, app.css, app.js
test/                  the test suite
docs/                  the supporting documents, indexed in docs/README.md
phase1/                the preserved Phase 1 research and decisions
```

## Where things are

- The assessment of record is [ASSIGNMENT_SUBMISSION.md](ASSIGNMENT_SUBMISSION.md). It is the only document that is the answer to the brief.
- The reasoning is in [docs/PRODUCT_THINKING.md](docs/PRODUCT_THINKING.md), the decisions and their trade-offs in [docs/PRODUCT_DECISIONS.md](docs/PRODUCT_DECISIONS.md), and the full document index in [docs/README.md](docs/README.md).

## Data

Every name, city, profession and note is invented. No real client, matchmaker or contact detail appears anywhere. The prototype is labelled synthetic in the UI, in the API payload and in the seed.

## What remains to be validated

Nothing here has been tested with a real matchmaker, and no real client data has been seen. The specific open questions and the cheapest way to answer them are in [docs/VALIDATION_PLAN.md](docs/VALIDATION_PLAN.md). The short version: whether the 35% figure and its denominator are as reported, whether a matchmaker will consult the check at the point of sending, and whether the criteria on file are accurate enough to compare against.
