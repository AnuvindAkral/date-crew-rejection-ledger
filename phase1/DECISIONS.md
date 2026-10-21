---
title: The Date Crew - Product Growth Assessment, Phase 1 Decisions
status: complete
created: 21 October 2026
phase: diagnosis, hypotheses, options, scoring
depends_on: RESEARCH.md
---

# DECISIONS

Funnel diagnosis, competing explanations, twenty candidate interventions, the scoring framework and the decision.

---

## 1. Funnel calculation

### 1.1 Step conversions

| Stage | Count | Denominator | Step conversion | Lost at this step | Share of all losses |
| --- | --- | --- | --- | --- | --- |
| Profiles shared | 1,000 | none | not applicable | 0 | 0% |
| Profiles accepted | 310 | 1,000 shared | 31.0% | 690 | 72.0% |
| Contact details shared | 210 | 310 accepted | 67.7% | 100 | 10.4% |
| Conversations started | 150 | 210 contact shared | 71.4% | 60 | 6.3% |
| Meetings fixed | 75 | 150 conversations | 50.0% | 75 | 7.8% |
| Meetings completed | 42 | 75 fixed | 56.0% | 33 | 3.4% |
| Total | 42 | 1,000 shared | 4.2% | 958 lost overall | 100% |

The final column expresses each loss as a share of the 958 profiles that did not reach a completed meeting.

### 1.2 Cumulative conversions

| From | To | Rate |
| --- | --- | --- |
| Profiles shared | Profiles accepted | 31.0% |
| Profiles shared | Contact details shared | 21.0% |
| Profiles shared | Conversations started | 15.0% |
| Profiles shared | Meetings fixed | 7.5% |
| Profiles shared | Meetings completed | 4.2% |
| Profiles accepted | Meetings completed | 13.5% |
| Contact details shared | Meetings completed | 20.0% |
| Conversations started | Meetings completed | 28.0% |

### 1.3 The 35% figure, with denominators made explicit

Rejections = 1,000 shared minus 310 accepted = 690.

| Reading | Computation | Result | Denominator it describes |
| --- | --- | --- | --- |
| A, primary | 0.35 x 690 | about 242 profiles | 35% of rejected profiles, which is 24.2% of all profiles shared |
| B, alternative | 0.35 x 1,000 | 350 profiles | 35% of all profiles shared, which would be 50.7% of rejections |

Reading A is the plain reading of the brief and is used throughout. Reading B is recorded so the difference is visible if the source number meant something else. The two readings differ by about 108 profiles, which is large enough to change any conclusion, so this must be confirmed before anything is built.

There is a third and more important distinction that the brief does not resolve, and it is the pivot of the whole diagnosis.

| Set | Definition | Known? |
| --- | --- | --- |
| Set 1 | Rejections citing a reason the client had already stated in their preferences | Yes, about 242 profiles |
| Set 2 | Rejections citing a reason the client had already rejected a previous profile for | No, not given |

Set 1 and Set 2 overlap but are not the same set. A first rejection for a stated criterion is in Set 1 and not in Set 2. A repeat rejection is in both. Set 2 is the set a "do not repeat what you already know" intervention can actually prevent, because a first-time violation was not preventable by a prior-rejection record. Set 2 is a subset of Set 1 in the likely case, and could in principle be much smaller. That number is not in the brief and it has to be measured.

### 1.4 Assumptions and missing data

- The funnel covers a single period and cohort. If it mixes new and mature clients, or straddles wedding season, the step rates are not comparable across stages.
- "Profiles shared" counts profiles sent to clients. It is not stated whether a profile re-sent to the same client counts twice.
- "Accepted" means the client agreed to proceed to share contact details. Whether it means "willing to meet" or "willing to see contact details" changes what the 31% measures.
- "Conversation started" may mean a message was sent, a message was received, or a reply happened. If those differ by matchmaker, the 71.4% is partly a measurement artifact.
- "Meetings fixed" may include meetings later cancelled, which would explain part of the 44% fixed to completed drop.
- No number is given for profiles sent per client, clients per matchmaker, or time period.
- The A and B acceptance rates are given without the volume of profiles each sent. A 44% on 50 profiles is not the same as 44% on 900.
- The 35% figure is not attributed to a period, a client set or a matchmaker set.
- Revenue per client is knowable from public pricing (Rs. 1.2 lakhs plus, plus a success bonus on marriage). Revenue per completed meeting is not, because the bonus attaches to marriage and the journey runs 6 to 9 months.

### 1.5 Where the losses are, and which are addressable

| Stage | Loss | Addressability |
| --- | --- | --- |
| Shared to accepted, 690 lost | The selection stage. The matchmaker's core judgement, and the brand's core claim | Partially. The part where a stated criterion was violated and still sent, at most 35% of rejections under reading A. A product cannot recover the rest, because those are judgement calls the company sells |
| Accepted to contact shared, 100 lost | Client engagement with the introduction | Unknown. Not enough data on what happens here |
| Contact shared to conversation, 60 lost | Whether contact details lead to a real exchange | Candidate for expectation setting and introduction framing. Weak evidence |
| Conversation to meeting fixed, 75 lost | A 50% drop and the largest proportional drop after the first stage. Logistics, nerves, mismatch between expectation and reality | Plausibly addressable by expectation setting and pre-meeting preparation, and TDC already coaches post date. But the base is 150, so the estimate is fragile |
| Meeting fixed to completed, 33 lost | No shows and drop outs | Barely product-addressable in two weeks. Mostly logistics, safety and scheduling |

