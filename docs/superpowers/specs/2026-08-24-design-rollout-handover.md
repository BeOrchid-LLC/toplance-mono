# Design rollout — handover

**Date:** 2026-08-24
**Branch:** `feat/clerk-auth-phase-1`
**Status:** 2 of 8 surfaces done. Uncommitted.

The goal: bring every route onto the visual language established by the
landing page. The rules live in
[`2026-08-24-design-guideline.md`](./2026-08-24-design-guideline.md) — **read
that first, it is the contract.** This file only covers what is done, what is
left, and what will bite you.

---

## Done

### 1. `(site)` — landing page — the reference implementation

The corridor bar was rebuilt and is now the pattern every other signature
moment copies.

- `src/components/site/corridor-state.tsx` — `mrz()` returns the payload
  **unpadded**; `MrzBand` adds the padding as its own span. Previously the
  padding was inside the code string, so 26 of 44 characters rendered in brand
  blue while encoding nothing.
- `src/components/site/corridor-bar.tsx` — slots, MRZ band and status are one
  laminated card. The CTA spans both grid rows on desktop.
- `src/app/globals.css` — new `@utility laminate`, `.laminate::before` (the
  optically-variable edge), `.laminate-sheen` (specular sweep), `.mrz-pad`, and
  the `--glass-*` token block.

### 2. `(auth)` — sign-in, sign-up, employer, operations

- `src/app/(auth)/layout.tsx` — brand-gradient header replaced with a light bar
  matching `site-nav`; `security-paper` ground; hairline footer.
- `src/components/auth/auth-panel.tsx` — **new.** The single laminate panel an
  auth screen is allowed. Read its comments before reusing it.
- `src/components/auth/auth-form.tsx` — both branches render inside
  `AuthPanel`; headings lifted `t-h3` → `d-md`; eyebrow names the door.
- `sign-up/page.tsx` — the "Not a traveller?" boxes are ruled rows.
- `employer/sign-in`, `ops/sign-in` — nested card wrappers removed, left column
  matched to the landing page's organisations section.

Verified: `lint`, `typecheck`, `build` clean; 1440px and 390px, light and dark.

---

## Left to do

In this order (guideline §12). Each is one sitting.

| # | Surface | Files |
|---|---|---|
| 3 | `(app)` layout + `/app` | `src/app/(app)/layout.tsx`, `src/app/(app)/app/page.tsx` |
| 4 | `/app/requirements` | `src/app/(app)/app/requirements/page.tsx` |
| 5 | `/app/documents` | `src/app/(app)/app/documents/page.tsx` |
| 6 | `/app/agent` | `src/app/(app)/app/agent/page.tsx` |
| 7 | `/employer` | `src/app/employer/page.tsx` |
| 8 | `/ops` | `src/app/ops/page.tsx` |
| 9 | shared sweep | `app-bar`, `document-row`, `completion-ring`, `status-badge`, `not-found` |

Per surface: read the route, redesign against the guideline, then
`npm run lint && npm run typecheck && npm run build`, then screenshot 1440 and
390 in **both** themes.

---

## Four things that will bite you

### 1. Do not hand-write `-webkit-` prefixes

This cost an hour. Writing

```css
backdrop-filter: blur(14px) saturate(175%);
-webkit-backdrop-filter: blur(14px) saturate(175%);   /* ← do not */
```

made Lightning CSS **drop the standard property** and ship only the prefixed
one. `getComputedStyle().backdropFilter` returned `none` while the CSS source
looked fine. Tailwind v4 autoprefixes from the project's browser targets —
write unprefixed and leave it alone. Same applies to `mask` / `mask-composite`.

### 2. The type scale is client-locked, and there is a fence in it

`globals.css` says so in two comments. `.t-*` (Inter) owns product screens;
`.d-*` / `.tag` (Archivo + JetBrains) are marketing. **The agreed rule for this
rollout: marketing roles may cross into a product screen only inside a
signature moment.** Do not pour `d-lg` across `/app` — a screen matches through
tokens, rules, spacing and colour, not by importing the headline face.

### 3. The laminate is capped at one per screen

`backdrop-filter` is a per-element frame cost and `corridor-bar.tsx` records
that this page is mostly read on mid-range Android. Guideline §4 has the
allow/deny list. Never on table rows, document lists, form fields, or anything
repeated down a scroll. Repeating it also turns the mark into a texture, which
is the exact failure the `Section` comment in `(site)/page.tsx` exists to
prevent.

Tints on or near glass must mix toward `transparent`, never toward `--surface`
— an opaque tint punches a hole through the material. See the `Slot` comment in
`corridor-bar.tsx`.

### 4. Do not invent data to fill a design

Guideline §7, and it outranks visual polish. Concretely:

- **No MRZ on the auth screens.** The mark carries a corridor; at sign-up no
  corridor has been chosen, and the landing page deliberately keeps that choice
  out of the URL and out of storage (`corridor-state.tsx`). An MRZ there would
  be inventing someone's destination. From `/app` onward the corridor *is*
  known, so the mark belongs there.
- Unearned figures render as a dashed rule with
  `aria-label="Awaiting a real figure"`, never as a number.
- Every MRZ is `aria-hidden`, so the same fact must appear in words beside it.
  That is the only version a screen reader gets.

---

## Open questions for whoever picks this up

1. **`/app` signature moment.** The plan is a laminate header carrying the
   active corridor plus its MRZ. The corridor for a signed-in traveller has to
   come from their record — confirm the field exists before designing around
   it, and fall back to no MRZ rather than a placeholder one.
2. **`/ops` density.** The queue is the one screen where a table may genuinely
   beat ruled rows. The guideline prefers rules; if you deviate, add a comment
   saying why.
3. **Locale.** New copy added during the rollout should go through
   `useT` / `src/lib/i18n` rather than being inlined. The auth work reused
   existing strings, so this has not been exercised yet.

---

## State of the tree

Everything is **uncommitted** on `feat/clerk-auth-phase-1`, mixed in with
unrelated in-flight Clerk work (`.env.local.example`, `package.json`,
`src/lib/storage/*`, `src/lib/db/*`). Separate the design commits from the
Clerk commits before opening a PR.

New files that must be added:

```
docs/superpowers/specs/2026-08-24-design-guideline.md
docs/superpowers/specs/2026-08-24-design-rollout-handover.md
src/components/auth/auth-panel.tsx
src/components/site/corridor-bar.tsx
src/components/site/corridor-board.tsx
src/components/site/corridor-state.tsx
```

`src/components/site/hero-art.tsx` was deleted.

A dev server may already be running on **:3003** (`next dev` refuses to start a
second one — it prints the existing PID).

The `AGENTS.md` block at the top of that file is regenerated by `next dev`;
commit it with your work rather than reverting it.
