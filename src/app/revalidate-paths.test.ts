import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every route in this app lives under `src/app/[locale]/`, and the
 * browser-facing paths — `/app`, `/agency`, `/ops` — only reach it
 * through the proxy's rewrite. `revalidatePath` is documented to take
 * the rewrite's *destination*, not the source in the address bar
 * (`next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`),
 * so a call written `revalidatePath("/agency")` silently revalidates
 * nothing.
 *
 * Silently is the problem: it typechecks, it lints, and the only symptom
 * is a screen that does not update after a server action. #58 shipped
 * five such calls precisely because nothing here could see them. This
 * asserts the shape instead of trusting each new action to remember it.
 */
const APP_DIR = new URL("../app/", import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    // This file quotes the wrong form to explain it; it is not a call site.
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Every string literal handed to `revalidatePath`, with the file it came from. */
function revalidatedPaths(): { file: string; path: string }[] {
  return sourceFiles(APP_DIR).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/revalidatePath\(\s*"([^"]*)"/g)].map((match) => ({
      file: file.slice(APP_DIR.length),
      path: match[1],
    }));
  });
}

describe("revalidatePath calls", () => {
  it("finds the calls it is meant to be checking", () => {
    // Guards the regex itself: a test that silently matches nothing
    // passes forever and protects nothing.
    expect(revalidatedPaths().length).toBeGreaterThan(10);
  });

  it("all name the route-tree path, not the browser path", () => {
    const wrong = revalidatedPaths().filter((c) => !c.path.startsWith("/[locale]"));

    expect(wrong).toEqual([]);
  });
});
