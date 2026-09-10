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
 *
 * `processing` joined on 7 September and takes `brand`, the one variant
 * no application status was using. Not `info`: `submitted` already holds
 * blue, and the two are the two handoffs — traveller to agency, agency
 * to mission — so a reader glancing at a queue would have had to read
 * the words to tell "we have it" from "the embassy has it". Not
 * `warning` either, which is `under_review`'s and means somebody here
 * owes work; waiting on a mission is the state where nobody here does.
 *
 * The interview pair joined on 10 September, and by then every variant
 * was spoken for — so both share, which `neutral` already did across
 * `collecting_documents` and `additional_documents`. Sharing is only
 * safe when the two never sit in the same mental group, so each was
 * paired with the status it is least likely to be confused for.
 *
 * `awaiting_decision` takes `brand`, with `processing`. They are the two
 * halves of one condition — a mission is holding this and nobody here
 * owes work — and a reader scanning a queue for "what do I have to do
 * today" is right to skip both on the same colour. The words tell them
 * apart when they need telling apart.
 *
 * `interview_scheduled` takes `info`, with `submitted`. Blue in this
 * product is a dated handoff in flight: `submitted` is one to the desk,
 * an interview is one to a counter. The rejected alternative was
 * `neutral`, which would have been consistent with
 * `additional_documents` on the rule that grey means the traveller owes
 * something — but grey is what the interface uses for the quiet
 * statuses, and a missed interview ends an application. This is the one
 * status carrying a date the traveller must physically keep.
 *
 * Both are a change to a mapping locked with the client on 2026-08-21
 * and want their nod before launch.
 */
export const STATUS_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  draft: "outline",
  collecting_documents: "neutral",
  submitted: "info",
  under_review: "warning",
  processing: "brand",
  interview_scheduled: "info",
  awaiting_decision: "brand",
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
 * `under_review → processing` is the lodgement, and it is a button here
 * rather than a side effect of the export route. The client's words on 7
 * September were "once the admin exports the file the status changes to
 * processing", and the same minute, "once they export, the next primary
 * action the admin should take is to update the application status" —
 * the second is the one built, because every status change in this
 * product carries a written message to the traveller (see `statusEvents`
 * in schema.ts) and a download has nobody to write one. What the export
 * does instead is stamp `documents_exported_at` and let the case screen
 * ask. A generated "your documents were sent" would be this product
 * asserting something about a mission that nothing here observed.
 *
 * `processing` keeps all three of `under_review`'s decision exits. An
 * embassy answers yes, answers no, or comes back wanting more — and the
 * third has to lead somewhere the traveller can act, or a case lodged
 * and queried would be stuck with nobody able to move it.
 *
 * The interview leg — `processing → interview_scheduled →
 * awaiting_decision` — has narrow entrances and wide exits, and both
 * halves of that are load-bearing.
 *
 * Narrow, because a status nothing constrains means nothing.
 * `interview_scheduled` is reachable only from `processing`: a consulate
 * interview follows lodgement, and biometrics before it stay what they
 * already were, an attendance invitation that touches no status at all.
 * `awaiting_decision` is reachable only from `interview_scheduled`, and
 * **there is deliberately no `processing → awaiting_decision`** — a
 * lodged case with no interview is already awaiting a decision, and
 * `processing` is its name. Two statuses for one condition is how a
 * queue and a funnel start disagreeing about the same case, and it would
 * spoil the one figure the pair exists to produce: cases that have been
 * interviewed and are overdue an answer.
 *
 * Wide, because a mission is not a state machine. Both keep every
 * decision exit, so a consulate that answers across the counter can be
 * recorded as having done so rather than routed through a wait that
 * already ended, and a case queried at or after interview has somewhere
 * to go — the traveller cannot submit from either status, so
 * `additional_documents` is the only move that hands them back the case.
 *
 * Booking the interview is not what moves the case. `InviteAttendance`
 * writes the appointment and emails the traveller; the case screen then
 * *asks* whether the case is now `interview_scheduled`, the same shape
 * `documents_exported_at` uses for the lodgement question above. An
 * automatic transition would write a status change carrying no message
 * to the traveller, which is the one thing `changeStatusTx` refuses.
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
  under_review: ["processing", "approved", "rejected", "additional_documents"],
  processing: [
    "interview_scheduled",
    "approved",
    "rejected",
    "additional_documents",
  ],
  interview_scheduled: ["awaiting_decision", "approved", "rejected", "additional_documents"],
  awaiting_decision: ["approved", "rejected", "additional_documents"],
  additional_documents: [],
  approved: [],
  rejected: [],
};

/** Every status a staff transition can land on — the buttons the desk ever draws. */
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

/**
 * Which sheet the documents screen draws on a case it can no longer
 * submit.
 *
 * `submitted` is the one status the traveller reached by their own act,
 * on the click they just made, so it is the one that gets the success
 * sheet. What stood there drew the neutral status panel for all of them,
 * which meant pressing Submit swapped a green sheet for a grey one and
 * left a toast as the only evidence anything had worked.
 *
 * Everything else is deliberately neutral. `under_review` and
 * `processing` are progress rather than success — nobody has decided
 * anything — and `approved` and `rejected` are decisions, which are not
 * reports on the act of submitting and must not borrow its colour.
 *
 * Here rather than in the page for the same reason `canSubmitFrom` is:
 * the two halves of that branch have to be read together, and a screen
 * is a bad place to keep a rule two people will later disagree about.
 */
export function submissionNotice(status: ApplicationStatus): "success" | "neutral" {
  return status === "submitted" ? "success" : "neutral";
}

/** Whether the traveller may send this case to the desk from here. */
export function canSubmitFrom(status: ApplicationStatus): boolean {
  return RESUBMITTABLE.includes(status);
}

/**
 * Who last gave a verdict on a document.
 *
 * `state` cannot answer this, and the screens that asked it of `state`
 * got it wrong. `applyPrecheckTx` writes an AI flag through the same
 * three columns a human flag writes — `state`, `reason`, `reasonCode` —
 * and says so in its own doc comment, so an AI-flagged document was
 * indistinguishable from a reviewed one downstream. The agency's case
 * screen filed it under "Already reviewed", folded shut, while no person
 * had opened it.
 *
 * `checkedAt` is the discriminator: `reviewDocumentTx` is the only thing
 * that writes it, on both legs of a human verdict. `precheck` says only
 * that the machine has run.
 *
 * Deliberately not a fifth `document_state`. The enum describes where a
 * file *is*, and every one of its values is already load-bearing —
 * submission gates on `verified`, billing has since 6 September, and the
 * completion ring counts `checking`. Splitting "flagged by AI" out as a
 * state would put that decision in front of every one of those callers.
 * This is a reading of columns that already exist.
 */
export type DocumentVerdict = "none" | "ai_checked" | "ai_flagged" | "human";

export function documentVerdict(doc: {
  state: DocumentState;
  checkedAt: Date | null;
  precheck: unknown;
}): DocumentVerdict {
  // A person, whichever way they went. `uploadDocument` clears this on a
  // re-upload, so it can only be about the file currently on the row.
  if (doc.checkedAt !== null && (doc.state === "verified" || doc.state === "flagged")) {
    return "human";
  }
  if (doc.precheck == null) return "none";
  if (doc.state === "flagged") return "ai_flagged";
  // A pass leaves the row on `checking`, waiting for a person.
  if (doc.state === "checking") return "ai_checked";
  return "none";
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

