import type { Page } from "@playwright/test";

/**
 * The three invariants the wayfinding sweep asserts, in one place.
 *
 * They were written inside `sweep.spec.ts`, which covers the five routes
 * a signed-out visitor can reach. The console routes — 28 of them, and
 * the ones a reviewer spends the day in — could not reuse any of it
 * without a copy, and a copied invariant is two invariants that drift.
 *
 * What is asserted, and why each one is here rather than in a unit test:
 *
 *   1. Nothing overflows horizontally at 390px. A page that scrolls
 *      sideways on a phone is broken for the readers this product is
 *      actually for, and it is invisible on a laptop, which is where it
 *      always gets reviewed.
 *   2. `dir` matches the locale. `ar` is live, and a hardcoded `left-`
 *      or `ml-` in a shared component strands Arabic without failing
 *      anything else.
 *   3. Rendered text clears its contrast floor. `tokens.test.ts` proves
 *      the palette's declared pairs clear their floors; it cannot know
 *      which token a component actually put on which ground. This
 *      measures what the browser painted.
 */

/** 390px is an iPhone 12/13/14 mini and the floor the spec names. */
export const NARROW = { width: 390, height: 844 };

export type Violation = { route: string; detail: string };

export type Invariants = {
  mirrored: Violation[];
  overflow: Violation[];
  contrast: Violation[];
};

export function emptyInvariants(): Invariants {
  return { mirrored: [], overflow: [], contrast: [] };
}

/**
 * English is unprefixed. The proxy rewrites a bare path under `en`, so
 * `/en/travelers` is not the canonical address of anything and answering
 * it is the proxy's business, not a sweep's.
 */
export function pathFor(locale: string, route: string): string {
  if (locale === "en") return route;
  return route === "/" ? `/${locale}` : `/${locale}${route}`;
}

export function report(v: Violation[]): string {
  return v.map((x) => `  ${x.route}\n    ${x.detail}`).join("\n");
}

/**
 * Measure one already-loaded page and add anything it breaks to `into`.
 *
 * The caller navigates. That is the whole difference between the public
 * sweep and the console one: a signed-out `page.goto` is the test, and a
 * signed-in one has to survive a redirect to `/sign-in` if the fixture
 * has drifted — which the console sweep checks for itself before
 * measuring.
 */
