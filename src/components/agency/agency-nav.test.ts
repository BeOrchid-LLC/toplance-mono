import { describe, expect, it } from "vitest";

import { agencyNav } from "@/components/agency/agency-nav";

const withOrg = { locale: "en" as const, hasOrganisation: true, isDirector: true };

describe("agencyNav", () => {
  it("keeps the dashboard first, since AppNav treats item 0 as the section root", () => {
    // `isActive` matches item 0 exactly and every other item on its
    // children — reordering this list would light the wrong item.
    expect(agencyNav(withOrg)[0].href).toBe("/agency");
  });

  it("carries the two rosters and the plan as their own pages", () => {
    expect(agencyNav(withOrg).map((i) => i.href)).toEqual([
      "/agency",
      "/agency/clients",
      "/agency/team",
      "/agency/billing",
    ]);
  });

  it("offers a reviewer neither the roster nor the plan", () => {
    // Both are questions about running the agency rather than about
    // handling a case, and both pages turn a reviewer away — a hidden
    // link is not the guard, it is the courtesy.
    expect(
      agencyNav({ locale: "en", hasOrganisation: true, isDirector: false }).map(
        (i) => i.href
      )
    ).toEqual(["/agency", "/agency/clients"]);
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
    ).toEqual(["/agency", "/agency/clients"]);
  });

  it("resolves its labels against the locale it is given", () => {
    expect(
      agencyNav({ locale: "fr", hasOrganisation: true, isDirector: true })[1].label
    ).toBe("Clients");
  });
});
