# Product decisions

The decisions that shaped the product, the trade-offs each one accepted, and the alternatives rejected for each.

## 1. Keep the client in the middle, not in the tool

**Decision.** The product is matchmaker-side. There is no client-facing surface, no client app, no self-service dashboard. The only client interaction is a question the matchmaker asks in a normal check-in.

**Trade-off.** The client cannot correct the record themselves. The matchmaker has to carry that conversation, and the capture depends on them remembering to have it.

**Rejected.** A client-facing rejection form, a client preference editor, and a client-facing dashboard of past rejections. All three add friction to the person the service exists to protect, and all three create a second source of truth alongside the existing member portal.

**Why this held.** The company positions itself as "by expert matchmakers" rather than "algorithm-pushed" profiles. An independent red-team review also rejected my own client-facing proposal for the same reason, plus a sharper one: it would read as the service doubting a client with a firm boundary. The reasoning is in `docs/REVIEW_FINDINGS_PROTOTYPE.md`.

## 2. A rejection is evidence, never a permanent rule

**Decision.** A matchmaker can record a rejection as a likely dealbreaker, but that does not become a confirmed dealbreaker until the client says so. The only code path that writes a client preference requires a recorded client answer with the client's own words and a value. A confirmed preference settles a dimension until the client rejects on it again, and never longer.

**Trade-off.** Some genuinely avoidable repeats get through, because a matchmaker has not yet asked. That is the intended behaviour: the tool prompts the question rather than silently enforcing a rule.

**Rejected.** Treating every rejection as a hard filter, and letting the matchmaker escalate a dimension to a dealbreaker without client confirmation. The brief itself says some clients reject profiles and later accept similar ones, so a hard rule would encode the client's own inconsistency as if it were a policy.

## 3. No ranking, no compatibility score, no automatic rejection

**Decision.** Candidates are never scored or ranked. The send review surfaces facts and asks the matchmaker to decide. Nothing is ever automatically rejected.

**Trade-off.** The tool cannot promise better matches, because it does not know what better means. It can only make the matchmaker's own knowledge available at the right moment.

**Rejected.** A compatibility score and a learned ranking. Both need outcome labels that do not exist yet in usable form, since a match is counted when two people meet and want a second meeting, and the business outcome is marriage. Both would also put a model where the brand says a human must be.

## 4. Confirmed dealbreakers are deterministic

**Decision.** If a candidate carries a dimension the client has confirmed as a dealbreaker, the conflict fires. No model, no confidence score, no interpretation.

**Trade-off.** A field comparison can be wrong when the candidate's data is thin, so the matchmaker still sees and can override. It is a check, not a block.

**Rejected.** A semantic check that reads free-text notes and decides whether a candidate conflicts. It would catch more soft cases and would also be confidently wrong about people, which is the exact failure the founder's own writing warns against when a label gets read as a prediction.

## 5. Missing information is never treated as a clean result

**Decision.** An untagged candidate, a client with no history, a client whose feedback is all uncoded, and a candidate whose value on a dimension the client cares about is unknown, are four separate states, and none of them is "no conflict".

**Trade-off.** The clean state is rarer than it could be, and the card appears more often than a marketing demo would suggest.

**Rejected.** Treating absent data as an absence of conflict, which is the same mistake as treating a rejection as a permanent rule, in the other direction.

## 6. Criteria are compared as values, not as categories

**Decision.** A preference and a candidate attribute each carry a dimension and a value, and the check compares the two values. A candidate who is vegetarian does not trip a non-vegetarian dealbreaker.

**Trade-off.** The matchmaker has to record a value, not just tick a category, so capture takes one more decision than it used to.

**Rejected.** Comparing dimensions on their own. It looks like a check but it is a proxy: a candidate tagged with any diet attribute would have tripped a non-vegetarian dealbreaker, and a candidate in any city would have looked like a match for a preference for the Bangalore metro. The proxy would have produced false conflicts and false support, and both would have looked like findings.

## 7. The acceptance debrief stays matchmaker-side

**Decision.** When a client accepts someone, the matchmaker records what mattered and what surprised them. That insight surfaces at the next send with a checkbox. Nothing is inferred from the profile, and no insight is created without a human writing one.

**Trade-off.** The capture depends on the matchmaker doing it, so the loop's value is capped by adoption.

**Rejected.** The client-facing version. My first instinct was to show the client their own history and ask whether the next objection was about the profile or the person. The red-team review found that the mechanism already existed matchmaker-side, so the only new part was the client-facing part, and that part reversed decision 1 and carried the trust risk.

## 8. The learning-loop metric measures use, not effect

**Decision.** The headline metric is the proportion of captured insights, among those that had a later recommendation to inform, that were explicitly consulted. Insights with no later recommendation are excluded from the denominator rather than counted as unconsulted.

**Trade-off.** It is a measure of whether the loop is being used, which is a weak proxy for whether it works. A tool can be consulted every time and still be useless.

**Rejected.** Any metric that treats consultation as an outcome, and any metric that rewards persuading clients to meet someone. The accepted-to-completed-meeting rate remains the guardrail that would actually matter, and it is a later question.

