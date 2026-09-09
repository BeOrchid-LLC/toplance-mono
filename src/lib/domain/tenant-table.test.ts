import { describe, expect, it } from "vitest";

import { TENANT_SORTS, tenantMatches, tenantSortKey } from "./tenant-table";

const sahara = {
  name: "Sahara Travel",
  domain: "sahara.ng",
  suspendedAt: null,
  members: 4,
  applicationsTotal: 31,
  createdAt: new Date("2026-03-02T00:00:00.000Z"),
};

const halted = { ...sahara, name: "Kano Voyages", domain: null, suspendedAt: new Date() };

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

  it("narrows to live or suspended", () => {
    expect(tenantMatches(sahara, "", "live")).toBe(true);
    expect(tenantMatches(sahara, "", "suspended")).toBe(false);
    expect(tenantMatches(halted, "", "suspended")).toBe(true);
    expect(tenantMatches(halted, "", "live")).toBe(false);
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

  it("sorts the live above the suspended, not by date", () => {
    expect(tenantSortKey(sahara, "state")).toBe(0);
    expect(tenantSortKey(halted, "state")).toBe(1);
  });

  it("orders by when the agency arrived", () => {
    expect(tenantSortKey(sahara, "added")).toBe(sahara.createdAt.getTime());
  });

  it("offers exactly the columns the table renders", () => {
    expect([...TENANT_SORTS]).toEqual(["agency", "members", "applications", "state", "added"]);
  });
});
