import { describe, expect, it } from "vitest";

import { colleagueMatches } from "./colleague-table";

const nilufar = {
  fullName: "Nilufar Usmanova",
  email: "n.usmanova@toplance.com",
  staffRole: "owner" as const,
};
const legacy = { fullName: "Ada Obi", email: "ada@toplance.com", staffRole: null };

describe("colleagueMatches", () => {
  it("keeps every row when nothing is asked of it", () => {
    expect(colleagueMatches(nilufar, "", "")).toBe(true);
  });

  it("matches on name or email, whatever the case", () => {
    expect(colleagueMatches(nilufar, "nilufar", "")).toBe(true);
    expect(colleagueMatches(nilufar, "N.USMANOVA@", "")).toBe(true);
  });

  it("rejects a row the search does not name", () => {
    expect(colleagueMatches(nilufar, "ada", "")).toBe(false);
  });

  it("narrows by rank", () => {
    expect(colleagueMatches(nilufar, "", "owner")).toBe(true);
    expect(colleagueMatches(nilufar, "", "reviewer")).toBe(false);
  });

  it("reads a rankless legacy account as a reviewer, the rank that grants nothing", () => {
    expect(colleagueMatches(legacy, "", "reviewer")).toBe(true);
    expect(colleagueMatches(legacy, "", "owner")).toBe(false);
  });

  it("ignores a rank nobody offers rather than emptying the table", () => {
    expect(colleagueMatches(nilufar, "", "banana")).toBe(true);
  });
});
