import { describe, expect, it } from "vitest";

import { agencyNav } from "@/components/agency/agency-nav";

const withOrg = { locale: "en" as const, hasOrganisation: true };

describe("agencyNav", () => {
  it("keeps the dashboard first, since AppNav treats item 0 as the section root", () => {
    // `isActive` matches item 0 exactly and every other item on its
    // children — reordering this list would light the wrong item.
    expect(agencyNav(withOrg)[0].href).toBe("/agency");
  });

  it("carries the two rosters as their own pages", () => {
    expect(agencyNav(withOrg).map((i) => i.href)).toEqual([
      "/agency",
      "/agency/clients",
      "/agency/team",
    ]);
  });

  /**
   * Both tabs redirect to `/agency` without a membership — see
   * `requireAgencyConsole` — so a director still naming their
   * organisation is offered neither.
   */
  it("offers nothing but the dashboard until an organisation exists", () => {
    expect(agencyNav({ locale: "en", hasOrganisation: false })).toHaveLength(1);
  });

  it("resolves its labels against the locale it is given", () => {
    expect(agencyNav({ locale: "fr", hasOrganisation: true })[1].label).toBe(
      "Clients"
    );
  });
});
