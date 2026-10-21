# Submission checklist

What the assessment brief asks for, where each item is, and what is still outstanding. Nothing is published or sent until the user approves it.

## Required by the brief

| Brief item | Where | Status |
| --- | --- | --- |
| 1. Your answers, as a document | `ASSIGNMENT_SUBMISSION.md` | Done. Part 1 about 300 words, Part 2 about 500, Part 4 at 200, in the headings the brief asks for |
| 2. Prototype: working link, screenshots or recording | `screenshots/`, run instructions in the submission and in `README.md` | Done. Four screenshots, a local run command, and a verified walkthrough in `docs/DEMO_SCRIPT.md` |
| 3. Code, on GitHub | The repository | Ready. No remote yet, publishing on approval |
| 4. AI usage in 3 to 5 lines: tools, what for, one thing you disagreed with | `ASSIGNMENT_SUBMISSION.md`, the AI usage section | Done. Four lines, and the disagreement is a real one |
| 5. Updated resume | Not produced | Needs the user's actual resume and sign-off |

## Supporting documents

| File | Contents |
| --- | --- |
| `README.md` | The story, the implemented features, setup, run, test, demo |
| `docs/PRODUCT_THINKING.md` | The problem, the reasoning, the assumptions, what would change the direction |
| `docs/PRODUCT_DECISIONS.md` | Ten decisions, each with its trade-off and the rejected alternative |
| `docs/DEMO_SCRIPT.md` | Verified walkthrough with exact commands and expected results |
| `docs/VALIDATION_PLAN.md` | Seven assumptions needing real matchmaker validation, and the proposed steps |
| `docs/AI_USAGE.md` | AI disclosure, both the assistance used in producing the work and the AI inside the product |
| `docs/PUBLISHING_AUDIT_PROMPT.md` | Reusable prompt for checking a repository before it goes public |
| `docs/SOURCING_SCORECARD_GATE.md` | Why the sourcing scorecard is excluded |
| `docs/INTERVIEW_PROTOCOL.md` | The five matchmaker conversations, prepared and unrun |
| `docs/GATE_B_*.md` | The metric definitions, experiment design, data model, decisions, and sitemap from Gate B |
| `docs/REVIEW_*.md` | Both independent review rounds and their reconciliation |
| `phase1/` | The original research, funnel diagnosis, decisions and experiment |
| `PILOT_PLAN.md` | The proposed live pilot, not authorised and not run |

## Verification state

| Check | Result |
| --- | --- |
| Test suite | 43 pass, 0 fail, `node --test` |
| Links and file references | 64 checked, all resolve |
| Secrets and personal data | gitleaks clean, no identifiers in tracked files |
| Screenshots | Re-captured against the current build and checked against the demo script |
| Em dashes and filler phrases | None in the public documents |
| Licence | Not added, the choice is the user's |

## Outstanding before sending

1. The user's resume, and their sign-off on it.
2. A decision on the licence, since a public repository without one defaults to all rights reserved.
3. The GitHub destination, and the user's approval to publish.
4. The user's approval to send the document and the repository link to tech@thedatecrew.com. Nothing has been sent.
