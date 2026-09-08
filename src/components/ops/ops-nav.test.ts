import { describe, expect, it } from "vitest";

import { localizedOpsNav, opsNav } from "@/components/ops/ops-nav";

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

  it("carries the tenants entry, second", () => {
    // Not first: `AppNav.isActive` matches item 0 exactly as the section
    // root, and `/ops` redirects to `/ops/corridors`. Reordering this
    // list lights the wrong pill.
    expect(opsNav.map((i) => i.href)).toContain("/ops/tenants");
    expect(opsNav[1].href).toBe("/ops/tenants");
  });
});

describe("the colleagues entry", () => {
  it("comes third, leaving the first two where they were", () => {
    // `AppNav.isActive` matches item 0 exactly as the section root, and
    // `/ops` redirects to it. Anything inserted ahead of these two lights
    // the wrong pill.
    expect(opsNav[0].href).toBe("/ops/corridors");
    expect(opsNav[1].href).toBe("/ops/tenants");
    expect(opsNav[2].href).toBe("/ops/staff");
  });

  it("is offered to an owner and withheld from a reviewer", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/staff");
    expect(localizedOpsNav("en", false).map((i) => i.href)).not.toContain("/ops/staff");
  });

  it("still offers a reviewer the two consoles that are theirs", () => {
    expect(localizedOpsNav("en", false).map((i) => i.href)).toEqual([
      "/ops/corridors",
      "/ops/tenants",
    ]);
  });
});
