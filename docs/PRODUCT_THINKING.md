# Product thinking

The reasoning behind the approach, written out so a reader can follow why the product took the shape it did.

## The starting observation

A matchmaker's most valuable information is also its most fragile. When a client rejects a profile, the reason they give is a strong signal about what they actually want, often stronger than what they said during onboarding. But it arrives as free text inside a conversation, and it is not stored anywhere it can be used again. The next time the matchmaker searches for profiles, or a colleague takes over the case, that reason is gone.

The founder of The Date Crew has made this point herself: she learns little from the onboarding call and far more from the reasons a client rejects. The signal is not in doubt. The problem is that it evaporates.

## The second observation

Rejection is only half the signal, and the weaker half for one specific reason. When a client rejects, they are usually avoiding something: a label, a city, a degree. When a client accepts, they are choosing something, and the research on mate preferences is consistent that stated preferences predict avoidance more reliably than attraction. A product built only on rejections teaches the matchmaker what to avoid, not what to find.

The yes is rarer and cleaner. Nobody was capturing why a client said yes.

## Why these two pieces specifically

The ledger answers "what has this client already told us, and what should I remember before I send the next profile." The debrief answers "what did their yes teach us that the rejection history cannot."

They share one rule: neither one decides. A confirmed dealbreaker is handled deterministically, but everything else is surfaced as evidence and left to the matchmaker. The reason is that choosing who meets whom is the thing The Date Crew sells, and a product that automates it would be selling something else.

## The assumptions this rests on

1. The reject-then-accept pattern, a client rejecting on a dimension and later accepting on it, exists in TDC's population. It comes from the supplied brief and the founder's writing, and it has not been measured.
2. Acceptance carries information that rejection does not. This is the debrief's whole premise, and it is unproven.
3. The debrief fits a real matchmaker's workflow without adding admin. A feature that becomes another form to fill will fail in practice regardless of how well it is designed.

## What would change the direction

The five-conversation interview protocol in `docs/INTERVIEW_PROTOCOL.md` is the cheap test. If those conversations show that acceptance is not informative, the debrief is solving the wrong problem and the fix is surfacing existing information rather than capturing new information. If they show the information is already captured but not consulted, then capture is not the bottleneck at all. If the reject-then-accept pattern turns out not to exist, the contradiction card has no target and should go. If channel is not a meaningful axis to matchmakers, the sourcing scorecard stays excluded for good rather than being revisited.

Each of these is a finding that would change the product. None of them is hidden in the submission.

## What I deliberately did not build

An earlier version of this work proposed showing clients their own rejection history and asking whether the next objection was about the profile or the person. It was attractive, and it was wrong. The mechanism already existed matchmaker-side, so the only new part was moving it into the client's hands, where it risked reading as the service doubting a client with a firm boundary. The reasoning is in `docs/PRODUCT_DECISIONS.md` and the red-team findings are in `docs/REVIEW_FINDINGS_PROTOTYPE.md`.

A compatibility score, an opaque ranking, and an automatic rejection list were all rejected for the same reason: they would put a model where the brand says a human must be, and they would be unmeasurable until outcome labels exist, which for this business means a year or more.