**The largest numerical drop is not the best opportunity.** 690 losses at the first stage is where the money and the goodwill go, but that stage is where the company's judgement and brand live, and the intervention ceiling there is set at roughly 242 profiles, being about 24% of everything shared. The 50% conversation to meeting drop is the largest proportional drop, but on 150 observations the confidence interval is wide, it sits downstream of selection where a selection tool cannot reach, and the available interventions there (expectation setting, briefing) are ones TDC partially runs by hand already.

The stage worth attacking is the intersection: the subset of the first-stage loss that is *knowable at send time*. That is what the recommended intervention targets, and its size is bounded by the 35% figure rather than by the 690.

---

## 2. Competing hypotheses

Ten explanations, each with what supports it, what weakens it, what would settle it, the root cause it implies, a cheap test and the intervention it would justify.

### H1. Filter failure, not a capture failure

The preference was known at send time and the profile went anyway.

- **Supports:** 35% of rejections cite reasons already stated in client preferences (Set 1). S12 tells matchmakers to ensure mutual compatibility before suggesting a match. S9 says the founder already knows the onboarding call under-determines the real criteria.
- **Against:** Nothing in the brief says the preference was visible at the moment of sending. A preference can be recorded but not consulted.
- **Data needed:** Whether the client preference record was open or visible when the profile was sent. Reason coded rejections split by whether the criterion was known before this send.
- **Root cause:** No checkable constraint list applied at the decision point. Selection runs on gestalt.
- **Cheap test:** For two weeks, tag each rejection as "known before send" or "new reason". If known-before-send is high, the filter hypothesis is live.
- **Implies:** A pre send check against recorded constraints.

### H2. Selection runs on intuition, not on constraints

- **Supports:** S12 explicitly says "use both logic and intuition to recommend the right people". S9 argues the real drivers are predictions attached to labels, which an unstructured search will never surface.
- **Against:** Intuition is the asset S13 says to protect. A tool that shames intuition will be abandoned.
- **Data needed:** Time per profile and where it goes, reading a sample of 30 sent profiles against the client brief.
- **Root cause:** No separation between what the matchmaker noticed about the person and what the client asked for.
- **Cheap test:** Blind second matchmaker review of 10 sent profiles a week against the client brief. Agreement rate is the number.
- **Implies:** A side by side view of candidate against brief at send time.

### H3. Rejection reasons are rationalisations, so the signal is weaker than it looks

- **Supports:** S9 and S10 make this argument the company's own position. A degree becomes a proxy for intelligence; a family becomes a proxy for values.
- **Against:** The 35% figure shows rejections agreeing with stated preferences, which is consistency, not rationalisation. And the brief says some clients later accept similar profiles, which is noise, not rationalisation.
- **Data needed:** Which dimensions clients later accept despite earlier rejecting on the same dimension.
- **Root cause:** Rejection text encodes the label, not the mechanism.
- **Cheap test:** Reason coded log for four weeks, then compare rejected versus accepted profiles on the same dimension.
- **Implies:** A ledger that treats a rejection as a question, never as a rule.

### H4. Client preference is unstable over time, so the criteria themselves are noisy

- **Supports:** The brief says some clients initially reject profiles and later accept profiles with similar characteristics. S4 says preferences evolve and clients can update them. S3 says matchmakers connect with clients every two weeks.
- **Against:** "Initially" may describe drift rather than noise, and drift is a different problem with a different fix.
- **Data needed:** Timestamped preference changes and dated rejections. Does the same dimension flip from reject to accept for the same client over weeks, and in which direction?
- **Root cause:** No versioned preference history, so the matchmaker cannot tell noise from evolution.
- **Cheap test:** Rejection reason log with dates, cross referenced against preference edits.
- **Implies:** A versioned preference timeline, or a rule that a criterion needs client confirmation before it becomes a standing exclusion.

### H5. Rejection fatigue from volume

- **Supports:** Matchmakers spend about 2 hours per client per week searching, which can produce a lot of profiles. A 31% acceptance rate means roughly 3 profiles shared per acceptance. A client receiving many profiles will start rejecting faster and less carefully.
- **Against:** No data on profiles per client per week. Also S4 promises 2 to 4 intros a month, which is low volume, so fatigue may not be the driver.
- **Data needed:** Profiles shared per client per week, and rejection velocity over the first five shares versus later ones.
- **Root cause:** Uncontrolled send volume with no review rhythm.
- **Cheap test:** Log share count and client rejection velocity per client.
- **Implies:** A batching and review rhythm, a process change with no product needed.

### H6. Channel mix explains the acceptance rate, not matchmaker skill

