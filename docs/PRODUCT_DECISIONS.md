# Product decisions

The decisions that shaped the product, the trade-offs each one accepted, and the alternatives rejected for each.

## 0. How the direction moved, and why

This started as a rejection ledger. That is worth saying plainly, because the reasoning is better than the thing it first pointed at, and a reader is entitled to know the earlier idea was considered rather than assumed away.

**The first idea.** Capture each rejection as a dimension and a flag the moment it happens, roll it up per client, and surface it at the next send. The appeal was that the founder's published line supports it: she learns very little from the onboarding call and far more from the reasons people reject someone. A ledger is the obvious way to bank that.

**Why it was not enough.** A ledger only pays off if the matchmaker looks at it at the moment it would change a decision. That is the weak joint in the whole idea, and nothing about a ledger fixes it: the data is captured well, and then not used. Worse, the ledger makes the matchmaker do work, a ledger they do not otherwise want to maintain, which is the surest way to end up with a system nobody keeps up.

**The revision.** The same evidence points somewhere more direct. The 35% in the brief is not about how many rejections get recorded, it is about how many profiles could have been stopped before they went out. So the intervention became the moment of sharing: take the criteria the client has already given and put them in front of the matchmaker, on the profile, at the point of sending, where a decision is already being made. The ledger did not disappear, it became the evidence the check reads.

**The two are not rivals.** Recording rejections is still how the criteria become true, because a rejection is how a client says what matters. The difference is where the work sits. A ledger asks the matchmaker to maintain a record. A check asks them to look at one screen at a moment they are already working.

**What this means for the assessment.** The hypothesis is the check, not the ledger. The measurement is built around the check, and the ledger is supporting machinery. If the check does not change what gets sent, the ledger would not have saved it either.

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

## 11. A criterion has a direction and a firmness, and they are separate

**Decision.** A criterion records a direction, must be or must not be, a set of values, and a level of firmness: stated preference, confirmed preference, or confirmed dealbreaker. The direction decides which way the comparison runs, the firmness decides how the finding is reported.

**Trade-off.** One more thing for the matchmaker to record, and a multi-value picker instead of a dropdown.

**Rejected.** Storing a dimension and a value and inferring the rest from the kind. A client who says "I only want a vegetarian partner" and one who says "I will not consider a vegetarian partner" produce the same record, and the check then flags the partner the client actually wanted. That was in the build, and an independent review found it. The direction is now recorded rather than inferred.

## 12. The primary metric is audited over every share, not measured over the checked ones

**Decision.** The primary outcome is the proportion of all profiles shared in the period that conflicted with a criterion on the client's file at the time, decided by an audit that runs on every share whichever arm the client is on and whether or not the card was opened. Adoption is reported beside it, separately.

**Trade-off.** The audit needs the criteria to be versioned, so a criterion that changes later does not reach back and change how an old share is judged. That is more work in the store, and it is what makes the baseline comparable.

**Rejected.** A rate over the profiles that were checked, with coverage printed underneath. A matchmaker who stops checking can improve the rate, and the reader has to combine the two numbers by hand to see it. That was the version a reviewer called out.

## 13. A new client gets the check by default

**Decision.** A new client starts on the intervention arm, and the operator can move a client to the control arm from the client page.

**Trade-off.** The arm is visible to the matchmaker, which in a real pilot would risk changing their behaviour. That is a pilot problem rather than a prototype problem, and hiding it would be dishonest.

**Rejected.** Starting new clients on the control arm. A matchmaker who adds a client and then finds the check never fires would conclude the tool does nothing, and they would be right about the tool they were looking at.

## 14. The records are the interface, not the source code

**Decision.** Clients, candidates, matchmakers and client criteria are created and edited through the interface, with validation on every write and stable ids behind every dropdown.

**Trade-off.** It is more surface area than a prototype strictly needs, and it is work that would be replaced by a real system anyway.

**Rejected.** Leaving the seed data as the only way to get records in. A reviewer would have to edit a JavaScript file to see the product work, and the brief is explicit that a prototype nobody can exercise is not a prototype. The "acting as" a matchmaker selector also forces the attribution question, which per-matchmaker metrics need anyway.

## 15. The send-time check is recomputed by the server

**Decision.** The server recomputes the check when a profile is shared and records it on the share event. The primary metric is confirmed-criterion conflicts over profiles shared and checked, with the two conflict components reported apart, coverage reported alongside, and the override rate reported separately.

**Trade-off.** The denominator is the profiles that were checked rather than every profile shared, which is a deliberate deviation from the brief's wording, explained in the measurement view and in the submission.

