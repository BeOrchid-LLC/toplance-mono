# Toplance — the traveller concourse (plan 2)

Implements step 3 of `2026-09-09-wayfinding-redesign-design.md` §9. That spec is
the contract; where this document and it disagree, it is right and this one
needs correcting.

Decided 2026-09-09, after the foundation landed (Tasks 1–9 of
`2026-09-09-wayfinding-foundation.md`).

## Scope

**Narrow, deliberately.** The route diagram and the dashboard that carries it,
and nothing else:

| In | Why |
|---|---|
| `src/lib/domain/route.ts` (new) | the stage derivation, as a pure function |
| `src/lib/domain/route.test.ts` (new) | the sent-back case is the thing that can be wrong |
| `src/components/app/route-diagram.tsx` (new) | the device |
| `src/app/[locale]/(app)/app/(corridor)/page.tsx` | the dashboard rebuild |
| `src/components/app/corridor-header.tsx` | §4.6 cleanup, and it heads the same screen |
| `src/lib/i18n/dashboard.ts`, `corridor-header.ts` | stage labels and decision copy, ×10 locales |

Explicitly **out**: requirements, documents, companion, intake, messages,
profile. Those are 2,382 lines of pages plus a 1,018-line intake component, and
they get their own plan.

The narrowness is the point. The parent spec's §10 says: *"If the wayfinding
direction does not land on the traveller surface at step 3, stopping and
keeping the old traveller treatment is a legitimate outcome, not a failure."*
This plan buys that judgement for one session rather than five. **The decision
to carry on is taken after this lands, by looking at it.**

## 1. The route diagram

The one device specific to this product: you are at a known point on a corridor
between two jurisdictions. §3 of the parent spec spends the boldness here, and
demotes the large plate carrying a headline number to support.

### It is the masthead

Order on the dashboard, top to bottom:

```
┌────────────────────────────────────┐
│ Your route                         │  ← the diagram, full width
│ Started ─▸ Intake ─▸ Docs ─▸ Sent  │
│                      ▲ you are here│
├────────────────────────────────────┤
│ [ attendance notice, when present ]│
├────────────────────────────────────┤
│ Next                               │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  ← the one --way object
│ ┃ Upload your bank statements    ┃ │
│ ┃ 3 of 11 documents left         ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
├────────────────────────────────────┤
│ [ status + handler ] [ trip … ]    │  ← the existing 1fr/360px grid
└────────────────────────────────────┘
```

`AttendanceNotice` keeps its place above the next action. Its comment earns it —
*"the only message here whose cost of being missed is a missed appointment"* —
and the diagram sits above it as orientation rather than as an alert, so that
invariant survives.

### The derivation is a pure function, not a component

```ts
// src/lib/domain/route.ts
export type RouteStageState = "reached" | "current" | "returned" | "ahead";

export type RouteStage = {
  key: string;                            // a FUNNEL_STAGES key
  state: RouteStageState;
  outcome?: "granted" | "refused";        // set on `decided` only
};

export function routeOf(facts: ApplicationFacts): RouteStage[];
```

`ApplicationFacts` already carries `status` alongside the timestamps, so this
takes one argument.

It returns **stage keys and states, never labels.** Labels are looked up per
locale in the component, which keeps the domain free of i18n and lets one
function serve all ten locales.

This lives in `src/lib/domain/` because there is no component-test
infrastructure — `vitest.config.mts` is `environment: "node"`,
`include: ["src/**/*.test.ts"]` — and the handoff forbids adding jsdom as part
of this redesign. Putting the logic here makes the part that can actually be
wrong testable next to `kpis.test.ts`.

### Two independent derivations

This is the whole trick, and the reason the naive version is wrong.

**The lit set** is `FUNNEL_STAGES[i].reached(facts)`, reused unchanged from
`kpis.ts`. The stage timestamps — `checklistCompleteAt`, `submittedAt`,
`decidedAt` — are **never cleared** anywhere in the codebase; the only nulls are
test fixtures. That property makes `reached()` already a high-water mark, which
is exactly what is wanted.