- **Supports:** S4 and S12 say profiles come from the internal network, matrimonial sites, LinkedIn and referrals. Different sources have different baseline quality. S6 says matchmakers look inside the member network first.
- **Against:** Nothing yet. This is a live confound with no measurement at all.
- **Data needed:** Source tag per profile sent, then acceptance and completed meeting rate by source.
- **Root cause:** No provenance on profiles, so quality is unmeasurable and unsortable.
- **Cheap test:** Add a source field to the send action for two weeks.
- **Implies:** Source quality scorecard, and possibly channel incentives.

### H7. Case mix explains the 44% versus 21% gap

- **Supports:** Standard confounding. New clients are stricter or looser by segment. Gender split, city tier, relationship history, price tier, readiness and journey stage all move acceptance. S12 says a matchmaker is "the primary guide" for premium clients, so tier allocation varies.
- **Against:** Nothing. There is no evidence either way.
- **Data needed:** Client segment per matchmaker, profiles sent per matchmaker, share of clients at each journey stage.
- **Root cause:** Assignment, not performance.
- **Cheap test:** Four weeks of per matchmaker logging, then stratify.
- **Implies:** Nothing product. A staffing or routing question.

### H8. The gap is a measurement artifact

- **Supports:** Stage names are not defined anywhere in public material. A and B may count "accepted" differently, or log "conversation started" at different moments. S12 mentions a CRM with notes; a notes based pipeline is easy to define inconsistently.
- **Against:** The 23 point gap is large. Pure definitional drift rarely produces a gap that wide on its own, though it could widen it.
- **Data needed:** A written definition per stage, applied to both matchmakers, with timestamps.
- **Root cause:** Funnel numbers assembled from free text notes rather than events.
- **Cheap test:** Audit 30 profiles per matchmaker across the pipeline against the CRM record.
- **Implies:** Event instrumentation before anything else is measured.

### H9. The real bottleneck is downstream, at conversation to meeting

- **Supports:** 50% of conversations never become a fixed meeting. S3 describes clients who are "confusing quantity for progress" and getting exhausted, and a LinkedIn post in S15 describes a client with "eight rejections in three months. Not after conversations. Before them." and a bi-weekly catch-up where the client is exhausted.
- **Against:** Nothing in the brief points to a product cause. And the brief's supplied facts about unstructured feedback and preference related rejections point upstream.
- **Data needed:** Why conversations stall. Is it scheduling, expectation mismatch, or interest?
- **Root cause:** Expectation gap between what a client imagines a match will be and what the profile contains.
- **Cheap test:** Five questions to clients who stalled, asked by the matchmaker in the normal check in.
- **Implies:** Expectation calibration and pre meeting briefing.

### H10. Client decision quality is the constraint, not matchmaker selection

- **Supports:** The client makes the accept and reject call. S9 argues clients choose predictions rather than evaluating people. S12 tells matchmakers to challenge blind spots and to call out being too picky.
- **Against:** The client is expensive to touch and S12 says the model is to absorb the work so the client does not have to. Any client-facing surface adds friction to the person the company is trying to keep.
- **Data needed:** Whether clients who accept later of similar profiles say the earlier rejection was wrong, or the later acceptance was a change of mind.
- **Root cause:** The client's rejection vocabulary and the matchmaker's brief are different languages.
- **Cheap test:** One question at the next send. "You rejected three profiles for this reason and later accepted one with it. Is that a deal breaker or a preference?"
- **Implies:** A structured question at the decision point, delivered by the matchmaker, not a client app.

### What the evidence already discriminates

H8 should be tested first because it is cheap and it can invalidate every other number. H6 and H7 are both confounders that must be controlled before any A versus B conclusion is allowed to stand. H1, H3 and H4 all point into the same design, a structured per client record of what was rejected and what was accepted, with the point of use at the next send. H5, H9 and H10 point to different interventions entirely.

---

## 3. Twenty candidate interventions

Each entry states the exact problem, the primary user, the intervention, the mechanism for changing behaviour, the data needed, the two week prototype scope, the primary success metric, the main failure mode, the privacy fairness or autonomy concern, and why it is not a generic solution. The twenty span preference capture, pre send validation, rejection structuring, search workflow, knowledge retention, client expectation work, communication automation, measurement, non AI process change and human in the loop decision support.

### 3.1 Preference capture and representation

**1. Constraint Card**
Problem: client preferences live as a conversation, a portal field and scattered notes, so no one can check a candidate against them.
User: matchmaker, with client confirmation.
Intervention: at onboarding, produce a short client approved brief split into must have, prefer and reject, versioned and dated.
Behaviour change: gives the matchmaker an explicit standard to select against, instead of recalling a call.
Data needed: onboarding call notes, current portal preferences, client confirmation.
Prototype scope: one template, one form, one rendered card per client.
Metric: share of sent profiles that conflict with a must have criterion.
Failure mode: becomes a compliance checklist that the matchmaker satisfies on paper while intuition still decides.
Concern: turning a client's exploratory answer into a fixed list risks hardening what was still forming. Needs explicit client confirmation and an edit path.
Distinct because: it is a negotiation artefact with client sign off, not a preference form.

