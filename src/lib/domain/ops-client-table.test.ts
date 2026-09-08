import { describe, expect, it } from "vitest";

import { opsClientMatches, openTabOf } from "./ops-client-table";

const row = { name: "Sahara Travel" };

describe("opsClientMatches", () => {
  it("keeps every row when nothing is typed", () => {
    expect(opsClientMatches(row, "")).toBe(true);
    expect(opsClientMatches(row, "   ")).toBe(true);
  });

  it("matches the agency name whatever the case or padding", () => {
    expect(opsClientMatches(row, "sahara")).toBe(true);
    expect(opsClientMatches(row, "  TRAVEL ")).toBe(true);
  });

  it("rejects a row the search does not name", () => {
    expect(opsClientMatches(row, "kano")).toBe(false);
  });
});

describe("openTabOf", () => {
  it("opens on the overview when the URL says nothing", () => {
    expect(openTabOf(undefined, ["overview", "clients"])).toBe("overview");
  });

  it("opens on the tab the URL names", () => {
    expect(openTabOf("clients", ["overview", "clients"])).toBe("clients");
  });

  it("ignores a tab that does not exist rather than showing nothing", () => {
    expect(openTabOf("banana", ["overview", "clients"])).toBe("overview");
  });
});
