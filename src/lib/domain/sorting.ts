export type SortDir = "asc" | "desc";

/**
 * Read a sort column off the query string, refusing anything the table
 * does not actually offer.
 *
 * The allow-list is the point. A sort key arrives from the URL, which
 * anybody can type, and the pages feed it into a comparator that indexes
 * a row by it — so an unchecked value is a way to read a column the table
 * was never meant to order by, and a missing one silently sorts by
 * nothing. Falling back to the table's own default makes a nonsense URL
 * render the default view rather than an error.
 */
export function readSort<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

export function readDir(raw: string | undefined, fallback: SortDir): SortDir {
  return raw === "asc" || raw === "desc" ? raw : fallback;
}

/**
 * Order two cell values of the same column.
 *
 * Nulls always sort last, in both directions. This is a deliberate
 * exception to "descending is ascending reversed": a case with no
 * submission date is not the newest submission, and a route with no
 * verification is not the freshest — the absence means "nothing here to
 * rank", so it belongs at the bottom whichever way the column points.
 * Sorting them as if they were the smallest value puts every empty row
 * at the top of a descending sort, which is the one place a reviewer is
 * looking.
 *
 * Strings compare with `localeCompare` so that accented names land where
 * a reader expects rather than where their code point falls.
 */
export function compareCells(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
  dir: SortDir
): number {
  const aMissing = a == null || a === "";
  const bMissing = b == null || b === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result: number;
  if (a instanceof Date && b instanceof Date) {
    result = a.getTime() - b.getTime();
  } else if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
  }

  return dir === "asc" ? result : -result;
}

/**
 * Sort a copy, never the array itself.
 *
 * The pages pass the same rows they counted their KPI figures from, and
 * `Array.prototype.sort` mutates — sorting in place would reorder the
 * list the counters were derived from, which is harmless today and the
 * kind of thing that stops being harmless the moment somebody slices the
 * first five rows off it for a summary.
 */
export function sortRows<T>(
  rows: readonly T[],
  key: (row: T) => string | number | Date | null | undefined,
  dir: SortDir
): T[] {
  return [...rows].sort((a, b) => compareCells(key(a), key(b), dir));
}