**2. Deal breaker against nice to have, settled at the first rejection**
Problem: clients treat every rejection reason as equally binding, so criteria silently harden and drift.
User: matchmaker asking the client.
Intervention: when a client first rejects on a dimension, the matchmaker asks once whether it is a deal breaker or a preference, and records which.
Behaviour change: separates the two, so a soft reason stops eliminating candidates.
Data needed: reason coded rejections.
Prototype scope: a two option field on the rejection capture plus a script for the matchmaker.
Metric: share of rejections coded deal breaker versus preference, and the acceptance rate of profiles matching a preference coded dimension.
Failure mode: the client performs compliance and answers deal breaker for everything.
Concern: low. It is a question, not a rule.
Distinct because: it is a single question at the moment of evidence.

**3. Stated against revealed preference ledger**
Problem: the company's own thesis says stated preferences under-determine behaviour, but the two are never compared.
User: matchmaker, in confidence.
Intervention: maintain, per client, a side by side view of what the client stated versus what their rejections have repeatedly surfaced.
Behaviour change: gives the matchmaker a hypothesis to test with the client rather than a rule to apply.
Data needed: structured rejections over time.
Prototype scope: a two column read only panel per client.
Metric: number of client conversations where a divergence was surfaced and acted on.
Failure mode: reads as accusing the client of dishonesty, which the brand will not tolerate.
Concern: high. Must never be shown to the client without consent, and must never write to preference fields.
Distinct because: it operationalises S9 rather than assuming it is true.

### 3.2 Pre send validation

**4. Static rule pre send check**
Problem: profiles that violate a recorded must have criterion are sent anyway.
User: matchmaker, at the send action.
Intervention: compare the candidate against the client's hard criteria before the profile can be sent, flagging conflicts by name.
Behaviour change: turns an invisible standard into a visible prompt at the moment of decision.
Data needed: constraint card from idea 1, candidate fields.
Prototype scope: one rule engine, one flag, embedded in the send flow.
Metric: conflict flag rate and the share of flagged sends that the matchmaker acts on.
Failure mode: flag fatigue, where every flag is dismissed.
Concern: the rule set encodes what was recorded, so it inherits recording error.
Distinct because: it prevents a specific avoidable error rather than ranking candidates.

**5. Semantic pre send check over notes and profiles**
Problem: some criteria live only in prose in notes and are invisible to field based rules.
User: matchmaker.
Intervention: a language model reads the client notes and the candidate profile, then reports any criterion conflict a field rule missed. It proposes, it never decides.
Behaviour change: surfaces soft and situational conflicts before the client does.
Data needed: notes corpus, candidate profiles.
Prototype scope: one prompt, one structured output, human confirms.
Metric: additional conflicts caught per 100 sends, and false positive rate on the matchmaker's own confirmations.
Failure mode: confidently wrong conflicts about people, which is the failure mode S9 and S10 warn about with degree and label.
Concern: high, and it breaches the no AI brand line if it reaches the client. Must stay matchmaker side and advisory.
Distinct because: it reads prose rather than fields, which is where this company's data actually lives.

### 3.3 Rejection feedback structuring

**6. Reason coded rejection capture**
Problem: rejection feedback is unstructured free text, so the richest signal in the business cannot be counted, compared or reused.
User: matchmaker, at the moment of rejecting.
Intervention: a fixed dimension vocabulary plus a severity flag plus optional free text, captured in one tap.
Behaviour change: makes the cost of recording low enough that it actually happens, which is what makes every downstream idea possible.
Data needed: a dimension list, and the existing rejection action.
Prototype scope: one sheet, one vocabulary of around twelve dimensions, one severity toggle.
Metric: share of rejections captured with a dimension, and capture latency in seconds.
Failure mode: matchmakers type free text anyway and the structured field rots empty.
Concern: low to moderate. The taxonomy must be able to say "other" without forcing a wrong label.
Distinct because: it is the enabling capture, not an analytics layer on top of free text.

**7. Rejection roll up by dimension per client**
Problem: even structured reasons stay trapped in individual records.
User: matchmaker, per client.
Intervention: auto aggregate rejected counts by dimension per client, with time.
Behaviour change: turns fifty separate rejections into one visible pattern, which is what makes a next decision different.
Data needs: the capture from idea 6.
Prototype scope: one roll up view per client.
Metric: time from first rejection on a dimension to the first subsequent send that avoids it.
Failure mode: the pattern becomes a standing exclusion that the client never actually wanted.
Concern: moderate. Auto derived exclusions must not become rules without client confirmation.
Distinct because: it turns a stream of events into a state, which is what a decision needs.

