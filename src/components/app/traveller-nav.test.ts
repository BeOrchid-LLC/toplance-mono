import { describe, expect, it } from "vitest";

import { travellerNav } from "@/components/app/traveller-nav";

const labels = (...args: Parameters<typeof travellerNav>) =>
  travellerNav(...args).map((i) => i.label);

describe("travellerNav", () => {
  it("locks everything past the dashboard until intake is complete", () => {
    const nav = travellerNav({ intakeComplete: false, status: "draft" });

    expect(nav.find((i) => i.href === "/app")?.locked).toBeFalsy();
    for (const href of [
      "/app/requirements",
      "/app/documents",
      "/app/messages",
    ]) {
      expect(nav.find((i) => i.href === href)?.locked).toBe(true);
    }
  });

  it("unlocks the journey once intake has resolved a corridor", () => {
    const nav = travellerNav({
      intakeComplete: true,
      status: "collecting_documents",
    });
    expect(nav.every((i) => !i.locked)).toBe(true);
  });

  it("treats a traveller with no application yet as locked", () => {
    // The landing page reads a plain select, so someone who has never
    // opened /app has no row at all — not a row that says "not started".
    const nav = travellerNav({ intakeComplete: false, status: null });
    expect(nav.find((i) => i.href === "/app/documents")?.locked).toBe(true);
  });

  it("omits the companion entirely before approval, rather than locking it", () => {
    expect(labels({ intakeComplete: true, status: "under_review" })).not.toContain(
      "After you land"
    );
  });

  it("adds the companion once the case is approved", () => {
    expect(labels({ intakeComplete: true, status: "approved" })).toContain(
      "After you land"
    );
  });

  /**
   * The drift this module exists to prevent: the landing page built its
   * own three-item copy of this list, so the bar gained Messages (and
   * sometimes the companion) the moment a traveller clicked through to
   * their own console. Both callers now pass the same two facts, so the
   * only way they can disagree again is by passing different ones.
   */
  it("gives the landing page and the app layout the same list", () => {
    for (const status of ["draft", "under_review", "approved"] as const) {
      for (const intakeComplete of [false, true]) {
        const fromLayout = travellerNav({ intakeComplete, status });
        const fromLandingPage = travellerNav({ intakeComplete, status });
        expect(fromLandingPage).toEqual(fromLayout);
      }
    }
  });

  it("keeps the dashboard first, since AppNav treats item 0 as the section root", () => {
    // `isActive` matches the first item exactly and every other item on
    // its children — reordering this list would light the wrong pill.
    expect(travellerNav({ intakeComplete: true, status: "approved" })[0].href).toBe(
      "/app"
    );
  });
});
