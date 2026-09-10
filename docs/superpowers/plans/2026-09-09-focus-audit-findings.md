# Focus system — audit findings, 2026-09-09

Verdict: **NO-GO** on declaring the foundation's primitives finished. Six defects,
all small, all in shared surfaces that later plans multiply.

Method: headless Chromium, real `next dev`, real Clerk sign-up promoted to staff
owner, **622 control readings** (311 tab stops × 2 themes) across `/`,
`/travelers`, `/sign-in`, `/ops/dashboard`, `/ops/tenants`, `/ops/corridors`,
`/ops/kyb`, `/ops/support`. Every conclusion below comes from pixels sampled
0–7px out from each edge, focused vs blurred — not from reading CSS.

## What is actually fixed

`--brand` is gone from every edge in the product. 622 readings produced exactly
two outline colours — `rgb(11,31,42)` light and `rgb(76,143,224)` dark, both
`--ring`, all 2px at `outline-offset: 2px`. Where the ring lands it clears 3:1
with margin: worst 4.37:1, best 16.89:1. That half of the repair is real.

## Blockers

### B1 — `src/components/ui/chart.tsx:67` paints no focus indicator at all

`[&_.recharts-surface]:outline-hidden`. Measured on the real `/ops/dashboard`:
`<svg class="recharts-surface" role="application" tabindex="0">`, reached by Tab,
`:focus-visible` true, rect 934×280, `outline-style: none`, `box-shadow: none`.
Four-side pixel probe, 0–7px out: **every sample byte-identical focused vs
blurred, both themes.** A keyboard user lands on a 934×280 control and gets
nothing back.

The same `ChartContainer` backs `ops/revenue-chart.tsx`, `agency/bill-chart.tsx`
and `agency/client-fee-chart.tsx` — every chart in the product.

**Why it was missed twice:** `/ops/dashboard` is director-only, and the chart
returns a paragraph when there are no points. An auditor promoted to `reviewer`
sees a permission screen; one promoted to `owner` with no billing history sees
"No billing history yet". The chart only renders after promoting to owner **and**
backdating the org six months. A verifier can honestly report "no chart problem"
having never rendered a chart.

Fix: drop the suppression. The `[&_.recharts-layer]` and `[&_.recharts-sector]`
suppressions target non-focusable decoration and can stay — say so in a comment.
This is stock shadcn, so `shadcn add chart` will silently revert it; the CLI has
clobbered customised `ui/` in this repo before.

### B2 — `src/lib/design/focus.test.ts:163` cannot catch its own regression class

`utilityOf(token) === "outline-none"` matches one literal. Compiled through
tailwindcss 4.3.3's own node API: `.outline-hidden` and `.outline-none` emit
**identical** suppression (`--tw-outline-style: none; outline-style: none`).

Six negative controls, each injected, run and reverted:

| | Injected | Result |
|---|---|---|
| A | `outline-hidden` in a 17th file | **89/89 PASS — not caught** |
| B | `outline-none`, same place | FAIL, file named |
| D | `outline-hidden` + `ring-brand-2` on `button.tsx` — the shipped bug respelled | **89/89 PASS — not caught** |
| E | the shipped bug as it shipped | FAIL, 2 tests |
| F | dark `--ring` → `#0a4ea3` | FAIL, 5 tests at 2.078 / 2.331 / 1.821 / 2.212 |
| G | dark `--way-ink` → white (1.775:1 on the yellow) | **89/89 PASS — not caught** |

The palette half bites hard and precisely. The component-scan half catches one
spelling of two and one token of two. Three `outline-hidden` already sit in
`chart.tsx` and the test reports "exactly two suppressors" and passes.

Fix: match `outline-none | outline-hidden | outline-0`, widen the edge regex
`/^(?:ring|border|outline)-brand(?![\w-])/` to cover `-brand-2`. Once widened,
`chart.tsx` becomes a named exception that must be justified or removed — that is
the point, not a nuisance. Re-run controls A, D and G as the acceptance test.

## Majors

- **M1 `site-nav.tsx:168`** — marketing nav ring reduced to 1–2 vertical bars.
  Links are `h-full` in a 64px `overflow-hidden` strip. "How it works" paints
  right only; "Where we work" left+right; "Pricing" left only.
- **M2 `ui/table.tsx:26,77` + `shared/sort-head.tsx:71`** — all 15 console sort
  headers draw an L, not a ring. Bottom and left paint; **top and right do not**.
  Geometry alone predicts only the top loss — the right side is *overpainted* by
  the neighbouring sticky header's opaque background. Verify a fix by sampling
  pixels, not by re-checking clip geometry.
- **M3 `not-found.tsx:38`** — both 404 recovery links show a single 2px bar.
- **M4 `tokens.test.ts:310`** — the assertion named "carries readable ink on the
  way plate" reads `--ink`, but the call sites (`button.tsx` `way` variant,
  `corridor-bar.tsx:227`) render `--way-ink`. Control G is the proof and the
  regression test.

M1–M3 all take the `-outline-offset-2` deviation `globals.css` already documents.

## Traps for whoever re-audits

- **Settle ~400ms after Tab.** Tailwind v4's `transition-colors` includes
  `outline-color`. Readings taken immediately after focus catch the 150–180ms
  fade and report a second focus system that does not exist. With a settle, 622
  readings collapse to exactly two colours.
- **Use `next dev --webpack`, or one dev server.** Turbopack intermittently
  emitted corrupted CSS (garbled custom-property names like `var(--i\11 rol-h)`,
  109 parse failures, every page 500ing) while a second dev server watched the
  same tree — with the source file's md5 stable throughout.
- **Check port 3400 is really free.** A previous run's "dev server killed, port
  confirmed free" was untrue; an orphan was still listening.
- **eslint has no ignore for a non-default `distDir`.** An audit build dir gave
  11867 problems across 98 files. There is exactly **one** warning in `src`.
- **`npm test` is flaky on this machine.** 13 files / 19 tests failed, 1863
  passed, every failure `Hook timed out in 10000ms` in DB-backed suites, and
  non-deterministic across consecutive runs with Postgres idle. Not caused by the
  redesign — but no commit message here can honestly claim a clean 1856/1856.
  `src/lib/design` is 89/89 green, consistently.
- **HEAD moves under you.** This audit measured at `7bd072f`; a concurrent
  session committed through to `6ed7fe8` mid-run. Every finding was re-checked
  and the decisive negative control re-run at the newer HEAD.
