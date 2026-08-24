# Toplance design guideline

Extracted from the landing page (`src/app/(site)/page.tsx`) on 2026-08-24 and
binding on every other surface. The landing page is the reference
implementation; where this document and the code disagree, the code at
`(site)` wins and this document is wrong and should be corrected.

Written because eleven routes redesigned against a memory of the landing page
produce eleven interpretations. Redesigned against a document, they produce
one.

## 1. The thesis

A visa application is a document problem, so the product looks like documents:
ruled ground, hairline rules, a data face for anything machine-shaped, and
display type used sparingly and with real width. It does not look like a
dashboard, and it does not decorate.

Three devices carry this and nothing else needs to:

| Device | What it means | Where it is allowed |
|---|---|---|
| **Laminate** | the polycarbonate over a passport data page | signature moments only — see §4 |
| **MRZ mark** | the corridor, machine-readable | where a corridor is the subject |
| **Margin rail** | the name of the part you are reading | long scrolling documents |

## 2. Two type systems, and the fence between them

`globals.css` holds two scales. **This fence is client-locked. Do not move
it.**

- **`.t-*`** — `t-display` `t-h1` `t-h2` `t-h3` `t-title` `t-body` `t-body-lg`
  `t-muted` `special` `special-caps` `kicker`. Inter. 16px body floor.
  `special` (13/600) is the only sub-16 role and never lands on a button,
  link or input. **These own every product screen.**
- **`.d-*` and `.tag`** — `d-lg` `d-md` `d-sm` (Archivo, variable width axis),
  `tag` (JetBrains, 13/600/+0.14em, uppercase), `num`, `mrz`. Marketing
  surface.

**The rule for this redesign:** the marketing roles may cross into a product
screen *only inside a signature moment* (§4). Everything a person reads or
operates for more than a few seconds stays on `.t-*`. A screen matches the
landing page through tokens, rules, spacing and colour discipline — not by
importing its headline face.

## 3. Tokens

Never hard-code a hue. Everything reads from the token layer so the
light/dark and toplance/beorchid axes keep working.

```
ground      --bg --surface --surface-2 --surface-inset
rules       --border --border-strong
ink         --ink --ink-2 --ink-3
brand       --brand --brand-press --brand-2 --brand-text --brand-accent --on-brand
semantic    --success --warning --danger --info  (+ each -ink)
glass       --glass-tint --glass-edge --glass-under --glass-sheen
radius      --radius-sm 10 / --radius-md 14 / --radius-lg 20 / --radius-xl 28 / --radius-pill
motion      --dur-tap 120 --dur-toggle 180 --dur-sheet 240 --dur-route 200
            --ease-out --ease-inout
fixed       --control-h 52 --row-h 44 --bar-h 56
```

`--brand-text` lifts to `#5e90f0` in dark so brand text clears AA. Use
`--brand-text` for type and `--brand` for fills; they are not
interchangeable.

Tints mix toward `transparent`, not toward `--surface`, anywhere a surface may
sit over glass or a ruled ground. Mixing toward `--surface` punches an opaque
rectangle through the material.

## 4. The laminate

`@utility laminate` + `.laminate::before` + `.laminate-sheen` in
`globals.css`. Three layers: `backdrop-filter: blur(14px) saturate(175%)`
refracting the ground, a tinted fill carrying the text, and two inset
hairlines lighting the top and bottom edges so the card reads as having
thickness. The `::before` draws a 1px optically-variable ring — `--brand-2`
at one corner, `--brand-accent` at the other, `--border-strong` between.

**Allowed on: signature moments only.** A signature moment is a surface whose
subject is a corridor, a case, or a person's standing in one. One per screen,
at the top.

- `(site)` hero and closing bar — the corridor picker
- `(app)` the active corridor header
- `employer` the roster's privacy card
- `ops` the queue header

**Never on:** table rows, document lists, form fields, anything repeated down
a scroll, or anything a person reads for minutes at a time. `backdrop-filter`
is a per-element frame cost and this page is mostly read on mid-range Android
(see the note in `corridor-bar.tsx`). Repeating it also turns the mark into a
texture, which is the failure the `Section` comment in `page.tsx` exists to
prevent.

Write `backdrop-filter` **unprefixed**. Lightning CSS adds the `-webkit-` twin
from the project's browser targets; a hand-written prefixed copy placed after
it wins the dedupe and silently drops the standard property from the build.

## 5. The MRZ mark

