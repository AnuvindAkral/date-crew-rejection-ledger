---
title: Gate B - Data model and rules
status: draft
created: 21 October 2026
phase: 2B
depends_on: docs/GATE_B_SITEMAP.md
---

# GATE B: DATA MODEL AND RULES

Minimal synthetic data model and the deterministic rules the prototype must implement. No implementation in this phase; this is the contract the code must satisfy.

---

## 1. Entities

### Client

| Field | Notes |
| --- | --- |
| id | Synthetic identifier |
| handle | Display name or Magic Link handle |
| arm | control or intervention, fixed at assignment |
| journey_stage | new or ongoing, the stratum |

### CandidateProfile

| Field | Notes |
| --- | --- |
| id | Synthetic identifier |
| handle | Display name |
| dimensions | Objective dimension tags recorded at sourcing or onboarding, independent of rejection capture. Rejection-derived dimensions are client-scoped on the RejectionEvent and never become a candidate's objective tags |
| source_channel | Internal network, matrimonial platform, LinkedIn, referral |

### ProfileDimension

The fixed vocabulary of twelve values, each with a one-line definition: religion or community, age or stage, education, profession or seniority, income or financial situation, location or city tier, family situation or parents, diet or lifestyle, appearance or grooming, personality or temperament, values or intent, marital history. Off-list dimensions are allowed and recorded as free-form labels.

### ExplicitClientPreference

| Field | Notes |
| --- | --- |
| id | |
| client_id | |
| dimension | May be a vocabulary dimension or free form |
| kind | stated-preference or confirmed-dealbreaker |
| status | active or revoked |
| source | client-confirmed, matchmaker-recorded |
| recorded_at | |
| confirmed_at | Set when a client answers the clarification question |

A preference only becomes a confirmed-dealbreaker when the client has confirmed it as such. A matchmaker cannot escalate a preference to a dealbreaker on the client's behalf.

### ClientConfirmation

| Field | Notes |
| --- | --- |
| id | |
| client_id | |
| question | The clarification question asked, verbatim |
| answer | The client's verbatim answer |
| dimension | The dimension settled by the answer |
| recorded_at | |
| recorded_by | Matchmaker id |

A confirmed rule or confirmed dealbreaker can only be written from a ClientConfirmation. No other path promotes a pattern or a likely-dealbreaker to confirmed.

### RejectionEvent

| Field | Notes |
| --- | --- |
| id | |
| client_id | |
| candidate_id | |
| dimension | Coded dimension, or null when uncoded |
| severity | likely-dealbreaker, preference, or uncertain. A matchmaker's read, not a client confirmation. See ClientConfirmation for the confirmed state |
| free_text | Original rejection text, preserved verbatim |
| recorded_at | |
| captured_by | Matchmaker id |

### AcceptanceEvent

| Field | Notes |
| --- | --- |
| id | |
| client_id | |
| candidate_id | |
| accepted_at | |

An acceptance event carries no severity and no text. Its role is to provide the second half of a contradiction, nothing else.

### StructuredReason

The resolved classification of a rejection. It links a rejection event to a dimension and a severity after human confirmation. Distinct from the raw rejection event because the confirmation step can change the proposed dimension.

### MatchmakerResolution

| Field | Notes |
| --- | --- |
| id | |
| card_id | The card the resolution answers |
| action | proceed, hold, or resolve |
| rationale | Matchmaker's stated reason, required |
| rule_recorded | Optional client-confirmed rule produced by a resolution; must reference a ClientConfirmation, never a matchmaker click alone |
| resolved_at | |
| actor | Matchmaker id |

### AuditEvent

| Field | Notes |
| --- | --- |
| id | |
| type | card-shown, card-resolved, preference-created, preference-revoked, preference-confirmed, tag-proposed, tag-confirmed, tag-changed |
| client_id | |
| actor | |
| timestamp | |
| payload | Immutable record of the change, with client-identifying free text redacted unconditionally |

Every change to a preference, and every AI proposal and its human confirmation, is an audit event. Free-text rejection notes are visible only to the owning client's matchmaker; audit payloads are redacted.

---

## 2. State distinctions

| State | Meaning | Created by | Treated as |
| --- | --- | --- | --- |
| Confirmed dealbreaker | Client escalated a criterion to hard and confirmed it | Client confirmation, recorded by matchmaker | Deterministic rule |
| Stated preference | Client expressed a soft criterion | Client, at onboarding or later | Information, surfaced but never enforced |
| Historical rejection | A past rejection on a dimension | Rejection event | Evidence, never a rule on its own |
| Historical acceptance | A past acceptance on a dimension | Acceptance event | Second half of a contradiction |
| Uncertain interpretation | A rejection whose severity is preference or uncertain | Rejection event | A prompt to clarify, not a rule |
| Missing information | No code, no tag, or no history | Absence of data | Never evidence of compatibility |

The three things that are never conflated: a confirmed dealbreaker, a historical rejection, and missing information. Only the first drives a deterministic check.

---

## 3. Rules

**R1. Deterministic dealbreaker check.** If a candidate's dimension tag matches a client's active confirmed-dealbreaker preference, the conflict state fires. This is a pure field comparison, no model, no heuristics.

**R2. Historical rejection never becomes a permanent dealbreaker.** A rejection with severity likely-dealbreaker, entered by a matchmaker, is an unconfirmed pattern, not a confirmed-dealbreaker. It can fire the conflict state as a warning, but it does not write a preference and does not enforce a hard block. Only a ClientConfirmation promotes it. The matchmaker-entered vocabulary deliberately has no confirmed value.

**R3. AI suggestions require human confirmation.** A model may propose a dimension from free text. The proposal is stored as a proposal and only becomes a StructuredReason after a human confirms or changes it. An unconfirmed proposal cannot affect any check.

**R4. No silent preference rewrites.** The prototype never writes to an ExplicitClientPreference except through a ClientConfirmation. A matchmaker recording a rule must first record the client's verbatim answer. No background process, model, or roll-up can modify a preference field, and no UI affordance can create a confirmed rule without a ClientConfirmation.

**R5. Contradiction requires evidence from both sides.** The contradiction state fires only when there exists at least one rejection event and at least one later acceptance event on the same dimension for the same client. One side alone is a repeat or a pattern, not a contradiction.

**R6. Missing information is not evidence.** An untagged candidate, an uncoded rejection, or an empty ledger never produces a conflict, a contradiction, or a clean affirmation. Untagged is distinct from compatible.

**R7. Matchmaker can always proceed, hold, or resolve.** Every card offers three exits. Proceed records the rationale. Hold parks the share. Resolve records a client-confirmed rule when a client answer exists. No card ever removes the matchmaker's ability to send.

**R8. Time ordering is strict.** Prior evidence counts only when its timestamp is earlier than the share timestamp. A rejection logged after the share cannot make that share avoidable, and a preference edited after the share cannot make it a conflict.

---

## 4. What the model may and may not do

| May | May not |
| --- | --- |
| Propose a dimension tag from a single rejection's free text | Decide the rejection's dimension |
| Propose a severity from the same text as a suggestion | Confirm a dealbreaker |
| Be absent entirely; the core check is deterministic | Write any preference field |
| | Treat missing data as compatibility |
| | Fire a contradiction from a single event |

The prototype must run the full core workflow with no model at all. The model is an optional convenience on the capture sheet only, and its absence must not change any decision the deterministic rules make.
