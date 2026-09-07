import type { Notification } from "@/lib/db/schema";

/** The enum, named off the row so it cannot drift from the column. */
type NotificationKind = Notification["kind"];

/**
 * Which notifications wait before they email, and for how long.
 *
 * No `server-only` and no database import, deliberately: this is the one
 * decision in the buffer worth pinning in a test, and a test cannot run
 * it if reaching it means standing up Postgres. `notify` and the sweep
 * in `api/cron/notification-emails` both read the answer from here, so
 * there is one rule rather than two that drift.
 */

/**
 * The wait. Long enough that somebody still on the page sees the thing
 * and no email is sent at all; short enough that somebody who closed the
 * tab is told while it still matters.
 */
export const EMAIL_BUFFER_MS = 15 * 60 * 1000;

/**
 * The two kinds that fire while the traveller is plausibly still looking
 * at the screen that caused them.
 *
 * `document_flagged` lands seconds after an upload, from that upload's
 * own `after()` hook — the traveller is usually still on the documents
 * page, and the flag is already on the row in front of them. Emailing
 * immediately tells them something they are currently reading.
 *
 * `message_received` is the same shape: somebody who is in the thread
 * does not need an email about the thread.
 *
 * Nothing else belongs here. A status change, an expiring visa, a ready
 * itinerary — those arrive when the traveller is elsewhere, and there is
 * no in-app moment for a buffer to protect.
 */
export const BUFFERED_KINDS = new Set<NotificationKind>([
  "document_flagged",
  "message_received",
]);

/**
 * When this notification's email falls due, or null to send it now.
 *
 * Null is also what a settled row carries, so the sweep's query and this
 * function agree on one meaning for the column: null is nothing owed.
 */
export function emailDueFor(kind: NotificationKind, now: Date): Date | null {
  if (!BUFFERED_KINDS.has(kind)) return null;
  return new Date(now.getTime() + EMAIL_BUFFER_MS);
}
