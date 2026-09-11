import type { DemoRequestRow } from "@/lib/data/demo-requests";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_ENQUIRIES } from "@/lib/i18n/ops-enquiries";

/**
 * What the enquiry queue knows that is not a rendered cell.
 *
 * Split from the table for the reason `invitation-table.ts` is: the
 * table is `"use client"`, and a server page cannot call a function it
 * imports from a client module. The sorting and filtering run on the
 * server; the cells run in the browser. This file is the half both may
 * import.
 */

/** The columns this table will order by, and nothing else. */
export const ENQUIRY_SORTS = [
  "who",
  "company",
  "requested",
  "preferred",
  "status",
  "assignee",
] as const;
export type EnquirySort = (typeof ENQUIRY_SORTS)[number];

/**
 * The value a column sorts on, which is not always the value it prints.
 *
 * `status` and `assignee` both sort on the words actually on the screen,
 * in the reader's own locale — ordering by the raw enum would sort
 * `contacted` before `new` in English and in no other language, and
 * ordering an unassigned row by an empty string would scatter the
 * untaken enquiries through the list instead of gathering them.
 */
export function enquirySortKey(
  row: DemoRequestRow,
  sort: EnquirySort,
  locale: Locale
): string | number | Date | null {
  switch (sort) {
    case "company":
      return row.companyName;
    case "requested":
      return row.createdAt;
    case "preferred":
      return row.preferredAt;
    case "status":
      return OPS_ENQUIRIES.status[row.status][locale];
    case "assignee":
      return row.assigneeName ?? OPS_ENQUIRIES.unassigned[locale];
    default:
      // The name if there is one, the address if there is not — the same
      // fallback the cell prints, so the order matches what is on screen.
      return row.fullName || row.email;
  }
}

/**
 * The assignee filter's three answers, as a query-string value.
 *
 * `nobody` is a first-class option rather than a gap in the list: "what
 * has nobody picked up" is the question this queue is opened to answer,
 * and it cannot be expressed by choosing a person.
 */
export type AssigneeFilter = { kind: "any" } | { kind: "nobody" } | { kind: "person"; id: string };

export function readAssigneeFilter(raw: string | undefined): AssigneeFilter {
  if (!raw || raw === "any") return { kind: "any" };
  if (raw === "nobody") return { kind: "nobody" };
  return { kind: "person", id: raw };
}

/** Whether one enquiry survives the assignee filter. */
export function matchesAssignee(row: DemoRequestRow, filter: AssigneeFilter): boolean {
  switch (filter.kind) {
    case "nobody":
      return row.assigneeId === null;
    case "person":
      return row.assigneeId === filter.id;
    default:
      return true;
  }
}
