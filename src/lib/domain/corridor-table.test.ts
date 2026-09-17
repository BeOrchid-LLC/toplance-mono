import { describe, expect, it } from "vitest";

import type { CorridorRow } from "@/lib/data/corridors";
import {
  CORRIDOR_STATUSES,
  corridorMatchesState,
  corridorSortKey,
  corridorStateFilters,
  corridorStatus,
  corridorStatusLabel,
} from "./corridor-table";

function row(over: Partial<CorridorRow> = {}): CorridorRow {
  return {
    id: "c-1",
    nationalityIso: "ng",
    destinationIso: "gb",
    purpose: "study",
    visaName: "Student visa",
    version: 1,
    reviewState: "approved",
    isLive: true,
    lastVerifiedAt: new Date("2026-09-01T00:00:00Z"),
    requirementCount: 6,
    ...over,
  } as CorridorRow;
}

describe("corridorStatus", () => {
  it("folds review state and liveness into one status", () => {
    expect(corridorStatus(row({ reviewState: "approved", isLive: true }))).toBe("live");
    expect(corridorStatus(row({ reviewState: "approved", isLive: false }))).toBe("superseded");
    expect(corridorStatus(row({ reviewState: "pending", isLive: false }))).toBe("pending");
    expect(corridorStatus(row({ reviewState: "rejected", isLive: false }))).toBe("rejected");
  });

  it("gives every status a label in every locale", () => {
    for (const status of CORRIDOR_STATUSES) {
      expect(corridorStatusLabel(status, "en")).toBeTruthy();
      expect(corridorStatusLabel(status, "ar")).toBeTruthy();
    }
    expect(corridorStatusLabel("superseded", "en")).toBe("Superseded");
  });
});

describe("corridorMatchesState", () => {
  it("filters on the one status the column prints", () => {
    const superseded = row({ isLive: false });
    expect(corridorMatchesState(superseded, "superseded")).toBe(true);
    expect(corridorMatchesState(superseded, "live")).toBe(false);
    expect(corridorMatchesState(row(), "live")).toBe(true);
    expect(corridorMatchesState(row({ reviewState: "pending", isLive: false }), "pending")).toBe(true);
    expect(corridorMatchesState(row({ reviewState: "rejected", isLive: false }), "rejected")).toBe(true);
  });

  it("still reads an old ?state=approved link as live or superseded", () => {
    expect(corridorMatchesState(row(), "approved")).toBe(true);
    expect(corridorMatchesState(row({ isLive: false }), "approved")).toBe(true);
    expect(corridorMatchesState(row({ reviewState: "pending", isLive: false }), "approved")).toBe(false);
  });

  it("keeps the not-checked filter the counter links to", () => {
    expect(corridorMatchesState(row({ lastVerifiedAt: null }), "unverified")).toBe(true);
    expect(corridorMatchesState(row(), "unverified")).toBe(false);
    expect(corridorStateFilters("en").map((f) => f.value)).toEqual([
      "live",
      "superseded",
      "pending",
      "rejected",
      "unverified",
    ]);
  });

  it("has no opinion on a junk value", () => {
    expect(corridorMatchesState(row({ reviewState: "rejected" }), "nonsense")).toBe(true);
  });
});

describe("corridorSortKey", () => {
  it("ranks the status column by status, not by its translated word", () => {
    const ranks = [
      row({ reviewState: "rejected", isLive: false }),
      row({ reviewState: "pending", isLive: false }),
      row({ isLive: false }),
      row(),
    ].map((r) => corridorSortKey(r, "state"));

    expect(ranks).toEqual([3, 2, 1, 0]);
  });
});
