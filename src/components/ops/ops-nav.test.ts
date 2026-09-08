import { describe, expect, it } from "vitest";

import { localizedOpsNav, opsNav } from "@/components/ops/ops-nav";
import { ADMIN_ICONS } from "@/components/shared/admin-icons";
import { opsAdminNav } from "@/components/shared/admin-nav";

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

/**
 * The enquiry queue. It used to be a table at the foot of
 * `/ops/tenants`, below the agency list and its pagination — present,
 * and not findable.
 */
describe("the enquiries entry", () => {
  it("comes after agencies, leaving the first two where they were", () => {
    // `AppNav.isActive` matches item 0 exactly as the section root, and
    // `/ops` redirects to it. Anything inserted ahead of these two lights
    // the wrong pill.
    expect(opsNav[0].href).toBe("/ops/corridors");
    expect(opsNav[1].href).toBe("/ops/tenants");
    expect(opsNav[2].href).toBe("/ops/enquiries");
  });

  /**
   * Unlike the two rows after it. Working the enquiry queue is the whole
   * platform team's job, and `/ops/enquiries` refuses nobody who is
   * staff — so hiding it from a reviewer would hide a screen they may
   * actually open.
   */
  it("is offered to every rank", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/enquiries");
    expect(localizedOpsNav("en", false).map((i) => i.href)).toContain("/ops/enquiries");
  });
});

describe("the colleagues entry", () => {
  it("comes after the enquiry queue, leaving the first two where they were", () => {
    expect(opsNav[0].href).toBe("/ops/corridors");
    expect(opsNav[1].href).toBe("/ops/tenants");
    expect(opsNav[3].href).toBe("/ops/staff");
  });

  it("is offered to an owner and withheld from a reviewer", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/staff");
    expect(localizedOpsNav("en", false).map((i) => i.href)).not.toContain("/ops/staff");
  });

  it("still offers a reviewer the three screens that are theirs", () => {
    expect(localizedOpsNav("en", false).map((i) => i.href)).toEqual([
      "/ops/corridors",
      "/ops/tenants",
      "/ops/enquiries",
    ]);
  });
});

/**
 * `/ops/dashboard` refuses anyone who is not an owner, so offering a
 * reviewer the link would be offering them a refusal — and a nav row
 * that turns you away is worse than no nav row. The bar and the gate
 * have to agree; these pin that they do.
 */
describe("the dashboard entry", () => {
  it("comes last, so /ops never redirects a reviewer at a refusal", () => {
    // `AppNav.isActive` matches item 0 exactly as the section root and
    // `/ops` redirects to it. An overview at the front would land every
    // reviewer on the one screen they cannot open.
    expect(opsNav[0].href).toBe("/ops/corridors");
    expect(opsNav.at(-1)?.href).toBe("/ops/dashboard");
  });

  it("is offered to an owner and withheld from a reviewer", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/dashboard");
    expect(localizedOpsNav("en", false).map((i) => i.href)).not.toContain(
      "/ops/dashboard"
    );
  });
});

describe("opsAdminNav", () => {
  const counts = { pendingRoutes: 0, openDemoRequests: 0 };
  const hrefs = (isOwner: boolean) =>
    opsAdminNav({ locale: "en", ...counts, isOwner }).flatMap((g) =>
      g.items.map((i) => i.href)
    );

  /**
   * The rail is what actually renders — `localizedOpsNav` and this list
   * are two answers to the same question, and the drift they were both
   * written to prevent would come back the moment they disagreed about
   * who may see what.
   */
  it("shows the dashboard to an owner and hides it from a reviewer", () => {
    expect(hrefs(true)).toContain("/ops/dashboard");
    expect(hrefs(false)).not.toContain("/ops/dashboard");
  });

  it("agrees with the top-bar nav on every destination", () => {
    expect(hrefs(true).sort()).toEqual(
      localizedOpsNav("en", true)
        .map((i) => i.href)
        .sort()
    );
    expect(hrefs(false).sort()).toEqual(
      localizedOpsNav("en", false)
        .map((i) => i.href)
        .sort()
    );
  });

  /**
   * The badge belongs to the row that leads to the work. It hung on
   * "Agencies" while the queue lived at the foot of that page; a count
   * of open enquiries beside a link to a list of agencies now names one
   * thing and opens another.
   */
  it("hangs the open-enquiry count on the enquiries row and nowhere else", () => {
    const rows = opsAdminNav({
      locale: "en",
      pendingRoutes: 0,
      openDemoRequests: 4,
      isOwner: true,
    }).flatMap((g) => g.items);

    expect(rows.find((i) => i.id === "enquiries")?.badge).toBe(4);
    expect(rows.find((i) => i.id === "agencies")?.badge).toBeUndefined();
  });

  it("hangs every row on an icon the table actually has", () => {
    for (const group of opsAdminNav({ locale: "en", ...counts, isOwner: true })) {
      for (const item of group.items) {
        expect(ADMIN_ICONS).toHaveProperty(item.icon);
      }
    }
  });
});