**8. Accept against reject divergence card**
Problem: the brief says some clients reject profiles and later accept profiles with similar characteristics, which means a rejection is not a stable rule and the matchmaker cannot know which.
User: matchmaker, at the next send.
Intervention: when a candidate matches a dimension the client rejected before, but the client later accepted a profile with that same dimension, show both, side by side, and say so in one line.
Behaviour change: stops a mechanical exclusion from firing when the client's own behaviour contradicts it, and prompts one question instead.
Data needed: structured rejections plus accepted profiles with dimension tags, both timestamped.
Prototype scope: one card, one comparison, one question.
Metric: share of divergence cases where the matchmaker asks the client, and the client's answer quality.
Failure mode: becomes a nag, and matchmakers learn to ignore it.
Concern: moderate. The card must describe a fact, not accuse.
Distinct because: it is the only idea that directly handles the scenario's later accept fact.

### 3.4 Search workflow

**9. Exclusion list generator**
Problem: rejections are recorded and then forgotten, so the same poor source settings are searched again.
User: matchmaker and sourcing team.
Intervention: structured reasons become saved search exclusions and filters that apply to the next search.
Behaviour change: removes the need to re-search what is already known.
Data needed: structured rejections, search system access.
Prototype scope: generate a proposed exclusion list per client as a document the matchmaker can paste into the search.
Metric: search minutes per client per week, against the 2 hour baseline.
Failure mode: over exclusion, which quietly shrinks the pool and hurts downstream quality.
Concern: moderate. Exclusions must be provisional and client confirmed.
Distinct because: it attacks the 2 hour per week cost directly.

**10. Sourcing brief assembler**
Problem: each matchmaker rebuilds the same client brief from notes before every search session.
User: matchmaker.
Intervention: assemble a one page brief per client with who is needed, hard constraints, recent rejections, warm leads and the last search settings, refreshed automatically.
Behaviour change: cuts the fixed overhead of every search session.
Data needed: client brief, rejection log, search history.
Prototype scope: one generated page per client.
Metric: minutes to first candidate found per search session.
Failure mode: becomes a document nobody reads because the matchmaker already knows the client.
Concern: low, provided it stays inside TDC.
Distinct because: it is time saving inside the existing workflow, not a new workflow.

### 3.5 Knowledge retention

**11. Cross client precedent library**
Problem: the company keeps its best practice in people's heads and in playbooks (S12), so a new matchmaker repeats solved mistakes.
User: matchmaker, across clients.
Interaction: search anonymised precedent such as three similar clients rejected on this dimension, two accepted despite it.
Behaviour change: turns scattered experience into a retrievable precedent.
Data needed: structured rejections and outcomes across clients.
Prototype scope: a search over anonymised historical decisions, seeded from existing notes.
Metric: reuse rate of precedent per 100 sends.
Failure mode: precedent laundering, where one loud matchmaker's opinion becomes policy for everyone.
Concern: high, because it crosses client boundaries. Requires de identification, a firewall test and client consent to contribute.
Distinct because: it is the only idea that turns the team's experience into an asset.

**12. Playbook and curriculum from real decisions**
Problem: S12 asks matchmakers to document learnings, but there is no mechanism that turns those notes into practice.
User: new matchmakers, then all matchmakers.
Intervention: a monthly curriculum and playbook built from anonymised real rejection and acceptance patterns, delivered as short cases.
Behaviour change: raises the floor on judgement without software.
Data needed: structured decisions plus matchmaker write ups.
Prototype scope: two case studies from real anonymised patterns.
Metric: the 44% versus 21% gap on a like for like client mix, plus time to first independent client.
Failure mode: training decays and the gap reopens.
Concern: low.
Distinct because: it is a process answer, and S13 explicitly asks whether a process change solves it.

### 3.6 Client expectation and autonomy

**13. Expectation calibration sheet**
Problem: clients imagine a match as a finished person and meet a biodata, and downstream stalls get attributed to bad matches.
User: client, at onboarding, with the matchmaker present.
Interaction: a one page sheet, signed, stating what the stage contains, what to expect in the next month, what a first meeting is and what is not guaranteed.
Behaviour change: replaces an imagined process with a concrete one, at the point where expectations are set.
Data needed: onboarding data.
Prototype scope: one page, one sign off.
Metric: share of stalled conversations where the client had received the sheet, and meeting fixed rate among sheet holders.
Failure mode: read as legal fine print and ignored.
Concern: moderate. It must not narrow the client's autonomy or read as a disclaimer.
Distinct because: it is a paper and a conversation, and it targets the stage where the biggest proportional drop sits.

**14. Preference trade off board**
Problem: clients can hold mutually incompatible wants and reject for the wrong reason when forced to pick.
User: client, once, during a check in.
Interaction: show three real candidates with the trade offs named, and ask which dimension matters most for this round.
Behaviour change: converts a shopping decision into a prioritisation decision.
Data needed: candidate shortlist, client constraints.
Prototype scope: one board for one client.
Metric: acceptance rate of the board shortlist against the client's baseline acceptance rate.
Failure mode: commoditises the service and looks like swiping, which the brand rejects.
Concern: high on brand and autonomy grounds.
Distinct because: it is a single explicit prioritisation, not a browse.

### 3.7 Communication automation

