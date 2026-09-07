import { describe, expect, it } from "vitest";

import { FLAG_REASON_KEYS, isFlagReason } from "@/lib/domain/flag-reason";

describe("isFlagReason", () => {
  it("accepts every reason the picker can offer", () => {
    for (const key of FLAG_REASON_KEYS) {
      expect(isFlagReason(key)).toBe(true);
    }
  });

  it("refuses a reason that is not one", () => {
    expect(isFlagReason("banana")).toBe(false);
    expect(isFlagReason("")).toBe(false);
  });

  /**
   * `value in ALL` walks the prototype chain, so every `Object.prototype`
   * member passed this guard. `reason_code=toString` on the
   * `reviewDocument` POST therefore reached the `flag_reason` enum
   * column, where Postgres rejected it — and that rejection is not a
   * `toActionError` case, so it rethrows as a 500 rather than coming back
   * as a field error the reviewer can act on.
   */
  it("refuses inherited object keys", () => {
    expect(isFlagReason("toString")).toBe(false);
    expect(isFlagReason("constructor")).toBe(false);
    expect(isFlagReason("hasOwnProperty")).toBe(false);
    expect(isFlagReason("__proto__")).toBe(false);
  });
});
