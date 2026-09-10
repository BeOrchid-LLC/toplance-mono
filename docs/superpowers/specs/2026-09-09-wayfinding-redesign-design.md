# Toplance — the wayfinding redesign

Supersedes `2026-08-24-design-guideline.md` §§1–6 and §9. Keeps §7 (data
honesty), §10 (quality floor, corrected below), §11 (voice) intact and
unchanged — those are product ethics, not visual language, and code cites
them by number.

Decided 2026-09-09. The user asked for a full replacement of the visual
language across all three surfaces, chose the wayfinding direction from three
proposals, and reaffirmed the scope after being shown what it reverses.

## Why

The product already had a distinctive visual language — the passport as a
physical object: `laminate` (polycarbonate over a refracting ground),
`ovi-edge` (the optically-variable hairline), `security-paper`, the MRZ mark,
Archivo at 88% width. It was good, and it stopped at the traveller's door.

Measured on 2026-09-09:

| Utility | Traveller + marketing | Agency console | Ops console |
|---|---|---|---|
| `laminate` | throughout | 2 of 12 pages | 2 of 13 pages, both via `CounterRow` |
| `security-paper` | 8 surfaces | 0 | 1 (`kyb/[id]`) |
| `ovi-edge` | 4 (intake) | 0 | 0 |
| `nav-label` | site + app nav | 0 | 0 |

`Panel`'s own comment explains how: *"matte on purpose — the laminate in the
corridor header is the only glass on any screen, and these cards are the ground
it reads against."* That rule was written for the traveller's dossier, where
there is glass to read against. The consoles inherited the matte and never got
the glass. They have the restraint half of the system and none of the identity
half — which is why the operator screens read as a generic admin template.

The two consoles are where BeOrchid's staff and every paying agency spend their
working day. The surface with the weakest identity is the one with the highest
hours-per-user.

## The grounding idea

Airport and transit **wayfinding** — the system, not the ornament. Signs are
plates on a ground; colour classifies destination rather than decorating;
direction is information; and you are only ever shown the next decision.

It is the one idea that serves all three audiences from the same source,
because all three are looking at the same corridor from different ends:

| Surface | Wayfinding artefact | Its job |
|---|---|---|
| Traveller | the concourse sign | one decision at a time, the next step marked |
| Agency | the departure board | dense status rows, sorted by what needs a human |
| Ops | the dispatch desk | the board, plus the instruments that set it |

The codebase already thinks in corridors — `LIVE_CORRIDORS`, `corridor-bar`,
`corridor-header`, `funnelOf`. This names what was already there.

## 1. Colour

Six named values plus two reserved status colours. Wayfinding colour
classifies; Schiphol's rule is that one colour means *the way to your flight*
and everything else recedes.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--concourse` | `#E7EBEA` | `#0A141B` | the ground; cool grey with a faint green cast |
| `--plate` | `#FFFFFF` | `#132029` | the sign face — solid, hard-edged, sitting *on* the concourse |
| `--plate-2` | `#F1F4F3` | `#1B2B36` | secondary plate: table heads, insets |
| `--ink` | `#0B1F2A` | `#E8EDEC` | signage ink — a real hue, not a tinted near-black |
| `--ink-2` | `#44565F` | `#A3B1B8` | secondary text |
| `--ink-3` | `#697980` | `#7A8B93` | muted text; still clears 4.5:1 |
| `--border` | `#D3DAD9` | `#2B3A44` | hairline |
| `--border-strong` | `#8E9695` | `#5D6C75` | a real edge; clears 3:1 as a non-text boundary |
| `--route` | `#0A4EA3` | `#4C8FE0` | the system colour — navigation, links, primary action |
| `--way` | `#F5B915` | `#F5B915` | **direction.** The next step, and nothing else |
| `--clear` | `#00713C` | `#2FA968` | granted / verified |
| `--stop` | `#C8102E` | `#E4574C` | refused / expired |

**`--way` is a fill, never type.** It carries `--ink` (light) on it in both
modes and never appears as text on a plate — it cannot clear contrast that way,
and using it as a field is what real signage does.

**Validated, not asserted.** All 30 foreground/background pairs clear WCAG in
both modes; text pairs at 4.5:1, non-text boundaries at 3:1, hairlines at 1.4:1.
`--ink-3`, `--border-strong` (both modes) and dark `--border` were solved
numerically against their surfaces rather than picked by eye. Re-run before any
palette edit.

