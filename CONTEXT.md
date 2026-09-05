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
_Avoid_: Route, lane, country pair

**Application**:
One traveller's visa case, from intake to decision. Exactly one per traveller.
_Avoid_: Case (staff-facing UI only), submission, request

**Traveller**:
The person applying. Spelled with two l's in prose and in code; the database
column is `traveler_id`, which is a legacy spelling rather than a second concept.
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
