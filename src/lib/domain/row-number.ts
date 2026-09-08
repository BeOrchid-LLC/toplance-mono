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