export async function measureInvariants(
  page: Page,
  {
    path,
    theme,
    dir,
    into,
  }: {
    path: string;
    theme: "light" | "dark";
    dir: string;
    into: Invariants;
  }
): Promise<void> {
  // The theme is stamped on the root rather than driven through the
  // app's own switcher: the switcher is chrome, and a sweep that depends
  // on chrome cannot run on a page whose chrome is what broke. Both
  // selectors, because globals.css keys off each.
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);

  /**
   * Kill transitions before measuring anything.
   *
   * Flipping the theme flips every token under a `transition-[…color]`
   * the design system puts on its controls, so for a few hundred
   * milliseconds the page is painted in blended intermediate colours.
   * Measuring there reported a screenful of contrast failures in dark
   * and none in light — the tell being that light needs no flip. Those
   * readings were of a page mid-fade, not of the design.
   */
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
    }`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);

  const found = await page.evaluate(() => {
    const de = document.documentElement;
    const out = {
      dir: de.dir,
      scrolls: de.scrollWidth > de.clientWidth + 1,
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      wide: [] as string[],
      low: [] as string[],
    };
    const vw = de.clientWidth;

    /**
     * Whether anything above this element clips it. A decorative strip
     * that runs off the edge inside an `overflow-hidden` parent is not
     * an overflow — it is a design, and the page does not scroll because
     * of it. Only an element nothing clips can widen the document.
     */
    const clipped = (el: Element) => {
      let n = el.parentElement;
      while (n && n !== de) {
        const o = getComputedStyle(n);
        if (o.overflowX !== "visible" || o.overflowY !== "visible") return true;
        n = n.parentElement;
      }
      return false;
    };

    const name = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const cls =
        typeof el.className === "string" && el.className
          ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
          : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
    };

    // 1: does the page scroll sideways. That is the invariant —
    // `out.scrolls` is what actually fails the test. The per-element pass
    // exists to name the culprit, because "scrollWidth is 514" tells
    // nobody which element to fix.
    for (const el of document.body.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      // A deliberately off-screen element is not overflow. `sr-only` and
      // the skip link both live out here on purpose.
      if (s.position === "fixed" || s.position === "absolute") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (clipped(el)) continue;
      if (r.right > vw + 1) out.wide.push(`${name(el)} right=${Math.round(r.right)} > ${vw}`);
      if (r.left < -1) out.wide.push(`${name(el)} left=${Math.round(r.left)} < 0`);
    }

    // 3: what the browser actually painted, not what the token said.
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(",").map((n) => parseFloat(n));
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: number, b: number) => {
      const [hi, lo] = a > b ? [a, b] : [b, a];
      return (hi + 0.05) / (lo + 0.05);
    };

    for (const el of document.body.querySelectorAll("*")) {
      // Leaf text only: a wrapper's `color` is inherited by children that
      // may override it, so measuring it measures nothing.
      const text = [...el.childNodes]
        .filter((n) => n.nodeType === 3 && (n.nodeValue || "").trim())
        .map((n) => (n.nodeValue || "").trim())
        .join(" ");
      if (!text) continue;

      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      if (parseFloat(s.opacity) < 1) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      const fg = parse(s.color);
      if (!fg || fg.a < 0.99) continue;

      /**
       * The effective ground, resolved by what is actually painted at the
       * text's own position rather than by walking parents.
       *
       * Ancestor-walking is wrong here and quietly so: a hero's ground is
       * routinely painted by an absolutely-positioned sibling that is
       * nowhere in the text's parent chain, so the walk sails past it to
       * `body` and measures the text against a colour nobody can see.
       * That produced a screenful of 1.1:1 "failures" on `/ar` in dark,
       * every one of them false.
       *
       * `elementsFromPoint` returns the real stack at that point, front
       * to back, overlays and siblings included. The ground is the first
       * thing behind the text that paints opaquely. A gradient or an
       * image has no single value to measure, so it ends the search
       * rather than being guessed at.
       */
      const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
      const stack = document.elementsFromPoint(cx, cy);
      const from = stack.indexOf(el);
      if (from === -1) continue;

      let bg: ReturnType<typeof parse> = null;
      let painted = true;
      // From the element itself, not from behind it: a button paints its
      // own fill, and that fill is the ground its label sits on. Starting
      // one step back measured a white label against the page behind the
      // button — 1.00:1, and false.
      for (const node of stack.slice(from)) {
        const ns = getComputedStyle(node);
        if (ns.backgroundImage !== "none") {
          painted = false;
          break;
        }
        const c = parse(ns.backgroundColor);
        if (c && c.a > 0.99) {
          bg = c;
          break;
        }
        if (c && c.a > 0) {
          painted = false;
          break;
        }
      }
      if (!painted || !bg) continue;

      const size = parseFloat(s.fontSize);
      const weight = Number(s.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const floor = large ? 3 : 4.5;
      const got = ratio(lum(fg), lum(bg));
      if (got < floor) {
        out.low.push(
          `${name(el)} ${got.toFixed(2)}:1 < ${floor} — ${size}px/${weight} "${text.slice(0, 30)}"`
        );
      }
    }
    return out;
  });

  if (found.dir !== dir) {
    into.mirrored.push({ route: path, detail: `dir="${found.dir}", expected "${dir}"` });
  }
  if (found.scrolls) {
    into.overflow.push({
      route: path,
      detail:
        `scrollWidth ${found.scrollWidth} > clientWidth ${found.clientWidth}` +
        (found.wide.length
          ? `\n    unclipped: ${found.wide.slice(0, 4).join("\n    unclipped: ")}`
          : ""),
    });
  }
  for (const d of found.low.slice(0, 4)) into.contrast.push({ route: path, detail: d });
}
