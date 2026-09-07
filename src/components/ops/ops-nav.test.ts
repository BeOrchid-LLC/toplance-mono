import { describe, expect, it } from "vitest";

import { opsNav } from "@/components/ops/ops-nav";

describe("opsNav", () => {
  it("carries the corridors entry", () => {
    expect(opsNav.map((i) => i.href)).toContain("/ops/corridors");
  });

  it("keeps route curation first, since AppNav treats item 0 as the section root", () => {
    // `isActive` matches the first item exactly and every other item on
    // its children — reordering this list would light the wrong pill.
    expect(opsNav[0].href).toBe("/ops/corridors");
  });

  /**
   * The v1.3 tenancy. BeOrchid provisions agencies, curates routes and
   * reads the audit log; it reviews nothing. A case queue in this nav
   * would be a link to a screen that must not exist — and the surface it
   * pointed at read documents directly, without going through
   * `requireApplicationAccess` at all.
   */
  it("offers no route into a traveller's case", () => {
    for (const item of opsNav) {
      expect(item.href).not.toMatch(/\/cases/);
    }
    expect(opsNav.map((i) => i.href)).not.toContain("/ops");
  });
});
