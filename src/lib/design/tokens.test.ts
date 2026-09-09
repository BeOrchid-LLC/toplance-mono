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

/**
 * `color-mix(in srgb, a p%, b)` in the two lines of arithmetic it is.
 *
 * sRGB rather than OKLab because that is the space `badge.tsx` names,
 * and a mix computed in a different space is a different colour.
 */
function mix(a: string, b: string, p: number): string {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const chan = (x: number, y: number) => Math.round(x * p + y * (1 - p));
  return (
    "#" +
    [chan(ar, br), chan(ag, bg), chan(ab, bb)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * A mode's palette is not one block. The neutrals and semantics are set
 * per theme, but the route colour is set per *brand* — `--brand` and
 * `--brand-text` live on the brand axis, and dark lifts only
 * `--brand-text`. Layering the blocks in cascade order is what the
 * browser resolves at runtime, so it is what the floors are checked
 * against.
 */
const brand = tokensIn('[data-brand="toplance"] {');
const brandDark = tokensIn('.dark [data-brand="toplance"] {');

const light = { ...brand, ...tokensIn(":root {") };
const dark = { ...brand, ...brandDark, ...tokensIn(':root[data-theme="dark"],') };

/**
 * [foreground, background, floor, what it is]
 *
 * This list was widened after a verification pass found `--ink-3`
 * passing the single assertion it had — on `--surface`, by 0.019 — while
 * failing on the three other grounds it actually lands on: 4.083 under a
 * table's header band, which is `.special-caps` on `--surface-2` and so
 * is every column head in the product; 3.759 on the concourse, which is
 * 17px marketing body copy; and 3.576 in an inset well.
 *
 * So the rule the list follows now: a token is tested against EVERY
 * ground it is drawn on, not against the one it happened to be picked
 * against. One pair per token is a sample, and a sample that includes
 * the highest-contrast ground in the system reads as a guarantee while
 * guaranteeing nothing.
 *
 * The same pass found the focus ring at 2.078:1 in dark, and that one is
 * worth recording in full, because it had been covered and then stopped
 * being. c5fdc60 shipped `["--brand", "--surface"]` and
 * `["--brand", "--bg"]`. 99a9da0 — the commit that repainted the palette
 * those two assertions guarded — rewrote both to `--brand-text`. The
 * reasoning was sound as far as it went: `--brand-text` is the token
 * that lands on a plate as type, and `--brand` is a fill. But `--brand`
 * was also the focus ring, so moving the assertion off it left the ring
 * measured by nothing, and the regression shipped green and survived a
 * full verification round. The ring has its own `--ring` token now, with
 * its own pairs below.
 *
 * The rule that follows from that one: do not narrow an assertion in the
 * same commit as the values it guards. If a pair has to move, the pair
 * it moves to goes in first, and the old one comes out afterwards.
 */
/**
 * Each pill variant's tint strength, taken from `badge.tsx` itself.
 *
 * `bg-[color-mix(in_srgb,var(--success)_14%,transparent)]` -> ["success", 0.14].
 * A variant that stops mixing toward `transparent` — mixing toward a
 * single ground instead, which guideline §3 forbids because a pill lands
 * on four — simply stops matching and drops out of the list, so the
 * count is asserted too.
 */
const BADGE = readFileSync(
  fileURLToPath(new URL("../../components/ui/badge.tsx", import.meta.url)),
  "utf8"
);
const PILLS: [string, number][] = [
  ...BADGE.matchAll(
    /bg-\[color-mix\(in_srgb,var\(--([a-z-]+)\)_(\d+)%,transparent\)\]/g
  ),
].map(([, name, pct]) => [name, Number(pct) / 100]);

const PAIRS: [string, string, number, string][] = [
  ["--ink", "--surface", 4.5, "body on plate"],
  ["--ink", "--bg", 4.5, "body on concourse"],
  ["--ink", "--surface-2", 4.5, "body on secondary plate"],
  ["--ink-2", "--surface", 4.5, "secondary text on plate"],
  ["--ink-2", "--bg", 4.5, "secondary text on concourse"],
  ["--ink-2", "--surface-2", 4.5, "secondary text on secondary plate"],
  ["--ink-2", "--surface-inset", 4.5, "secondary text in an inset well"],
  ["--ink-3", "--surface", 4.5, "muted text on plate"],
  ["--ink-3", "--surface-2", 4.5, "column heads under a table's band"],
  ["--ink-3", "--surface-inset", 4.5, "muted text in an inset well"],
  ["--ink-3", "--bg", 4.5, "muted body copy on concourse"],
  /* `--brand-text`, not `--brand`: the route colour has two jobs and
     only one of them is type. `--brand` is a fill and carries
     `--on-brand` on it, which is why it stays the deep blue in dark;
     `--brand-text` is the one that lands on a plate as a link or a
     label, and it is the one dark lifts. */
  ["--brand-text", "--surface", 4.5, "route on plate"],
  ["--brand-text", "--bg", 4.5, "route on concourse"],
  ["--brand-text", "--surface-2", 4.5, "footer links on their band"],
  ["--brand-text", "--surface-inset", 4.5, "route in an inset well"],
  /* The fill's other half, and the pair the split above exists to
     protect. Nothing asserted it until now, which is exactly why lifting
     `--brand` to clear the ring floor looked free. */
  ["--on-brand", "--brand", 4.5, "primary button label on its fill"],
  /* The semantic fills' own label inks, the same split one step further
     out. These three render as real labelled buttons — "Flag", "Flag for
     the traveler", "Submit my application" — at 16px semibold, which is
     under the 18.66px bold that would relax the floor, so 4.5 is the
     number for every one of them. They carried `text-white` until now,
     which held in light and failed in dark at 2.100 / 3.002 / 3.642. */
  ["--on-success", "--success", 4.5, "success button label on its fill"],
  ["--on-warning", "--warning", 4.5, "warning button label on its fill"],
  ["--on-danger", "--danger", 4.5, "danger button label on its fill"],
  ["--success", "--surface", 4.5, "granted on plate"],
  ["--danger", "--surface", 4.5, "refused on plate"],
  ["--border", "--surface", 1.4, "hairline on plate"],
  ["--border-strong", "--surface", 3.0, "strong edge on plate"],
  ["--border-strong", "--surface-2", 3.0, "strong edge on secondary plate"],
  ["--border-strong", "--bg", 3.0, "rule ruled across the concourse"],
  /* 3.0, not 4.5: the focus ring is a boundary against a ground, not
     type, so it takes the non-text floor.

     All four grounds, not the two it had. The ring is drawn wherever a
     control can be, and a control can be on a plate, on the concourse,
     under a table's header band or in an inset well; two of four is the
     same sampling mistake that let `--ink-3` ship failing on three
     grounds while passing on the one it was picked against.

     The four also do a second job, which is why `--surface-2` and
     `--surface-inset` matter more than they look. `outline-offset` leaves
     a TRANSPARENT gap, so the colour immediately inside the ring is the
     ground the control sits on rather than the control's own fill — these
     four assertions are what say that gap is legible on both sides, and
     therefore what stops a primary button drawing a ring that touches its
     own `--brand` fill at 1.000:1. */
  ["--ring", "--surface", 3.0, "focus ring on plate"],
  ["--ring", "--bg", 3.0, "focus ring on concourse"],
  ["--ring", "--surface-2", 3.0, "focus ring under a table's band"],
  ["--ring", "--surface-inset", 3.0, "focus ring in an inset well"],
];

/**
 * Why there is no `["--brand", "--surface", 3.0]` here.
 *
 * There was, in c5fdc60, and 99a9da0 rewrote it to `--brand-text` in the
 * same commit as the repaint it was guarding — which is the mistake the
 * rule above the list was written about. So this absence is deliberate
 * and is recorded rather than left to be rediscovered as an oversight.
 *
 * The pair belonged here for as long as `--brand` was drawn as an edge:
 * it was the focus ring on every button and input, the border of the
 * secondary button, the marker on the current page in the app nav, the
 * active slot of the OTP field. On the dark palette it measures 2.078 on
 * a plate, 2.331 on the concourse, 1.821 on the secondary plate and 2.212
 * in an inset well, so every one of those was under the 3:1 floor.
 *
 * It is not drawn as an edge any more. Focus reads `--ring`, and the
 * handful of resting and hover edges that read the route colour now read
 * `--brand-text`, which is byte-identical in light and lifts to #5192e1
 * in dark. `--brand` is a fill and only a fill — asserted as one by
 * `["--on-brand", "--brand"]` above.
 *
 * Which leaves the obvious question: why not assert it anyway, as
 * insurance? Because it cannot pass and be true at the same time. Making
 * `--brand` clear 3:1 on the dark grounds means lifting it to something
 * like the #4c8fe0 the ring uses, and white on that is 3.327:1 — so the
 * assertion above it fails instead. One hex cannot be both a fill that
 * carries white and an edge that reads against a near-black ground; that
 * is the whole reason `--ring` was split out.
 *
 * So the guarantee is enforced in the other direction, by
 * `focus.test.ts`, which fails if `ring-brand`, `border-brand` or
 * `outline-brand` reappears anywhere in `src/`. A comment saying "--brand
 * is a fill" is what the last two rounds had.
 */

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
   * The status pills, which no pair above can reach.
   *
   * A pill's fill is not a token — it is `color-mix(in srgb, var(--x) N%,
   * transparent)`, so what sits behind the label is the token diluted
   * into whichever ground the pill landed on. That ground varies: the
   * corridor header's plate, a table row, the inset beneath it, the
   * concourse. PAIRS compares two tokens and cannot see any of it, so
   * these four variants have never been measured in this repo — through
   * a full palette repaint that moved every one of the tokens they mix.
   *
   * The percentages are read out of `badge.tsx` rather than copied
   * here, for the same reason the palette is read out of `globals.css`:
   * a number typed in two places is a number that will disagree with
   * itself. Retinting a pill in the component re-runs this assertion at
   * the new strength automatically.
   *
   * The ink is the `-ink`
   * half of each pair rather than the fill, because that is what the
   * component sets. 4.5:1 because a pill is a written word: 13px, which
   * is small text, with nothing to relax the floor.
   */
  it("found every pill variant in badge.tsx", () => {
    expect(PILLS.map(([n]) => n).sort()).toEqual([
      "brand",
      "danger",
      "info",
      "success",
      "warning",
    ]);
  });

  it.each(PILLS)("the %s pill's label clears 4.5:1 on every ground", (variant, strength) => {
    for (const ground of ["--surface", "--surface-2", "--surface-inset", "--bg"]) {
      const fill = mix(tokens[`--${variant}`], tokens[ground], strength);
      const ratio = contrast(tokens[`--${variant}-ink`], fill);
      expect(
        ratio,
        `${variant} pill on ${ground} in ${mode}: ${ratio.toFixed(3)}:1`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * The ring's second job, which has no WCAG number and needs one anyway.
   *
   * A ring that clears 3:1 against the ground can still be useless, and
   * the light palette shipped exactly that: `--ring` was `--brand`'s own
   * hex, so on a primary button the ring and the fill were 1.000:1. Every
   * floor in PAIRS passed. In a browser it read as one blue shape with a
   * white pinstripe through it — the 2px offset gap was carrying the
   * entire signal, and a gap is not an indicator.
   *
   * 2.0 is not a contrast floor, because there is no contrast floor for
   * this: 1.4.11 measures the ring against what is adjacent to it, and
   * what is adjacent to it is the gap, which is the ground. This is the
   * weaker claim that the two are not the same colour, and the number is
   * the one the palette already meets rather than an invented target —
   * 2.116 in light, 2.399 in dark.
   *
   * `--brand` alone, because it is the only fill a ring has to sit beside
   * that is dark in BOTH themes. The signage fills flip with the theme
   * and the gap does the separating there: `--way` is 9.344 from the dark
   * plate and 1.775 from the light one, so the ratio that matters for it
   * moves between the two boundaries rather than staying on one.
   */
  it("does not ring a primary button in the button's own colour", () => {
    expect(contrast(tokens["--ring"], tokens["--brand"])).toBeGreaterThanOrEqual(2.0);
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
