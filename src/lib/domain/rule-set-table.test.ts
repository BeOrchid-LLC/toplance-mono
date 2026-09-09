import { describe, expect, it } from "vitest";

import type { AgencyRuleSetRow } from "@/lib/data/agency-rule-sets";
import {
  RULE_SET_SORTS,
  ruleSetMatches,
  ruleSetMatchesPurpose,
  ruleSetSortKey,
} from "./rule-set-table";

function row(over: Partial<AgencyRuleSetRow> = {}): AgencyRuleSetRow {
  return {
    id: "corr-1",
    nationalityIso: "NG",
    destinationIso: "GB",
    purpose: "tourism",
    visaName: "Standard Visitor",
    version: 3,
    isLive: true,
    lastVerifiedAt: null,
    effectiveFrom: "2026-01-01",
    governmentFeeMinor: 11500,
    governmentFeeCurrency: "GBP",
    processingWeeksMin: 3,
    processingWeeksMax: 4,
    requirementCount: 9,
    caseCount: 12,
    ...over,
  };
}

describe("ruleSetMatches", () => {
  it("matches a country by its name, not only its code", () => {
    // The row stores GB; nobody types GB when they mean the country's
    // name, and nobody types the name when they file the route daily.
    // Both have to work.
    expect(ruleSetMatches(row(), "united kingdom")).toBe(true);
    expect(ruleSetMatches(row(), "nigeria")).toBe(true);
  });

  it("matches either ISO code", () => {
    expect(ruleSetMatches(row(), "gb")).toBe(true);
    expect(ruleSetMatches(row(), "ng")).toBe(true);
  });

  it("matches the visa's own name", () => {
    expect(ruleSetMatches(row(), "standard visitor")).toBe(true);
    expect(ruleSetMatches(row(), "VISITOR")).toBe(true);
  });

  it("keeps every row when nothing has been typed", () => {
    expect(ruleSetMatches(row(), "")).toBe(true);
    expect(ruleSetMatches(row(), "   ")).toBe(true);
  });

  it("refuses a route that is not on the row", () => {
    expect(ruleSetMatches(row(), "canada")).toBe(false);
  });
});

describe("ruleSetMatchesPurpose", () => {
  it("keeps every row when no purpose is chosen", () => {
    expect(ruleSetMatchesPurpose(row(), "")).toBe(true);
  });

  it("is exact rather than a substring", () => {
    expect(ruleSetMatchesPurpose(row({ purpose: "tourism" }), "tourism")).toBe(true);
    expect(ruleSetMatchesPurpose(row({ purpose: "tourism" }), "tour")).toBe(false);
    expect(ruleSetMatchesPurpose(row({ purpose: "study" }), "tourism")).toBe(false);
  });
});

describe("ruleSetSortKey", () => {
  it("orders the route column by country name, not by ISO code", () => {
    // "NG" would file under N either way; the test that matters is that
    // the key is the word on the screen.
    expect(ruleSetSortKey(row(), "route")).toContain("Nigeria");
    expect(ruleSetSortKey(row(), "route")).not.toBe("NG GB");
  });

  it("sorts the numeric columns on their numbers", () => {
    expect(ruleSetSortKey(row({ caseCount: 12 }), "cases")).toBe(12);
    expect(ruleSetSortKey(row({ requirementCount: 9 }), "documents")).toBe(9);
    expect(ruleSetSortKey(row({ version: 3 }), "version")).toBe(3);
  });

  it("names a key for every sortable column", () => {
    for (const sort of RULE_SET_SORTS) {
      expect(ruleSetSortKey(row(), sort)).not.toBeUndefined();
    }
  });
});
