import type { NavItem } from "@/components/app/app-nav";

/**
 * The staff console's nav, in one place.
 *
 * Unlike the traveller side there is no `/ops` layout — every page builds
 * its own `AppBar` — so the list was pasted per page and drifted: the two
 * corridor screens carried a Corridors link and the two case screens did
 * not, which made the entry disappear the moment a reviewer opened a case.
 * Same fix as `travellerNav`: one answer, so the four screens cannot
 * disagree.
 *
 * A constant rather than a function because nothing here is conditional —
 * the console is staff-only already, so there is no state to vary on.
 *
 * `/ops` stays first: `AppNav.isActive` treats item 0 as the section root
 * and matches it exactly, so reordering this list would light the wrong
 * pill on every child route.
 */
export const opsNav: NavItem[] = [
  { href: "/ops", label: "Case queue" },
  { href: "/ops/corridors", label: "Routes" },
];
