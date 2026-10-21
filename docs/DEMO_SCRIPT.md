# Demo script

A verified walkthrough of the actual application. Five sections, twenty numbered steps, about four minutes.

## Commands

```bash
node src/server.js
# or
npm start
```

Then open http://localhost:4321. Press **Reset demo** before each section, so the store starts from the seeded synthetic data.

All data is synthetic. Every name is invented.

## Hold does not send anything

This is the one thing to get right in a demo, so it is worth being explicit before the first click.

- **Hold the profile** closes the card and sends nothing. The profile stays on the client's list and the row says **Held, not sent**. No share event is written, so it never enters the measurement.
- **Ask the client** opens the clarification sheet and sends nothing. It is a question for the matchmaker to put to the client.
- **Share this profile**, or **Share anyway** when there is a confirmed deal breaker, is the only action that sends. Sharing anyway asks for a reason, because a confirmed no going out has to be reviewable later.

Never click **Share anyway** to get past a card you are only reading. Use **Hold the profile**, and the demo sends nothing at all.

---

## Section 1: the check fires before anything is sent (about 90 seconds)

**1. Open Priya S.** The page opens on what she wants.

> "Her preferences and deal breakers are on one screen. The deal breaker first, because that is the one that stops a profile going out. Under each one it says where the evidence came from, so you can tell what she confirmed from what was noted down at intake."

**2. Look at the three groups and the "Worth resolving" box.**

> "Deal breakers, preferences, and things to check with the client, kept apart on purpose. The box says what disagrees: she confirmed she will not accept a smoker, and she later accepted one. Only she can say which is right."

**3. Send Aarav M.** The check opens before anything is sent.

> "One finding at a time, the one that needs a decision. The other two are under 'Also worth knowing', so the card does not become a wall. Here is the criterion, the client's own words, and the candidate's value."

**4. Press Hold the profile.** Nothing is sent.

> "That is how you dismiss a check you have read. The profile stays on her list and says 'Held, not sent'."

**5. Send Aarav M. again and press Ask the client.** The sheet opens with one question about one dimension.

> "It asks what the client said, in the client's words. Direction, the values, how firm it is, and their own words. It also shows what they have done before, labelled as previous decisions, because what happened is not proof of what they want."

**6. Record what she said and save.**

> "A rule is written from what she said, and the version it replaced is kept with the date it was in force. The file now shows 'Confirmed by the client' and a change log entry."

---

## Section 2: a confirmed deal breaker (about 60 seconds)

**7. Open Rahul M.** Their file shows the deal breaker in their own words.

**8. Send Nikhil S.** The check opens with one thing to check.

> "Nikhil is non-vegetarian. The client confirmed that is a no. The value comparison runs in the direction the client set, so it is the actual fact and not a proxy for it."

**9. Press Share anyway.** A reason box appears and the button changes to **Confirm and share**.

> "A confirmed no that goes out has to be reviewable later, so it asks for a line of reason. A softer mismatch does not earn that friction."

**10. Press Hold the profile** instead, so the demo does not send anything on the way through.

**11. Send Dev P.** The check says no conflicts found.

> "Dev is vegetarian and he is from a top-tier college, which is what Rahul wanted. Same dimensions, different values, the opposite answer."

---

## Section 3: what it does not know (about 45 seconds)

**12. Open Neha K.** and send **Varun J.**

> "The check says his position on children is not recorded. That is not a match and not a mismatch. It is missing information, and it says so."

**13. Send Ishita P.** from the same client.

> "She does not want children, which is a preference rather than a no, so it is worded as advice, not as a warning."

**14. Open Meera J.** and send **Sam K.**

> "Meera is in the group where the check is worked out but not shown, so she gets a plain confirmation. That is what lets the two groups be compared."

---

## Section 4: the data has a path into the product (about 60 seconds)

**15. On the client, press Check another profile.** The list shows every profile and what is known about it.

> "Nothing here is a hard-coded name. Pick one and the check runs for this client, with her preferences in view while you choose."

**16. On Profiles, press Add a profile.** Enter a name, a city, a profession, a source, and one dimension and value.

> "Only what is actually known. If you try a value that is not in the vocabulary, it is refused and it says why."

**17. On Clients, press Add a client.** Name, city, journey stage, and the matchmaker who looks after them.

**18. Open that client and press Record something the client said.** Pick a dimension, a direction, the values, and how sure it is: a pattern you noticed, what they said at intake, what they confirmed, or a no they confirmed. Add their own words.

> "Direction and firmness are recorded separately, so must be vegetarian and must not be vegetarian are opposite criteria. A confirmed rule needs what the client said, so the words go in."

---

## Section 5: what has happened (about 45 seconds)

**19. Open How it's going.**

> "Profiles sent, profiles checked before sending, potential mismatches found, profiles with missing information, and deal breaker conflicts that reached clients. Each one says what it is and how many profiles it came from. A number of zero and no data are shown differently, and a small sample says so."

**20. Open Details for the pilot operator.**

> "The measurement model underneath, and one row per profile sent, including the ones with nothing against them, so the denominator is visible. A reviewer can confirm or dispute each one, which is the stand-in for the blind human re-check a real pilot would need."

---

## What this demo does not prove

It shows the mechanism works. It does not claim the mismatch rate falls, that completed meetings rise, or that any business metric moves. Those need the pilot in [PILOT_PLAN.md](../PILOT_PLAN.md), the measurement design in [MEASUREMENT_MODEL.md](MEASUREMENT_MODEL.md), and the unrun interviews in [INTERVIEW_PROTOCOL.md](INTERVIEW_PROTOCOL.md).