**Rejected.** Measuring the rate after the fact from rejections alone. It answers a different question, it cannot separate a conflict that was caught from one that reached the client, and it cannot be computed for the control arm, which is the comparison the whole pilot design rests on.

## 16. Three kinds of evidence, kept apart

**Decision.** The product-wide truth rule is:

> A client's explicit answer establishes their preference. Historical behaviour is context, not proof. A matchmaker's inference is a hypothesis, not a confirmed rule.

Three things are therefore never the same thing in the data model, the interface or the measurement:

| On the file | Tier | What it does |
| --- | --- | --- |
| What the client confirmed | `confirmed_dealbreaker`, `confirmed_preference` | Every profile is checked against it. A confirmed dealbreaker that is broken is a conflict |
| What the client said at intake | `stated_preference` | Checked, and shown as advice rather than a no |
| A pattern the matchmaker noticed | `observation` | Shown as context, offered to the client, and it never fires a finding and never excludes a candidate |

A confirmed rule has to be backed by something the client said: either an answer recorded from them, or their own words written down. The write is refused otherwise, and it is recorded as an observation instead. Accepting a profile and rejecting a profile write no criterion at all, in any code path.

A contradiction is a decision that disagrees with a criterion the client has on file, on the same dimension and later than the criterion. It is shown with both sides and it decides nothing. It is not, and was never, the old "rejected once then accepted once" pattern, which is history rather than a disagreement.

**Trade-off.** A matchmaker who has only noticed a pattern cannot turn it into a rule without putting it to the client, and a confirmed rule needs the client's words. That is friction at the moment of recording, and it is the cost of not guessing on a client's behalf. It also means the matchmaker has to write down what the client said, which is work the onboarding call does not do for them.

**Rejected.** Treating the client's own history as their preference, because it is available and it is free. It is also wrong: people reject profiles for reasons that are not their preferences, and accept profiles that break the preferences they stated. Reading history as a rule would have produced a confident no that the client never gave.

**Rejected.** Letting a matchmaker record a confirmed rule without any record of what the client said. It would have been less friction, and it would have made the whole check rest on the matchmaker's memory, which is the thing the product is meant to support rather than replace.

## 17. What the prototype is and is not

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
| The five findings, including incomplete and prior rejection | Core | They are what stops missing data reading as a clean result |
| Criterion direction, recorded rather than inferred | Core | A requirement and a prohibition are opposite criteria, and only the client can say which is which |
| Three tiers of evidence, with the observation tier kept out of the decision | Core | A matchmaker's hypothesis is not the client's preference, and treating it as one would rule people out on a guess |
| A confirmed rule needs the client's own words | Core | Without a record of what the client said, a rule is the matchmaker's memory, which is what the tool exists to replace |
| The audited primary outcome over all shares | Core | A rate over the checked profiles improves when people stop checking |
| The adoption guardrail, reported separately | Core | It is the thing that can move on its own, so it has to be visible next to the rate |
| Matchmaker records and the acting-as selector | Supporting | Attribution is needed for per-matchmaker reads, and the brief asks for a matchmaker to be selectable |
| Data entry for clients, candidates and criteria | Supporting | The brief requires a reviewer to be able to exercise the workflow without editing code |
| The ad-hoc check from the Candidates view | Supporting | Lets a reviewer pick a client and a profile and see the check with nothing sent |
| Validation on every write, with a message naming the field | Supporting | A record that cannot be created is a feature that does not exist |
| Criterion change log and withdrawal | Supporting | A preference change has to be explicit and traceable, and a withdrawn criterion must not vanish |
| Rejection ledger by dimension, with contradiction markers | Supporting | It is the history the check reads, and it is what the matchmaker consults when the check is not enough |
| Client clarification, and a rule written only from the client's words | Supporting | It is how a contradiction is settled without the tool guessing |
| The audit, the human confirmation step, and the per-client breakdown | Supporting | The primary outcome needs an audit, and an automated one needs a human to check it |
| Acceptance debrief, surfaced at the next send | Later | A sensible next question, but there is no evidence matchmakers fail to capture it today |
| The learning-loop consultation metric | Later | It measures use, not effect, and it is only meaningful if the debrief is used |
| The keyword dimension suggestion | Later | A convenience standing in for a model, and the only place a model would sit |
| Sourcing-channel scorecard | Removed | The data cannot support a channel-level rate. See `SOURCING_SCORECARD_GATE.md` |
| Compatibility score or ranking | Removed | Needs outcome labels this business will not have for a year, and it puts a model where a human must be |
| Client-facing prompts | Removed | A matchmaker asking one question in a check-in does the same work without doubting a client who has a firm boundary |
| Automatic rejection | Removed | The product informs the matchmaker. It does not decide |
