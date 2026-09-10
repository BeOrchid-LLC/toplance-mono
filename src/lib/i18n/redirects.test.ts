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
 * is the shape of a call, the redirect targets are literals, and there
 * is no component-test infrastructure here to render a gate in.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

/**
 * Comments first. Several of the files fixed here explain in prose what
 * they used to do, quoting the bare call — and a scanner that reads those
 * back reports every fix as the bug it fixed.
 */
function stripComments(body: string): string {
  return body.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
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

const CALL = /\b(?:permanentRedirect|redirect)\(\s*(["'])(\/[^"'`]*)\1/g;

describe("localised redirects", () => {
  const files = sourceFiles(SRC);

  it("has files to scan", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("never redirects to a bare page path", () => {
    const offenders: string[] = [];

    for (const path of files) {
      const body = stripComments(readFileSync(path, "utf8"));
      for (const match of body.matchAll(CALL)) {
        const target = match[2];
        if (isNonPage(target)) continue;
        const line = body.slice(0, match.index).split("\n").length;
        offenders.push(`${path.slice(SRC.length)}:${line} → ${target}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
