/**
 * The agency's pending-invitations panel, on the server side of the
 * boundary — the table is a client component, so the filter cannot live
 * beside the cells and still run over every row before one page of them
 * is handed across.
 */

type Searchable = {
  email: string;
  fullName: string;
  kind: "client" | "staff" | "platform_staff";
};

/**
 * Whether one invitation survives the toolbar.
 *
 * Address and name both, with the address first: an operator opening
 * this panel has usually been sent the address by the agency, and an
 * invitation often has no name at all — the form takes one optionally.
 *
 * `platform_staff` never appears here (this read is scoped to one
 * agency, and a platform invitation belongs to none), so the filter
 * offers the two kinds that do. An unknown kind means "no opinion"
 * rather than "match nothing": a junk `?kind=` should render the panel,
 * not empty it with no way to see why.
 */
export function tenantInviteMatches(row: Searchable, q: string, kind: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle) {
    const hay = `${row.email} ${row.fullName}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (kind === "client" || kind === "staff") return row.kind === kind;
  return true;
}
