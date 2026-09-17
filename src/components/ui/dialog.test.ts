import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The dialog's fit-to-viewport contract, as a text scan.
 *
 * There is no component-test environment here (`vitest.config.mts` runs
 * in `node`), and what broke was a class list rather than a behaviour:
 * a box centred with nothing capping its height, so the client could not
 * reach the title, the close button or the submit button of a long form
 * on a 1920x950 window (review of 2026-09-17). Two dialogs had patched it
 * locally by making the whole box scroll, which scrolls the close button
 * away with the title — this keeps both fixes from coming back.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));
const DIALOG = readFileSync(join(SRC, "components/ui/dialog.tsx"), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (entry.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/** The class string on `DialogPrimitive.Content` in the primitive. */
function contentClasses(): string {
  const match = DIALOG.match(/data-slot="dialog-content"\s+className=\{cn\(\s*"([^"]+)"/);
  if (!match) throw new Error("DialogContent's class list was not found");
  return match[1];
}

describe("DialogContent", () => {
  it("is capped at the viewport and lays out as a column", () => {
    const classes = contentClasses().split(/\s+/);
    expect(classes).toContain("max-h-[calc(100dvh-2rem)]");
    expect(classes).toContain("flex");
    expect(classes).toContain("flex-col");
  });

  it("does not scroll as a whole, so the close button stays put", () => {
    expect(contentClasses()).not.toMatch(/\boverflow-/);
  });

  it("gives long dialogs a body that can shrink and scroll", () => {
    const body = DIALOG.match(/data-slot="dialog-body"\s+className=\{cn\("([^"]+)"/);
    expect(body).not.toBeNull();
    const classes = body![1].split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto"]));
  });

  it("is never made to scroll at a call site", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles(join(SRC, "components"))) {
      const body = readFileSync(path, "utf8");
      for (const [tag] of body.matchAll(/<DialogContent\b[^>]*>/g)) {
        if (/overflow-(?:y-)?(?:auto|scroll)/.test(tag)) {
          offenders.push(`${path.slice(SRC.length)}: ${tag}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
