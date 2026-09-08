/**
 * What the clients roster knows that is not a rendered cell.
 *
 * Split from the table for the reason `enquiry-table.ts` and
 * `invitation-table.ts` are: `client-roster.tsx` is `"use client"`, and
 * a server page cannot read a value it imports from a client module —
 * across that boundary the export arrives as a client reference, not the
 * array, so `readSort`'s `allowed.includes` is not a function and
 * `/agency/clients` fails to render at all.
 *
 * The sorting runs on the server; the cells run in the browser. This
 * file is the half both may import.
 */

/** The columns `/agency/clients` will order by, as `readSort`'s allow-list. */
export const CLIENT_SORTS = [
  "client",
  "route",
  "documents",
  "status",
  "submitted",
] as const;

export type ClientSort = (typeof CLIENT_SORTS)[number];
