---
title: The Date Crew - Product Growth Assessment, Project Status
status: Phase 1 complete, awaiting approval
created: 21 October 2026
phase: 1 of 2
---

# PROJECT STATUS

**Phase 1, research and diagnosis: complete.**
**Phase 2, implementation: not started, awaiting explicit approval.**

---

## 1. Where the work lives

| File | Contents |
| --- | --- |
| RESEARCH.md | Source register, company snapshot, positioning constraints, client and matchmaker journey, founder's published theory, competitor landscape, evidence against assumption register, research limitations |
| DECISIONS.md | Funnel calculation with denominators, ten competing hypotheses, twenty candidate interventions, scoring framework and results, recommendation, alternatives, the rejected idea |
| EXPERIMENT.md | Problem statement, hypothesis, intervention, baseline, primary metric with denominators, guardrails, instrumentation, sample and power, decision rule, confounders, what the prototype can and cannot prove |
| SITEMAP.md | Four surfaces, primary journey, acceptance criteria, explicit exclusions |
| PROJECT_STATUS.md | This file |

The five files were written in a planning directory before the project workspace existed, and were copied into this repository when the work was approved. They are preserved here as they were written.

---

## 2. The recommendation in one paragraph

The problem is not that matchmakers choose badly. It is that a decision gets made with information the system has not made available, at a moment nobody checks. The recommended intervention is the Rejection Ledger: capture rejections as a dimension plus a deal breaker or preference flag at the moment they happen, roll them up per client, and at the next send surface either a conflict or a contradiction. The contradiction case is the distinctive part. It is where the same client rejected on a dimension and later accepted on it, and the system says so and asks one question. The recommended alternative is a client approved Constraint Card plus a static pre send check, which is simpler and faster but can only enforce what the client already said, which the company's own published thesis says is not the same as what the client does. The rejected idea is an AI compatibility scoring or profile ranking model, rejected on five grounds set out in DECISIONS.md section 4.3.

---

## 3. The three strongest pieces of evidence

1. **The Product Growth job description is the rubric, and it asks for exactly this.** Posted 18 September 2026, it asks a candidate to work out whether a problem should be answered with a process change, an automation, a product or AI, and to find the quickest way to test it. It names funnel drop off analysis, structuring psychometric or behavioural information, and turning qualitative information into product signals. It also warns against treating matchmaking as a ranking exercise. A brief that answers with a ranking model fails the rubric before it is read.

2. **The founder has already published the theory this diagnosis rests on.** In September 2026 she wrote that she learns almost nothing from the onboarding call and far more from the reasons clients reject, and that people choose predictions rather than traits. The scenario data partially contradicts this, because 35% of rejections cite reasons already stated in preferences. That tension is the most interesting thing in the whole assessment and the reason the recommended intervention treats a rejection as a question rather than a rule.

3. **The company already runs a CRM with match histories, and its own matchmaker job description says to track responses, feedback and patterns over time.** So the richest signal in the business is expected to be captured and, per the scenario, arrives as unstructured free text. That makes this a capture and structure problem, not a modelling problem. It also means another dashboard is not the answer.

---

## 4. The largest unresolved uncertainty

The 35% figure. It is the single number that decides whether this is worth building, and it has three unresolved ambiguities.

- **Denominator.** 35% of the 690 rejections, which is about 242 profiles, or 35% of all 1,000 shared, which is about 350. The two readings differ by about 108 profiles and would change the conclusion.
- **What "already mentioned in client preferences" means.** If it means the criterion was stated on the call and the profile went anyway, the problem is a filter failure and the intervention fits. If it means the criterion was stated somewhere and the client rejected for it anyway, the problem is preference interpretation, and the constraint card becomes the better answer.
- **How much of it is a repeat.** The brief does not say how many of those rejections repeated a dimension the client had already rejected on. That set is the one the conflict card can prevent. A first-time violation was never preventable by a prior rejection record.

Until this is confirmed, the intervention is a bet with a reasonable prior rather than a known target. EXPERIMENT.md puts a two week structured capture phase at the front specifically to measure it, which is also the cheapest possible way to find out.

The second unresolved uncertainty is the 44% against 21% acceptance gap between the two matchmakers. It cannot be interpreted at all without case mix, source channel mix and volumes per matchmaker, none of which are supplied. It is very likely a case mix and channel mix artefact rather than a skill difference, and the way to test that is not a ranking model, it is four weeks of per matchmaker logging plus a blind second reviewer sample.

---

## 5. Work completed in this phase

