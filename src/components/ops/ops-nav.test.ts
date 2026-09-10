import { describe, expect, it } from "vitest";

import { localizedOpsNav, opsNav } from "@/components/ops/ops-nav";
import { ADMIN_ICONS } from "@/components/shared/admin-icons";
import { opsAdminNav } from "@/components/shared/admin-nav";

describe("opsNav", () => {
  it("carries the corridors entry", () => {
    expect(opsNav.map((i) => i.href)).toContain("/ops/corridors");
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
    expect(opsNav.map((i) => i.href)).toContain("/ops/tenants");
    expect(opsNav[1].href).toBe("/ops/tenants");
  });
});

/**
 * The overview, moved to the front on 2026-09-08 at the client's
 * request. `AppNav.isActive` matches item 0 exactly as the section root,
 * so this is also what makes the dashboard the console's front door.
 */
describe("the dashboard entry", () => {
  it("leads the list, as the section root", () => {
    expect(opsNav[0].href).toBe("/ops/dashboard");
  });

  it("is offered to a director and withheld from a reviewer", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/dashboard");
    expect(localizedOpsNav("en", false).map((i) => i.href)).not.toContain(
      "/ops/dashboard"
    );
  });
});

/**
 * Route curation, moved to the back by the same request. The pairing is
 * the point: an overview a director opens for ten seconds leads, and the
 * reference data every case is judged against closes.
 */
describe("the routes entry", () => {
  it("comes last, for both ranks", () => {
    expect(opsNav.at(-1)?.href).toBe("/ops/corridors");
    expect(localizedOpsNav("en", true).at(-1)?.href).toBe("/ops/corridors");
    expect(localizedOpsNav("en", false).at(-1)?.href).toBe("/ops/corridors");
  });

  /**
   * `/ops` used to redirect at a fixed path, which is why the dashboard
   * was kept out of slot 0. It now reads the rank instead (`OpsHome`), so
   * a reviewer is never sent at a screen that refuses them — and this
   * pins the half of that contract the nav owns: the entry a reviewer
   * lands on is still one they can open.
   */
  it("is offered to every rank", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/corridors");
    expect(localizedOpsNav("en", false).map((i) => i.href)).toContain("/ops/corridors");
  });
});

/**
 * The verification queue, added on 2026-09-08 — the sixth entry in a
 * nav whose own comment says curation closes the list. The exception is
 * argued in `ops-nav.ts` and pinned here: KYB is a queue, and a queue
 * with no front door is a queue nobody works.
 */
describe("the KYB entry", () => {
  it("sits beside agencies, before the enquiry queue", () => {
    expect(opsNav[1].href).toBe("/ops/tenants");
    expect(opsNav[2].href).toBe("/ops/kyb");
  });

  /**
   * Like the enquiry queue and unlike the two director-only rows.
   * `/ops/kyb` refuses nobody who is staff, so hiding it from a reviewer
   * would hide a screen they may actually open — and verifying a
   * business is the platform team's shared work.
   */
  it("is offered to every rank", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/kyb");
    expect(localizedOpsNav("en", false).map((i) => i.href)).toContain("/ops/kyb");
  });

  /**
   * The one badge on this rail that shortens because somebody did the
   * work behind it. It must not drift onto the agencies row the way the
   * enquiry count once did.
   */
  it("carries the awaiting-KYB count, and no other row does", () => {
    const rows = opsAdminNav({
      locale: "en",
      pendingRoutes: 0,
      openDemoRequests: 0,
      openSupport: 0,
      agenciesAwaitingKyb: 3,
      isOwner: true,
    }).flatMap((g) => g.items);

    expect(rows.find((i) => i.id === "kyb")?.badge).toBe(3);
    expect(rows.find((i) => i.id === "agencies")?.badge).toBeUndefined();
  });
});

/**
 * The enquiry queue. It used to be a table at the foot of
 * `/ops/tenants`, below the agency list and its pagination — present,
 * and not findable.
 */
describe("the enquiries entry", () => {
  it("comes after KYB", () => {
    expect(opsNav[2].href).toBe("/ops/kyb");
    expect(opsNav[3].href).toBe("/ops/enquiries");
  });

  /**
   * Unlike the two rows a director alone sees. Working the enquiry queue
   * is the whole platform team's job, and `/ops/enquiries` refuses nobody
   * who is staff — so hiding it from a reviewer would hide a screen they
   * may actually open.
   */
  it("is offered to every rank", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/enquiries");
    expect(localizedOpsNav("en", false).map((i) => i.href)).toContain("/ops/enquiries");
  });
});

