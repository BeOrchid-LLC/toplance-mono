import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The font chain's guard rail.
 *
 * A font stack is not a preference list the browser reads top to bottom
 * once — it is consulted per character. A glyph missing from the first
 * family sends the search to the next FAMILY, never to another face
 * inside the same one, which is why this product declares one
 * `localFont` per subset and chains them.
 *
 * Two ways to break that silently, both of which did break it while the
 * chain was being built, and neither of which any other test can see:
 *
 * 1. A generic family (`system-ui`, `sans-serif`, `monospace`) placed
 *    ahead of a real one. Arabic then lands on the OS font because
 *    `system-ui` answered first.
 * 2. `fallback:` on a `localFont` call. next/font bakes that list INTO
 *    the emitted variable, so `var(--font-plex-sans)` expands to
 *    `plexSans, system-ui, …, sans-serif` and drops the generics into
 *    the MIDDLE of the chain, ahead of every subset after it. Nothing
 *    in the CSS shows this — the stack still reads correctly there.
 *
 * Both failures look like ordinary text. They are only visible in a
 * locale most reviewers cannot read, which is exactly why they are
 * asserted here rather than left to review.
 */
const CSS = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8"
);
const LAYOUT = readFileSync(
  fileURLToPath(new URL("../../app/[locale]/layout.tsx", import.meta.url)),
  "utf8"
);

/** The generic families a browser can resolve without a downloaded face. */
const GENERIC =
  /^(system-ui|-apple-system|"?Segoe UI"?|Roboto|sans-serif|serif|ui-monospace|SFMono-Regular|Menlo|monospace|Arial|Helvetica)$/;

function stack(name: string): string[] {
  const m = CSS.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"));
  if (!m) throw new Error(`No ${name} declaration in globals.css`);
  return m[1].split(",").map((s) => s.trim());
}

describe("the font chain", () => {
  for (const name of ["--sans", "--display", "--data", "--font-sans", "--font-display", "--font-mono"]) {
    it(`${name} puts every real family ahead of every generic one`, () => {
      const entries = stack(name);
      const firstGeneric = entries.findIndex((e) => GENERIC.test(e));
      const lastReal = entries.reduce((acc, e, i) => (e.startsWith("var(--font-") ? i : acc), -1);
      expect(lastReal, `${name} lists no downloaded family`).toBeGreaterThanOrEqual(0);
      if (firstGeneric !== -1) {
        expect(
          firstGeneric,
          `${name}: "${entries[firstGeneric]}" sits ahead of "${entries[lastReal]}", so it answers for glyphs that family would have covered`
        ).toBeGreaterThan(lastReal);
      }
    });
  }

  it("carries every subset of the body face, in the sans stacks", () => {
    // Each closes a specific hole: latin-ext and vietnamese for the
    // Nigerian locales, arabic for `ar`, latin-african for the hook
    // letters Plex Sans does not draw at all.
    const required = [
      "--font-plex-sans",
      "--font-plex-sans-ext",
      "--font-plex-sans-vietnamese",
      "--font-plex-sans-arabic",
      "--font-latin-african",
    ];
    for (const name of ["--sans", "--display", "--data"]) {
      const joined = stack(name).join(",");
      for (const font of required) {
        expect(joined, `${name} is missing ${font}`).toContain(`var(${font})`);
      }
    }
  });

  it("declares no `fallback` on any localFont, because it would land mid-chain", () => {
    expect(LAYOUT).not.toMatch(/\bfallback:\s*\[/);
  });
});
