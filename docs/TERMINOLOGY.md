# Terminology

The words the product uses, where each came from, and what it replaced. The rule for this file: **no phrase goes in the interface that the company has not been recorded as using.**

## Where the evidence comes from

| Strength | Source | What it gives |
| --- | --- | --- |
| Direct quote | The founder's blog on rejections, quoted verbatim in `phase1/RESEARCH.md` section 5 (source S9) | The founder's own framing of rejections and the onboarding call |
| Direct quote | The Matchmaker job description, quoted in `phase1/RESEARCH.md` section 4.2 (source S12) | The matchmaker's own job vocabulary |
| Company page, summarised in the research | The Date Crew FAQ and About pages (sources S3, S4, S6), summarised in `phase1/RESEARCH.md` section 4.1 | The client journey and its vocabulary |
| The assignment brief | The figures and stage names the employer supplied: profiles shared, profiles accepted, contact details shared, conversations started, meetings fixed, meetings completed | The funnel names the measurement has to line up with |

## The map

| Company wording | Source | Where it appears in the product | What it replaces |
| --- | --- | --- | --- |
| **preferences and deal breakers** | `phase1/RESEARCH.md:100`, recording the FAQ (S4) on the detailed call | The heading over the client's criteria, the labels on each criterion, the sheet where the matchmaker records what the client said | "criteria", "rules", "conditions" |
| **the onboarding call** | `phase1/RESEARCH.md:138`, direct quote (S9) | Where a criterion came from: "From the onboarding call" | "intake", "onboarding record" |
| **the reasons they reject someone** | `phase1/RESEARCH.md:138`, direct quote (S9) | The heading of the rejection sheet, the confirmation message | "rejection feedback", "feedback capture" |
| **the rejection conversation is about reality** | `phase1/RESEARCH.md:140`, direct quote (S9) | One line of framing in the rejection sheet, so the matchmaker knows what the record is for | nothing, it is new |
| **match histories** | `phase1/RESEARCH.md:115,118,178`, recording the Matchmaker JD (S12) | The collapsed section of past feedback on a client | "rejection ledger" as a user-facing name |
| **client responses, feedback, and patterns over time** | `phase1/RESEARCH.md:113`, recording S12 | What the record is called in the documentation and the confirmation messages | "the ledger", "the log" |
| **suggesting a match** | `phase1/RESEARCH.md:113`, direct quote from S12 | The wording of the decision the card supports | "scoring", "ranking" |
| **mutual compatibility, not just profile alignment** | `phase1/RESEARCH.md:113`, direct quote from S12 | The caveat under "No conflicts found in the information available" | any claim that a profile is a good match |
| **profile** | The assignment brief ("profiles shared", "profiles accepted") and the journey description (S2, S4, S6) | The record being reviewed. A "candidate" is someone being sourced; the record the matchmaker works from is a profile | "candidate record", "person record" |
| **client** | The brief and S12 | Everywhere a client is referred to | "customer", "user" |
| **matchmaker** | The brief and S12 | The person using the workspace | "user", "operator" |
| **curate** | `phase1/RESEARCH.md:113`, recording S12 | The verb for the matchmaker's work: curating a set of profiles for a client | "managing", "processing" |

## The language the interface actually uses

The map above is where each phrase came from. This is what the interface says with it, so a reviewer can check the map against the build. Nothing here is a new piece of company vocabulary; each line is either a sourced phrase or plain English built from one.

| In the interface | Where | Built from |
| --- | --- | --- |
| **Preferences and deal breakers** | The heading over a client's criteria | The company's own phrase for the two things a client has |
| **Deal breakers**, **Preferences**, **To check with the client** | The three groups on a client's file | The first two are the company's; the third is the hypothesis tier, and it says plainly that it is not a rule |
| **Confirmed by the client**, **Recorded at intake**, **An observation to check, not a rule** | The evidence tier under each criterion | "The onboarding call" for what was said at intake, and the confirmed case for what the client answered for themselves |
| **The client said** | Under a finding, beside the client's own words | The rejection conversation is about reality, so the words are shown, not paraphrased |
| **Their file disagrees with itself** | The contradiction finding | Plain English for a contradiction, which is not a phrase any source uses |
| **Worth resolving** | The box on a client's file | Plain English. The client resolves it, so the wording does not claim the tool has |
| **Also worth knowing** | The collapsed rest of the findings | Plain English for the findings that are not the one needing a decision |
| **In their favour** | The positive evidence strip | Plain English, deliberately narrow, because the strip shows what happened, not that the profile is a good match |
| **What they liked before** | The collapsed acceptance debrief | The acceptance is the client's, and what they liked is what the debrief captured |
| **Check before sharing**, **Hold the profile**, **Ask the client**, **Share this profile**, **Share anyway** | The card | "Profiles shared" from the brief, and plain English for the three decisions a matchmaker can take |
| **Held, not sent** | A held profile on the shortlist | Plain English, and it is there so nobody has to guess whether something went out |
| **Previous decisions** | The block on the clarification sheet | Plain English for what the client has done, labelled so it is not read as a preference |
| **Clarify {client}'s {dimension} preference** | The clarification sheet | "Preferences and deal breakers", with the question the client is asked |
| **Record something the client said** | The criterion editor | "The onboarding call" and "the reasons they reject someone" |
| **Match histories** | The collapsed history on a client's file | The company's own phrase from the Matchmaker job description |
| **How it's going** | The measurement view | Plain English. It is a status, not a scoreboard |
| **Profiles sent**, **Checked before sending**, **Potential mismatches found**, **Dealbreaker conflicts that reached clients**, **Preference mismatches that reached clients**, **Profiles with missing information**, **No conflicts found**, **Nothing to compare against** | The measurement view | The funnel names from the brief, with the measure named in plain English |

## The measurement view uses the employer's funnel names

The funnel stage names come from the assignment brief, and the measurement has to line up with them: **profiles sent, profiles accepted, contact details shared, conversations started, meetings fixed, meetings completed**. The plain-language labels for the measure itself, taken from the brief's own suggestion:

| Technical | Plain |
| --- | --- |
| Shared | Profiles sent |
| Audited | Profiles reviewed |
| Conflicted | Profiles with a mismatch |
| Hard conflict | Dealbreaker conflict |
| Soft conflict | Preference mismatch |
| Unknown coverage | Missing information |
| Clean | No conflicts found |
| Conflict rate | Mismatch rate |

## One unresolved variant

The assignment brief writes **"dealbreakers"** as one word. The research record of the company's own FAQ (S4) writes **"deal breakers"** as two. The interface uses "deal breaker", because the brief's own plain-language table says "Dealbreaker" for the technical term and the company's page is the source for the user-facing phrase. Both spellings are defensible and this is flagged rather than hidden.

## What the product does not claim

The company's public material is recorded as saying "No AI. No App. No Endless Swiping" and contrasting "by expert matchmakers" with "algorithm-pushed" profiles. The interface therefore never implies an automatic recommendation, a compatibility score, or a ranking. The check reports what the client has on file, and the matchmaker decides.

Words that appear in no source material, and so appear nowhere in the product: conversion optimisation, lead scoring, AI compatibility, customer intelligence, pipeline, funnel stage, insight, signal, activation.