Dark is **selected, not flipped** — it is the night concourse, with its own
steps validated against its own ground.

### The two-brand axis survives

`[data-brand="toplance"]` and `[data-brand="beorchid"]` stay. `--route` and
`--way` are the brand axis; `--concourse`, `--plate` and the ink ramp are
shared. BeOrchid's own `--route`/`--way` pair is deferred until that product
needs it, and gets the same validation run.

### Chart colour

The funnel ramp added earlier on 2026-09-09 is derived from the old brand hue
(264.5°) and must be re-derived on `--route`'s hue and re-validated against the
new `--plate` in both modes. Same method: an ordinal ramp, one hue, monotone
lightness, light end clearing 2:1.

## 2. Type

Three families, one of them new. Every face self-hosted and vendored into
`src/app/fonts/` — no third-party request from a browser handling identity
documents, and no round trip to `fonts.gstatic.com` on a slow in-market
connection.

| Face | Role | Subsets needed |
|---|---|---|
| **Archivo** (already vendored) | signage: page titles, rail rows, board column heads, plate labels, corridor bar. Held at 75–88% on its `wdth` axis | latin, latin-ext, vietnamese |
| **IBM Plex Sans** (new) | everything read as language: body, forms, help, chat | latin, latin-ext, vietnamese, **arabic** |
| **IBM Plex Mono** (new) | everything a machine assigned: MRZ, document and case numbers, board rows, timestamps, counts | latin, latin-ext |

Replaces Inter and JetBrains Mono. Inter is the neutral default and reads as
one; Plex is institutional by design, which is the right register for a border
product, and carries more character at the 16px floor.

**`latin-ext` and `vietnamese` are not optional.** Hausa needs ƙ/ɓ/ɗ from
`latin-ext`; Yoruba's ẹ/ọ and Igbo's ị/ụ live in the `vietnamese` subset. A
headline that falls back mid-word is worse than not using the face.

### Arabic — an existing gap this closes

`ar` is a live RTL locale. Inter, Archivo and JetBrains have **no Arabic
between them**, so every Arabic reader currently gets OS fallback with metrics
matching nothing else in the product. This was not recorded anywhere.

**IBM Plex Sans Arabic** closes it with a face from the same family. Archivo
has no Arabic, so under `ar` the signage role falls back to Plex Sans Arabic at
a heavier weight — the width axis is a Latin device and does not transfer.

### The fence

Guideline §2 holds a fence between `.t-*` (Inter, product screens) and
`.d-*`/`.tag` (Archivo/JetBrains, marketing), and says: **"This fence is
client-locked. Do not move it."**

**This redesign moves it.** Archivo becomes the signage role on every surface,
including product screens. That is the direction's central move — the consoles
are mute precisely because the identity face was fenced out of them.

> **Needs the client's word, not just ours.** The user approved the redesign.
> "Client-locked" names a different authority. This item ships only once the
> client has agreed in writing; everything else in this spec is independent of
> it and can proceed. If the client declines, the fallback is to keep Inter for
> body and give the signage role to Archivo *only* in chrome — rail, bar, board
> heads — which is most of the value at none of the disagreement.

Sentence case throughout. Real signage is mixed-case because it reads faster at
distance, which agrees with the ban on tracked-out caps below.

## 3. Layout

Start-aligned throughout so it mirrors under RTL. Numbers tabular and
end-aligned. Nothing centred — centred text loses the return edge, which is a
wayfinding error, and the existing `centred` prop on `AdminShell` becomes a
plate that is itself centred in the field rather than centred text.