| Done | Notes |
| --- | --- |
| Public source research | 21 sources across the company site, blog, FAQ, privacy policy, careers board, LinkedIn, startup registries and three matchmaker tooling vendors |
| Matchmaker workflow reconstructed from a primary source | The Matchmaker job description, which names the CRM, the sourcing team, the tracking expectation and the playbook duty |
| Funnel diagnosis | Step and cumulative conversions, denominators stated, three readings of the 35% figure separated, missing data listed |
| Ten competing hypotheses | Each with support, counter evidence, data needed, root cause, cheap test and implied intervention |
| Twenty candidate interventions | Across ten distinct mechanisms, each specified on ten dimensions |
| Transparent scoring | Weights declared before scoring, eight criteria, full matrix, rounded to one decimal, with a note that the spread is inside the noise |
| Recommendation, alternative, rejected idea | With the reasoning for why the recommendation beats a ranking model, a chatbot and a dashboard |
| Experiment design | With honest power analysis and a clear split between what a prototype can validate and what a pilot would need |
| Sitemap | Four surfaces, no client app, explicit exclusions |

**Not done in this phase, by design.** No code, no prototype, no dependencies, no repository, no real client data, no fabricated interview, no claimed business impact. No client, matchmaker or employee was contacted, and no internal system was accessed.

---

## 6. Phase 2, what it would contain

On approval, Phase 2 runs in this order.

**Step 1, confirm the numbers.** Ask TDC for the denominator behind the 35%, the funnel period and cohort, profiles sent per client, and whether a rejection reason field exists in the CRM. This is a short conversation with the founder or the Product Growth lead and it either confirms or kills the intervention. It should happen before any code is written.

**Step 2, build the prototype.** Four surfaces per SITEMAP.md, on synthetic data first, against a shell that mimics the CRM. Ten working days. The build order is capture, then ledger, then the conflict check, because the check depends on the other two being real.

**Step 3, instrument and baseline.** Write the stage definitions, then run two weeks of structured capture with the card hidden. This is also where the A versus B question gets its first honest comparison.

**Step 4, run the test.** Two weeks, randomised at client level, against the decision rule in EXPERIMENT.md section 9.

**Step 5, report.** Three artefacts for the hiring team, per EXPERIMENT.md section 11, with the result written against the decision rule whether it is favourable or not.

**Phase 2 is about four weeks of elapsed time, of which two are the prototype build the brief asks for.**

---

## 7. Open questions for you

Four questions where your answer would change the plan.

1. **Where should the five files live?** They are in the plan directory because of plan mode. Tell me the project workspace and I will move them.
2. **Do you have access to TDC's founder or the Product Growth lead?** If yes, step 1 of Phase 2 can happen in week one and the 35% ambiguity can be resolved before building. If no, the prototype has to carry the uncertainty, and I would design around that.
3. **Is the two week prototype the deliverable, or is a working measurement plan the deliverable?** The brief says two weeks to prototype and separately asks what a real pilot needs. I have planned for the first and flagged the second. If the hiring team wants the measurement plan to run live inside TDC, that changes the timeline and the consent steps.
4. **Is the client side actually out of scope?** I have kept it out on autonomy and brand grounds, and I would defend that. If the hiring team wants a client-facing surface, the honest version is a single question in the existing check in, which needs no client software. But that is your call to overrule.

---

## 8. Risk register for Phase 2

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| The 35% turns out to be a much smaller set once repeats are separated | Medium | High | Phase 0 measures it before the build. If it is small, fall back to the Constraint Card alternative |
| Matchmakers decline to use structured capture | Medium | High | Keep capture to one tap, measure latency, let the vocabulary grow from real rejections rather than being designed in advance |
| The conflict card is read as surveillance of client judgement | Medium | Medium | Frame it as protecting the matchmaker from repeating a mistake, never show it to clients, log overrides without penalty |
| The brand reads any model use as a breach of the no AI promise | Medium | Medium | The model only proposes a dimension tag from free text, a human confirms, and the promise already holds for Magic Link descriptions |
| Wedding season distorts the measurement | High if the timing is wrong | High | Check the calendar before starting. Extend to four weeks and compare with the same weeks a year earlier |
| A null result | Medium | Low for the assessment, high for the build | A null result with a clean design is a strong artefact for the hiring team and is written into the plan in advance |

---

## 9. Status statement

Phase 1 is finished. The diagnosis is complete, ten hypotheses have been compared, twenty interventions have been generated and scored against declared weights, one intervention is recommended with a credible alternative and a rejected alternative, the experiment is designed with an honest power analysis, and the sitemap is scoped to four surfaces.

Nothing has been built. No dependency has been installed. No repository has been published. No file has been written outside the plan directory.

The direction needs approval before Phase 2 begins.
