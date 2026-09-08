/**
 * The staff table's search, on the server side of the boundary.
 *
 * Its own module for the reason `corridor-table.ts` is one: the table is
 * a client component, and the filtering has to run over every colleague
 * before one page of them is handed across.
 */

type Searchable = {
  fullName: string;
  email: string;
  staffRole: "reviewer" | "owner" | null;
};

/**
 * Whether one colleague survives the toolbar.
 *
 * Email as well as name, because an operator looking somebody up has
 * usually just read their address in a thread.
 *
 * A `null` rank reads as `reviewer` — the same default `isOwner`
 * applies. These are accounts made before `staff_role` was written by
 * anything but hand-run SQL, and filtering them into a third invisible
 * group would hide real people from the only screen that lists them.
 */
export function colleagueMatches(row: Searchable, q: string, rank: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle) {
    const hay = `${row.fullName} ${row.email}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (rank === "owner" || rank === "reviewer") {
    return (row.staffRole ?? "reviewer") === rank;
  }
  return true;
}
