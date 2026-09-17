import { describe, expect, it } from "vitest";

import {
  buildSortOptions,
  leadsFirst,
  readSortOptionValue,
  sortOptionValue,
} from "@/lib/domain/sort-options";
import { LOCALES } from "@/lib/i18n/locales";

describe("buildSortOptions", () => {
  it("offers nothing for a table with no sortable column", () => {
    expect(buildSortOptions([{ id: "a", label: "A" }], "en")).toEqual([]);
  });

  it("names each option after the column heading, in the direction a reader wants first", () => {
    const options = buildSortOptions(
      [
        { id: "agency", label: "Agency", sort: "text" },
        { id: "progress", label: "Progress" },
        { id: "members", label: "Members", sort: "number" },
        { id: "added", label: "Added", sort: "date" },
      ],
      "en"
    );

    expect(options.map((o) => [o.value, o.label])).toEqual([
      ["agency:asc", "Agency: A–Z"],
      ["agency:desc", "Agency: Z–A"],
      ["members:desc", "Members: high to low"],
      ["members:asc", "Members: low to high"],
      ["added:desc", "Added: newest first"],
      ["added:asc", "Added: oldest first"],
    ]);
  });

  it("takes a rank-ordered column's own words, and its own lead", () => {
    const options = buildSortOptions(
      [
        {
          id: "state",
          label: "Status",
          sort: { asc: "Live first", desc: "Suspended first", first: "desc" },
        },
      ],
      "en"
    );
    expect(options).toEqual([
      { value: "state:desc", sort: "state", dir: "desc", label: "Suspended first" },
      { value: "state:asc", sort: "state", dir: "asc", label: "Live first" },
    ]);
  });

  it("leaves no template marker behind in any locale", () => {
    for (const { code: locale } of LOCALES) {
      const options = buildSortOptions(
        [
          { id: "a", label: "X", sort: "text" },
          { id: "b", label: "X", sort: "date" },
          { id: "c", label: "X", sort: "number" },
        ],
        locale
      );
      for (const o of options) {
        expect(o.label).toContain("X");
        expect(o.label).not.toMatch(/[{}]/);
      }
      expect(leadsFirst("Live", locale)).not.toMatch(/[{}]/);
    }
  });
});

describe("sort option values", () => {
  it("round-trip a column and a direction", () => {
    expect(readSortOptionValue(sortOptionValue("added", "desc"))).toEqual({
      sort: "added",
      dir: "desc",
    });
  });

  it("refuse a value that names no direction", () => {
    expect(readSortOptionValue("added")).toBeNull();
    expect(readSortOptionValue("added:sideways")).toBeNull();
    expect(readSortOptionValue(":asc")).toBeNull();
  });
});
