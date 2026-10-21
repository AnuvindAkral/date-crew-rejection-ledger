# Curveball response

Anticipated hard questions and direct answers. Written to be read aloud or pasted, not to be polished into corporate language.

---

**1. "Isn't this just a CRM feature? SmartMatchApp and HoneyBee already do feedback surveys."**

The feedback survey collects a response. The Rejection Ledger does something those tools do not: it holds the client's stated preferences, their rejection history, and their later acceptances side by side, and it surfaces the *disagreement* at the moment the next profile is chosen.

A survey is backward-looking. A report is backward-looking. This is a decision made at the point of decision. The whole thing turns on one moment: the matchmaker is about to send a profile that repeats a dimension the client rejected, and the system says so, with the evidence, before the send happens.

If SmartMatchApp or HoneyBee already did that, I would have found it in their feature pages. I did not. That is an absence in their marketing, not proof they cannot do it, but it is the honest basis for calling it different.

**2. "Why not just build a ranking model? That is what everyone wants."**

Because the bottleneck is not ordering. At a 31% acceptance rate, the matchmaker is not choosing badly between acceptable candidates. They are sending profiles that should not have been sent at all. Reordering a list that contains unacceptable items does not help.

A ranking model also needs outcome labels to train on. TDC counts a match as two people meeting and wanting a second meeting, and the business outcome is marriage, six to nine months out. There are no labels to train on in a two-week window.

And the brand says it out loud: "hand-picked" against "algorithm-pushed", "by expert matchmakers" against "through AI or low-EQ relationship managers". A ranking model puts the algorithm in the middle of the thing the company sells.

**3. "Why not a client chatbot? It would be faster to just ask the client."**

The client is the person the business model exists to protect. "By absorbing the search, the mediation, the feedback" is the company's own promise. A chatbot hands the work back to the client.

There is exactly one client question in this design, and it is asked by the matchmaker in a normal check-in, not by software. That is deliberate. It keeps the human relationship intact and it means the client never has to use a second product.

**4. "What happens when there is no data? A new client has no history."**

The system says so, rather than pretending. A new client gets "no feedback yet", and an untagged candidate gets "untagged", and an uncoded rejection gets "history present but uncoded". None of those is "clean".

The failure mode the whole product is built against is treating missing information as a clean bill of health. That is a principle enforced in code and tested, not a nice-to-have.

**5. "Couldn't a matchmaker just game this? Code rejections to fresh dimensions and the metric falls."**

Yes, and that is the single most serious measurement risk. It is handled three ways. First, a blind second coder audits a sample of rejection dimensions against the verbatim free text, blind to which arm the client is in. Second, the uncoded rejection rate is a co-required number: if it rises, the metric is not interpretable. Third, the safety guardrails, shared-to-accepted and accepted-to-completed-meeting, catch the over-filtering version of gaming.

The honest answer is that no metric on human behaviour is ungameable. This one at least names its gaming path and instruments against it.

**6. "A two-week pilot cannot prove anything. Why build it?"**

Correct, and the plan says so. The two-week pilot establishes feasibility: can matchmakers capture structured reasons at an 80% rate in ten seconds, does the ledger surface genuine contradictions, does the card change a decision, does matchmaker time stay flat. Causal proof that ARCR falls needs roughly 290 clients per arm and a real, longer run.

The point of the prototype is to de-risk the measurement path before anyone spends that time and money. If the pilot shows clients' decisions never disagree with what they told us, the whole product is wrong and that is a cheap thing to learn. That is the value.

**7. "Doesn't a client rejecting a profile and later accepting a similar one just mean the client is flaky?"**

Possibly, and that is exactly why a rejection is treated as a question, never a rule. The card does not say "this client is inconsistent". It says "you confirmed you will not accept a smoker, and you later accepted someone who smokes. Those two do not agree, and only the client can say which is right."

That single question is the product. It converts noise into a settled rule with the client's own words, and then it stops asking. If the answer is genuinely "it depends", the matchmaker records "not sure" and holds, and nothing is written.

**8. "Why is the AI only a tag suggester? That feels like a cop-out."**

Because the brand already draws that line itself. Magic Link already uses AI to draft personal descriptions. So AI may draft and summarise what a person already decided. It may not decide who meets whom.

The tag suggester is the one place AI earns its keep: normalising a free-text rejection into a fixed vocabulary keeps capture at a few seconds. Everywhere else, the rules are deterministic and auditable. If someone asks me to make the AI bolder, I would ask which brand promise they want to give up first.

**9. "This is a tiny internal tool. Where is the growth?"**

The growth is in the one number the business already optimises against: the two hours a matchmaker spends searching per client per week, and the 690 rejections out of 1,000 shared profiles. If even the bounded, knowable slice of that waste, the roughly 35% rejected for already-stated reasons, stops repeating, the matchmaker's time and the client's patience both recover.

That is not a viral loop. It is the unglamorous growth a services business actually has: more introductions per matchmaker, fewer burned clients, a higher chance a success fee fires. The prototype does not claim it moves that number. The pilot is what would test it.

**10. "What would make you abandon this and pivot?"**

If the two-week pilot shows no genuine contradictions in TDC's population, the distinctive mechanism has no target and I would drop the ledger for the simpler fallback: ask, once, at the first rejection, whether a dimension is a dealbreaker or a preference. That needs no ledger and no history.

If matchmakers ignore the card, or clients report feeling processed, or a preference ever changes without the client's words, I would stop rather than ship a tool the humans in the loop do not trust.
