import { describe, expect, it } from "vitest";

import type { KybQueueRow } from "@/lib/data/kyb";
import {
  KYB_SORTS,
  kybMatches,
  kybMatchesStanding,
  kybSortKey,
  kybStandingFilters,
} from "./kyb-table";

function row(over: Partial<KybQueueRow> = {}): KybQueueRow {
  return {
    orgId: "org-1",
    name: "Sahara Travel",
    verified: 3,
    touched: 4,
    total: 6,
    standing: "in_review",
    activatedAt: null,
    suspendedAt: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...over,
  };
}

describe("kybMatches", () => {
  it("matches a substring of the name, whatever the case", () => {
    expect(kybMatches(row(), "sahara")).toBe(true);
    expect(kybMatches(row(), "TRAVEL")).toBe(true);
    expect(kybMatches(row(), "hara Tra")).toBe(true);
  });

  it("ignores surrounding whitespace rather than failing on it", () => {
    expect(kybMatches(row(), "  sahara  ")).toBe(true);
  });

  it("keeps every row when nothing has been typed", () => {
    expect(kybMatches(row(), "")).toBe(true);
    expect(kybMatches(row(), "   ")).toBe(true);
  });

  it("refuses a name that is not there", () => {
    expect(kybMatches(row(), "kano")).toBe(false);
  });
});

describe("kybMatchesStanding", () => {
  it("keeps every row when no standing is chosen", () => {
    expect(kybMatchesStanding(row({ standing: "ready" }), "")).toBe(true);
  });

  it("is exact, not a substring", () => {
    expect(kybMatchesStanding(row({ standing: "in_review" }), "in_review")).toBe(true);
    expect(kybMatchesStanding(row({ standing: "in_review" }), "review")).toBe(false);
    expect(kybMatchesStanding(row({ standing: "activated" }), "ready")).toBe(false);
  });
});

describe("kybSortKey", () => {
  it("orders progress by the fraction, not the numerator", () => {
    // Six of six is finished; six of twelve is halfway. Sorting on
    // `verified` alone would call them equal.
    const done = kybSortKey(row({ verified: 6, total: 6 }), "progress");
    const halfway = kybSortKey(row({ verified: 6, total: 12 }), "progress");
    expect(done).toBeGreaterThan(halfway as number);
  });

  it("treats a checklist with no requirements as nothing done", () => {
    expect(kybSortKey(row({ verified: 0, total: 0 }), "progress")).toBe(0);
  });

  it("puts the rows waiting on this console above the settled ones", () => {
    const ready = kybSortKey(row({ standing: "ready" }), "standing") as number;
    const inReview = kybSortKey(row({ standing: "in_review" }), "standing") as number;
    const activated = kybSortKey(row({ standing: "activated" }), "standing") as number;
    expect(ready).toBeLessThan(inReview);
    expect(inReview).toBeLessThan(activated);
  });

  it("sorts the agency column case-insensitively", () => {
    expect(kybSortKey(row({ name: "Zenith" }), "agency")).toBe("zenith");
  });

  it("sorts by the date itself, so it orders rather than reads", () => {
    expect(kybSortKey(row(), "added")).toBeInstanceOf(Date);
  });
});

describe("kybStandingFilters", () => {
  it("offers every standing the queue can hold, ready first", () => {
    const values = kybStandingFilters("en").map((f) => f.value);
    expect(values).toEqual(["ready", "in_review", "not_started", "activated"]);
  });

  it("labels each one rather than printing the enum", () => {
    for (const f of kybStandingFilters("en")) {
      expect(f.label).not.toContain("_");
      expect(f.label.length).toBeGreaterThan(0);
    }
  });
});

describe("KYB_SORTS", () => {
  it("names a key for every sortable column", () => {
    for (const sort of KYB_SORTS) {
      expect(kybSortKey(row(), sort)).not.toBeUndefined();
    }
  });
});