describe("the colleagues entry", () => {
  it("comes after the enquiry queue", () => {
    expect(opsNav[3].href).toBe("/ops/enquiries");
    expect(opsNav[4].href).toBe("/ops/staff");
  });

  it("is offered to a director and withheld from a reviewer", () => {
    expect(localizedOpsNav("en", true).map((i) => i.href)).toContain("/ops/staff");
    expect(localizedOpsNav("en", false).map((i) => i.href)).not.toContain("/ops/staff");
  });

  it("still offers a reviewer the four screens that are theirs", () => {
    expect(localizedOpsNav("en", false).map((i) => i.href)).toEqual([
      "/ops/tenants",
      "/ops/kyb",
      "/ops/enquiries",
      "/ops/support",
      "/ops/corridors",
    ]);
  });
});

describe("opsAdminNav", () => {
  const counts = { pendingRoutes: 0, openDemoRequests: 0, openSupport: 0, agenciesAwaitingKyb: 0 };
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
  it("shows the dashboard to a director and hides it from a reviewer", () => {
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
   * Route curation below "Toplance operations", not above it — the same
   * move the top-bar nav makes, expressed as the rail's group order.
   */
  it("puts route curation in the last group, on its own", () => {
    const groups = opsAdminNav({ locale: "en", ...counts, isOwner: true });

    expect(groups.at(-1)?.items.map((i) => i.id)).toEqual(["routes"]);
    // Unlabelled, so it has to ask for the gap that separates it from
    // the operations rows — an unlabelled group runs on from its
    // neighbour otherwise.
    expect(groups.at(-1)?.label).toBeUndefined();
    expect(groups.at(-1)?.separated).toBe(true);
    // The operations heading is above it, which is what "below" means
    // once the rail is the thing rendering.
    expect(groups[0].label).toBeTruthy();
    expect(groups[0].items.map((i) => i.id)).not.toContain("routes");
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
      openSupport: 0,
      agenciesAwaitingKyb: 0,
      isOwner: true,
    }).flatMap((g) => g.items);

    expect(rows.find((i) => i.id === "enquiries")?.badge).toBe(4);
    expect(rows.find((i) => i.id === "agencies")?.badge).toBeUndefined();
  });

  /**
   * The same test for support, which arrives from outside and shortens
   * when somebody acts on it — the two properties that earn a badge.
   */
  it("hangs the unclaimed-support count on the support row", () => {
    const rows = opsAdminNav({
      locale: "en",
      pendingRoutes: 0,
      openDemoRequests: 0,
      openSupport: 3,
      agenciesAwaitingKyb: 0,
      isOwner: false,
    }).flatMap((g) => g.items);

    expect(rows.find((i) => i.id === "support")?.badge).toBe(3);
  });

  /** Every rank, like the enquiry queue: a dispute should not wait. */
  it("shows support to a reviewer as well as a director", () => {
    expect(hrefs(false)).toContain("/ops/support");
    expect(hrefs(true)).toContain("/ops/support");
  });

  /**
   * The client asked for this on 8 September and it was reported done
   * twice before it was. `opsNav` listed the dashboard first, which is
   * what made it look done — but the rail is a separate list, and it is
   * the rail that renders. Assert the thing on screen, not the thing
   * that resembles it.
   */
  it("opens a director's rail on the dashboard", () => {
    const groups = opsAdminNav({ locale: "en", ...counts, isOwner: true });
    expect(groups[0].items[0].id).toBe("business");
  });

  it("opens a reviewer's rail on the agencies, since the dashboard is not theirs", () => {
    const groups = opsAdminNav({ locale: "en", ...counts, isOwner: false });
    expect(groups[0].items[0].id).toBe("agencies");
  });

  it("hangs every row on an icon the table actually has", () => {
    for (const group of opsAdminNav({ locale: "en", ...counts, isOwner: true })) {
      for (const item of group.items) {
        expect(ADMIN_ICONS).toHaveProperty(item.icon);
      }
    }
  });
});
