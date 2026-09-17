import { describe, expect, it } from "vitest";

import { pageRange, rowOffset } from "./row-number";

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

describe("pageRange", () => {
  it("reads the first page from one", () => {
    expect(pageRange({ page: 1, size: 25 }, 104)).toEqual({ start: 1, end: 25 });
  });

  it("follows the row numbers onto a later page", () => {
    expect(pageRange({ page: 2, size: 25 }, 104)).toEqual({ start: 26, end: 50 });
  });

  it("stops the last page at the total", () => {
    expect(pageRange({ page: 5, size: 25 }, 104)).toEqual({ start: 101, end: 104 });
  });

  it("covers a list shorter than a page", () => {
    expect(pageRange({ page: 1, size: 50 }, 12)).toEqual({ start: 1, end: 12 });
  });

  it("says nothing is shown when nothing is there", () => {
    expect(pageRange({ page: 1, size: 25 }, 0)).toEqual({ start: 0, end: 0 });
  });
});
