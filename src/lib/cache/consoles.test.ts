import { describe, expect, it } from "vitest";

import { CASE_CONSOLE_PATHS } from "@/lib/cache/consoles";

/**
 * Both sides of a case thread read the same rows, so a write to one has
 * to invalidate the other. Spelling that out at each call site is what
 * went wrong twice in #58: `sendMessage` still named `/[locale]/ops`,
 * which no longer has a case screen, and never gained
 * `/[locale]/agency`, which does — so a reviewer's own message did not
 * appear in the thread they had just posted it to.
 *
 * One list, named once, is the fix. These assert the list rather than
 * the callers, because the callers now have nothing left to get wrong.
 */
describe("CASE_CONSOLE_PATHS", () => {
  it("covers both sides of a case", () => {
    expect(CASE_CONSOLE_PATHS).toContain("/[locale]/app");
    expect(CASE_CONSOLE_PATHS).toContain("/[locale]/agency");
  });

  it("names no console that has no case screen", () => {
    // `/ops` is BeOrchid's own console. Case review moved to the agency
    // in #58 and `/ops` renders no case, so revalidating it was a write
    // to a screen that had stopped existing.
    expect(CASE_CONSOLE_PATHS).not.toContain("/[locale]/ops");
  });

  it("names route-tree paths, so the rewrite resolves them", () => {
    for (const path of CASE_CONSOLE_PATHS) {
      expect(path.startsWith("/[locale]/")).toBe(true);
    }
  });
});
