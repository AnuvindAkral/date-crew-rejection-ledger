# Demo script

A verified walkthrough of the actual application, about two minutes.

## Commands

```bash
node src/server.js
# or
npm start
```

Then open http://localhost:4321. Press **Reset demo** before each beat, so the store starts from the seeded synthetic data.

All data is synthetic. Every name is invented.

---

## Beat 1: the check fires before anything is sent (about 60 seconds)

This is the core idea: the matchmaker sees the conflict while they can still do something about it.

**1. Open Priya S.** Point at the Rejection ledger panel.

> "Rejected three on location or city tier, accepted one. Same dimension, opposite decisions."

**2. Send Aarav M.** The check fires before the profile goes anywhere. Point at the two panels side by side.

> "The earliest rejection, in the matchmaker's own words, next to the profile she later accepted. It asks one question: is this a dealbreaker, or a preference?"

**3. Ask the client.** Type what she said, then choose **Preference**.

> "The matchmaker asked one question in the check-in. The client said location is a preference, not a dealbreaker, as long as the person is settled about it."

**4. Send Karan D.** The check is clean.

> "The dimension is settled, so the send goes out without a prompt. Nothing was filtered automatically."

## Beat 2: the deterministic case (about 30 seconds)

**5. Open Rahul M.** His Preferences panel shows **Diet or lifestyle · confirmed dealbreaker**, quoting his own note: "Non-vegetarian is a definite no."

**6. Send Nikhil S.** The check fires a hard conflict.

> "This is the case the assessment asks about. A confirmed dealbreaker, compared to a known attribute of the candidate. No model, no interpretation, a field comparison. It still does not block the send. The matchmaker decides."

## Beat 3: nothing to compare against (about 15 seconds)

**7. Open Meera J.** and send **Sam K.**

> "No preferences on file, so the check says it has nothing to compare against. It does not say no conflict, because missing information is not agreement."

---

## Also built, a next step rather than the claim (about 30 seconds)

Press **Reset demo** first.

**8. Open Priya S.** The "Acceptance insights" panel shows one positive capture: *accepted Arjun T., Personality or temperament: "Warmer and calmer in person than his profile suggested. Location mattered less than she expected."*

**9. Send Aarav M.** The insight appears in the send review with a checkbox. Tick it and send. The measurement view reports it consulted.

> "Rejections tell the matchmaker what to avoid. This captures what a yes taught them. It is the obvious next question, but I have no evidence that matchmakers fail to capture it today, so it is a next step and not the claim."

---

## Optional: the other states (about 30 seconds each)

- **Accept** any candidate to see the debrief sheet: pick what mattered, write what surprised you.
- **Reject** any candidate to see the capture sheet. Type a reason like "not based in Bangalore, won't relocate" and watch the suggestion propose *Location or city tier*, which the matchmaker confirms.
- **Measurement** (top nav) is the operator view: session counts, Metric A and ARCR with denominators, the learning-loop metric, and the reference scenario from the assessment brief. It is for the pilot operator, not the matchmaker.

---

## What this demo does not prove

The demo shows the mechanism works. It does not claim the conflict rate falls, that completed meetings rise, or that any business metric moves. Those need the pilot in [PILOT_PLAN.md](../PILOT_PLAN.md) and the unrun interviews in [INTERVIEW_PROTOCOL.md](INTERVIEW_PROTOCOL.md), not a local prototype.
