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

/**
 * Rows per page, for every console table.
 *
 * One number rather than a prop each screen picks, because the reason
 * for it is the same everywhere: it is how many rows fit before a
 * reviewer stops reading and starts scrolling, and a table that shows 25
 * beside one that shows 40 makes the consoles feel like two products.
 */
export const PAGE_SIZE = 25;

/**
 * The row counts a reader may choose between.
 *
 * A closed list, not a free number, for the reason `readSort` has an
 * allow-list: this value comes off the URL and becomes a slice width, so
 * `?size=1000000` would otherwise ask the page to render every row it
 * holds. Four options rather than a spinner — the choice is "a screenful,
 * the usual, a long scroll, or the lot", and nobody wants 37.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function readPageSize(raw: string | undefined): number {
  const asked = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(asked) ? asked : PAGE_SIZE;
}

/**
 * Work out which page of a list to show, from a number anybody can type.
 *
 * Returns the slice bounds rather than the rows, so the caller slices
 * the array it already has and the control above it can print "Page 2 of
 * 7" from the same answer — a page that sliced by one number and
 * labelled by another is how a table ends up claiming page 5 while
 * showing page 1.
 *
 * Two things guard the page number, and they do different jobs. The
 * toolbar drops `page` whenever a search or filter changes, so narrowing
 * a list returns to the top rather than to a page that no longer exists
 * — that is the common case, and it is handled before this function is
 * ever reached. The clamp here is for the URL that arrives already
 * wrong: a bookmark, a pasted link, a hand-edited number. It shows the
 * last page that does exist, because a blank table reads as breakage
 * whereas the final page reads as the end of the list.
 *
 * `pageCount` is never zero. "Page 1 of 0" is not a sentence, and an
 * empty list renders its empty state instead of this control anyway.
 */
export function resolvePage(
  raw: string | undefined,
  total: number,
  size: number = PAGE_SIZE
): { page: number; pageCount: number; start: number; end: number } {
  const pageCount = Math.max(1, Math.ceil(total / size));

  // `Number` rather than `parseInt`: "1.5" and "1e3" are pages nobody
  // meant, and `parseInt` would quietly read them as 1 and 1. Anything
  // that is not a whole number at least 1 falls back to the first page.
  const asked = Number(raw);
  const wanted = Number.isInteger(asked) && asked >= 1 ? asked : 1;

  const page = Math.min(wanted, pageCount);
  const start = (page - 1) * size;

  return { page, pageCount, start, end: Math.min(start + size, total) };
}
