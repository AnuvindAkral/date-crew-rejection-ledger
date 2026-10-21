# Submission checklist

What goes out, what is done, and what is still pending. Nothing is published until this is checked and the user approves external sharing (Gate F).

## Ready to submit

| Item | File | Status |
| --- | --- | --- |
| Research and source register | `phase1/RESEARCH.md` | Done |
| Funnel diagnosis and decisions | `phase1/DECISIONS.md` | Done |
| Experiment design | `phase1/EXPERIMENT.md` | Done, superseded by `docs/GATE_B_EXPERIMENT.md` |
| Sitemap | `phase1/SITEMAP.md` | Done, superseded by `docs/GATE_B_SITEMAP.md` |
| Metric definitions | `docs/GATE_B_METRICS.md` | Done |
| Revised experiment | `docs/GATE_B_EXPERIMENT.md` | Done |
| Data model and rules | `docs/GATE_B_DATA_MODEL.md` | Done |
| Decisions and trade-offs | `docs/GATE_B_DECISIONS.md` | Done |
| Independent review, round 1 | `docs/REVIEW_BRIEF.md`, `docs/REVIEW_FINDINGS.md` | Done |
| Working prototype | `src/` | Done, 31 tests pass |
| Tests | `test/` | Done, `node --test` |
| Run instructions | `README.md` | Done |
| Demo script | `DEMO_SCRIPT.md` | Done |
| Pilot plan | `PILOT_PLAN.md` | Done |
| Screenshots | `screenshots/` | Captured, unverified visually by this agent |
| Curveball response | `docs/CURVEBALL_RESPONSE.md` | Done |
| AI usage explanation | `docs/AI_USAGE.md` | Done |
| This checklist | `docs/SUBMISSION_CHECKLIST.md` | Done |

## Pending

| Item | Why pending |
| --- | --- |
| Resume | Not updated by this agent. There is a resume file in the user's Documents, but the instruction is not to invent or claim a resume update. Needs the user's actual resume and sign-off |
| Final assessment draft (one-page executive summary for the hiring team) | Not yet produced. This is the last assembly step and should be written only after the above is approved |
| External sharing, deployment, publishing, email | Blocked on Gate F approval. Nothing is deployed, no remote exists |

## The exact 90-second demo

1. Open http://localhost:4321. Land on Clients.
2. Open **Priya S.** The ledger shows a contradiction on *Location or city tier*: rejected 3, accepted 1.
3. Send **Aarav M.** The card fires: contradiction, with the rejected and accepted profiles side by side, and a "Supports sending" strip showing *stated preference: Location* and *accepted before: Arjun T.*
4. **Ask the client**, type the client's words ("Location is a preference, not a dealbreaker, as long as they're settled about it"), choose **Preference**. The share proceeds and the dimension becomes a confirmed preference.
5. Send **Karan D.** The card fires clean. No prompt.

Point at step 5. The intervention did not filter anyone out. It turned a repeated contradiction into a settled question, then stopped asking.

## Run and test commands

```bash
node src/server.js   # http://localhost:4321
node --test          # 31 tests
```

## What the demo does and does not claim

It demonstrates the mechanism. It does not claim ARCR falls, that completed meetings rise, or that any business metric moves. Those need the pilot in `PILOT_PLAN.md`, not a local prototype.
