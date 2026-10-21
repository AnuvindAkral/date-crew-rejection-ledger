# Submission checklist

What the assessment brief asks for, where each item is, and what is still outstanding. Nothing is published or sent until the user approves it.

## Required by the brief

| Brief item | Where | Status |
| --- | --- | --- |
| 1. Your answers, as a document | `ASSIGNMENT_SUBMISSION.md` | Done. Part 1 is 331 words, Part 2 is 540, Part 4 is 200, in the headings the brief asks for |
| 2. Prototype: working link, screenshots or recording | `screenshots/`, run instructions in the submission and in `README.md` | Done. Seven screenshots re-captured against the current build, a local run command, and a verified walkthrough in `docs/DEMO_SCRIPT.md` |
| 3. Code, on GitHub | The repository | Ready. No remote yet, publishing on approval |
| 4. AI usage in 3 to 5 lines: tools, what for, one thing you disagreed with | `ASSIGNMENT_SUBMISSION.md`, the AI usage section | Done. Four lines, and the disagreement is a real one |
| 5. Updated resume | Not produced | Needs the user's actual resume and sign-off |

## Supporting documents

| File | Contents |
| --- | --- |
| `README.md` | The problem, the direction, the workflow, the implemented features, setup, run, test, demo |
| `docs/README.md` | The document index, and which file is the assessment of record |
| `docs/PRODUCT_THINKING.md` | The problem, the reasoning, the assumptions, what would change the direction |
| `docs/PRODUCT_DECISIONS.md` | Thirteen decisions with their trade-offs, plus the feature classification |
| `docs/DEMO_SCRIPT.md` | Verified walkthrough with exact commands and expected results |
| `docs/VALIDATION_PLAN.md` | The assumptions that need real matchmaker validation, and the proposed steps |
| `docs/AI_USAGE.md` | AI disclosure, both the assistance used in producing the work and the AI inside the product |
| `docs/PUBLISHING_AUDIT_PROMPT.md` | Reusable prompt for checking a repository before it goes public |
| `docs/SOURCING_SCORECARD_GATE.md` | Why the sourcing scorecard is excluded |
| `docs/INTERVIEW_PROTOCOL.md` | The five matchmaker conversations, prepared and unrun |
| `docs/GATE_B_*.md` | The metric definitions, experiment design, data model, decisions and sitemap from Gate B, kept as the working record |
| `docs/REVIEW_*.md` | Both independent review rounds and their reconciliation |
| `phase1/` | The original research, funnel diagnosis, decisions and experiment |
| `PILOT_PLAN.md` | The proposed live pilot, not authorised and not run |

## Verification state

| Check | Result |
| --- | --- |
| Test suite | 85 pass, 0 fail, `node --test`, three consecutive runs with no flakiness |
| Clean start | `npm start` from a wiped store serves the API, the page and the assets, and seeds itself |
| Record creation, editing and persistence | A client and a criterion created through the API survive a server restart, along with the change log, and the check uses them afterwards |
| Preference checking | Conflict, no conflict, missing information, untagged, uncoded history and preference mismatch are all exercised by the test suite and shown in the interface |
| Matchmaker keeps control | Nothing is blocked, every override is logged with the check that preceded it, and no criterion changes without the client's words |
| Links and file references | 102 checked across all markdown, 0 broken |
| Secrets and personal data | gitleaks clean over 11 commits, no phone numbers, no personal email addresses, no keys in tracked files |
| Screenshots | Seven, re-captured against the current build, each with zero console errors, and inspected |
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
- The metric's denominator is the profiles that were checked, not every profile shared. Coverage is reported beside it so a rate that improves because the tool was used less stays visible.
- The store is a JSON file with no concurrency control, which is fine for a local prototype and would not survive two people writing at once.