**15. Reason forward introduction note**
Problem: profiles are passed with little framing, and clients cannot tell what the matchmaker saw in them.
User: matchmaker, drafting, client receiving.
Interaction: when a profile is approved, draft a short note that states the reason in the client's own stated priorities and sets one expectation.
Behaviour change: gives the client a reason to respond, which should lift contact shared to conversation.
Data needed: structured rejections and preferences, candidate profile, matchmaker note.
Prototype scope: one template with a drafted body, matchmaker edits and sends.
Metric: contact shared to conversation rate for reason forward sends against the 71.4% baseline.
Failure mode: generic phrasing that sounds templated and erodes the personal feel.
Concern: moderate. Sends on the matchmaker's authority, never to a client without a human send.
Distinct because: it carries the client's own words back to them, which a generic matcher cannot.

**16. Pre meeting brief for both sides**
Problem: conversations stall because both sides arrive with different pictures of the other.
User: both clients, delivered by the matchmaker.
Interaction: one page each, covering what the other said they want, what the matchmaker noticed, and three openers.
Behaviour change: makes the meeting concrete instead of exploratory.
Data needs: onboarding data and matchmaker notes.
Prototype scope: one generated brief per meeting.
Metric: meeting fixed to completed rate for briefed meetings against the 56% baseline.
Failure mode: a document that leaks one side's private detail to the other, which would be a serious breach given S11.
Concern: high on privacy, manageable with strict field separation and matchmaker review before send.
Distinct because: it works on the meeting stage, which no selection tool can reach.

### 3.8 Measurement

**17. Funnel event taxonomy and instrumentation**
Problem: stage definitions live in people's heads, so every funnel number is assembled differently and the A versus B gap cannot be interpreted.
User: the product team, and matchmakers indirectly.
Interaction: a written definition per stage, one timestamped event per transition, computed rather than recounted.
Behaviour change: none directly. It changes what everyone can argue about.
Data needed: the CRM schema.
Prototype scope: one stage definition document and one event per transition for the five funnel steps.
Metric: percentage of transitions with a timestamped event, and inter-matchmaker definition agreement on a 30 record audit.
Failure mode: becomes a reporting project that delays the real work.
Concern: low.
Distinct because: it is deliberately unglamorous and it gates the credibility of everything else.

**18. Source tagging and channel quality scorecard**
Problem: profiles come from the member network, matrimonial sites, LinkedIn and referrals, and nobody knows which source produces which outcome.
User: matchmaker and sourcing team, and the founder.
Interaction: a source tag on every profile sent, and a monthly view of acceptance and completed meeting rate by source.
Behaviour change: shifts sourcing effort toward what actually converts.
Data needed: source field on the send action.
Prototype scope: one field and one view.
Metric: completed meeting rate by source, and the share of sends from the best source.
Failure mode: source quality varies by client segment, so the scorecard misleads.
Concern: low, provided no client is penalised for their source mix.
Distinct because: it measures the input side of curation rather than the output side.

### 3.9 Human in the loop quality and governance

**19. Blind second matchmaker audit sampler**
Problem: there is no measurement of whether the matchmaker selected well, so the 44% versus 21% gap stays a mystery and quality is assumed rather than checked.
User: the matchmaker, as a development tool.
Interaction: every week, a random ten sent profiles per matchmaker go to a second matchmaker to review against the client brief, with a blind agreement score that is visible only to the matchmaker and the founder.
Behaviour change: creates a quiet quality loop and surfaces where the team actually disagrees.
Data needed: sent profiles, client briefs, a reviewer rubric.
Prototype scope: a rubric, a sampling query and a sheet.
Metric: blind agreement rate, and the change in per matchmaker acceptance rate on a like for like mix over eight weeks.
Failure mode: becomes surveillance and matchmakers game it.
Concern: high on culture. Must be framed as coaching, with no ranking published.
Distinct because: it is a measurement of judgement, which no CRM feature provides.

**20. Fairness reflection audit on selection**
Problem: the founder's own content argues against labels standing in for people, and the selection step is where a label can quietly become a proxy.
User: matchmaker, as a reflection prompt.
Interaction: a periodic check of whether selection correlates with protected or adjacent attributes such as caste, religion, age, gender or city tier beyond the client's stated criteria, surfaced as a question.
Behaviour change: makes an unconscious filter visible for one conversation.
Data needed: selected and rejected profile attributes, client stated criteria.
Prototype scope: one aggregate view for one month.
Metric: share of selections with a criterion that was not client stated, and the change after reflection.
Failure mode: a false positive reading of legitimate client criteria as bias, which would be both wrong and damaging.
Concern: high on fairness and on trust. Aggregate only, never per client, never used to override a client's criteria.
Distinct because: it protects the equity promise the company publishes while changing nothing about what the client asked for.

---

## 4. Scoring framework

### 4.1 Criteria and weights

