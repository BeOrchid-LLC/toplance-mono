import { describe, expect, it } from "vitest";

import { isUuid } from "@/lib/domain/uuid";

/**
 * Anything that reaches a uuid column from outside — a URL segment, a
 * form field — goes through this first. Postgres throws on a malformed
 * uuid before any row logic runs, which turned /ops/cases/1 into a 500
 * instead of a 404.
 */
describe("isUuid", () => {
  it("accepts a canonical uuid in either case", () => {
    expect(isUuid("69dc91d0-c6bb-fc00-da71-ab699317ca88")).toBe(true);
    expect(isUuid("69DC91D0-C6BB-FC00-DA71-AB699317CA88")).toBe(true);
  });

  it("rejects what a typed URL actually contains", () => {
    expect(isUuid("1")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("TPL-000042")).toBe(false);
    expect(isUuid("not-a-uuid-at-all")).toBe(false);
  });

  it("rejects near-misses Postgres would also reject", () => {
    expect(isUuid("69dc91d0c6bbfc00da71ab699317ca88")).toBe(false);
    expect(isUuid("69dc91d0-c6bb-fc00-da71-ab699317ca8")).toBe(false);
    expect(isUuid("69dc91d0-c6bb-fc00-da71-ab699317ca88 ")).toBe(false);
    expect(isUuid("g9dc91d0-c6bb-fc00-da71-ab699317ca88")).toBe(false);
  });
});
