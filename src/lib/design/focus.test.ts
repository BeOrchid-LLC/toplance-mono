import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The focus system's guard rail.
 *
 * `tokens.test.ts` checks that the palette's values clear their floors.
 * It cannot check which value a component reaches for, and that is where
 * the focus ring actually broke: the token layer said
 * `:focus-visible { outline: 2px solid var(--ring) }` and measured green,
 * while sixteen component files carried `outline-none` — which lands in
 * Tailwind's utilities layer, declared after base and therefore winning
 * everywhere — and drew their own ring in `--brand` instead. A 2.078:1
 * ring shipped twice with the palette test passing both times, because
 * nothing connected the two halves.
 *
 * This is that connection, and it is a text scan rather than a rendering
 * test on purpose: there is no component-test infrastructure in this repo
 * (`vitest.config.mts` is `environment: "node"`), and the failure being
 * guarded is a class name, not a behaviour. What it can prove is that the
 * product has exactly one focus mechanism and that the mechanism reads
 * the one token measured for the job.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));
const GLOBALS = join(SRC, "app/globals.css");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Comments first, and this repo is the reason it matters: the files that
 * removed a `ring-brand` mostly say so in prose, quoting the class they
 * removed. A scanner that reads those back out reports every fix as the
 * bug it fixed. The `:` guard keeps `https://` out of the line-comment
 * pattern.
 */
function stripComments(body: string): string {
  return body.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Class strings are whitespace-separated and Tailwind spells its own
 * spaces `_`, so splitting on whitespace and quotes yields whole class
 * tokens with their arbitrary values intact — `ring-[color-mix(in_srgb,…)]`
 * survives, which splitting on commas or parentheses would not.
 */
function classTokens(body: string): string[] {
  return stripComments(body)
    .split(/[\s"'`]+/)
    .filter(Boolean);
}

/** The utility half of `hover:focus-visible:border-brand` is `border-brand`. */
function utilityOf(token: string): string {
  const parts = token.split(":");
  return parts[parts.length - 1];
}

function variantsOf(token: string): string {
  const parts = token.split(":");
  return parts.slice(0, -1).join(":");
}

const FILES = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length),
  body: readFileSync(path, "utf8"),
}));

describe("the focus system", () => {
  it("has files to scan", () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  /**
   * `--brand` is a fill. It stays dark enough to carry `--on-brand` white
   * as a button label, which puts it at 2.078:1 against a dark plate and
   * 1.821 against the secondary plate — so any edge drawn in it is under
   * the 3:1 floor for a boundary somebody has to see, focus or not. The
   * route colour's edge-and-ink half is `--brand-text`, which is the same
   * hex in light and lifts in dark; the focus ring is `--ring`.
   *
   * `border-brand-text` and `bg-brand` are both fine and neither matches:
   * the check is for the bare token, so a trailing `-` excludes it and a
   * fill utility is a different word.
   */
  it("never draws --brand as an edge", () => {
    const offenders: string[] = [];
    for (const { path, body } of FILES) {
      for (const token of classTokens(body)) {
        if (/^(?:ring|border|outline)-brand(?![\w-])/.test(utilityOf(token))) {
          offenders.push(`${path}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The same rule reached through an arbitrary value. `ring-2 ring-brand`
   * is the obvious spelling and the one above catches it; the ring this
   * replaced was also written as `ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]`
   * on seven controls, which is the fill hue at a fifth strength — under
   * 1.2:1 on either plate, and invisible in both themes.
   *
   * Scoped to focus variants, because `--brand` in an arbitrary value is
   * legitimate elsewhere: a decorative halo around an `aria-hidden` dot on
   * the profile timeline is a `ring-[color-mix(…var(--brand)…)]` that
   * marks nothing and has to clear no floor.
   */
  it("never builds a focus indicator out of --brand", () => {
    const offenders: string[] = [];
    for (const { path, body } of FILES) {
      for (const token of classTokens(body)) {
        const utility = utilityOf(token);
        if (!/^(?:ring|border|outline|shadow)-\[/.test(utility)) continue;
        if (!utility.includes("var(--brand)")) continue;
        if (!variantsOf(token).includes("focus")) continue;
        offenders.push(`${path}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The base rule itself, so a future edit cannot quietly repoint the one
   * ring the components now depend on back at the fill.
   */
  it("draws the base ring from --ring", () => {
    const css = readFileSync(GLOBALS, "utf8");
    const rule = css.slice(css.indexOf(":focus-visible {"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("outline: 2px solid var(--ring)");
    expect(block).toContain("outline-offset: 2px");
  });

  /**
   * The two suppressions that are allowed, named individually.
   *
   * Both are places where the element that takes focus is not the element
   * a person sees, and where the visible shell draws the ring instead —
   * the deviation `:focus-visible` in globals.css permits and describes.
   * Listing them here rather than counting them means adding a
   * seventeenth `outline-none` fails this test with the file named, which
   * is the only way an exception stays an exception.
   */
  it("suppresses the outline in exactly two places, both documented", () => {
    const allowed = ["components/app/intake-dock.tsx", "components/auth/phone-field.tsx"];
    const suppressing = FILES.filter(({ body }) =>
      classTokens(body).some((token) => utilityOf(token) === "outline-none")
    ).map(({ path }) => path);
    expect(suppressing.sort()).toEqual(allowed.sort());
  });
});
