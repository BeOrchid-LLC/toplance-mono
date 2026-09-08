import { describe, expect, it } from "vitest";

import { rowOffset } from "./row-number";

describe("rowOffset", () => {
  it("starts at zero when the table does not page", () => {
    expect(rowOffset(undefined)).toBe(0);
  });

  it("starts at zero on the first page", () => {
    expect(rowOffset({ page: 1, size: 25 })).toBe(0);
  });

  it("continues the count across pages", () => {
    expect(rowOffset({ page: 3, size: 25 })).toBe(50);
  });

  it("refuses to go negative on a nonsense page number", () => {
    expect(rowOffset({ page: 0, size: 25 })).toBe(0);
    expect(rowOffset({ page: -4, size: 25 })).toBe(0);
  });
});
