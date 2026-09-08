import { describe, expect, it } from "vitest";

import type { DemoRequestRow } from "@/lib/data/demo-requests";
import {
  enquirySortKey,
  matchesAssignee,
  readAssigneeFilter,
} from "@/lib/domain/enquiry-table";
import { OPS_ENQUIRIES } from "@/lib/i18n/ops-enquiries";

function enquiry(over: Partial<DemoRequestRow> = {}): DemoRequestRow {
  return {
    id: "e1",
    fullName: "Ada Visitor",
    email: "ada@example.test",
    companyName: "Kite Travel",
    jobTitle: "Director",
    preferredAt: new Date("2026-10-01T14:00:00Z"),
    preferredTz: "Africa/Lagos",
    locale: "en",
    status: "new",
    convertedOrgId: null,
    convertedOrgName: null,
    assigneeId: null,
    assigneeName: null,
    createdAt: new Date("2026-09-01T09:00:00Z"),
    ...over,
  };
}

describe("enquirySortKey", () => {
  it("falls back to the address when there is no name, matching the cell", () => {
    expect(enquirySortKey(enquiry({ fullName: "" }), "who", "en")).toBe(
      "ada@example.test"
    );
  });

  /**
   * Sorting on the raw enum would order `contacted` before `new` in
   * English and in no other language — the rows would come back in an
   * order the words on the screen do not explain.
   */
  it("sorts status on the words the reader actually sees", () => {
    expect(enquirySortKey(enquiry({ status: "contacted" }), "status", "fr")).toBe(
      OPS_ENQUIRIES.status.contacted.fr
    );
  });

  /** Otherwise every untaken enquiry sorts under the empty string. */
  it("gives an unassigned row the word the cell prints", () => {
    expect(enquirySortKey(enquiry(), "assignee", "en")).toBe(
      OPS_ENQUIRIES.unassigned.en
    );
    expect(
      enquirySortKey(enquiry({ assigneeName: "Ngozi Balogun" }), "assignee", "en")
    ).toBe("Ngozi Balogun");
  });

  it("orders the preferred column by the instant, not its printed form", () => {
    expect(enquirySortKey(enquiry(), "preferred", "en")).toBeInstanceOf(Date);
  });
});

describe("the assignee filter", () => {
  it("reads a missing or 'any' value as no filter at all", () => {
    expect(readAssigneeFilter(undefined)).toEqual({ kind: "any" });
    expect(readAssigneeFilter("any")).toEqual({ kind: "any" });
  });

  it("keeps 'nobody' apart from a person, since neither can express the other", () => {
    expect(readAssigneeFilter("nobody")).toEqual({ kind: "nobody" });
    expect(readAssigneeFilter("user_123")).toEqual({ kind: "person", id: "user_123" });
  });

  it("matches on the three answers", () => {
    const untaken = enquiry();
    const mine = enquiry({ assigneeId: "user_123", assigneeName: "Ngozi Balogun" });

    expect(matchesAssignee(untaken, { kind: "any" })).toBe(true);
    expect(matchesAssignee(mine, { kind: "any" })).toBe(true);

    expect(matchesAssignee(untaken, { kind: "nobody" })).toBe(true);
    expect(matchesAssignee(mine, { kind: "nobody" })).toBe(false);

    expect(matchesAssignee(mine, { kind: "person", id: "user_123" })).toBe(true);
    expect(matchesAssignee(untaken, { kind: "person", id: "user_123" })).toBe(false);
  });
});
