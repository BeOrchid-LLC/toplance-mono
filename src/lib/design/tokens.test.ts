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
