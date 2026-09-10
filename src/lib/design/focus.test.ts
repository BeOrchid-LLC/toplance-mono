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
   * The match is by exception rather than by exact word, and that is the
   * repair of a hole this test shipped with. It used to read
   * `-brand(?![\w-])`, which matched the bare token and nothing else — so
   * it caught `ring-brand` and was blind to every other step on the brand
   * axis. `--brand-2` is the sharpest of those: it is `#4c8fe0`, the same
   * hex the DARK ring uses, which is why it reads as a safe blue. In light
   * it is 2.767:1 on `--bg` and 3.006 on the secondary plate — under, or
   * on, the 3:1 floor. `ring-brand-2` is therefore the shipped bug in the
   * other theme, and had no call site to catch it by.
   *
   * So everything on the axis is an edge offence except the two tokens
   * that exist to be drawn as one: `--brand-text` and `--brand-ink`, which
   * are the same #0a4ea3 in light and lift in dark. `border-brand-text` is
   * the secondary button's whole boundary and is fine. `bg-brand` is fine
   * too and does not match — a fill utility is a different word.
   */
  it("never draws --brand as an edge", () => {
    const offenders: string[] = [];
    for (const { path, body } of FILES) {
      for (const token of classTokens(body)) {
        if (/^(?:ring|border|outline)-brand(?!-(?:text|ink)\b)/.test(utilityOf(token))) {
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
   *
   * The `toContain` pair is necessary and was not sufficient. A fourth
   * declaration inside the same block — `outline-color: transparent` — leaves
   * both strings present and every assertion green while painting nothing,
   * because the later longhand wins over the shorthand it follows. That was
   * one of five evasions an adversarial pass got past this file, and it is
   * the only one that lives in CSS rather than in a class name. So the block
   * is enumerated rather than searched: these three declarations, no fourth.
   */
  it("draws the base ring from --ring, and declares nothing that cancels it", () => {
    const css = readFileSync(GLOBALS, "utf8");
    const rule = css.slice(css.indexOf(":focus-visible {"));
    const block = rule.slice(0, rule.indexOf("}"));

    expect(block).toContain("outline: 2px solid var(--ring)");
    expect(block).toContain("outline-offset: 2px");

    const declared = block
      .slice(block.indexOf("{") + 1)
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => d.slice(0, d.indexOf(":")).trim());

    expect(declared.sort()).toEqual(["border-radius", "outline", "outline-offset"]);
  });

  /**
   * Every spelling of "draw no outline", because Tailwind has three.
   *
   * This check used to be `utilityOf(token) === "outline-none"`, one
   * literal, and it was blind to the other two for as long as it existed.
   * Compiled through tailwindcss 4.3.3's own node API, `.outline-none` and
   * `.outline-hidden` emit the same two declarations —
   * `--tw-outline-style: none; outline-style: none` — and `outline-hidden`
   * adds only a `forced-colors` fallback that paints nothing in a normal
   * render. `.outline-0` gets there by a different route,
   * `outline-width: 0px`, and arrives at the same place: no ring.
   *
   * The cost of the narrow match was three `outline-hidden` sitting in
   * `chart.tsx` while this test reported "exactly two suppressors" and
   * passed. One of them was switching off the focus indicator on the
   * largest tab stop in the console.
   */
  const SUPPRESSES = /^outline-(?:none|hidden|0|\[0(?:\.0+)?(?:px|rem|em|pt|%)?\])$/;

  /**
   * The other way to draw nothing: keep the outline and make it invisible.
   *
   * `outline-transparent` compiles to `outline-color: transparent`, which
   * beats the base rule's shorthand and leaves a control with a 2px ring
   * nobody can see — indistinguishable, at the pixel, from `outline-none`.
   * An adversarial pass got this past the suppression check three ways: on
   * its own, composed with a `ring-border` substitute, and spelled as an
   * arbitrary value. It is the same offence as suppression and is judged by
   * the same allowlist.
   *
   * Scoped to focus variants. `outline-transparent` on a control that is not
   * being focused is a layout device — it reserves the ring's space so the
   * box does not jump when it arrives — and cancels nothing.
   */
  const INVISIBLE = /^outline-(?:transparent|\[transparent\]|\[rgba?\([^)]*[,\s]0(?:\.0+)?\)\])$/;

  /**
   * The suppressions that are allowed, keyed to the exact class that does
   * the suppressing and carrying its reason here.
   *
   * The key is the whole token, variants and all, not the file. That is
   * deliberate and `chart.tsx` is why: its three suppressions were three
   * different decisions written into one `cn()` string, and a file-level
   * allowlist would have waved all three through on the strength of the
   * best one. Keying on `[&_.recharts-layer]:outline-hidden` means the
   * exception covers that selector and no other — a fourth suppression
   * appearing in the same string fails the suite with the class named.
   *
   * The bar for adding a row: the element that takes focus is not the
   * element a person sees and something else draws its ring, or the
   * element takes focus from nothing at all. Neither is "the ring looked
   * wrong here". A row with no reason beside it is the same as no row.
   */
  const ALLOWED_SUPPRESSIONS: Record<string, { count: number; why: string }> = {
    "components/app/intake-dock.tsx: outline-none": {
      count: 1,
      why: "The composer's <textarea>. Its shell carries the ring for it — the deviation :focus-visible in globals.css permits and describes, for an element flush inside a clipped wrapper.",
    },
    "components/auth/phone-field.tsx: outline-none": {
      count: 2,
      why: "The dial-code button and the number field. Three of each one's edges are the shell's, so an outward ring is clipped there and the fourth edge paints a stray 2px bar down the middle of the control. The shell rings for both children.",
    },
    "components/ui/chart.tsx: [&_.recharts-layer]:outline-hidden": {
      count: 1,
      why: "The <g> grouping inside the chart svg, measured on /ops/dashboard with no tabindex attribute at all. Nothing tabs to it; the class suppresses only the stray outline a browser can hang on an SVG child it decides a click focused.",
    },
    "components/ui/chart.tsx: [&_.recharts-sector]:outline-hidden": {
      count: 1,
      why: "The pie and radial-bar wedge, which this product never renders — every chart here is a BarChart, so the selector matches no element on any screen. Dormant rather than justified, and left as stock ships it.",
    },
  };

  /**
   * `.recharts-surface` is the row that is NOT here, and the reason this
   * test was widened before the class was removed rather than after.
   *
   * That svg is `role="application" tabindex="0"` — a keyboard tab stop
   * 280px tall and as wide as its panel — 1094×280 as measured on
   * /ops/dashboard at a 1440 viewport. Stock shadcn suppressed its
   * outline in the same string as the two decorative selectors above, as
   * if the three were one decision. A probe 0–7px out from all four edges read
   * byte-identical focused and blurred, in both themes: a person tabbed
   * onto the largest control on the page and got nothing back. With the
   * class gone the ring lands 2px out on all four edges, 16.886:1 light and
   * 4.985:1 dark.
   *
   * Widening this matcher first is what turned that from a thing somebody
   * had to notice into a named failure — and it is the order to keep. The
   * stricter check lands before the thing it catches is removed, or the
   * removal is the only evidence the check works.
   */
  it("suppresses the outline only where a row here says why", () => {
    const suppressing = new Map<string, number>();
    for (const { path, body } of FILES) {
      for (const token of classTokens(body)) {
        const utility = utilityOf(token);
        const invisible = INVISIBLE.test(utility) && variantsOf(token).includes("focus");
        if (!SUPPRESSES.test(utility) && !invisible) continue;
        const key = `${path}: ${token}`;
        suppressing.set(key, (suppressing.get(key) ?? 0) + 1);
      }
    }

    expect([...suppressing.keys()].sort()).toEqual(Object.keys(ALLOWED_SUPPRESSIONS).sort());

    /**
     * The count, and not merely the key, because a Set was the fifth hole.
     *
     * The rows below are keyed `path: token`, so every occurrence of the
     * same class in the same file collapses to one entry — and an
     * adversarial pass put a second `outline-none` on a different control
     * inside an already-listed file and watched the suite stay green. Two
     * controls suppressed under a reason written for one is exactly the
     * shape of the `chart.tsx` bug this file was widened to catch: three
     * decisions waved through on the strength of the best one.
     *
     * `phone-field.tsx` is the row that legitimately reads 2 — the dial
     * code and the number are two elements under one shell — and it is
     * written out here so that a third would fail rather than hide.
     */
    for (const [key, { count }] of Object.entries(ALLOWED_SUPPRESSIONS)) {
      expect(`${key} ×${suppressing.get(key)}`).toBe(`${key} ×${count}`);
    }

    for (const { why } of Object.values(ALLOWED_SUPPRESSIONS)) {
      expect(why.length).toBeGreaterThan(40);
    }
  });
});