```
TRAVELLER — the concourse              AGENCY — the departure board
┌──────────────────────────────┐       ┌──────────────────────────────────────┐
│ TOPLANCE   NG → GB · Work  ☰ │       │ Clients                    12 open   │
├──────────────────────────────┤       ├────────┬──────────┬───────┬──────────┤
│ Next                         │       │ CASE   │ TRAVELLER│ ROUTE │ STATUS   │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │       ├────────┼──────────┼───────┼──────────┤
│ ┃ Upload your bank         ┃ │       │ TL-4471│ A. Okafor│ NG→GB │ ▮ Review │
│ ┃ statements               ┃ │       │ TL-4468│ M. Diallo│ NG→CA │ ▮ Waiting│
│ ┃ 3 of 11 documents left   ┃ │       │ TL-4462│ K. Mensah│ GH→GB │ ▮ Granted│
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │       └────────┴──────────┴───────┴──────────┘
│ ──────────────────────────── │        ▲ status is the only colour in the table
│ Your route                   │
│ Started ▸ Intake ▸ Docs ▸ Sent│      OPS — the dispatch desk
│                ▲ you are here│       ┌───────┬──────────────────────────────┐
└──────────────────────────────┘       │ Board │ Agencies        4 awaiting   │
                                       │ KYB 4 │ Kaduna Freight NG ▮ Live  18 │
 the route diagram is the hero,        │ Leads │ Jos Travel    NG ▮ KYB     — │
 not the yellow plate                  │ Racks │                              │
                                       │ Routes│ Corridors    54 live · 3 due │
                                       └───────┴──────────────────────────────┘
```

The **route diagram** is where the boldness is spent. It is the one device
specific to this product: you are at a known point on a corridor between two
jurisdictions. A large plate carrying a headline number would have been the
default treatment, so it is demoted to support.

## 4. Principles

1. **Colour classifies, never decorates.** `--way` marks exactly one thing per
   screen: the next action. Two yellow things means one is wrong.
2. **Direction is structure.** Arrows live in route diagrams and corridor pairs
   (`NG → GB`) where they carry meaning. Never appended to a button or link
   label.
3. **Plates, not cards.** Hard edges, 4px radius, solid fills. No soft drop
   shadow, no gradient wash. A plate reads as an object because of its edge and
   its ground, not because of a blur beneath it.
4. **One decision visible.** Progressive disclosure is the wayfinding contract.
5. **Density is a service to staff.** A reviewer scanning forty cases needs
   rows, not cards. Boards are dense on purpose.
6. **Banned, explicitly:** tracked-out ALL-CAPS eyebrow labels; ` · `-joined
   meta strings; `→` appended to button or link text; mono used as a label
   style rather than for machine-assigned values.

## 5. Motion

Replaces §9. One orchestrated moment per screen, and it belongs to the person's
action rather than to page load.

- The route diagram advances when a stage completes — the only non-triggered
  motion in the product, and it fires on a real state change.
- Board rows do not animate on load. A departure board's rows change one field
  at a time; the row does not re-enter.
- The `laminate-sheen` specular sweep and the MRZ resolve are removed with the
  material they belonged to.
- Reduced motion stays handled in the base layer by collapsing durations to
  0.001ms with `both` fill, so animations must still end in their resting state.

## 6. Production hardening

Direction-independent, and it ships with whichever surface it touches. Found in
the same survey; none of it is defended by a recorded decision.

| Gap | Evidence | Cost |
|---|---|---|
| No error boundaries | 0 `error.tsx` across 46 routes | a DB or Clerk fault drops an operator mid-case onto Next's unstyled default — no brand, no locale, no way back |
| Nothing painted while loading | 41/46 pages `force-dynamic`, 0 `loading.tsx`, `Suspense` on 3 auth pages only | every queue screen blocks on its slowest query before painting |
| No skip link | none in `src` | keyboard and screen-reader users tab the whole rail on every navigation |
| Metadata holes | `agency/people`, both sign-in doors, `/ops`, `/go` | sign-in pages with no title |
| Ops work does not ship | `LIVE_CORRIDORS` hardcoded in `corridors.ts` | a reviewer approves a corridor and the marketing site never changes |

The last one is a product bug, not a design one, and is listed so it is not
lost. It is out of scope for this spec.

## 7. Quality floor

Replaces §10, corrected — it still named four locales.

- Responsive to 390px.
- `:focus-visible` — 2px `--route` outline at 2px offset, in the base layer.
- Both themes checked on every screen, dark selected rather than flipped.
- **Ten locales**, not four: en, ha, yo, ig, fr, pt, sw, ar, tw, zu. Copy goes
  through `src/lib/i18n` rather than being inlined.
- **`ar` is RTL** — every screen checked with `dir="rtl"`, and styles written in
  logical properties (`ms-`, `pe-`, `start-`).
