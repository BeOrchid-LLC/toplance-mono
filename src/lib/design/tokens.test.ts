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
  /* The fill's other half, and the pair the split above exists to
     protect. Nothing asserted it until now, which is exactly why lifting
     `--brand` to clear the ring floor looked free. */
  ["--on-brand", "--brand", 4.5, "primary button label on its fill"],
  ["--success", "--surface", 4.5, "granted on plate"],
  ["--danger", "--surface", 4.5, "refused on plate"],
  ["--border", "--surface", 1.4, "hairline on plate"],
  ["--border-strong", "--surface", 3.0, "strong edge on plate"],
  ["--border-strong", "--surface-2", 3.0, "strong edge on secondary plate"],
  ["--border-strong", "--bg", 3.0, "rule ruled across the concourse"],
  /* 3.0, not 4.5: the focus ring is a boundary against a ground, not
     type, so it takes the non-text floor. */
  ["--ring", "--surface", 3.0, "focus ring on plate"],
  ["--ring", "--bg", 3.0, "focus ring on concourse"],
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
