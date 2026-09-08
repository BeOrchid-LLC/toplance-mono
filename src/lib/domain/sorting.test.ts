import { describe, expect, it } from "vitest";

import {
  PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  compareCells,
  readDir,
  readPageSize,
  readSort,
  resolvePage,
  sortRows,
} from "@/lib/domain/sorting";

const COLUMNS = ["name", "added"] as const;

describe("readSort", () => {
  it("takes a column the table offers", () => {
    expect(readSort("added", COLUMNS, "name")).toBe("added");
  });

  it("falls back when the URL names a column the table does not have", () => {
    // The allow-list is the guard: an unchecked value indexes a row by
    // whatever was typed.
    expect(readSort("password_hash", COLUMNS, "name")).toBe("name");
  });

  it("falls back when there is no sort in the URL at all", () => {
    expect(readSort(undefined, COLUMNS, "name")).toBe("name");
  });
});

describe("readDir", () => {
  it("takes either direction", () => {
    expect(readDir("desc", "asc")).toBe("desc");
    expect(readDir("asc", "desc")).toBe("asc");
  });

  it("falls back on anything else", () => {
    expect(readDir("sideways", "asc")).toBe("asc");
    expect(readDir(undefined, "desc")).toBe("desc");
  });
});

describe("compareCells", () => {
  it("sorts missing values last in both directions", () => {
    // A never-accepted invitation is not the oldest acceptance. The
    // absence means "nothing to rank", so it belongs at the bottom
    // whichever way the column points.
    expect(compareCells(null, "a", "asc")).toBeGreaterThan(0);
    expect(compareCells(null, "a", "desc")).toBeGreaterThan(0);
    expect(compareCells("", "a", "desc")).toBeGreaterThan(0);
  });

  it("compares dates by their instant", () => {
    const early = new Date("2026-01-01");
    const late = new Date("2026-06-01");
    expect(compareCells(early, late, "asc")).toBeLessThan(0);
    expect(compareCells(early, late, "desc")).toBeGreaterThan(0);
  });

  it("compares numbers as numbers, not as text", () => {
    // "10" < "9" as strings. A document count must not sort that way.
    expect(compareCells(9, 10, "asc")).toBeLessThan(0);
  });
});

describe("sortRows", () => {
  it("does not mutate the array it was given", () => {
    // The pages count their KPI figures off the same array they sort.
    const rows = [{ n: 2 }, { n: 1 }];
    const sorted = sortRows(rows, (r) => r.n, "asc");
    expect(rows.map((r) => r.n)).toEqual([2, 1]);
    expect(sorted.map((r) => r.n)).toEqual([1, 2]);
  });
});

describe("resolvePage", () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("defaults to the first page", () => {
    expect(resolvePage(undefined, 100)).toMatchObject({ page: 1, start: 0 });
  });

  it("reads a page out of the URL", () => {
    const r = resolvePage("2", 100, 10);
    expect(r).toMatchObject({ page: 2, pageCount: 10, start: 10, end: 20 });
  });

  it("refuses anything that is not a whole page number", () => {
    // All of these arrive from a URL anybody can type. A NaN start would
    // slice nothing and render an empty table that looks like a bug.
    for (const raw of ["0", "-3", "1.5", "abc", ""]) {
      expect(resolvePage(raw, 100, 10).page).toBe(1);
    }
  });

  it("treats an exponent as the number it is, then clamps it", () => {
    // `?page=1e3` says one thousand. It is past the end, so it clamps
    // like any other over-large page rather than being called nonsense.
    expect(resolvePage("1e3", 100, 10).page).toBe(10);
  });

  it("clamps a page past the end onto the last real page", () => {
    // A bookmarked ?page=9 against a list that has shrunk to 12 rows.
    // Clamping shows the last page of what exists; the alternative is a
    // blank table that reads as breakage.
    const r = resolvePage("9", 12, 10);
    expect(r).toMatchObject({ page: 2, pageCount: 2, start: 10, end: 12 });
  });

  it("keeps one page when there is nothing to show", () => {
    // Not zero pages: "Page 1 of 0" is not a sentence, and the empty
    // state renders instead of the control anyway.
    expect(resolvePage("3", 0, 10)).toMatchObject({ page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it("does not invent a second page for an exact multiple", () => {
    expect(resolvePage(undefined, 20, 10).pageCount).toBe(2);
    expect(resolvePage(undefined, 10, 10).pageCount).toBe(1);
  });

  it("slices the rows the page should show", () => {
    const { start, end } = resolvePage("3", 25, 10);
    expect(rows(25).slice(start, end)).toEqual([20, 21, 22, 23, 24]);
  });

  it("has a default page size", () => {
    expect(resolvePage(undefined, PAGE_SIZE * 3).pageCount).toBe(3);
  });
});

describe("readPageSize", () => {
  it("takes a size the control actually offers", () => {
    for (const size of PAGE_SIZE_OPTIONS) {
      expect(readPageSize(String(size))).toBe(size);
    }
  });

  it("falls back to the default for anything else", () => {
    // An allow-list for the same reason `readSort` has one: this number
    // comes off the URL and becomes a slice width. "1000000" would ask
    // the page to render every row it holds.
    for (const raw of ["1000000", "26", "0", "-10", "abc", "", undefined]) {
      expect(readPageSize(raw)).toBe(PAGE_SIZE);
    }
  });

  it("offers the default among its options", () => {
    // Otherwise the select opens with nothing matching what is on screen.
    expect(PAGE_SIZE_OPTIONS).toContain(PAGE_SIZE);
  });
});

describe("resolvePage with a chosen size", () => {
  it("repages the same rows when the size changes", () => {
    expect(resolvePage(undefined, 99, 10).pageCount).toBe(10);
    expect(resolvePage(undefined, 99, 25).pageCount).toBe(4);
    expect(resolvePage(undefined, 99, 100).pageCount).toBe(1);
  });

  it("clamps a page that the larger size just removed", () => {
    // Reading page 7 at 10 a page, then switching to 50: page 7 no
    // longer exists, and page 2 is the last that does.
    expect(resolvePage("7", 99, 50)).toMatchObject({ page: 2, pageCount: 2 });
  });
});
