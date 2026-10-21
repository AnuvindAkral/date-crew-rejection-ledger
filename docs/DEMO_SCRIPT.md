# Demo script

A verified walkthrough of the actual application, about four minutes.

## Commands

```bash
node src/server.js
# or
npm start
```

Then open http://localhost:4321. Press **Reset demo** before each beat, so the store starts from the seeded synthetic data.

All data is synthetic. Every name is invented.

---

## Beat 1: the check fires before anything is sent (about 90 seconds)

This is the core idea: the matchmaker sees the conflict while they can still do something about it.

**1. Open Priya S.** Point at the Rejection ledger panel.

> "Rejected three on location or city tier, accepted one. Same dimension, opposite decisions."

**2. Send Aarav M.** The card fires before the profile goes anywhere.

> "Two things at once. She rejected three on location and then accepted one, so the rule and her behaviour disagree. And separately, she told us she wants the Bangalore metro, and Aarav is in Pune. It shows the mismatch as well as the contradiction, because both are facts she would want to know."

**3. Ask the client.** Pick the value the answer is about, type what she said, then choose **Preference**.

> "The matchmaker asked one question in the check-in. The client said location is a preference, not a dealbreaker, as long as the person is settled about it. The rule is written from her own words, and only then."

**4. Send Karan D.** The contradiction on location is gone. What is left says his education is unknown, which is a different and smaller point.

> "The dimension is settled, so it stops asking about location. It still tells her what it does not know."

## Beat 2: the deterministic case, and the direction of the criterion (about 60 seconds)

**5. Open Rahul M.** His criteria show **Diet or lifestyle, must not be Non-vegetarian, confirmed dealbreaker**, in his own note.

**6. Send Nikhil S.** The check fires a hard conflict.

> "Nikhil is non-vegetarian. That is a value comparison in the direction the client set, not a category comparison, so it is the actual fact and not a proxy for it."

**7. Send Dev P.** The check is clean.

> "Dev is vegetarian, and he is from a top-tier college, which is what Rahul said he wanted. Same dimensions, different values, opposite answer."

**8. Open Priya S. and press "Record what the client said".** Pick **Smoking**, pick the direction **must not be**, pick **Regular smoker**, and set the firmness to **confirmed dealbreaker**.

> "A criterion records a direction and a firmness separately, because they are separate things. Must be vegetarian and must not be vegetarian are opposite criteria, and the old version could not tell them apart. A stated preference is advice, a confirmed preference is one she confirmed, and only a confirmed dealbreaker is a no."

## Beat 3: what it does not know (about 45 seconds)

**9. Open Neha K.**

> "Neha wants children. Send Varun J. and the check says we do not have his position on children, because we do not. It does not say no conflict, because not knowing is not agreement. Send Ishita P. and it says she does not want children, which is a preference mismatch, and a preference is advice rather than a warning."

**10. Open Meera J.** and send **Sam K.**

> "Meera is on the control arm of the pilot, so the check is computed but not surfaced. She gets a plain confirmation. That is what lets the two arms be compared."

## Beat 4: the data has a path into the product (about 60 seconds)

**11. Open the Candidates view.** Every profile in the workspace, with the attributes actually known.

> "Nothing here is a hard-coded name. A candidate is a record with a value for each dimension we know, and a blank dimension means unknown rather than no."

**12. Pick a client from a dropdown and press "Check against this client".**

> "Choose a client and a profile and the same check runs, with nothing sent. This is the path a reviewer can take without reading a README first."

**13. Press "Add a candidate".** Enter a name, a city, a profession, a source, and pick a dimension and a value.

> "You only record what you actually know. If you try a value that is not in the vocabulary, it is refused and it says why."

**14. On Clients, press "Add a client".** Name, city, journey stage, and the matchmaker who looks after them.

> "A new client gets the check by default. The arms are a pilot allocation, not a reason to switch the product off, and a matchmaker who added a client and then found the check never fired would conclude the tool does nothing. The operator can move a client to the control arm from the client page."

## Beat 5: the measurement (about 60 seconds)

**15. Open the Measurement tab.**

> "The primary outcome is the proportion of all profiles shared in the period that conflicted with a criterion on the client's file at the time. It is decided by an audit, not by the card, so it does not improve when matchmakers stop using the tool. The denominator is every share, not every checked share."

**16. Point at the two tables.**

> "The baseline is before the window, and it is audited by the same process, so the two are comparable. Adoption, the share of profiles checked before sending, is on its own row, because that is the thing that can move on its own. A rate that improves while coverage collapses is not a result."

**17. Point at the audit table.**

> "One row per profile shared, including the ones with nothing against them, so the denominator is visible. A reviewer can confirm or dispute each one, and the human-confirmed rate is reported separately. In a real pilot, the automated audit would be checked against a blind human re-code of a sample."

**18. Point at the overrides.**

> "A matchmaker who overrides every warning has a tool that is not working. Sending past a warning asks for a reason, and the reason is kept, so the override is reviewable."

---

## Also built, a next step rather than the claim (about 30 seconds)

Press **Reset demo** first.

**19. Open Priya S.** The "Acceptance insights" panel shows one positive capture: *accepted Arjun T., Personality or temperament: "Warmer and calmer in person than his profile suggested. Location mattered less than she expected."*

**20. Send Aarav M.** The insight appears in the send review with a checkbox. Tick it and send. The measurement view reports it consulted.

> "Rejections tell the matchmaker what to avoid. This captures what a yes taught them. It is the obvious next question, but I have no evidence that matchmakers fail to capture it today, so it is a next step and not the claim."

---

## Optional: the other states

- **Accept** any candidate to see the debrief sheet: pick what mattered, write what surprised you.
- **Reject** any candidate to see the capture sheet. Pick a dimension and the sheet tells you what the candidate actually is on that dimension. Type a reason like "not based in Bangalore, won't relocate" and watch the suggestion propose *Location or city tier*, which the matchmaker confirms.

## What this demo does not prove

The demo shows the mechanism works. It does not claim the conflict rate falls, that completed meetings rise, or that any business metric moves. Those need the pilot in [PILOT_PLAN.md](../PILOT_PLAN.md), the measurement design in [MEASUREMENT_MODEL.md](MEASUREMENT_MODEL.md), and the unrun interviews in [INTERVIEW_PROTOCOL.md](INTERVIEW_PROTOCOL.md), not a local prototype.
