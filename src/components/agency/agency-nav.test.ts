import { describe, expect, it } from "vitest";

import { agencyNav } from "@/components/agency/agency-nav";
import { ADMIN_ICONS } from "@/components/shared/admin-icons";
import { agencyAdminNav } from "@/components/shared/admin-nav";

const withOrg = { locale: "en" as const, hasOrganisation: true, isDirector: true };

describe("agencyNav", () => {
  it("keeps the dashboard first, since AppNav treats item 0 as the section root", () => {
    // `isActive` matches item 0 exactly and every other item on its
    // children — reordering this list would light the wrong item.
    expect(agencyNav(withOrg)[0].href).toBe("/agency");
  });

  it("carries the rosters, the invitations, the plan and support as their own pages", () => {
    expect(agencyNav(withOrg).map((i) => i.href)).toEqual([
      "/agency",
      "/agency/clients",
      "/agency/clients/invitations",
      "/agency/team",
      "/agency/billing",
      "/agency/support",
    ]);
  });

  /**
   * The roster is the section's front door, and the invitations sit
   * directly under it. Split out of `/agency/clients` on 2026-09-08 —
   * reversing the order would make an empty invitation list the first
   * thing an agency sees on opening its console.
   */
  it("opens the clients section on the roster, with invitations beneath", () => {
    const hrefs = agencyNav(withOrg).map((i) => i.href);
    expect(hrefs.indexOf("/agency/clients")).toBeLessThan(
      hrefs.indexOf("/agency/clients/invitations")
    );
  });

  it("offers a reviewer neither the roster nor the plan", () => {
    // Both are questions about running the agency rather than about
    // handling a case, and both pages turn a reviewer away — a hidden
    // link is not the guard, it is the courtesy.
    //
    // Support is on the list because it is not such a question: it is
    // the way out of a case going wrong, and the reviewer is the person
    // it went wrong for.
    expect(
      agencyNav({ locale: "en", hasOrganisation: true, isDirector: false }).map(
        (i) => i.href
      )
    ).toEqual(["/agency", "/agency/clients", "/agency/support"]);
  });

  /**
   * The rule sets tab came off both navs on 2026-09-09, at the client's
   * request. This is the inverse of the test it replaces, kept rather
   * than deleted so the omission reads as a decision and not an
   * oversight: the page still stands at `/agency/rule-sets`, still
   * guarded by `requireAgencyConsole`, and whoever finds an unlinked
   * route is meant to leave it unlinked. The reasoning, and what to put
   * back, is on the matching item in `agency-nav.ts`.
   */
  it("offers the rule sets at neither rank, the page being unlinked not gone", () => {
    for (const isDirector of [true, false]) {
      expect(
        agencyNav({ locale: "en", hasOrganisation: true, isDirector }).map(
          (i) => i.href
        )
      ).not.toContain("/agency/rule-sets");
    }
  });

  /**
   * Support is the exception to the rule the two tests around it prove.
   *
   * Everything else kept from a reviewer is a question about running
   * the agency. Support is a question about a case going wrong, and the
   * reviewer is the person it went wrong for — routing the only channel
   * out through their director would make a dispute wait on somebody
   * else's calendar.
   */
  it("offers support to every rank", () => {
    const reviewer = agencyNav({
      locale: "en",
      hasOrganisation: true,
      isDirector: false,
    }).map((i) => i.href);
    expect(reviewer).toContain("/agency/support");
    expect(agencyNav(withOrg).map((i) => i.href)).toContain("/agency/support");
  });

  /**
   * Both tabs redirect to `/agency` without a membership — see
   * `requireAgencyConsole` — so a director still naming their
   * organisation is offered neither.
   */
  it("offers nothing but the dashboard until an organisation exists", () => {
    expect(agencyNav({ locale: "en", hasOrganisation: false })).toHaveLength(1);
  });

  it("keeps the team roster to the director", () => {
    // A reviewer's console is their own desk. Who works here and what
    // rank they hold is the agency's business, not a case's.
    expect(
      agencyNav({ locale: "en", hasOrganisation: true }).map((i) => i.href)
    ).toEqual(["/agency", "/agency/clients", "/agency/support"]);
  });

  it("keeps the client invitations to the director", () => {
    // An address nobody has accepted is not yet a client, and certainly
    // not this reviewer's. The page redirects them too — the hidden row
    // is the courtesy, not the guard.
    expect(
      agencyNav({ locale: "en", hasOrganisation: true, isDirector: false }).map(
        (i) => i.href
      )
    ).not.toContain("/agency/clients/invitations");
  });

  it("resolves its labels against the locale it is given", () => {
    expect(
      agencyNav({ locale: "fr", hasOrganisation: true, isDirector: true })[1].label
    ).toBe("Clients");
  });
});

describe("agencyAdminNav", () => {
  const counts = {
    clients: 0,
    pendingClientInvitations: 0,
    pendingTeamInvitations: 0,
  };
  const hrefs = (isDirector: boolean) =>
    agencyAdminNav({
      locale: "en",
      hasOrganisation: true,
      ...counts,
      isDirector,
    }).flatMap((g) => g.items.map((i) => i.href));

  /**
   * The rail is what actually renders — `agencyNav` and this list are two
   * answers to the same question, and they must not disagree about who
   * may see what. The platform console pins the same thing.
   */
  it("agrees with the top-bar nav on every destination", () => {
    expect(hrefs(true).sort()).toEqual(
      agencyNav({ locale: "en", hasOrganisation: true, isDirector: true })
        .map((i) => i.href)
        .sort()
    );
    expect(hrefs(false).sort()).toEqual(
      agencyNav({ locale: "en", hasOrganisation: true, isDirector: false })
        .map((i) => i.href)
        .sort()
    );
  });

  it("puts invitations in the clients group, straight after the roster", () => {
    const first = agencyAdminNav({
      locale: "en",
      hasOrganisation: true,
      ...counts,
      isDirector: true,
    })[0];

    expect(first.items.map((i) => i.id)).toEqual([
      "overview",
      "clients",
      "invitations",
    ]);
  });

  /**
   * One figure served both badges before the split, which put every
   * unanswered client invitation on the Team row — a count of people
   * waiting to join the staff that was mostly travellers.
   */
  it("counts client and team invitations on their own rows", () => {
    const rows = agencyAdminNav({
      locale: "en",
      hasOrganisation: true,
      clients: 3,
      pendingClientInvitations: 4,
      pendingTeamInvitations: 1,
      isDirector: true,
    }).flatMap((g) => g.items);

    expect(rows.find((i) => i.id === "invitations")?.badge).toBe(4);
    expect(rows.find((i) => i.id === "team")?.badge).toBe(1);
    expect(rows.find((i) => i.id === "clients")?.badge).toBe(3);
  });

  it("hangs every row on an icon the table actually has", () => {
    for (const group of agencyAdminNav({
      locale: "en",
      hasOrganisation: true,
      ...counts,
      isDirector: true,
    })) {
      for (const item of group.items) {
        expect(ADMIN_ICONS).toHaveProperty(item.icon);
      }
    }
  });
});
