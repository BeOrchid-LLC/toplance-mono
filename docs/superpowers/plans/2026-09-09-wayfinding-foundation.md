# Wayfinding Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the token layer, type faces and shared primitives with the wayfinding system, so every screen in the product repaints at once and stays green.

**Architecture:** This codebase was built so that nothing hard-codes a hue — every component reads `--bg`, `--surface`, `--ink`, `--brand` from the token layer. That means a values-only swap behind the existing token names repaints all 46 routes without touching a single component file. We exploit that: the palette lands first as a repaint, then the plate geometry, then the faces, then the primitives. Each step is independently reviewable and leaves the product working.

**Tech Stack:** Next.js 16.3.2 (App Router, Turbopack), Tailwind v4 (`@theme inline`, `@utility`), React 19.2, Vitest (node environment), Playwright, `next/font/local` with vendored woff2.

**Spec:** `docs/superpowers/specs/2026-09-09-wayfinding-redesign-design.md`

## Global Constraints

- **Never hard-code a hue.** Every colour reads from the token layer, so the light/dark and toplance/beorchid axes keep working. Copied from guideline §3, which survives this redesign.
- **16px body floor, client-locked.** `.special` (13/600/+0.02em) is the only sub-16 role and never lands on a button, link or input. The `.t-*` sizes are locked by the client and do not change — only the face they are set in.
- **`--way` is a fill, never type.** It carries `#0B1F2A` ink on it in both modes and never appears as text on a plate.
- **Ten locales**, en ha yo ig fr pt sw ar tw zu. `ar` is RTL. Styles use logical properties (`ms-`, `pe-`, `start-`), never `ml-`/`pr-`/`left-`.
- **Fonts self-hosted only.** No request to `fonts.gstatic.com` or any third party. Vendored woff2 in `src/app/fonts/`.
- **Guideline §2's Inter/Archivo fence is client-locked and is NOT moved by this plan.** Tasks here swap the body face and re-cut the `.d-*` roles, but `.d-*` stays fenced to chrome and marketing. Moving it onto product screens is a separate change gated on the client's written agreement.
- **Destructive controls route through `src/components/shared/confirm-dialog.tsx`** and say what lands when they commit (AGENTS.md).
- **Verification:** `npm run typecheck` and `npm run lint` must both pass at every commit. `npm test` runs 129 node-environment suites. There is no component-test infrastructure — `vitest.config.mts` is `environment: "node"`, `include: ["src/**/*.test.ts"]`. Do not add jsdom or Testing Library as part of this plan.

---

## Scope note — this is plan 1 of 4

The spec's §9 sequences into four subsystems that each produce working software on their own. This plan is the first. The other three should each get their own plan, written after this one lands, because they depend on what the primitives actually become:

| Plan | Covers | Spec section |
|---|---|---|
| **1. Foundation** (this doc) | token layer, faces, plate geometry, shared primitives, hardening primitives | §9 steps 1, 2, 6 |
| 2. Traveller concourse | route diagram, next-step plate, corridor bar, intake, documents, profile | §9 step 3 |
| 3. Agency board | case desk, roster, invitations, billing, team, support | §9 step 4 |
| 4. Ops dispatch + sweep | dashboard, tenants, KYB, corridors, enquiries, support, staff; then ten locales × two themes × RTL × 390px | §9 steps 5, 7 |

## File structure

| File | Responsibility |
|---|---|
| `src/lib/design/contrast.ts` (new) | sRGB relative luminance and WCAG contrast ratio. Pure functions, no deps. |
| `src/lib/design/tokens.test.ts` (new) | Parses `globals.css`, builds the light and dark token maps, asserts every documented pair clears its floor. The palette's guard rail. |
| `src/app/globals.css` (modify) | The token layer, plate geometry, type scale, base layer. The single largest change. |
| `src/app/[locale]/layout.tsx` (modify, 40–70) | Font wiring — retire Inter and JetBrains, add Plex Sans, Plex Mono, Plex Sans Arabic. |
| `src/app/fonts/*.woff2` (add/remove) | Vendored subsets. |
| `src/components/ui/button.tsx` (modify) | Variants onto route/way, plate geometry. |
| `src/components/ui/badge.tsx`, `src/components/shared/status-badge.tsx` (modify) | Status vocabulary onto `--clear`/`--stop`/`--way`. |
| `src/components/shared/panel.tsx` (modify) | Card → plate. |
| `src/app/[locale]/error.tsx`, `src/app/[locale]/(app)/error.tsx`, `src/app/[locale]/agency/error.tsx`, `src/app/[locale]/ops/error.tsx` (new) | Error boundaries per route group. |
| `src/app/[locale]/(app)/loading.tsx`, `src/app/[locale]/agency/loading.tsx`, `src/app/[locale]/ops/loading.tsx` (new) | Loading fallbacks. |
| `src/components/shared/skip-link.tsx` (new) | Skip to content, mounted in both shells. |

