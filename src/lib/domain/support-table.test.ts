import { describe, expect, it } from "vitest";

import { supportMatches } from "./support-table";

const row = {
  orgName: "Sahara Travel",
  subject: "A suspended agency cannot open its cases",
  body: "We were suspended this morning and have four cases mid-review.",
  state: "open" as const,
};

describe("supportMatches", () => {
  it("keeps every row when nothing is asked of it", () => {
    expect(supportMatches(row, "", "")).toBe(true);
  });

  it("matches the agency, the subject and the body", () => {
    expect(supportMatches(row, "sahara", "")).toBe(true);
    expect(supportMatches(row, "suspended agency", "")).toBe(true);
    expect(supportMatches(row, "mid-review", "")).toBe(true);
  });

  it("survives a request whose agency has gone", () => {
    expect(supportMatches({ ...row, orgName: null }, "sahara", "")).toBe(false);
    expect(supportMatches({ ...row, orgName: null }, "suspended", "")).toBe(true);
  });

  it("narrows by state", () => {
    expect(supportMatches(row, "", "open")).toBe(true);
    expect(supportMatches(row, "", "resolved")).toBe(false);
  });

  it("ignores a state nobody offers rather than emptying the queue", () => {
    expect(supportMatches(row, "", "banana")).toBe(true);
  });
});