| Criterion | Weight | What it measures here |
| --- | --- | --- |
| Evidence strength | 20% | How directly the supplied data and public sources point at this intervention, against how much is assumption |
| Two week feasibility | 18% | Whether one person can build a demonstrable version in ten working days |
| Speed to learning | 15% | How fast a real signal arrives on whether the intervention works |
| Potential business impact | 15% | Plausible effect on wasted search, client goodwill and introductions, with the bound stated |
| Differentiation | 12% | Whether the idea exists in the market already, judged against S18, S19 and S20 |
| Data availability | 10% | Whether the data needed exists in week one or has to be created first |
| Cost and complexity | 5% | Build and running cost, scored inverse |
| Reversibility and risk | 5% | How safely it can be abandoned, and how much damage a failure causes to clients or trust |

Weighted score = sum of (weight x criterion score), then divided by 100 to give a figure out of 5. Each criterion is scored 1 to 5. Scores are judgements, not measurements, so the output is rounded to one decimal and should be read as a ranking, not a ranking with error bars.

### 4.2 Results

| Rank | # | Idea | Evidence 20 | Feasib. 18 | Learn 15 | Impact 15 | Differ. 12 | Data 10 | Cost 5 | Risk 5 | Weighted /5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 6 | Reason coded rejection capture | 5 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 4.4 |
| 2 | 19 | Blind second matchmaker audit | 4 | 5 | 5 | 3 | 4 | 3 | 5 | 3 | 4.1 |
| 3 | 17 | Funnel event taxonomy | 4 | 5 | 3 | 3 | 3 | 5 | 5 | 5 | 4.0 |
| 4 | 8 | Accept against reject divergence card | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3.9 |
| 5 | 18 | Source tag scorecard | 3 | 5 | 4 | 3 | 3 | 4 | 5 | 5 | 3.8 |
| 6 | 13 | Expectation calibration sheet | 3 | 5 | 3 | 3 | 3 | 4 | 5 | 5 | 3.7 |
| 7 | 4 | Static rule pre send check | 4 | 4 | 4 | 4 | 2 | 3 | 4 | 3 | 3.6 |
| 8 | 2 | Deal breaker against nice to have | 3 | 4 | 3 | 4 | 3 | 3 | 5 | 5 | 3.5 |
| 9 | 7 | Rejection roll up by dimension | 4 | 4 | 4 | 3 | 3 | 2 | 4 | 3 | 3.5 |
| 10 | 9 | Exclusion list generator | 3 | 4 | 4 | 3 | 3 | 3 | 4 | 3 | 3.4 |
| 11 | 1 | Constraint Card | 4 | 4 | 2 | 4 | 2 | 3 | 4 | 4 | 3.4 |
| 12 | 5 | Semantic pre send check | 3 | 3 | 4 | 4 | 4 | 2 | 2 | 2 | 3.2 |
| 13 | 12 | Playbook and curriculum | 3 | 4 | 2 | 3 | 3 | 3 | 4 | 5 | 3.2 |
| 14 | 15 | Reason forward intro note | 2 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 3.1 |
| 15 | 3 | Stated against revealed ledger | 3 | 3 | 3 | 3 | 4 | 2 | 4 | 2 | 3.0 |
| 16 | 10 | Sourcing brief assembler | 2 | 4 | 3 | 3 | 2 | 2 | 4 | 5 | 2.9 |
| 17 | 16 | Pre meeting brief | 2 | 4 | 3 | 3 | 2 | 3 | 3 | 2 | 2.8 |
| 18 | 11 | Cross client precedent library | 3 | 2 | 2 | 4 | 4 | 2 | 2 | 1 | 2.7 |
| 19 | 20 | Fairness reflection audit | 2 | 3 | 2 | 2 | 4 | 2 | 3 | 2 | 2.5 |
| 20 | 14 | Preference trade off board | 2 | 3 | 3 | 2 | 2 | 2 | 3 | 2 | 2.4 |

Reading the table. The top band is crowded and the spread between rank 1 and rank 6 is about 0.7 points on a five point scale, which is inside the noise of a judgement based scoring exercise. The ranking is useful for eliminating the bottom half and for forcing reasons, not for pretending a precise ordering exists.

Two observations that the weights produce:

- **Ideas 17 and 18 score above their glamour.** Event taxonomy and source tagging are unglamorous, they score well on data availability, cost, reversibility and learning speed, and they are prerequisites for believing any other number. They are supporting work, not the recommendation.
- **Idea 19 scores high and is not a product.** A blind second matchmaker audit is a process intervention with a measurement component. It is the strongest diagnostic in the set and it belongs in the experiment as a comparison method, not as the product.
- **Idea 1, the Constraint Card, scores poorly for a reason worth stating.** It scores well on impact and evidence and badly on speed to learning, because re capturing preferences takes months and produces no measurable signal inside a two week window. That is a learning problem, not a value problem, which is exactly why it is the credible alternative rather than the recommendation.

### 4.3 Recommendation

**Recommended: the Rejection Ledger.** A per client record of structured rejections, with a contradiction check at the next send.

Three parts, built in this order:

