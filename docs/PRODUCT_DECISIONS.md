# Product decisions

The decisions that shaped the product, the trade-offs each one accepted, and the alternatives rejected for each.

## 1. Keep the client in the middle, not in the tool

**Decision.** The product is matchmaker-side. There is no client-facing surface, no client app, no self-service dashboard. The only client interaction is a question the matchmaker asks in a normal check-in.

**Trade-off.** The client cannot correct the record themselves. The matchmaker has to carry that conversation, and the capture depends on them remembering to have it.

**Rejected.** A client-facing rejection form, a client preference editor, and a client-facing dashboard of past rejections. All three add friction to the person the service exists to protect, and all three create a second source of truth alongside the existing member portal.

**Why this held.** The company positions itself as "by expert matchmakers" rather than "algorithm-pushed" profiles. An independent red-team review also rejected my own client-facing proposal for the same reason, plus a sharper one: it would read as the service doubting a client with a firm boundary. The reasoning is in `docs/REVIEW_FINDINGS_PROTOTYPE.md`.

## 2. A rejection is evidence, never a permanent rule

**Decision.** A matchmaker can record a rejection as a likely dealbreaker, but that does not become a confirmed dealbreaker until the client says so. The only code path that writes a client preference requires a recorded client answer with the client's own words.

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

**Decision.** An untagged candidate, a client with no history, and a client whose feedback is all uncoded are three separate states, and none of them is "no conflict".

**Trade-off.** The clean state is rarer than it could be, and the card appears more often than a marketing demo would suggest.

**Rejected.** Treating absent data as an absence of conflict, which is the same mistake as treating a rejection as a permanent rule, in the other direction.

## 6. The acceptance debrief stays matchmaker-side

**Decision.** When a client accepts someone, the matchmaker records what mattered and what surprised them. That insight surfaces at the next send with a checkbox. Nothing is inferred from the profile, and no insight is created without a human writing one.

**Trade-off.** The capture depends on the matchmaker doing it, so the loop's value is capped by adoption.

**Rejected.** The client-facing version. My first instinct was to show the client their own history and ask whether the next objection was about the profile or the person. The red-team review found that the mechanism already existed matchmaker-side, so the only new part was the client-facing part, and that part reversed decision 1 and carried the trust risk.

## 7. The learning-loop metric measures use, not effect

**Decision.** The headline metric is the proportion of captured insights, among those that had a later recommendation to inform, that were explicitly consulted. Insights with no later recommendation are excluded from the denominator rather than counted as unconsulted.

**Trade-off.** It is a measure of whether the loop is being used, which is a weak proxy for whether it works. A tool can be consulted every time and still be useless.

**Rejected.** Any metric that treats consultation as an outcome, and any metric that rewards persuading clients to meet someone. The accepted-to-completed-meeting rate remains the guardrail that would actually matter, and it is a later question.

## 8. The sourcing scorecard is excluded

**Decision.** No channel-level view is built. The source field stays on every candidate so the comparison is possible if real data ever supports it.

**Trade-off.** One of the two parts of the original learning-loop idea, the part about where unsuitable profiles come from, is not built.

**Rejected.** Building it anyway on synthetic data. With two to five candidates per channel, any channel-level rate would be noise presented as insight. The full reasoning is in `docs/SOURCING_SCORECARD_GATE.md`.

## 9. The model only suggests a tag

**Decision.** The one AI-shaped component proposes a dimension from free-text rejection feedback, and a human confirms or changes it. Everything that affects a decision is deterministic.

**Trade-off.** The tag suggestion is a convenience, not intelligence. If it is wrong, the matchmaker catches it in a tap.

**Rejected.** Letting a model write a preference, decide a conflict, or draft a client message. The first two would breach the constraints above, and the third touches the most trust-sensitive thing a matchmaker sends.

## 10. What the prototype is and is not

**Decision.** The prototype is a mechanism demonstration on synthetic data, with a proposed pilot written up in `PILOT_PLAN.md` and a validation plan in `docs/VALIDATION_PLAN.md`. It is not described as production-ready, and no result is claimed from it.

**Trade-off.** Nothing has been measured with a real user, so the central assumption remains untested.

**Rejected.** Presenting the working demo as evidence that matchmakers need the product. A demo proves the mechanism works, not that anyone wants it.
