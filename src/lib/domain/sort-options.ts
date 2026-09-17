import type { SortDir } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";

/**
 * How a column orders, as far as the sort control needs to know.
 *
 * The kind decides the words and which direction is offered first — a
 * date's useful order is newest first, a count's is highest first, a
 * name's is A–Z — and never what the server does: the page still sorts
 * on its own key for the column, with `readSort` and `readDir`, exactly
 * as it did when the column headers were the control.
 *
 * A column ordered by rank rather than by its words (a status whose
 * order is "ready, then in review, then…") names its own two options,
 * because "A–Z" would be a claim about words the order does not follow.
 */
export type ColumnSort =
  | "text"
  | "date"
  | "number"
  | { asc: string; desc: string; first?: SortDir };

export type SortOption = {
  /** `sort:dir` — the select's value; see `sortOptionValue`. */
  value: string;
  sort: string;
  dir: SortDir;
  label: string;
};

/** One select value for a column and a direction. */
export function sortOptionValue(sort: string, dir: SortDir): string {
  return `${sort}:${dir}`;
}

/**
 * The column and direction a select value names, or `null` for a value
 * that is not one. Split on the last colon so a column id may carry one.
 */
export function readSortOptionValue(value: string): { sort: string; dir: SortDir } | null {
  const at = value.lastIndexOf(":");
  if (at <= 0) return null;
  const dir = value.slice(at + 1);
  if (dir !== "asc" && dir !== "desc") return null;
  return { sort: value.slice(0, at), dir };
}

/**
 * The sort control's options: two per sortable column, in column order,
 * each pair led by the direction a reader most often wants.
 *
 * Built from the same column definitions the table renders, so a column
 * that sorts is a column the control offers, and the words name the
 * heading the reader can see above it.
 */
export function buildSortOptions(
  columns: readonly { id: string; label: string; sort?: ColumnSort }[],
  locale: Locale
): SortOption[] {
  const options: SortOption[] = [];

  for (const column of columns) {
    if (!column.sort) continue;
    const { sort } = column;
    const label = { label: column.label };

    let asc: string;
    let desc: string;
    let first: SortDir;
    if (sort === "text") {
      asc = fill(ADMIN_CONSOLE.sortAsc[locale], label);
      desc = fill(ADMIN_CONSOLE.sortDesc[locale], label);
      first = "asc";
    } else if (sort === "date") {
      asc = fill(ADMIN_CONSOLE.sortOldest[locale], label);
      desc = fill(ADMIN_CONSOLE.sortNewest[locale], label);
      first = "desc";
    } else if (sort === "number") {
      asc = fill(ADMIN_CONSOLE.sortLow[locale], label);
      desc = fill(ADMIN_CONSOLE.sortHigh[locale], label);
      first = "desc";
    } else {
      asc = sort.asc;
      desc = sort.desc;
      first = sort.first ?? "asc";
    }

    const pair: SortOption[] = [
      { value: sortOptionValue(column.id, "asc"), sort: column.id, dir: "asc", label: asc },
      { value: sortOptionValue(column.id, "desc"), sort: column.id, dir: "desc", label: desc },
    ];
    options.push(...(first === "asc" ? pair : pair.reverse()));
  }

  return options;
}

/** "Ready first" — the words for a rank-ordered column's option. */
export function leadsFirst(value: string, locale: Locale): string {
  return fill(ADMIN_CONSOLE.sortFirst[locale], { value });
}
