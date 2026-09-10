import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Every redirect keeps the reader's language.
 *
 * The locale lives in the URL and nowhere else. `src/proxy.ts` reads it
 * with `splitLocalePath` and there is no cookie and no `Accept-Language`
 * fallback behind that — deliberately, because a language a reader can
 * see in the address bar is one they can change, bookmark and send to
 * somebody else. The consequence is that an unprefixed path is not
 * "whatever language this person was reading". It is English.
 *
 * So `redirect("/agency")` inside the localised tree is a language
 * change. A Hausa director hits a gate and arrives in English, with
 * nothing on screen to say why and no way back but the language menu.
 *
 * This was found by the console sweep rather than by review:
 * `/ar/agency/verification` reported `dir="ltr"` in both themes, because
 * an activated agency is redirected off that screen and the redirect
 * dropped the prefix. Looking for the one bug found 35 of them — every
 * gated redirect in the product, across the traveller, agency and ops
 * surfaces. The proxy itself always got this right (it re-applies the
 * prefix on all three of its own redirects), which is what kept the
 * pattern invisible: the layer that thought about locales was not the
 * layer doing most of the redirecting.
 *
 * A text scan, for the same reason `focus.test.ts` is one: the failure
 * is the shape of a call, and there is no component-test infrastructure
 * here to render a gate in.
 *
 * It scans for the *shape* rather than for bare literals, and that is
 * the second version of this file. The first matched only a quoted
 * string argument — `redirect("/agency")` — and passed green over five
 * calls that were still dropping the locale, because they pass a
 * variable: `redirect(destination)` in `/go`, `redirect(homeFor(role))`
 * in four gates, and a template literal in each retired sign-in door.
 * `/go` was the worst of them, since it is where the fixed gates send
 * people, so the repair was undone one hop later and the test could not
 * see it. So the rule is now the one that actually holds: whatever a
 * redirect is handed, it comes out of `withLocalePrefix`.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Route handlers are skipped, and only they.
 *
 * `route.ts` files live outside the localised tree — there is no
 * `/en/api/...`, which is the whole of why `isNonPagePath` exists — so a
 * redirect from one is never a page redirect and has no prefix to keep.
 * `/api/kyb/[orgId]/[docKey]` redirects to a signed storage URL, which
 * is not even a path.
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (
      /\.tsx?$/.test(entry) &&
      !/\.test\.tsx?$/.test(entry) &&
      !/^route\.tsx?$/.test(entry)
    ) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Comments first. Several of the files fixed here explain in prose what
 * they used to do, quoting the bare call — and a scanner that reads those
 * back reports every fix as the bug it fixed.
 *
 * Blanked rather than deleted, so the line numbers below still name the
 * line the offending call is actually on. A block comment replaced by a
 * single space collapses every line it spanned, and this file's whole
 * job is to point at a call somebody then has to go and find.
 */
function stripComments(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Paths that carry no locale segment and must not be given one.
 *
 * Route handlers live outside the localised tree, so `/en/api/...` does
 * not exist — prefixing `/api/cron/*` would 404 every scheduled job.
 * `isNonPagePath` in `paths.ts` is the same list; it is repeated here
 * rather than imported so that this test still describes its own rule.
 */
function isNonPage(path: string): boolean {
  return path.startsWith("/api/") || path.startsWith("/__clerk");
}

/**
 * `redirect(` and `permanentRedirect(`, but never `.redirect(`.
 *
 * `NextResponse.redirect` is the proxy's, and the proxy is the one layer
 * that always got this right — it re-applies the prefix on all three of
 * its own redirects, and it takes a `URL` rather than a path, so the
 * rule below does not describe it.
 */
const CALL = /(?:^|[^.\w$])(permanentRedirect|redirect)\(/g;

/**
 * The call's argument, as written. Tracks quotes so a `)` inside a
 * string or a template literal does not close the call early — both
 * retired sign-in doors pass one.
 */
function argumentOf(body: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;

  for (let i = open; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return body.slice(open + 1, i);
  }
  return body.slice(open + 1);
}

/** A quoted string and nothing else — the only argument exempt at all. */
const LITERAL = /^(["'])(\/[^"'`]*)\1$/;

describe("localised redirects", () => {
  const files = sourceFiles(SRC);

  it("has files to scan", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("passes every redirect target through withLocalePrefix", () => {
    const offenders: string[] = [];

    for (const path of files) {
      const body = stripComments(readFileSync(path, "utf8"));
      for (const match of body.matchAll(CALL)) {
        const open = match.index + match[0].length - 1;
        const target = argumentOf(body, open).trim();

        if (target.startsWith("withLocalePrefix(")) continue;
        const literal = LITERAL.exec(target);
        if (literal && isNonPage(literal[2])) continue;

        const line = body.slice(0, match.index).split("\n").length;
        offenders.push(
          `${path.slice(SRC.length)}:${line} → ${target.replace(/\s+/g, " ")}`
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
