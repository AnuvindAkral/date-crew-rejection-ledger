# AI usage disclosure

Two separate questions get confused here, so this document answers both: what AI helped with in producing this work, and what AI does inside the product.

## Part one: AI assistance in producing this work

This project was built with substantial AI assistance, and it would be misleading to present it otherwise.

An AI coding agent did the research synthesis, wrote the application and the test suite, and drafted these documents, working from instructions and decisions made by the human author. The agent did not choose the product direction. Every product decision in [PRODUCT_DECISIONS.md](PRODUCT_DECISIONS.md) was taken by the author, usually after review, and each build stage was gated on explicit approval.

Two things are worth stating plainly about how that assistance was used.

**The product decisions were the author's, and the agent pushed back on them.** The rejection-and-acceptance design, the decision to keep everything matchmaker-side, the refusal to build the sourcing scorecard on thin data, and the decision to narrow scope after review were all author decisions. The agent's role was to implement, test, and argue where the evidence was weak.

**An independent review changed the work.** The design was reviewed twice by separate model sessions in fresh contexts, with instructions to challenge rather than to help. The second review ran on a different model from the one that produced the work and was explicitly given permission to kill the proposal. It did. It found that the distinctive mechanism was largely already implemented, that the genuinely new part was the riskiest part, and that the proposed metric pointed the wrong way. The scope changed as a result: the client-facing contradiction feature was removed, the acceptance debrief was kept matchmaker-side, and the sourcing scorecard was excluded. The review also caught that an earlier draft of my own research summary overstated what a meta-analysis found, and that overstatement was corrected rather than carried into the submission.

**The third review changed the data model.** A later red-team pass found that the check compared dimension categories, so a candidate tagged with any diet attribute tripped a non-vegetarian dealbreaker, and a candidate in any city looked like a match for a stated preference for the Bangalore metro. Both were false results wearing the costume of findings. The comparison was rebuilt to work on values, which also produced the preference-mismatch state the submission had claimed but the code did not have. The review also found that a confirmed preference silenced its dimension permanently, so a client who rejected on it again was never prompted a second time. Both were fixed, and both are covered by tests.

**The fourth review found the direction was still missing, and the metric could be gamed.** Even after the value comparison, a criterion still stored only a value, so the direction was inferred from the kind. A client who said "I only want a vegetarian partner" was flagged on the vegetarian candidate and passed on the non-vegetarian one, which is backwards. The direction is now recorded separately from the firmness. The same review pointed out that the primary metric was computed over the profiles a matchmaker chose to check, so it could improve if matchmakers stopped using the tool, and that the coverage figure printed next to it measured app-recorded shares against seeded history rather than whether anyone opened the card. The metric is now an audit over every share, and the card view is what the adoption guardrail is built on.

**A later usability pass found the same bug in the wording, and it was mine.** The direction was being written out backwards in the plain-English sentence, so the check named the opposite of what the client had asked for. A unit test caught it, which is the kind of error that would have survived a demo and reached a client.

**A later pass found that the product was reading the client's history as their preference.** The contradiction finding fired when a client had rejected someone on a dimension and later accepted someone else, and the client's file grouped that history next to what they had said, which invited the matchmaker to read one as the other. The rule the product now rests on is that a client's explicit answer establishes their preference, their history is context rather than proof, and a matchmaker's inference stays a hypothesis. So a contradiction is now a decision that disagrees with a criterion on file, on the same dimension and later than the criterion. Accepting and rejecting write no criterion at all. A matchmaker's noticed pattern is recorded as an observation, and a confirmed rule is refused unless the client's own words are written down. The agent's suggestion to keep the old reject-then-accept behaviour as a lighter-weight warning was rejected, because a warning that fires on ordinary indecision would have trained matchmakers to ignore the one that matters.

Two independent reviews is not a lot of scrutiny, and neither substitutes for a real matchmaker. The reasoning is recorded in [REVIEW_FINDINGS.md](REVIEW_FINDINGS.md) and [REVIEW_FINDINGS_PROTOTYPE.md](REVIEW_FINDINGS_PROTOTYPE.md) rather than presented as a clean run.

## Part two: AI inside the product

**There is no model call anywhere in the prototype.** No API key, no network request, no external service. The full workflow, including the demo, runs offline.

`src/lib/suggest.js` is a keyword heuristic that proposes a dimension from free-text rejection feedback. It stands in for a model and is labelled as such in the code. The matchmaker confirms or changes the proposal before it is stored.

The decision path, end to end:

| Step | Who decides | AI involved |
| --- | --- | --- |
| Capture a rejection reason | Matchmaker picks a dimension and severity | A keyword suggestion only |
| Propose a dimension from free text | Suggestion proposes, matchmaker confirms or changes | The only suggestion in the product |
| Conflict check, confirmed dealbreaker | Deterministic value comparison | No |
| Preference mismatch check | Deterministic value comparison | No |
| Missing information, untagged candidate | Deterministic | No |
| Criterion direction, must be or must not be | The matchmaker records it, from what the client said | No |
| Auditing a past share | The server, against the criteria in force at the time | No |
| Contradiction check, a decision against a criterion | Deterministic, needs the criterion and the decision | No |
| Recording a criterion | The matchmaker records what the client said, and the words go in with it | No |
| Acceptance debrief capture | Matchmaker writes what mattered and what surprised | No, and nothing is inferred |
| Write a confirmed rule | The client's recorded words, recorded by the matchmaker | No, and it is refused without them |
| Proceed, hold or resolve | Matchmaker | No |

## Why the suggestion is the only place a model would sit

The brand draws the line already. The public site says "No AI. No App. No Endless Swiping," and its comparison table contrasts "by expert matchmakers" with "algorithm-pushed" profiles. The same company already uses AI in Magic Link to draft personal descriptions, so the permitted zone is narrow and real: a model may draft and summarise what a person already decided. It may not decide.

Normalising prose into a fixed vocabulary is what keeps rejection capture at a few seconds instead of a minute, which is the only reason a capture feature survives contact with a real workload. That is the whole case for it.

## What is explicitly not done

- No compatibility score and no ranking. A model that ranks people would sit where the brand says a human must be, and it could not be evaluated anyway, since outcome labels for this business take a year or more to accumulate.
- No automatic rejection. Nothing is filtered out without a matchmaker deciding.
- No model-written client messages. An introduction note is the most trust-sensitive thing a matchmaker sends.
- No silent preference writes. The only paths that write a client preference are `recordClientAnswer` and `setPreference` in `src/lib/store.js`, and both refuse a confirmed rule without the client's recorded words or their own words in the note. Accepting and rejecting write no preference at all. It is covered by `test/truth.test.js`.
- No model touching client data at all in this prototype, because classification is deterministic.

## The consent point

The proposed pilot does not assume a client agreed to AI processing because the company uses a CRM. In the current design no model touches client data, so the question does not yet arise. If a model were introduced, specific and separate client consent would be required before it touched client data. That is written into [PILOT_PLAN.md](../PILOT_PLAN.md).

## If asked to make the AI bolder

Ask which brand promise is being given up first. A semantic pre-send check that reads notes and flags conflicts would catch more soft cases, and it would also be confidently wrong about people, which is the exact failure the founder's own writing warns against when a label gets read as a prediction.