1. **Capture.** At the moment a client rejects a shared profile, the matchmaker picks a dimension from a fixed list, marks it as a deal breaker or a preference, and optionally adds a line of free text. One tap, under ten seconds. AI does one narrow job here: it proposes the dimension tag from the free text so the matchmaker is not forced to author a taxonomy on the fly, and the matchmaker confirms or changes it. The model never decides.
2. **Roll up.** The rejections aggregate into a per client view by dimension, with counts and dates, and a record of which dimensions the client later accepted on despite rejecting before.
3. **Conflict at send.** When the matchmaker is about to share a profile with a client, the ledger checks the candidate against that client's recorded dimensions and surfaces one of two things. Either a plain conflict, where the candidate hits a recorded deal breaker, or a contradiction, where the client rejected on this dimension before and later accepted a profile with it, in which case the matchmaker is asked one question before sending.

The third part is the part that matters and the part that is distinctive. It puts a decision, not a report, at the point where the decision is made. And it treats a rejection as a question rather than a rule, which is what the founder's own published argument and the brief's later accept fact both point to.

**Credible alternative: the Constraint Card plus a static pre send check.** Simpler, faster to build, and tied most directly to the 35% finding. It is the second choice for a specific reason: it can only enforce what the client already said, and the company's own thesis is that what the client says under-determines what the client does. It is also the version most likely to already exist in some form in competitor CRMs (S18 and S19 both ship filters and suggestion engines), so it wins on speed and loses on difference. If the two week test shows that the rejection signal is too sparse or too noisy to act on, this is the fallback.

**Rejected despite its appeal: an AI compatibility scoring or profile ranking model.**

It is the most attractive idea in the room and the rubric in S13 explicitly mentions "improving how our matchmaking algorithm ranks profiles". It still loses, on five grounds.

1. **It addresses ordering, and the problem is selection.** With a 31% acceptance rate, the matchmaker is not choosing badly between acceptable candidates. They are sending profiles that should never have been sent. Reordering a list that contains unacceptable items does not help, and the portion of the problem a ranking model can touch is bounded by the 35% ceiling, which is the same ceiling a rule based check reaches at a fraction of the cost.
2. **The data cannot support it in two weeks.** A ranking model needs labelled good and bad matches. TDC counts a match as two people meeting and wanting a second meeting (S4), and the business outcome is marriage with a 6 to 9 month lag and a success bonus. There is no outcome label set to train or validate on.
3. **It breaks the promise the company sells.** S2 contrasts "by expert matchmakers" against "through AI or low EQ relationship managers" and "hand picked" against "algorithm pushed". A ranking model puts the algorithm in the middle of the most valued part of the offer.
4. **It scales the exact bias the founder argues against.** S10 is a warning that a label gets read as a prediction. A model trained on past selections would encode those predictions at scale and make them harder to see.
5. **It changes no behaviour.** It produces a list. The waste in this funnel comes from a human deciding, at a moment, with incomplete context. Only an intervention at that moment changes it.

A chatbot for clients is rejected on the same grounds, plus the brand line, plus the fact that clients are the party TDC wants to protect from work (S15). A dashboard is rejected because a dashboard reports and this problem needs prevention.

### 4.4 Why not a profile ranking model, a chatbot or a dashboard, in one line each

| Generic answer | Why the recommended intervention beats it |
| --- | --- |
| Ranking model | Cannot encode a criterion the client never articulated, needs outcome labels that will not exist for a year, and puts a model where the brand says a human must be |
| Chatbot | Adds friction to the client, who is the party the business model protects, and puts AI in the matching decision the brand explicitly rejects |
| Dashboard | Reports on waste that has already happened. The waste here is preventable at a specific moment, and a dashboard does not reach that moment |

---

## 5. Decisions taken and their consequences

| Decision | Reason | Consequence accepted |
| --- | --- | --- |
| Recommend a matchmaker side, client agnostic intervention | The work sits with the matchmaker, and client autonomy is a brand promise (S2, S15) | The client never sees the ledger, which means the client cannot self correct, so the matchmaker has to run the conversation |
| Treat a rejection as a question, not a rule | The brief says clients later accept what they rejected. Encoding rejections as rules would automate the wrong thing | A contradiction card can be overridden freely, so some waste stays. That is the intended trade |
| Use AI only for dimension tagging from free text | The brand rejects AI in matching, and S5 shows AI is already tolerated in drafting and summarising | The tagging step still needs a human to confirm, so the capture cost stays at a few seconds rather than zero |
| Do not touch preference fields without client confirmation | The brief forbids silent changes to client preferences, and S4 has clients editing their own preferences | The tool proposes, the client confirms, the matchmaker records. Slower, and correct |
| Ship the conflict check as advisory, never blocking | A blocking rule that is wrong removes a good candidate with no appeal | Some conflicts still go out, and the override rate becomes a quality metric on the rule set |
| Keep stage definitions and instrumentation as a prerequisite, not the deliverable | The A versus B gap and every funnel rate are currently ambiguous (H8) | Two weeks of the four week build go to instrumentation. The hiring team sees a smaller screen set and a more credible number |
| Do not claim any business metric will move | Two weeks and a handful of clients cannot establish a change in completed meetings, and completed meetings are upstream of marriage and the success bonus | The primary metric is a proximate one, and the brief says so plainly |
