# Demo script

A word-for-word run of the prototype, about 90 seconds. Start the server first (`node src/server.js`), open http://localhost:4321, and press **Reset demo** if the store has been used before.

Synthetic data only. Every name is invented.

---

## Act 1: the contradiction (about 45 seconds)

**1. Land on Clients.** Three clients: Priya S., Rahul M., Meera J. Priya's card reads "contradiction to resolve".

> Say: "Priya has been rejecting on location, but she just accepted someone on location. That disagreement is the thing the ledger exists to surface."

**2. Open Priya S.** Point at the Rejection ledger panel.

> "Rejected three on location or city tier, accepted one. The system flags the contradiction, not a rule."

**3. Send Aarav M.** The card fires in the contradiction state. Point at the two panels side by side.

> "The earliest rejection, in the matchmaker's own words, next to the profile she later accepted. Same dimension, opposite decisions."

**4. Ask the client.** Type what she said, then choose **Preference**.

> "The matchmaker asked one question in the check-in. The client said location is a preference, not a dealbreaker, as long as the person is settled about it."

## Act 2: the settled send (about 30 seconds)

**5. Back on Priya's ledger.** Location now reads "Client-confirmed: preference".

> "Only the client's answer wrote that rule. Nothing was changed silently."

**6. Send Karan D.** The card fires clean.

> "Two weeks ago this same candidate would have prompted a contradiction. Now the dimension is settled, and the send goes out without a prompt."

**Stop here.** This is the point. The intervention did not filter anyone out. It turned a repeated contradiction into a settled question, then stopped asking.

---

## Optional: the other states (about 30 seconds each)

- **Rahul M.** shows a confirmed dealbreaker. Send **Nikhil S.** and the deterministic conflict card fires on *Diet or lifestyle*, quoting the client's own note. Send **Dev P.** for a clean send, and **Siddharth B.** for the untagged state, which is never shown as compatible.
- **Meera J.** has no feedback yet. Send **Sam K.** and the card says so rather than implying a clean bill of health.
- **Reject** any candidate to see the capture sheet. Type a reason like "not based in Bangalore, won't relocate" and watch the suggestion propose *Location or city tier*, which the matchmaker confirms.
- **Measurement** (top nav) is the operator view: session counts, Metric A and ARCR with denominators, and the reference scenario from the assessment brief. It is for the pilot operator, not the matchmaker.

---

## What to say about what the demo does not prove

The demo shows the mechanism works. It does not claim ARCR falls, that completed meetings rise, or that any business metric moves. Those need the pilot in `PILOT_PLAN.md`, not a local prototype.