## 9. The sourcing scorecard is excluded

**Decision.** No channel-level view is built. The source field stays on every candidate so the comparison is possible if real data ever supports it.

**Trade-off.** One of the two parts of the original learning-loop idea, the part about where unsuitable profiles come from, is not built.

**Rejected.** Building it anyway on synthetic data. With two to five candidates per channel, any channel-level rate would be noise presented as insight. The full reasoning is in `docs/SOURCING_SCORECARD_GATE.md`.

## 10. The model only suggests a tag

**Decision.** The one AI-shaped component proposes a dimension from free-text rejection feedback, and a human confirms or changes it. Everything that affects a decision is deterministic.

**Trade-off.** The tag suggestion is a convenience, not intelligence. If it is wrong, the matchmaker catches it in a tap.

**Rejected.** Letting a model write a preference, decide a conflict, or draft a client message. The first two would breach the constraints above, and the third touches the most trust-sensitive thing a matchmaker sends.

## 11. The records are the interface, not the source code

**Decision.** Clients, candidates, matchmakers and client criteria are created and edited through the interface, with validation on every write and stable ids behind every dropdown.

**Trade-off.** It is more surface area than a prototype strictly needs, and it is work that would be replaced by a real system anyway.

**Rejected.** Leaving the seed data as the only way to get records in. A reviewer would have to edit a JavaScript file to see the product work, and the brief is explicit that a prototype nobody can exercise is not a prototype. The "acting as" a matchmaker selector also forces the attribution question, which per-matchmaker metrics need anyway.

## 12. The primary metric is measured at the moment of sending

**Decision.** The server recomputes the check when a profile is shared and records it on the share event. The primary metric is confirmed-criterion conflicts over profiles shared and checked, with the two conflict components reported apart, coverage reported alongside, and the override rate reported separately.

**Trade-off.** The denominator is the profiles that were checked rather than every profile shared, which is a deliberate deviation from the brief's wording, explained in the measurement view and in the submission.

**Rejected.** Measuring the rate after the fact from rejections alone. It answers a different question, it cannot separate a conflict that was caught from one that reached the client, and it cannot be computed for the control arm, which is the comparison the whole pilot design rests on.

## 13. What the prototype is and is not

**Decision.** The prototype is a mechanism demonstration on synthetic data, with a proposed pilot written up in `PILOT_PLAN.md` and a validation plan in `docs/VALIDATION_PLAN.md`. It is not described as production-ready, and no result is claimed from it.

**Trade-off.** Nothing has been measured with a real user, so the central assumption remains untested.

**Rejected.** Presenting the working demo as evidence that matchmakers need the product. A demo proves the mechanism works, not that anyone wants it.

---

## Feature classification

Every feature that exists in the build, classified against the brief's four categories.

| Feature | Class | Why |
| --- | --- | --- |
| Pre-send check against the client's criteria | Core | The whole hypothesis. Without it there is no product |
| Value-level comparison of criteria to attributes | Core | A category comparison is a proxy, and a proxy produces false conflicts and false support |
| Client criteria as records, with kinds and values | Core | The check has nothing to compare against without them |
| Rejection capture: dimension, severity, value, verbatim | Core | It is the mechanism that creates the history the check runs on |
| The four states, including incomplete and untagged | Core | They are what stops missing data reading as a clean result |
| Matchmaker records and the acting-as selector | Supporting | Attribution is needed for per-matchmaker reads, and the brief asks for a matchmaker to be selectable |
| Data entry for clients, candidates and criteria | Supporting | The brief requires a reviewer to be able to exercise the workflow without editing code |
| The ad-hoc check from the Candidates view | Supporting | Lets a reviewer pick a client and a profile and see the check with nothing sent |
| Validation on every write, with a message naming the field | Supporting | A record that cannot be created is a feature that does not exist |
| Criterion change log and withdrawal | Supporting | A preference change has to be explicit and traceable, and a withdrawn criterion must not vanish |
| Rejection ledger by dimension, with contradiction markers | Supporting | It is the history the check reads, and it is what the matchmaker consults when the check is not enough |
| Client clarification, and a rule written only from the client's words | Supporting | It is how a contradiction is settled without the tool guessing |
| The send-time conflict rate, coverage, and the override rate | Supporting | The primary metric, and the only way to tell the two pilot arms apart |
| Acceptance debrief, surfaced at the next send | Later | A sensible next question, but there is no evidence matchmakers fail to capture it today |
| The learning-loop consultation metric | Later | It measures use, not effect, and it is only meaningful if the debrief is used |
| The keyword dimension suggestion | Later | A convenience standing in for a model, and the only place a model would sit |
| Sourcing-channel scorecard | Removed | The data cannot support a channel-level rate. See `SOURCING_SCORECARD_GATE.md` |
| Compatibility score or ranking | Removed | Needs outcome labels this business will not have for a year, and it puts a model where a human must be |
| Client-facing prompts | Removed | A matchmaker asking one question in a check-in does the same work without doubting a client who has a firm boundary |
| Automatic rejection | Removed | The product informs the matchmaker. It does not decide |
