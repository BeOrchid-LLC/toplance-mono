import type { ListedInvitation } from "@/lib/data/invitations";
import { INVITATION_STATUS } from "@/lib/domain/status";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";

/**
 * What the platform-staff roster knows that is not a rendered cell.
 *
 * Split from the component for the reason `corridor-table.ts` is: the
 * table is `"use client"`, and a server page cannot call a function it
 * imports from a client module. The sorting runs on the server; the
 * cells run in the browser. This file is the half both may import.
 */

/** The columns this table will order by, and nothing else. */
export const STAFF_SORTS = ["person", "rank", "status", "invited"] as const;
export type StaffSort = (typeof STAFF_SORTS)[number];

/**
 * The value a column sorts on, which is not always the value it prints.
 *
 * `status` sorts on `INVITATION_STATUS`, which is the string the badge
 * itself renders — English in every locale today. That is a gap in the
 * dictionary rather than one to paper over here: a localised sort key
 * beside an untranslated badge would order the rows by words that are
 * not on the screen.
 */
export function staffSortKey(
  invite: ListedInvitation,
  sort: StaffSort,
  locale: Locale
): string | number | Date | null {
  switch (sort) {
    case "rank":
      return invite.staffRank ? OPS_COMMON.staffRole[invite.staffRank][locale] : null;
    case "status":
      return INVITATION_STATUS[invite.status].label;
    case "invited":
      return invite.createdAt;
    default:
      // The name if there is one, the address if there is not — the same
      // fallback the cell prints, so the order matches what is on screen.
      return invite.fullName || invite.email;
  }
}
