# Submission checklist

What the assessment brief asks for, where each item is, and what is still outstanding. Nothing is published or sent until the user approves it.

## Required by the brief

| Brief item | Where | Status |
| --- | --- | --- |
| 1. Your answers, as a document | `ASSIGNMENT_SUBMISSION.md` | Done. Part 1 is 299 words, Part 2 is 499, Part 4 is 192 in the body and 198 with its heading, in the headings the brief asks for. Counts are measured from the file, not asserted |
| 2. Prototype: working link, screenshots or recording | `screenshots/`, run instructions in the submission and in `README.md` | Done. Seven screenshots re-captured against the current build, a local run command, and a verified walkthrough in `docs/DEMO_SCRIPT.md`. No public link yet, because publishing needs the user's approval |
| 3. Code, on GitHub | The repository | Ready. No remote yet, publishing on approval |
| 4. AI usage in 3 to 5 lines: tools, what for, one thing you disagreed with | `ASSIGNMENT_SUBMISSION.md`, the AI usage section | Done. Four lines, and the disagreement is a real one |
| 5. Updated resume | Not produced | Needs the user's actual resume and sign-off |

## Supporting documents

| File | Contents |
| --- | --- |
| `README.md` | The problem, the direction, the workflow, the implemented features, setup, run, test, demo |
| `docs/README.md` | The document index, and which file is the assessment of record |
| `docs/MEASUREMENT_MODEL.md` | The primary outcome, the adoption guardrail, the audit, and what a two-week pilot could and could not show |
| `docs/PRODUCT_THINKING.md` | The problem, the reasoning, the assumptions, what would change the direction |
| `docs/PRODUCT_DECISIONS.md` | Seventeen decisions with their trade-offs, the feature classification, and how the direction moved from a rejection-ledger-first idea to the pre-send check |
| `docs/TERMINOLOGY.md` | The words the product uses, the company source of each one, and the plain-language labels the measurement view uses |
| `docs/DEMO_SCRIPT.md` | Verified walkthrough with exact commands and expected results |
| `docs/VALIDATION_PLAN.md` | The assumptions that need real matchmaker validation, and the proposed steps |
| `docs/AI_USAGE.md` | AI disclosure, both the assistance used in producing the work and the AI inside the product |
| `docs/PUBLISHING_AUDIT_PROMPT.md` | Reusable prompt for checking a repository before it goes public |
| `docs/SOURCING_SCORECARD_GATE.md` | Why the sourcing scorecard is excluded |
| `docs/INTERVIEW_PROTOCOL.md` | The five matchmaker conversations, prepared and unrun |
| `docs/GATE_B_*.md` | The metric definitions, experiment design, data model, decisions and sitemap from Gate B, kept as the working record |
| `docs/REVIEW_*.md` | The independent review rounds and their reconciliation |
| `phase1/` | The original research, funnel diagnosis, decisions and experiment |
| `PILOT_PLAN.md` | The proposed live pilot, not authorised and not run |

## Verification state

| Check | Result |
| --- | --- |
| Test suite | 139 pass, 0 fail, `node --test`, three consecutive runs with no flakiness |
| Clean start | `npm start` from a wiped store serves the page, the API and the assets, and seeds itself. The store file is written on the first save, not on boot |
| End to end, in the browser | Open a client and read the three evidence tiers, open the check, hold a profile and confirm nothing was sent, ask the client and record an answer with the direction, the values, the firmness and the client's words, read the change log, open a confirmed deal breaker and see the reason box, read the measurement. Every screen checked with zero console errors |
| Invalid input | A duplicate client name and an empty name are both refused with a message naming the field, and no success message appears |
| Persistence | A client and a criterion created through the API survive a server restart, along with the change log, and the check uses them afterwards |
| Preference checking | Conflict, preference mismatch, contradiction, prior rejection, incomplete, untagged, uncoded history, nothing to compare against and no conflict are all exercised by the test suite and shown in the interface |
| The truth rule | A client's answer establishes a preference; accepting and rejecting write no criterion; an observation never fires a finding, never excludes a candidate and is never audited as a conflict; a confirmed rule is refused without the client's words. Covered in `test/truth.test.js` through the store and the action layer, so no other code path can bypass it |
| A held profile is not sent | The hold action writes a resolution and no share event, the row reads "Held, not sent", and the held profile never enters the measurement denominator |
| Matchmaker keeps control | Nothing is blocked, every override is logged with a reason, no criterion changes without the client's words, and the old version of a criterion is kept |
| Links and file references | Every markdown link and file reference in the repository checked, 0 broken |
| Secrets and personal data | gitleaks clean over the history, no phone numbers, no personal email addresses, no keys in tracked files |
| Screenshots | Seven, re-captured against the current build from a clean store, each with zero console errors, each inspected after capture |
| Em dashes and filler phrases | None in the public documents |
| Licence | Not added, the choice is the user's |

## Outstanding before sending

1. The user's resume, and their sign-off on it.
2. A decision on the licence, since a public repository without one defaults to all rights reserved.
3. The GitHub destination, and the user's approval to publish.
4. The user's approval to send the document and the repository link to tech@thedatecrew.com. Nothing has been sent.

## Known limitations, stated rather than hidden

- No matchmaker has been interviewed and no real client data has been seen. The prototype demonstrates the mechanism and nothing about the business.
- The 35% figure and its denominator are unconfirmed. The submission says so and gives the three readings.
- The primary outcome is measured by an automated audit that uses the same rules as the check it measures. A real pilot needs a blind human re-code of a sample to know how much the rule engine misses. This is written into the measurement model and the validation plan, and it is the single biggest caveat on the metric.
- The store is a JSON file with no concurrency control, which is fine for a local prototype and would not survive two people writing at once.
- The pilot arms are visible to the matchmaker. In a real pilot that would need to be allocated centrally and hidden, so the arm does not change the matchmaker's behaviour.