- 16px body floor. `.special` (13/600) stays the only sub-16 role and never
  lands on a button, link or input.
- Model-authored chat renders through `chat-markdown.tsx`. No raw HTML, no
  `rehype-raw`, no remote images, no `dangerouslySetInnerHTML` (AGENTS.md).
- Every destructive control routes through `confirm-dialog.tsx` and says what
  lands when it commits (AGENTS.md).

## 8. What this reverses

Recorded decisions this overturns, named so they are not lost silently:

| Decision | Where | Status |
|---|---|---|
| The Inter/Archivo fence, **client-locked** | guideline §2 | **needs the client's word** — see §2 above |
| Passport materials: `laminate`, `ovi-edge`, `security-paper`, the specular tilt | globals.css, guideline §4 | removed |
| The MRZ mark as a signature device | guideline §5 | removed as decoration; the MRZ *band* stays where a real machine-readable zone is the subject |
| `bar-edge`, "the only decoration either bar gets" | globals.css | removed |
| `--radius: 14px` with real elevation, "so a card reads as a surface rather than an outlined box" | globals.css | reversed — plates, 4px, no shadow |
| `--bg: #f1f4fa` a step deeper (client's call, 2026-09-08) | globals.css | replaced by `--concourse` |
| `--brand: #2450d8` | globals.css | becomes `--route: #0A4EA3` |
| Inter and JetBrains Mono as the specified faces | guideline §2, layout.tsx | replaced by IBM Plex Sans / Plex Mono |
| `Panel`'s "matte on purpose" contrast rule | panel.tsx | moot — the glass it contrasted against is gone |
| The funnel ramp | globals.css, 2026-09-09 | re-derived on the new hue |

Kept, unchanged: guideline §7 (data honesty — a figure nobody earned renders as
a dashed rule, never an invented number; "verified" never means "approved"),
§11 (voice), and every AGENTS.md convention.

## 9. Sequence

Not one sitting. Each step lands green and reviewable on its own.

1. **Token layer.** `globals.css` rewritten to the validated palette; Plex Sans
   and Plex Mono vendored and wired in place of Inter and JetBrains. The `.t-*`
   roles keep their sizes and take the new body face — that is a face swap, not
   a fence move, and does not wait on the client. The `.d-*` roles are re-cut
   for the signage register but stay fenced to chrome and marketing until the
   client answers §2; if they agree, a follow-up moves them onto product
   screens without touching anything else. Nothing visual ships until the
   primitives below follow, so this step and the next go together.
2. **Primitives.** `Panel` → plate, `Button`, `Badge`, `StatusBadge`,
   `DataTable`, `CounterRow`, the rail and both bars.
3. **Traveller — the concourse.** The route diagram, the next-step plate, the
   corridor bar, intake, documents, profile.
4. **Agency — the departure board.** Case desk, client roster, invitations,
   billing, team, support.
5. **Ops — the dispatch desk.** Dashboard, tenants, KYB, corridors, enquiries,
   support, staff.
6. **Hardening**, folded into each surface as it is touched: `error.tsx` and
   `loading.tsx` per route group, the skip link, the metadata holes.
7. **Sweep.** Ten locales × two themes × RTL × 390px, and the e2e suite green.

## 10. Risks

- **The fence is client-locked.** §2 above. Everything else proceeds without it.
- **Two new font families** on a product read on mid-range Android over slow
  connections. Plex Sans + Plex Mono + Plex Sans Arabic across four subsets is
  more bytes than Inter + JetBrains across three. Budget and subset before
  vendoring; drop Plex Mono's `latin-ext` if the numbers do not justify it.
- **Scale.** 46 routes, ~24 files using the material utilities, the whole token
  layer. The risk is a half-migrated product where two visual languages sit on
  adjacent screens. Mitigation: steps 1–2 land together, and each surface step
  is complete before the next starts.
- **RTL under a new type system.** Archivo's width axis is a Latin device.
  Arabic gets a weight change instead, which has to be checked by eye, not
  assumed.
- **This deletes good work.** The passport-materials language was specific,
  well-argued and well-built. It is being replaced because it did not reach two
  of three surfaces, not because it was wrong. If the wayfinding direction does
  not land on the traveller surface at step 3, stopping and keeping the old
  traveller treatment is a legitimate outcome, not a failure.
