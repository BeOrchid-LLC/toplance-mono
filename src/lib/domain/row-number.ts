/**
 * Where a page's row numbering starts.
 *
 * Row 1 of page 3 is row 51, not row 1. A reader counting rows is
 * counting the whole table, so the ordinal has to survive paging — a
 * column that restarts at 1 on every page is worse than no column,
 * because it looks like a count and is not one.
 *
 * A page number arrives from the query string, which anybody can type,
 * so a nonsense value falls back to the start rather than handing the
 * table negative ordinals.
 */
export function rowOffset(pagination?: { page: number; size: number }): number {
  if (!pagination) return 0;
  return Math.max(0, (pagination.page - 1) * pagination.size);
}

/**
 * The rows a page shows, as the pager prints them: "26–50 of 104".
 *
 * Counted from `rowOffset`, so the range and the `#` column beside the
 * rows can never disagree about where page two starts. The end stops at
 * the total — the last page of 104 at 25 a page is "101–104", not
 * "101–125" — and an empty list is "0–0" rather than "1–0".
 */
export function pageRange(
  pagination: { page: number; size: number },
  total: number
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const offset = rowOffset(pagination);
  return { start: Math.min(offset + 1, total), end: Math.min(offset + pagination.size, total) };
}
