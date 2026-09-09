/**
 * The support queue's search, on the server side of the boundary.
 *
 * Its own module for the reason `corridor-table.ts` is one: the table is
 * a client component, and the filter runs over every request before one
 * page of them is handed across.
 */

type Searchable = {
  orgName: string | null;
  subject: string;
  body: string;
  state: string;
};

/**
 * Whether one request survives the toolbar.
 *
 * The body is searched as well as the subject. A subject line on a
 * support request is written in a hurry and is often "help" — the
 * sentence underneath is where the agency actually says what happened,
 * so an operator hunting for "suspended" has to be able to find it
 * there.
 *
 * A null agency name is searchable as blank rather than skipped: the
 * organisation may have gone, but the record of the dispute has not,
 * and its text should still be findable.
 */
export function supportMatches(row: Searchable, q: string, state: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle) {
    const hay = `${row.orgName ?? ""} ${row.subject} ${row.body}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (state === "open" || state === "claimed" || state === "resolved") {
    return row.state === state;
  }
  return true;
}