**The marker** is derived separately. The rules are evaluated **in this order**,
and the first match wins — the ordering is load-bearing, because a `draft`
application also has `intakeComplete === false` and the two rules would
otherwise both apply:

| # | test | marker sits on |
|---|---|---|
| 1 | `intakeComplete === false` | `intake` |
| 2 | `draft`, `collecting_documents`, `additional_documents` | `collected` |
| 3 | `submitted`, `under_review`, `processing` | `submitted` |
| 4 | `approved`, `rejected` | `decided`, with `outcome` |

`started` is therefore never the marker, only ever lit. That is honest: if
there is a dashboard to look at, you have started, and "Started" is a milestone
passed instantly rather than a place to stand. The function stays total — every
combination of the five `ApplicationFacts` fields lands on exactly one rule.

**`returned` is computed, not stored:** the marker's index is less than the
highest lit index. That single comparison is the sent-back case. It needs no new
column and no migration.

Deriving both from one source is what fails. A traveller sent back for more
documents still has `submittedAt` set, so `reached()` alone lights **Sent** while
the plate directly beneath says *"upload your bank statements"* — two devices
contradicting each other on one screen. Deriving from `status` alone fails the
other way: `additional_documents` says nothing about having submitted, so the
diagram would erase a submission that really happened. Guideline §7 (data
honesty, kept intact by the parent spec) cuts both ways.

### Stages and labels

Keys stay `FUNNEL_STAGES`': `started · intake · collected · submitted · decided`.

The traveller gets **its own localised labels keyed to those keys** — "Started ·
Intake · Documents · Sent · Granted/Refused" — so the agency console keeps
"Finished intake" and "Documents complete" without either surface pulling the
other's wording. One definition of the journey, two vocabularies.

### The decision stage

`decided` splits by outcome and takes colour, because §4.1 is that colour
classifies and an outcome is the definition of a classification:

| outcome | token | note |
|---|---|---|
| granted | `--success` | carries the parent spec's `--clear` value |
| refused | `--danger` | carries the parent spec's `--stop` value |

**The token names are `--success` and `--danger`, not `--clear` and `--stop`.**
The parent spec §1 names the roles `--clear`/`--stop`; the code kept the
existing identifiers and changed their values, per the handoff's settled
decision that only `--way`, `--way-ink` and `--ring` are new names. This matches
`STATUS_VARIANT`, which already maps `approved → success` and
`rejected → danger`.

The traveller dashboard has **no decision copy today** — `dashboard.ts` has no
approved/rejected keys, so an outcome currently reaches the traveller only as a
status badge. This is new copy in all ten locales.

## 2. The dashboard

**`CompletionRing` comes out of the dashboard.** The diagram already says how far
along you are, and a ring beside it is the same fact twice.

It is **not deleted.** `documents/page.tsx` also renders it and that screen is out
of scope; removing the file would reach into a page this plan does not own.
It stays in the tree, unused by the dashboard, and its removal belongs to
whichever plan takes the documents screen. One unused component is a smaller
problem than an out-of-scope edit.

**The left panel becomes the plate.** The state-dependent heading, body and CTA
stay and become the single `--way` object on the screen — §4.1 allows exactly
one, and this is it. `Button` already has the `way` variant from foundation
Task 6, so the primitive exists.

**The status panel stays.** It looks redundant beside the diagram, but the
diagram deliberately collapses `submitted`, `under_review` and `processing` into
one "Sent" stage. The badge is where that precision lives, along with the
handler and the message CTAs.

## 3. §4.6 and §4.2 enforcement

Three violations sit in the two files this plan touches. All three are fixed
here; the other six files wait for their own plan.

| Violation | Where | Becomes |
|---|---|---|
| ` · `-joined meta string | `corridor-header.tsx:65` (`visaName · purpose`) | two elements, purpose on its own line |
| ` · `-joined meta string | `corridor-header.tsx:84` (`NG → GB · PURPOSE`) | the pair and the purpose separated structurally |
| caps eyebrow `className="tag"` | `corridor-header.tsx` | sentence-case label |
| `<ArrowRight />` on CTAs | `(corridor)/page.tsx` | removed |

