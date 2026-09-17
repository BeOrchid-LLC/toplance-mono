import { describe, expect, it } from "vitest";

import { TENANT_SORTS, tenantMatches, tenantSortKey } from "./tenant-table";

const sahara = {
  name: "Sahara Travel",
  domain: "sahara.ng",
  status: "live" as const,
  members: 4,
  applicationsTotal: 31,
  createdAt: new Date("2026-03-02T00:00:00.000Z"),
};

const halted = { ...sahara, name: "Kano Voyages", domain: null, status: "suspended" as const };
const unpaid = { ...sahara, name: "Abuja Tours", status: "awaiting_payment" as const };

describe("tenantMatches", () => {
  it("keeps every row when nothing is asked of it", () => {
    expect(tenantMatches(sahara, "", "")).toBe(true);
  });

  it("matches the agency name whatever the case", () => {
    expect(tenantMatches(sahara, "sahara", "")).toBe(true);
    expect(tenantMatches(sahara, "SAHARA", "")).toBe(true);
    expect(tenantMatches(sahara, "  Travel  ", "")).toBe(true);
  });

  it("matches the domain, because that is what arrives in an email", () => {
    expect(tenantMatches(sahara, "sahara.ng", "")).toBe(true);
  });

  it("survives a row with no domain at all", () => {
    expect(tenantMatches(halted, "kano", "")).toBe(true);
    expect(tenantMatches(halted, "sahara.ng", "")).toBe(false);
  });

  it("rejects a row the search does not name", () => {
    expect(tenantMatches(sahara, "lagos", "")).toBe(false);
  });

  it("narrows to one lifecycle status", () => {
    expect(tenantMatches(sahara, "", "live")).toBe(true);
    expect(tenantMatches(sahara, "", "suspended")).toBe(false);
    expect(tenantMatches(halted, "", "suspended")).toBe(true);
    expect(tenantMatches(halted, "", "live")).toBe(false);
    // Not suspended is no longer enough to be live.
    expect(tenantMatches(unpaid, "", "live")).toBe(false);
    expect(tenantMatches(unpaid, "", "awaiting_payment")).toBe(true);
  });

  it("ignores a state nobody offers rather than emptying the table", () => {
    expect(tenantMatches(sahara, "", "banana")).toBe(true);
  });

  it("applies search and state together", () => {
    expect(tenantMatches(sahara, "sahara", "suspended")).toBe(false);
  });
});

describe("tenantSortKey", () => {
  it("orders by name by default", () => {
    expect(tenantSortKey(sahara, "agency")).toBe("Sahara Travel");
  });

  it("orders numbers as numbers, not as text", () => {
    expect(tenantSortKey(sahara, "members")).toBe(4);
    expect(tenantSortKey(sahara, "applications")).toBe(31);
  });

  it("sorts by lifecycle status, not by its words or a date", () => {
    expect(tenantSortKey(unpaid, "state")).toBeLessThan(tenantSortKey(sahara, "state") as number);
    expect(tenantSortKey(sahara, "state")).toBeLessThan(tenantSortKey(halted, "state") as number);
  });

  it("orders by when the agency arrived", () => {
    expect(tenantSortKey(sahara, "added")).toBe(sahara.createdAt.getTime());
  });

  it("offers exactly the columns the table renders", () => {
    expect([...TENANT_SORTS]).toEqual(["agency", "members", "applications", "state", "added"]);
  });
});
