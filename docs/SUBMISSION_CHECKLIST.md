# Submission checklist

What goes out, what is done, and what is still pending. Nothing is published until this is checked and the user approves external sharing (Gate F).

## Ready to submit

| Item | File | Status |
| --- | --- | --- |
| Research and source register | `phase1/RESEARCH.md` | Done |
| Funnel diagnosis and decisions | `phase1/DECISIONS.md` | Done |
| Metric definitions and experiment | `docs/GATE_B_METRICS.md`, `docs/GATE_B_EXPERIMENT.md` | Done |
| Data model and rules | `docs/GATE_B_DATA_MODEL.md` | Done |
| Decisions and trade-offs | `docs/GATE_B_DECISIONS.md` | Done |
| Independent reviews, both rounds | `docs/REVIEW_FINDINGS.md`, `docs/REVIEW_FINDINGS_PROTOTYPE.md` | Done |
| Working prototype | `src/` | Done, 40 tests pass |
| Tests | `test/` | Done, `node --test` |
| Run instructions | `README.md` | Done |
| Demo script | `DEMO_SCRIPT.md` | Done |
| Pilot plan | `PILOT_PLAN.md` | Done |
| Interview protocol (validation plan) | `docs/INTERVIEW_PROTOCOL.md` | Prepared, unrun |
| Scorecard exclusion note | `docs/SOURCING_SCORECARD_GATE.md` | Done |
| Curveball response | `docs/CURVEBALL_RESPONSE.md` | Done |
| AI usage explanation | `docs/AI_USAGE.md` | Done |
| Canonical submission response | `ASSESSMENT_NARRATIVE.md` | Done. The primary answer; everything else in the repo is supporting detail |
| Screenshots | `screenshots/` | Captured, unverified visually by this agent |
| This checklist | `docs/SUBMISSION_CHECKLIST.md` | Done |

## Pending

| Item | Why pending |
| --- | --- |
| Resume | Not updated by this agent. A resume file exists in the user's Documents, but the instruction is not to invent or claim a resume update. Needs the user's actual resume and sign-off |
| External sharing, deployment, publishing, email | Blocked on Gate F approval. Nothing is deployed, no remote exists |

## Run and test commands

```bash
node src/server.js   # http://localhost:4321
node --test          # 40 tests
```

## The demo, in two beats

**Beat 1, the ledger.** Open Priya S. The ledger shows a contradiction on *Location or city tier*: rejected 3, accepted 1. Send Aarav M. and the card fires with both sides side by side and a "Supports sending" strip. Ask the client, type her words, answer Preference, and the dimension settles. Send Karan D. and the card fires clean.

**Beat 2, the debrief.** Priya's acceptance insight from Arjun T. ("warmer in person, location mattered less") surfaces at the next send with a checkbox. Tick it and send. Measurement reports 1 / 1 consulted.

The word-for-word script is in `DEMO_SCRIPT.md`.

## What the demo does and does not claim

It demonstrates the mechanism works technically. It does not claim the debrief improves matching, that ARCR falls, that completed meetings rise, or that any business metric moves. Those need the pilot in `PILOT_PLAN.md` and the unrun interviews in `docs/INTERVIEW_PROTOCOL.md`, not a local prototype.