---

### Task 1: The palette guard rail

The redesign has no unit-test surface — there is no component testing here. What *is* testable, and what matters most, is that the palette keeps its contrast guarantees forever. Build that first, against the palette we are about to write, so it fails until the palette lands.

**Files:**
- Create: `src/lib/design/contrast.ts`
- Create: `src/lib/design/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `contrast(a: string, b: string): number` — WCAG contrast ratio between two `#rrggbb` strings, 1–21. `relativeLuminance(hex: string): number`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/design/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { contrast } from "./contrast";

/**
 * The palette's guard rail.
 *
 * A redesign has no unit-test surface — there is no component testing in
 * this repo — but the contrast guarantees are computable, so they are
 * computed. Every pair below is a place where one token lands on another
 * in the product; the floors are WCAG's, 4.5:1 for text and 3:1 for a
 * non-text boundary a person has to see.
 *
 * Parsed out of `globals.css` rather than duplicated here, so the CSS
 * stays the single source of truth and this test cannot drift from it.
 */
const CSS = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8"
);

/** The declarations inside one `{ ... }` block, by custom-property name. */
function tokensIn(startSelector: string): Record<string, string> {
  const at = CSS.indexOf(startSelector);
  if (at === -1) throw new Error(`No block for ${startSelector}`);
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("\n}", open);
  const body = CSS.slice(open, close);
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[name] = value;
  }
  return out;
}

const light = tokensIn(":root {");
const dark = tokensIn(':root[data-theme="dark"],');