`MrzBand` in `corridor-state.tsx`. 44 columns, the width of a real
machine-readable zone. Payload (`TPL<NGA<<GBR<<WORK`) in `--brand-text`;
padding in `.mrz-pad`, dimmed to 42% of `--ink-3` and masked so it runs out
rather than stopping. Two stacked layers with complementary `clip-path`
animations resolve the code out of a field of fillers.

`aria-hidden`, `user-select: none`. It is a mark, not information — so
**every MRZ must be accompanied by the same fact in words**, which is the only
version assistive tech gets.

Rare by design. Twice on the landing page. At most once per product screen.

## 6. Structure

- **Shell** — `mx-auto max-w-[1240px] px-6`.
- **Margin rail** — for long scrolling documents only. A sticky
  `lg:grid-cols-[184px_1fr]` with a 2px brand tick, a `.tag` label and an
  optional `datum`. `datum` carries a fact, never a second label; with nothing
  true to say it is omitted.
- **Rules over boxes.** Separate with `border-t border-border`, not with a
  card. Reserve `border-border-strong` for the top rule of a set. A screen of
  bordered boxes is the failure mode.
- **Section rhythm** — `py-20 md:py-24` between sections; `mt-11`/`mt-12`
  between a heading and its content.
- **Measures** — headings `max-w-[26ch]`, leads `max-w-[62ch]`, body
  `max-w-[74ch]`.

## 7. Data honesty

Non-negotiable, and it outranks visual polish.

- A figure nobody has earned renders as a dashed rule with
  `aria-label="Awaiting a real figure"` — never as an invented number.
- Placeholder testimonials and logos are visibly dashed slots that say what
  they await.
- Verified means *accepted for review*, never *approved*. No surface may
  imply Toplance decides an outcome.
- Amounts and plan prices are placeholders until the client sets them, and
  must read as placeholders.

## 8. Status colour

One vocabulary everywhere:

| State | Ink | Fill |
|---|---|---|
| Live / verified / complete | `--brand-text` | `--brand` |
| In build / pending / needs action | `--warning-ink` | `--brand-accent` |
| Rejected / expired | `--danger-ink` | `--danger` |
| Draft / not started | `--ink-3` | `--border-strong` |

A 3px rounded rule above a block encodes a boundary (the landing page uses it
for free vs paid). Use it only where a real boundary exists.

## 9. Motion

One orchestrated moment per screen, not scattered effects.

- `.rise` — 620ms `--ease-out`, hero settle on load.
- MRZ resolve — 700ms complementary clips, re-keyed on the corridor.
- `.laminate-sheen` — 900ms specular sweep, keyed on the corridor so it fires
  on the same state change as the MRZ.
- Hover/press use `--dur-tap` / `--dur-toggle`.

Reduced motion is handled globally in the base layer by collapsing durations
to 0.001ms with `both` fill — so animations must be written to end in their
resting state.

## 10. Quality floor

Every screen, not negotiable:

- Responsive to 390px.
- `:focus-visible` — 2px `--brand` outline, 2px offset (base layer).
- Native `<select>` behind a styled face on mobile pickers: faster, offline,
  already translated into the system language. The visible text is ours, the
  interaction is the phone's.
- Both themes checked, including the `--brand-text` lift in dark.
- Locale: English, Hausa, Yoruba, Igbo. Copy goes through `useT`/`src/lib/i18n`
  rather than being inlined.
- Model-authored chat renders through `chat-markdown.tsx`. No raw HTML, no
  `rehype-raw`, no remote images, no `dangerouslySetInnerHTML` (AGENTS.md).

## 11. Voice

Plain verbs, sentence case, no filler. Name things by what a person controls.
An action keeps its name through the whole flow. Errors say what happened and
what to do, and never apologise. Empty states invite an action.

The landing page's register — "Free until you ask us to do the work", "A
person actually looks" — is the tone. Confident, specific, never salesy, and
never implying an approval Toplance cannot give.

## 12. Order of work

Guideline first, then one route per iteration:

1. `(auth)` layout + sign-in, sign-up, employer/sign-in, ops/sign-in
2. `(app)` layout + `/app`
3. `/app/requirements`
4. `/app/documents`
5. `/app/agent`
6. `/employer`
7. `/ops`
8. `not-found` + shared components sweep (`app-bar`, `document-row`,
   `completion-ring`, `status-badge`, `auth-form`)

Each iteration: read the route, redesign against this document, `npm run
lint && npm run typecheck && npm run build`, screenshot both themes at 1440
and 390, then move on.