**The spec argues with itself here and the prose wins.** §3's own sketch draws
`NG → GB · Work`, which §4.6 bans in the same document. §4.2 is unambiguous and
unqualified — *"Never appended to a button or link label"* — so the arrow icons
go too. A sketch is a sketch; the rule is the rule.

The corridor pair's `→` **stays**. §4.2 permits arrows exactly where they carry
meaning: "route diagrams and corridor pairs (`NG → GB`)". That is this.

## 4. Motion, RTL, small screens

**The diagram ships static.** §5 wants it to advance when a stage completes,
explicitly not on page load. Two things prevent that here. A server-rendered
page cannot distinguish "first paint after advancing" from "revisiting the
page" without client state; and, more decisively, **nothing on the dashboard
advances a stage** — stages advance on the documents screen and at submit, both
out of scope. A mount animation would therefore fire on every visit, which is
the exact behaviour §5 forbids.

The advance lands with the plan that owns the screens where advances happen.
The rejected alternative was `sessionStorage` remembering the last-seen stage
index: real, but it puts per-viewer client state into a server component to
animate a change the traveller made somewhere else.

**RTL.** The connector arrows point the way of travel, so they mirror:
`Started ─▸ Intake` becomes `Intake ◂─ Started`. This is the one glyph in the
component that cannot be a static character and needs a logical-direction
treatment. Everything else is start-aligned and mirrors for free.

**390px.** Five stages with labels do not fit one row at 390px. Vertical stack
below `sm`, horizontal from `sm` up — which mirrors trivially and matches how
order-tracking reads on a phone.

**Reduced motion** is already handled in the base layer by collapsing durations
to 0.001ms with `both` fill. Since the diagram ships static this costs nothing
now, but any advance added later must end in its resting state.

## 5. Testing

`src/lib/domain/route.test.ts` covers `routeOf`:

- the sent-back case — `additional_documents` with `submittedAt` set puts the
  marker behind the high-water mark and yields `returned`
- both terminal outcomes, and that `outcome` is set only on `decided`
- pre-intake (`intakeComplete === false`) regardless of other timestamps
- `collecting_documents` before `checklistCompleteAt`
- that the lit set is never non-monotonic

Rendering is verified in the browser at both themes and 390px. Per the
handoff, focus and layout are read from `getComputedStyle` in a headless
Chromium, never from the CSS source — and note that **every local route
redirects to `/sign-in` without a session**, so signing in comes first.

The existing contrast guard rail (`tokens.test.ts`) already covers the tokens
this uses; no new pair is introduced.

## 6. Decisions taken

| Decision | Alternative rejected | Why |
|---|---|---|
| Diagram is the masthead, plate below | plate first, per the sketch's literal order | §3's annotation is explicit that the diagram, not the plate, is the hero |
| `CompletionRing` retired from the dashboard | keep both | the same fact twice; §3 demotes the headline number by name |
| High-water mark + returned marker | current-position-only; monotonic reuse | tells both truths; the alternatives each erase one of them |
| Fifth stage, coloured by outcome | neutral fifth stage; stop at Sent | §4.1 — colour classifies, and an outcome is a classification |
| Reuse `FUNNEL_STAGES` | a traveller-specific stage module | one journey definition; `travellerNav`'s docblock records what drift cost last time |
| Narrow scope | all seven screens | buys §10's judgement point for one session |
| Static diagram | `sessionStorage`; animate on mount | no stage completes on this screen |

## 7. Deferred

- **The advance animation** — with the plan that owns documents and submit.
- **`CompletionRing`'s deletion** — with the plan that owns the documents screen.
- **The other six traveller screens**, and the §4.6 sweep of the **seven**
  remaining files that carry caps eyebrows: `profile/page.tsx`,
  `requirements/page.tsx`, `intake-record.tsx`, `account-menu.tsx`,
  `completion-ring.tsx`, `profile-fields.tsx`, `intake-agent.tsx`. (Eight carry
  them today; `corridor-header.tsx` is fixed here.)
- **The parent spec's §3 sketch** still draws a banned ` · `. Correcting it was
  offered and not taken; recorded here so the next reader knows it is known.