/** [foreground, background, floor, what it is] */
const PAIRS: [string, string, number, string][] = [
  ["--ink", "--surface", 4.5, "body on plate"],
  ["--ink", "--bg", 4.5, "body on concourse"],
  ["--ink", "--surface-2", 4.5, "body on secondary plate"],
  ["--ink-2", "--surface", 4.5, "secondary text on plate"],
  ["--ink-2", "--bg", 4.5, "secondary text on concourse"],
  ["--ink-3", "--surface", 4.5, "muted text on plate"],
  ["--brand", "--surface", 4.5, "route on plate"],
  ["--brand", "--bg", 4.5, "route on concourse"],
  ["--success", "--surface", 4.5, "granted on plate"],
  ["--danger", "--surface", 4.5, "refused on plate"],
  ["--border", "--surface", 1.4, "hairline on plate"],
  ["--border-strong", "--surface", 3.0, "strong edge on plate"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s palette", (mode, tokens) => {
  it("parsed a full token block", () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(10);
    expect(tokens["--ink"]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it.each(PAIRS)("%s on %s clears %s:1 — %s", (fg, bg, floor) => {
    const ratio = contrast(tokens[fg], tokens[bg]);
    expect(ratio).toBeGreaterThanOrEqual(floor);
  });

  /**
   * `--way` is a fill and never type, so it is checked the other way
   * round: the ink that sits ON it, which is the light ink in both
   * modes because yellow is a light fill in both.
   */
  it("carries readable ink on the way plate", () => {
    expect(contrast(light["--ink"], tokens["--way"])).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/design/tokens.test.ts`
Expected: FAIL — `Cannot find module './contrast'`.

- [ ] **Step 3: Write the contrast helper**

Create `src/lib/design/contrast.ts`:

```ts
/**
 * WCAG contrast, computed rather than eyeballed.
 *
 * Lives in the repo rather than in a dev dependency because
 * `tokens.test.ts` is a guard rail on shipped values: a palette edit that
 * breaks a contrast floor should fail the suite on a machine with no
 * design tooling installed.
 */

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 1 for identical colours, 21 for black on white. */
export function contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Run it again**

Run: `npx vitest run src/lib/design/tokens.test.ts`
Expected: FAIL, but now on the assertions — the current palette has no `--way`, and `--border-strong: #ccd2de` is 1.35:1 on white against a 3.0 floor. This is the failing test that Task 2 makes pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/contrast.ts src/lib/design/tokens.test.ts
git commit -m "Make the palette's contrast floors a test, not a promise"
```

---

### Task 2: Repaint — the wayfinding palette behind the existing token names

**Files:**
- Modify: `src/app/globals.css:13-160` (light `:root`), `:163-215` (dark block)

**Interfaces:**
- Consumes: `contrast()` from Task 1, via the test.
- Produces: the token values every later task and every component reads. New token `--way` (+ `--color-way` in `@theme inline`).

**Naming decision — read this before starting.** The spec names the roles `--concourse`, `--plate`, `--ink`, `--route`, `--way`. We keep the *existing identifiers* (`--bg`, `--surface`, `--ink`, `--brand`) and change their values, because 46 routes and ~130 component files already read them; renaming would be a mechanical diff across the whole repo with a high chance of a missed call site, for no behavioural gain. The one genuinely new role — the directional colour, which has no existing equivalent — gets the new name `--way`. Record this in the CSS comment so the spec and the code agree.

- [ ] **Step 1: Replace the light neutrals and semantics**

In `src/app/globals.css`, inside the light `:root {` block, replace the neutral ramp and semantic values with:

```css
  /* The concourse. A cool grey with a faint green cast — the colour of
     a terminal floor and of the backing a sign is mounted on. Replaces
     the blue-grey #f1f4fa set on 2026-09-08; that decision was about
     separating the ground from a white sheet, and this keeps the
     separation while changing the temperature. */
  --bg: #e7ebea;
  --surface: #ffffff;
  --surface-2: #f1f4f3;
  --surface-inset: #e0e6e5;
  --border: #d3dad9;
  /* Lifted from #ccd2de, which was 1.35:1 on white — invisible as the
     edge of a control. 3.02:1 is the WCAG floor for a non-text boundary
     somebody has to see. `tokens.test.ts` holds it there. */
  --border-strong: #8e9695;
  --ink: #0b1f2a;
  --ink-2: #44565f;
  /* 4.52:1 on white. The old #7b8296 was 4.16:1 and failed AA for body
     text, which `.special` and `.t-muted` both use. */
  --ink-3: #697980;

  /* Signage green and red, not the old semantic pair. Both are read at
     a glance next to a status word, never alone. */
  --success: #00713c;
  --success-ink: #005c31;
  --warning: #8a5905;
  --warning-ink: #6f4704;
  --danger: #c8102e;
  --danger-ink: #a30d25;
  --info: #0a4ea3;
  --info-ink: #083f83;
```

- [ ] **Step 2: Add the directional colour**

Immediately after the semantics in the light `:root` block:

```css
  /* Direction — the one genuinely new role in the wayfinding system,
     and the reason it gets a new name rather than reusing
     --brand-accent, which was an amber used decoratively.

     `--way` marks the next step and nothing else. Exactly one thing per
     screen wears it; two means one is wrong. It is always a FILL with
     `--way-ink` on it, never type on a plate — as type it cannot clear
     4.5:1 on white, and using it as a field is what real signage does.

     The ink on it is the light-mode ink in BOTH themes, because yellow
     is a light fill in both. 9.51:1 light, 10.48:1 dark. */
  --way: #f5b915;
  --way-ink: #0b1f2a;
```

- [ ] **Step 3: Replace the dark neutrals and semantics**

Inside the `:root[data-theme="dark"], .dark {` block:

```css
  /* The night concourse. Selected against this ground, not flipped out
     of the light steps — a flip puts the hairline at 1.29:1 and the
     strong edge at 1.86:1, both invisible. */
  --bg: #0a141b;
  --surface: #132029;
  --surface-2: #1b2b36;
  --surface-inset: #0e1a22;
  --border: #2b3a44;
  --border-strong: #5d6c75;
  --ink: #e8edec;
  --ink-2: #a3b1b8;
  --ink-3: #7a8b93;

  --success: #2fa968;
  --success-ink: #7fe0ac;
  --warning: #e5a83c;
  --warning-ink: #f3c77e;
  --danger: #e4574c;
  --danger-ink: #f2a199;
  --info: #4c8fe0;
  --info-ink: #9dbaf6;

  /* Holds. Yellow is a light fill on either ground, and so is the ink
     that sits on it. */
  --way: #f5b915;
  --way-ink: #0b1f2a;
```

- [ ] **Step 4: Move the brand hue to the signage blue**

In the brand axis block (`:root, [data-brand="toplance"]`):

```css
:root,
[data-brand="toplance"] {
  /* A motorway-sign blue, not the indigo #2450d8 it replaces. The old
     hue was a SaaS default; this one is the institutional register the
     rest of the system is written in. 7.98:1 on white, 6.64:1 on the
     concourse. */
  --brand: #0a4ea3;
  --brand-press: #083f83;
  --brand-2: #4c8fe0;
  --brand-text: #0a4ea3;
  --brand-accent: var(--way);
  --on-brand: #ffffff;
  --brand-grad: linear-gradient(150deg, #0a4ea3, #4c8fe0);
}
```

Leave `[data-brand="beorchid"]` as it is — the spec defers BeOrchid's own route/way pair until that product needs it, and it gets the same validation run then.

In the dark brand-text lift block, change the toplance value to `#4c8fe0`.

- [ ] **Step 5: Surface `--way` as a utility**

In the `@theme inline` block, beside the other colour aliases:

```css
  --color-way: var(--way);
  --color-way-ink: var(--way-ink);
```

- [ ] **Step 6: Run the guard rail**

Run: `npx vitest run src/lib/design/tokens.test.ts`
Expected: PASS — 26 pair assertions across both modes, plus the two parse checks and the two way-ink checks.

- [ ] **Step 7: Verify nothing else broke**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck clean, lint clean apart from the pre-existing unused-`Progress` warning in `src/app/[locale]/agency/page.tsx`, and all 129 suites green.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css
git commit -m "Repaint the product onto the wayfinding palette"
```

---

### Task 3: Plates, not cards

Reverses `--radius: 14px` and the soft-shadow elevation. A plate reads as an object because of its edge and its ground, not because of a blur beneath it.

**Files:**
- Modify: `src/app/globals.css` — the radius block (~96–104) and the shadow block (~52–56)

**Interfaces:**
- Consumes: `--border`, `--border-strong`, `--surface` from Task 2.
- Produces: `--radius-*` and `--shadow-*` values every component reads.

- [ ] **Step 1: Cut the radii to signage geometry**

```css
  /* Signage geometry. A sign is a plate with a machined edge, so the
     radius is the smallest one that still reads as manufactured rather
     than as a cut corner. 14px read as a SaaS card, which is what it
     was chosen to be on the previous system; that decision goes with
     the system it belonged to. */
  --radius-sm: 3px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 10px;
  --radius-pill: 999px;
  --radius: var(--radius-md);
```

- [ ] **Step 2: Retire the soft elevation**

```css
  /* Plates sit ON the concourse; they do not float above it. What
     separates a plate from its ground is the ground being darker and
     the plate having a real edge — not a blur. `--shadow-sm` survives
     as a hairline-thin contact shadow for a plate that genuinely
     overlaps another (menus, dialogs, the mobile nav sheet); the two
     larger steps are for those and nothing else. */
  --shadow-sm: 0 1px 0 rgb(11 31 42 / 0.06);
  --shadow: 0 1px 2px rgb(11 31 42 / 0.10), 0 8px 20px -10px rgb(11 31 42 / 0.16);
  --shadow-lg: 0 2px 6px rgb(11 31 42 / 0.14), 0 20px 44px -14px rgb(11 31 42 / 0.24);
```

And in the dark block:

```css
  --shadow-sm: 0 1px 0 rgb(0 0 0 / 0.4);
  --shadow: 0 1px 2px rgb(0 0 0 / 0.5), 0 8px 20px -10px rgb(0 0 0 / 0.45);
  --shadow-lg: 0 2px 6px rgb(0 0 0 / 0.55), 0 20px 44px -14px rgb(0 0 0 / 0.55);
```

- [ ] **Step 3: Move the focus ring onto the route colour**

In `@layer base`, the `:focus-visible` rule already reads `var(--brand)`, which Task 2 repointed. Change only the radius so the ring matches the new geometry:

```css
  :focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
    border-radius: 3px;
  }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npx vitest run src/lib/design/tokens.test.ts`
Expected: all clean.

- [ ] **Step 5: Look at it**

Start the app on a free port (3000 and 3100 are taken by other projects):

```bash
npx next dev -p 3400
```

Open `http://localhost:3400/en` and confirm the landing page renders on the concourse with plate geometry, in both themes. Screenshot both.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "Give the product plates instead of cards"
```

---

### Task 4: Retire the passport materials

The laminate, the optically-variable edge, the specular tilt and the security paper belonged to the system being replaced. They come out together — a half-removed material language is worse than either.

**Files:**
- Modify: `src/app/globals.css` — the laminate axis, `@utility laminate`, `@utility ovi-edge`, `@utility security-paper`, `@utility bar-edge`, `.laminate-sheen`, `@keyframes laminate-tilt`, the `@supports` fallback, and the two `.bar-edge::after` rules
- Modify: the 24 files that reference them (list below)

**Interfaces:**
- Consumes: nothing.
- Produces: removes `laminate`, `ovi-edge`, `security-paper`, `bar-edge`, `laminate-sheen` from the class vocabulary. Later plans must not reintroduce them.

- [ ] **Step 1: Find every call site**

```bash
grep -rln "laminate\|ovi-edge\|security-paper\|bar-edge" src/components src/app
```

Expected: 26 files. Work through them in this order so the app never renders a half-removed effect — CSS last.

- [ ] **Step 2: Replace `laminate` with a plate at each call site**

`laminate` was a glass surface with an inset edge and a shadow. Its replacement is the plate: `bg-surface border border-border`. Where a `laminate` element also carried `<span aria-hidden className="laminate-sheen" />`, delete that span — it has no successor.

Files, from the grep: `(app)/app/(corridor)/layout.tsx`, `(corridor)/page.tsx`, `(corridor)/requirements/page.tsx`, `app/messages/page.tsx`, `app/profile/page.tsx`, `(auth)/agency/sign-up/page.tsx`, `(auth)/layout.tsx`, `agency/page.tsx`, `not-found.tsx`, `agency/client-roster.tsx`, `app/app-bar.tsx`, `app/app-nav.tsx`, `app/corridor-header.tsx`, `app/document-row.tsx`, `app/intake-agent.tsx`, `auth/auth-form.tsx`, `auth/auth-panel.tsx`, `shared/counter-row.tsx`, `shared/panel.tsx`, `site/corridor-bar.tsx`, `site/site-nav.tsx`, `ui/badge.tsx`.

- [ ] **Step 3: Replace `security-paper` with nothing**

It was a ruled ground under a hero. The concourse is the ground now. Delete the `aria-hidden` div that carried it at each of: `(corridor)/layout.tsx`, `app/profile/page.tsx`, `(auth)/layout.tsx`, `(site)/page.tsx`, `(site)/travelers/page.tsx`, `checkout/page.tsx`, `go/page.tsx`, `invite/[token]/page.tsx`, `not-found.tsx`, `ops/kyb/[id]/page.tsx`, `app/intake-agent.tsx`.

- [ ] **Step 4: Replace `ovi-edge` and `bar-edge` with a hairline**

`ovi-edge` on `intake-agent.tsx`, `intake-dock.tsx`, `intake-record.tsx` becomes `border border-border`. `bar-edge` on the two chrome bars becomes `border-b border-border`.

- [ ] **Step 5: Delete the CSS**

Remove from `globals.css`: the `laminate axis` `:root` blocks (`--glass-tint`, `--glass-edge`, `--glass-under`, `--glass-sheen`), `@utility security-paper`, `@utility laminate`, the `@supports not (backdrop-filter)` fallback, the `.laminate::before, .ovi-edge::before` rule, `@utility ovi-edge`, `@keyframes laminate-tilt`, `.laminate-sheen`, `@utility bar-edge`, both `.bar-edge::after` rules, and `--bar-edge-o` wherever it is set.

- [ ] **Step 6: Confirm nothing references them**

```bash
grep -rn "laminate\|ovi-edge\|security-paper\|bar-edge\|glass-" src/components src/app
```

Expected: no output.

- [ ] **Step 7: Verify and look**

Run: `npm run typecheck && npm run lint && npm test`, then `npx next dev -p 3400` and check `/en`, `/en/app`, `/en/agency` in both themes.

- [ ] **Step 8: Commit**

```bash
git add -A src/app src/components
git commit -m "Take out the passport materials the wayfinding system replaces"
```

---

### Task 5: The faces

Retires Inter and JetBrains Mono for IBM Plex Sans and IBM Plex Mono, and closes the Arabic gap with Plex Sans Arabic. Archivo stays and is untouched.

**Files:**
- Modify: `src/app/[locale]/layout.tsx:36-70`
- Modify: `src/app/globals.css` — the `@theme` font stacks (~557–559) and the `body` block in `@layer base` (~586–588)
- Add: `src/app/fonts/plex-sans-{latin,latin-ext,vietnamese,arabic}.woff2`, `src/app/fonts/plex-mono-latin.woff2`
- Delete: `src/app/fonts/inter-latin.woff2`, `inter-latin-ext.woff2`, `jetbrains-latin.woff2`

- [ ] **Step 1: Vendor the subsets**

```bash
npm i -D @fontsource-variable/ibm-plex-sans @fontsource-variable/ibm-plex-sans-arabic @fontsource-variable/ibm-plex-mono
cp node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2 src/app/fonts/plex-sans-latin.woff2
cp node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-ext-wght-normal.woff2 src/app/fonts/plex-sans-latin-ext.woff2
cp node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-vietnamese-wght-normal.woff2 src/app/fonts/plex-sans-vietnamese.woff2
cp node_modules/@fontsource-variable/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-wght-normal.woff2 src/app/fonts/plex-sans-arabic.woff2
cp node_modules/@fontsource-variable/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2 src/app/fonts/plex-mono-latin.woff2
```

If a filename does not exist, list `node_modules/@fontsource-variable/<pkg>/files/` and take the variable-weight normal file for that subset. Plex Mono may ship static weights only; if so take 400 and 600 and declare them separately.

- [ ] **Step 2: Check the byte budget before going further**

```bash
ls -l src/app/fonts/
```

The spec flags this as a risk: this product is read on mid-range Android over slow connections. Record the before and after totals in the commit message. The previous set was 384KB across six files. If the new set exceeds roughly 450KB, drop `plex-mono-latin-ext` (Task 5 does not add it) and consider subsetting Plex Sans Arabic.

- [ ] **Step 3: Wire the faces**

In `src/app/[locale]/layout.tsx`, replace the `inter` and `jetbrains` declarations:

```ts
/**
 * IBM Plex Sans in place of Inter, and Plex Mono in place of JetBrains.
 *
 * Plex is institutional by design, which is the register a border
 * product is written in; Inter is the neutral default and reads as one.
 * The four subsets are not optional: Hausa's ƙ/ɓ/ɗ live in `latin-ext`,
 * and Yoruba's ẹ/ọ and Igbo's ị/ụ live in `vietnamese`.
 *
 * `arabic` closes a gap nobody had recorded. `ar` is a live RTL locale
 * and Inter, Archivo and JetBrains had no Arabic between them, so every
 * Arabic reader was getting OS fallback with metrics matching nothing
 * else in the product.
 */
const plexSans = localFont({
  src: [
    { path: "../fonts/plex-sans-latin.woff2", weight: "100 700", style: "normal" },
    { path: "../fonts/plex-sans-latin-ext.woff2", weight: "100 700", style: "normal" },
    { path: "../fonts/plex-sans-vietnamese.woff2", weight: "100 700", style: "normal" },
    { path: "../fonts/plex-sans-arabic.woff2", weight: "100 700", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

const plexMono = localFont({
  src: [{ path: "../fonts/plex-mono-latin.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
```

Update the `className` on `<html>` or `<body>` — wherever `inter.variable` and `jetbrains.variable` are listed — to `plexSans.variable` and `plexMono.variable`. Keep `archivo.variable`.

Update the refresh instructions in the doc comment above the declarations to name the new packages.

- [ ] **Step 4: Repoint the stacks**

In `globals.css`, the `@theme` block:

```css
  --font-sans: var(--font-plex-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-display: var(--font-archivo), var(--font-plex-sans), system-ui, sans-serif;
```

And in `@layer base`'s `body` block, where the stacks are re-declared because `@theme inline` does not emit the custom property:

```css
    --sans: var(--font-plex-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --display: var(--font-archivo), var(--font-plex-sans), system-ui, sans-serif;
    --data: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
```

- [ ] **Step 5: Remove the retired files**

```bash
git rm src/app/fonts/inter-latin.woff2 src/app/fonts/inter-latin-ext.woff2 src/app/fonts/jetbrains-latin.woff2
grep -rn "font-inter\|font-jetbrains" src/
```

Expected: no output from the grep.

- [ ] **Step 6: Verify, including Arabic**

Run: `npm run typecheck && npm run lint`, then `npx next dev -p 3400`. Open `/en` and `/ar`. Confirm on `/ar` that the page runs right-to-left **and** that Arabic text renders in Plex rather than an OS fallback — check in devtools that the computed `font-family` resolves to the Plex face and that the rendered glyphs match Plex Sans Arabic's forms.

Also open `/ha` and `/yo` and confirm ƙ/ɓ/ɗ and ẹ/ọ render in Plex rather than falling back mid-word.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/fonts src/app/[locale]/layout.tsx src/app/globals.css package.json package-lock.json
git commit -m "Set the product in Plex, and give Arabic a face at last"
```

---

### Task 6: The primitives

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/shared/status-badge.tsx`
- Modify: `src/components/shared/panel.tsx`

**Interfaces:**
- Consumes: `--way`, `--way-ink`, `--brand`, `--clear`/`--stop` via `--success`/`--danger`, and the new radii.
- Produces: a `way` variant on `Button` — `variant="way"` — that later plans use for the single next action on a screen.

- [ ] **Step 1: Add the `way` variant to Button**

In `buttonVariants`, add to `variants.variant`, after `primary`:

```ts
        /**
         * Direction. The single next step on a screen, and never more
         * than one — see `--way` in globals.css. Its ink is fixed rather
         * than themed because yellow is a light fill in both modes.
         */
        way: "bg-way text-way-ink hover:bg-[color-mix(in_srgb,var(--way)_88%,#fff)] active:bg-[color-mix(in_srgb,var(--way)_88%,#000)]",
```

- [ ] **Step 2: Drop the glass from Badge**

`src/components/ui/badge.tsx` carries `laminate` — Task 4 removed it. Confirm the class is gone and the badge reads `bg-surface-2 border border-border`.

- [ ] **Step 3: Repoint StatusBadge onto the signage vocabulary**

`src/components/shared/status-badge.tsx` maps states to tokens. Guideline §8's vocabulary survives with new colours: live/verified/complete → `--success`; pending/needs action → `--way` as a fill with `--way-ink`; rejected/expired → `--danger`; draft/not started → `--ink-3` on `--surface-2`. Keep every state's icon and label — status is never colour alone.

- [ ] **Step 4: Turn Panel into a plate**

In `src/components/shared/panel.tsx`, both `Panel` and `DisclosurePanel` carry `rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]`. The radius token already changed under them, so the only edit is the doc comment — the "matte on purpose … the laminate in the corridor header is the only glass on any screen" paragraph describes a system that no longer exists. Replace it:

```
 * The plate. One sign face: a solid surface with a machined edge, sitting
 * on the concourse rather than floating above it. What separates it from
 * its ground is the ground being darker and the plate having a real edge,
 * which is why the elevation is a 1px contact shadow and not a blur.
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm test`

- [ ] **Step 6: Look at every primitive at once**

`npx next dev -p 3400`, then open `/en/agency` and `/en/ops/dashboard` in both themes. Confirm buttons, badges, status pills and panels all read as one family.

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "Give the shared primitives the signage vocabulary"
```

---

### Task 7: Error boundaries, loading states and the skip link

The spec's §6. None of this is defended by a recorded decision, and all of it is a production gap today: 0 `error.tsx` across 46 routes, 0 `loading.tsx`, no skip link anywhere in `src`.

**Files:**
- Create: `src/components/shared/skip-link.tsx`
- Create: `src/app/[locale]/error.tsx`, `src/app/[locale]/(app)/error.tsx`, `src/app/[locale]/agency/error.tsx`, `src/app/[locale]/ops/error.tsx`
- Create: `src/app/[locale]/(app)/loading.tsx`, `src/app/[locale]/agency/loading.tsx`, `src/app/[locale]/ops/loading.tsx`
- Modify: `src/components/shared/admin-shell.tsx` and `src/components/shared/shell.tsx` to mount the skip link and give `<main>` an id
- Modify: `src/app/[locale]/agency/people/page.tsx`, `(auth)/agency/sign-in/page.tsx`, `(auth)/ops/sign-in/page.tsx`, `ops/page.tsx`, `go/page.tsx` — add the missing `metadata`

**Interfaces:**
- Consumes: `Panel`, `Button` from Task 6.
- Produces: `<SkipLink />`, mounted in both shells.

- [ ] **Step 1: Write the skip link**

```tsx
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The first thing in the tab order, and invisible until it has focus.
 *
 * Without it a keyboard or screen-reader user tabs the whole rail — a
 * dozen destinations and an account menu — on every navigation, before
 * reaching the page they asked for.
 *
 * `sr-only` rather than an off-screen transform: the link has to be
 * reachable, announced and then visible on focus, and `focus:not-sr-only`
 * is the one pattern that does all three without a magic offset.
 */
export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-[var(--shadow)] focus:outline-2 focus:outline-brand"
    >
      {ADMIN_CONSOLE.skipToContent[locale]}
    </a>
  );
}
```

Add `skipToContent` to `src/lib/i18n/admin-console.ts` as a `Record<Locale, string>` — all ten locales, English "Skip to content". The type is a compile error until every locale is present, which is the point.

- [ ] **Step 2: Mount it and give `<main>` an id**

In `src/components/shared/admin-shell.tsx`, render `<SkipLink locale={locale} />` as the first child inside the outer `div`, and change `<main className="min-w-0 flex-1 px-4 py-8 sm:px-6">` to carry `id="main"`. Do the same in `src/components/shared/shell.tsx` for the traveller and marketing surfaces.

- [ ] **Step 3: Write one error boundary and copy it per group**

`src/app/[locale]/ops/error.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

/**
 * A route group's error boundary.
 *
 * There were none anywhere in the product until now, so a DB or Clerk
 * fault dropped an operator mid-case onto Next's unstyled default — a
 * page from a different product, with no brand, no locale and no way
 * back. This is deliberately plain: it renders when something has
 * already gone wrong, so it depends on as little as possible.
 *
 * `reset()` re-renders the segment. It is offered first because most of
 * what lands here is transient — a dropped connection, a cold pool.
 */
export default function OpsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-16">
      <h1 className="t-h2">That screen did not load</h1>
      <p className="t-muted mt-3 measure">
        Something went wrong on our side. Nothing you were working on has been
        lost.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" asChild>
          <a href="/ops">Back to the console</a>
        </Button>
      </div>
      {error.digest && (
        <p className="special mt-8">
          Reference <span className="num">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
```

Copy to `agency/error.tsx` (back link `/agency`, "Back to the console"), `(app)/error.tsx` (back link `/app`, "Back to my application"), and `[locale]/error.tsx` (back link `/`, "Back to the start"). Copy goes through `src/lib/i18n` for the `(app)` and `agency` ones, which are translated surfaces; `/ops` is English-only, consistent with the rest of that console.

- [ ] **Step 4: Write the loading fallbacks**

`src/app/[locale]/ops/loading.tsx`:

```tsx
/**
 * What the console shows while a page's queries run.
 *
 * 41 of 46 routes are `force-dynamic`, so every console screen blocks on
 * its slowest query before painting anything. This is the plate the page
 * will fill — same geometry, same rhythm — so the layout does not jump
 * when the real rows arrive.
 */
export default function OpsLoading() {
  return (
    <div className="px-4 py-8 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-[280px] rounded-md bg-surface-2" />
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="h-[60px] border-b border-border bg-surface-2" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[var(--row-h)] border-b border-border last:border-b-0" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
```

Copy to `agency/loading.tsx` and `(app)/loading.tsx`, adjusting the shape to what that group's pages actually render.

- [ ] **Step 5: Fill the metadata holes**

Add `export const metadata = { title: "..." }` (or `generateMetadata` where the title is localised) to `agency/people/page.tsx`, `(auth)/agency/sign-in/page.tsx`, `(auth)/ops/sign-in/page.tsx`, `ops/page.tsx`, `go/page.tsx`.

- [ ] **Step 6: Verify the boundaries actually catch**

Temporarily add `throw new Error("boundary check")` to the top of `src/app/[locale]/ops/dashboard/page.tsx`, run `npx next dev -p 3400`, open `/en/ops/dashboard`, and confirm the branded error page renders with a working "Try again". **Remove the throw.**

Then tab into `/en/ops` from the address bar and confirm the skip link appears on first Tab and jumps to the content.

- [ ] **Step 7: Verify the suite**

Run: `npm run typecheck && npm run lint && npm test`

- [ ] **Step 8: Commit**

```bash
git add -A src/app src/components src/lib/i18n
git commit -m "Give every route group an error boundary, a loading state and a skip link"
```

---

### Task 8: Re-derive the funnel ramp

The ordinal ramp committed earlier on 2026-09-09 is derived from the old brand hue (264.5°) and validated against the old surfaces. Both changed.

**Files:**
- Modify: `src/app/globals.css` — `--chart-funnel-1` … `-5` in both theme blocks

**Interfaces:**
- Consumes: `--brand` (now `#0a4ea3`) and `--surface` from Tasks 2 and 3.
- Produces: nothing new; `FunnelBars` already reads these five tokens by index.

- [ ] **Step 1: Derive five steps on the new hue**

`#0a4ea3` is roughly OKLCH hue 258°. Build a five-step ordinal ramp on that hue: light mode L 0.36 → 0.68 in 0.08 steps, dark mode L 0.78 → 0.46, chroma held near 0.16 until the gamut takes it.

- [ ] **Step 2: Validate as an ordinal ramp, both modes**

The check is monotone lightness, every adjacent ΔL ≥ 0.06, and the pale end clearing 2:1 against that mode's `--surface` — `#ffffff` light, `#132029` dark. Running the categorical checks on a sequential ramp fails by design; do not "fix" a good ramp to satisfy them.

- [ ] **Step 3: Write the values in**

Replace the ten hexes, and update the two doc comments to name the new hue and the re-measured light-end ratios. The existing comments state 2.94:1 and 2.38:1 — both will change.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test`, then `npx next dev -p 3400` and look at `/en/ops/dashboard` and `/en/agency` in both themes.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "Re-derive the funnel ramp on the route hue"
```

---

## Self-review

**Spec coverage.** §1 colour → Tasks 1, 2, 8. §2 type → Task 5; the fence is explicitly *not* moved, per the Global Constraints, and the spec flags it as needing the client. §3 layout → deferred to plans 2–4 by design; this plan supplies the geometry (Task 3) those plans lay out with. §4 principles → encoded as the `way` variant (Task 6) and the removal of the material vocabulary (Task 4); the ban on caps eyebrows and ` · ` meta strings belongs to the surface plans, where the call sites are. §5 motion → Task 4 removes `laminate-tilt` and the sheen; the route diagram's advance belongs to plan 2. §6 hardening → Task 7. §7 quality floor → enforced per-task in the verification steps. §8 reversals → Tasks 2, 3, 4, 5, 8 each name the decision they overturn in the commit message.

**Gap found and closed:** the spec's §1 says the two-brand axis survives, and Task 2 step 4 leaves `[data-brand="beorchid"]` untouched with a note saying why. Without that step it would have silently kept a teal brand beside a wayfinding palette.

**Gap found and left open deliberately:** `LIVE_CORRIDORS` is listed in the spec's §6 table and marked out of scope there. It stays out of scope here. It is a product bug and needs its own plan.

**Type consistency.** `contrast(a, b)` is defined in Task 1 and used only there. `--way` / `--way-ink` are introduced in Task 2 step 2, surfaced as utilities in step 5, and consumed by name in Task 6 step 1 (`bg-way text-way-ink`) and Task 6 step 3. `SkipLink({ locale })` is defined and mounted in Task 7 steps 1–2. `ADMIN_CONSOLE.skipToContent` is added in Task 7 step 1 and read in the same file.

**Placeholder scan.** No TBD, no "add appropriate error handling", no "similar to Task N". Task 5 step 1 carries a conditional ("if a filename does not exist, list the directory") because Fontsource's file naming genuinely varies between variable and static packages; the fallback instruction is specific rather than vague.
