/**
 * The agencies panel on the ops dashboard: its search, and which tab the
 * page opens on.
 *
 * Both live here rather than beside the components because the page has
 * to answer them on the server — the filtering runs over every row
 * before the table is handed a page of them, and the open tab has to be
 * decided before the client component mounts, or the strip flickers
 * from Overview to wherever the reader actually was.
 */

/**
 * Whether one agency survives the panel's search.
 *
 * Name only. Unlike `/ops/tenants`, this row carries no domain — it is a
 * rollup keyed on `orgId`, and searching a field the row does not have
 * would quietly match nothing.
 */
export function opsClientMatches(row: { name: string }, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return row.name.toLowerCase().includes(needle);
}

/**
 * Which dashboard tab to open.
 *
 * The tab used to be client state alone, which was fine until a table
 * inside one of the panels gained a search box: the toolbar writes its
 * query to the URL, the server re-renders, and the reader who typed
 * into the agencies table landed back on Overview with their search
 * still in the address bar. So the tab travels in the URL too.
 *
 * An unknown tab opens the first one rather than rendering an empty
 * strip — a mistyped URL should show the dashboard, not nothing.
 */
export function openTabOf(raw: string | undefined, tabs: readonly string[]): string {
  return raw && tabs.includes(raw) ? raw : tabs[0];
}
