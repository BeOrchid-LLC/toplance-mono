# Toplance

A visa application product: a traveller answers an AI intake, uploads what their
route requires, staff review and decide, and the product keeps working for them
after they land.

This file is a glossary and nothing else. It records the words this domain has
settled on — not how anything is built, and not decisions, which live in
`docs/adr/`.

## Language

**Corridor**:
One nationality, one destination and one travel purpose, together with the visa
that combination requires. Versioned, so a rule set can be superseded without
losing what an in-flight application was told.

The word is **code-side only**. Every screen — the traveller's app, the agency
console and `/ops` alike — calls it a **route**, because a traveller runs
several trips through this product over time and "corridor" reads as a fixed
thing they are assigned to. The client asked for this on 2026-09-01. Tables,
columns, types, files and analytics events keep `corridor`: renaming those is
BeOrchid Core work, not a copy change.
_Avoid_: Lane, country pair. "Route" in code; "corridor" in a sentence a user
reads.

**Conditional requirement**:
A document only some travellers on a route need. It carries a *rule* —
clauses against the intake answers, in `corridor_requirements.applies_when`
— and the rule is what lets the checklist say "this is yours" instead of
"this might be". A conditional requirement with no rule yet keeps the
hedge; that is a gap to close, not a third kind of document.
_Avoid_: Optional (it is not optional for the traveller it applies to)

**Application**:
One traveller's visa case, from intake to decision. Exactly one per traveller.
_Avoid_: Case (staff-facing UI only), submission, request

**Traveller**:
The person applying. Two l's in code, comments and documents like this one; the
US **traveler** in every string a user reads, which the client asked for on
2026-09-01 and which the `traveler_id` column happened to be using already.
`travelling` follows it to `traveling` in copy, but the rest of the product's
British spelling does not move — it is still `organisations`, and copy still
says "prioritised".
_Avoid_: User, applicant, customer

## Travel advice

**Advisory**:
A safety document a government publishes about a destination, quoted and
attributed, never restated in this product's own words. One per source, kept
separate: an FCDO advisory and a State Department advisory about the same
country are two advisories, not one merged view.
_Avoid_: Warning, safety notice

**Alert**:
The message this product sends a traveller because an advisory moved. An
advisory is the government's; an alert is ours. A traveller can be shown an
advisory without ever being alerted about it — the first sighting always is.
_Avoid_: Notification (that is the delivery mechanism, not this)

## Visa expiry

Two day-counts that are not interchangeable. Conflating them put a wrong number
in a traveller's inbox once already.

**Threshold days**:
Which of the three expiry notices is being sent — 60, 30 or 7. A band, used to
decide whether a notice is owed and to recognise one already sent. Never shown
to a traveller.
_Avoid_: Days out, notice period

**Days remaining**:
Whole days between today and the traveller's expiry date. The true count, and
the only one any wording may use.
_Avoid_: Days out, days left (in code)
