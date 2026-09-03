import { describe, expect, it } from "vitest";

import { opsNav } from "@/components/ops/ops-nav";

describe("opsNav", () => {
  /**
   * The drift this module exists to prevent: the two corridor screens
   * built their own copy of this list and the two case screens built a
   * shorter one, so Corridors vanished from the bar the moment a
   * reviewer opened a case.
   */
  it("carries the corridors entry", () => {
    expect(opsNav.map((i) => i.href)).toContain("/ops/corridors");
  });

  it("keeps the queue first, since AppNav treats item 0 as the section root", () => {
    // `isActive` matches the first item exactly and every other item on
    // its children — reordering this list would light the wrong pill.
    expect(opsNav[0].href).toBe("/ops");
  });
});
