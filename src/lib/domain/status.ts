import type { applicationStatus, documentState, invitationStatus } from "@/lib/db/schema";

// Still derived from the schema rather than written out, so adding a
// status to the enum makes the exhaustive maps below fail to compile
// instead of rendering a blank pill.
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type DocumentState = (typeof documentState.enumValues)[number];
export type InvitationStatus = (typeof invitationStatus.enumValues)[number];
export type BadgeVariant =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "outline";

/**
 * Whether a string off a form is one of the statuses.
 *
 * Reads `STATUS_VARIANT`'s own keys rather than the enum, because this
 * module takes the schema as types only — see the note at the top. Own
 * keys literally: `in` would also answer for everything on
 * `Object.prototype`, which let `to=toString` past this guard and into
 * the status label in a traveller's notification.
 */
export function isApplicationStatus(value: string): value is ApplicationStatus {
  return Object.hasOwn(STATUS_VARIANT, value);
}

/**
 * The colour of every application-status pill, and nothing else.
 *
 * Every pill carries a written label too — colour reinforces the state,
 * it never carries it alone, so the pills survive colour blindness and
 * greyscale printing without needing an icon to disambiguate. Those
 * labels are `STATUS_COPY` in `@/lib/i18n/status`: the words differ per
 * reader and need native review, the colour is the same for everybody,
 * and keeping them apart is what lets this module stay free of a locale
 * argument so `status-control.tsx` can import it into the browser.
 *
 * Mapping locked with the client 2026-08-21:
 *   Not started → grey outline · In progress → grey fill · Submitted → blue
 *   Under review → amber · Approved → green · Rejected → red
 */
export const STATUS_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  draft: "outline",
  collecting_documents: "neutral",
  submitted: "info",
  under_review: "warning",
  additional_documents: "neutral",
  approved: "success",
  rejected: "danger",
};

/**
 * The staff decision path, as a map from where a case is to where a
 * reviewer may send it next.
 *
 * `draft` and `collecting_documents` have no staff exits — nobody on the
 * desk touches a case before the traveller submits it.
 * `additional_documents → submitted` is missing on purpose: that leg is
 * the traveller's own resubmit, gated by `RESUBMITTABLE` in
 * `@/lib/data/submissions`, not a staff write. `approved` and `rejected`
 * are terminal — this product has no un-decide, only a fresh case if the
 * situation genuinely changes.
 *
 * Lives here rather than in `@/lib/data/transitions` (which enforces it
 * against the database) so `status-control.tsx` — a client component —
 * can read the same map to draw its buttons without pulling `db` and
 * `server-only` into the browser bundle. `changeStatusTx` re-exports it
 * for its own callers.
 */
export const STAFF_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: [],
  collecting_documents: [],
  submitted: ["under_review", "additional_documents"],
  under_review: ["approved", "rejected", "additional_documents"],
  additional_documents: [],
  approved: [],
  rejected: [],
};

/** Every status a staff transition can land on — the four buttons the desk ever draws. */
export const STAFF_REACHABLE_STATUSES: readonly ApplicationStatus[] = Array.from(
  new Set(Object.values(STAFF_TRANSITIONS).flat())
);

/**
 * The two statuses `STAFF_TRANSITIONS` gives no further exit from — a
 * decision has been made and the case is closed. Named so a decision
 * check reads as what it means, rather than as two statuses that happen
 * to be spelled out together each time.
 */
export const TERMINAL_STATUSES: readonly ApplicationStatus[] = ["approved", "rejected"];

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * The traveller's half of the machine: the statuses a case may be
 * submitted from.
 *
 * Here rather than in `@/lib/data/submissions` (which enforces it) for
 * the same reason `STAFF_TRANSITIONS` is here — the documents screen
 * needs to read it to decide whether to draw the submit panel, and must
 * not pull `db` and `server-only` into that page to do so.
 *
 * That screen used to draw the panel from the checklist alone, so a case
 * already with the review desk still showed "Everything is verified" and
 * a Submit button; the transaction refused the second click with a red
 * toast, which is a correct system telling a traveller off for believing
 * its own screen. `submitApplicationTx` re-exports this for its callers.
 */
export const RESUBMITTABLE: readonly ApplicationStatus[] = [
  "draft",
  "collecting_documents",
  "additional_documents",
];

/** Whether the traveller may send this case to the desk from here. */
export function canSubmitFrom(status: ApplicationStatus): boolean {
  return RESUBMITTABLE.includes(status);
}

/** The same split, for one document's pill. Words in `DOC_STATE_COPY`. */
export const DOC_STATE_VARIANT: Record<DocumentState, BadgeVariant> = {
  not_started: "outline",
  uploaded: "info",
  checking: "brand",
  verified: "success",
  flagged: "warning",
  failed: "danger",
};

/**
 * Same split again, for the roster's other list. An invitation has no
 * reviewer-facing "short" label, so `INVITATION_STATUS_COPY` carries
 * only a `label`.
 */
export const INVITATION_STATUS_VARIANT: Record<InvitationStatus, BadgeVariant> = {
  pending: "neutral",
  accepted: "success",
  expired: "outline",
  revoked: "danger",
};

