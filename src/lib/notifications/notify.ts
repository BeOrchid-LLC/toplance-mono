import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { notifications, profiles, type Notification } from "@/lib/db/schema";
import { sendEmail } from "@/lib/notifications/email";
import {
  advisoryChangedEmail,
  checklistChangedEmail,
  checklistCompleteEmail,
  companionDigestEmail,
  documentFlaggedEmail,
  itineraryReadyEmail,
  messageReceivedEmail,
  statusChangedEmail,
  submissionEmail,
  visaExpiringEmail,
} from "@/lib/notifications/templates";

/**
 * The notification module every later slice emits through.
 *
 * `notify` and `notifyStaff` are called only AFTER the transaction that
 * caused them commits — a rolled-back write must never email anyone, and
 * a slow or failing email must never roll back a write. Neither function
 * opens a transaction of its own or joins the caller's.
 */

/**
 * Absolute URL for a link inside an email. `APP_URL` unset means local dev.
 *
 * The fallback is a convenience for a developer's machine and a hazard
 * anywhere else: these URLs are read after they have left the building,
 * in an invitation or a digest, so an unset `APP_URL` in production does
 * not fail visibly — it ships links to `localhost` that no recipient can
 * open, and nothing in the app ever reports it. Refusing outright turns
 * that into a deploy-time error with the variable's name in it.
 *
 * Note this is a per-call check rather than a module-load assertion: the
 * build runs with `NODE_ENV=production` and no runtime environment, so
 * throwing at import time would fail `next build` instead.
 */
export function appUrl(path: string): string {
  const configured = process.env.APP_URL;

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "APP_URL is not set. Emailed links would point at localhost."
      );
    }
    return new URL(path, "http://localhost:3000").toString();
  }

  return new URL(path, configured).toString();
}

/**
 * One entry per `notification_kind`, keyed so an emitter's payload is
 * compile-checked against the template it will build. `invitation` is
 * deliberately absent — see the schema comment on `notifications`: an
 * invitee has no `profiles` row, so `invitationEmail` is sent directly by
 * its caller rather than through here.
 */
export type NotificationPayload = {
  application_submitted: { caseRef: string; url: string };
  checklist_complete: { caseRef: string; url: string };
  status_changed: { statusLabel: string; message: string; url: string };
  document_flagged: { documentName: string; reason: string; url: string };
  message_received: { senderName: string; preview: string; url: string };
  itinerary_ready: { url: string };
  advisory_changed: {
    destination: string;
    source: string;
    level: string | null;
    changeNote: string | null;
    url: string;
  };
  visa_expiring: {
    visaName: string | null;
    expiresOn: string;
    daysOut: number;
    url: string;
  };
  companion_digest: { url: string; highlights: string[] };
  checklist_changed: {
    visaName: string;
    added: string[];
    removed: string[];
    url: string;
  };
};

function templateFor<K extends keyof NotificationPayload>(
  kind: K,
  payload: NotificationPayload[K]
) {
  switch (kind) {
    case "application_submitted":
      return submissionEmail(payload as NotificationPayload["application_submitted"]);
    case "checklist_complete":
      return checklistCompleteEmail(
        payload as NotificationPayload["checklist_complete"]
      );
    case "status_changed":
      return statusChangedEmail(payload as NotificationPayload["status_changed"]);
    case "document_flagged":
      return documentFlaggedEmail(payload as NotificationPayload["document_flagged"]);
    case "message_received":
      return messageReceivedEmail(payload as NotificationPayload["message_received"]);
    case "itinerary_ready":
      return itineraryReadyEmail(payload as NotificationPayload["itinerary_ready"]);
    case "advisory_changed":
      return advisoryChangedEmail(
        payload as NotificationPayload["advisory_changed"]
      );
    case "visa_expiring":
      return visaExpiringEmail(payload as NotificationPayload["visa_expiring"]);
    case "companion_digest":
      return companionDigestEmail(payload as NotificationPayload["companion_digest"]);
    case "checklist_changed":
      return checklistChangedEmail(
        payload as NotificationPayload["checklist_changed"]
      );
  }
}

/**
 * The whole point of the module: one in-app row plus its matching email,
 * for one person. Entire body try/caught — never throws. A notification
 * is not worth failing the write that triggered it, the same philosophy
 * as `track()` in `@/lib/analytics/track`.
 */
export async function notify<K extends keyof NotificationPayload>(
  recipientId: string,
  kind: K,
  payload: NotificationPayload[K],
  applicationId?: string
): Promise<void> {
  try {
    await db.insert(notifications).values({
      recipientId,
      kind,
      applicationId: applicationId ?? null,
      payload,
    });

    const [recipient] = await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, recipientId))
      .limit(1);

    // A `recipientId` with no `profiles` row at all never reaches here —
    // `notifications.recipientId` has a foreign key, so that insert
    // fails above and is the caught DB error, not this branch. This one
    // covers the narrower race where the profile is deleted between the
    // insert and this select: the in-app row still exists (it's the
    // source of truth for the bell — see the schema comment on
    // `notifications`), there is just nowhere left to send an email.
    if (!recipient) return;

    const template = templateFor(kind, payload);
    await sendEmail({ to: recipient.email, ...template });
  } catch (error) {
    console.error(`[notifications] could not notify "${kind}"`, error);
  }
}

/**
 * The same event to every member of staff. A thin fan-out over `notify`
 * rather than a batched insert — fine at current team size; revisit if
 * the review desk ever grows past a handful of reviewers.
 *
 * Also never throws — the staff lookup is wrapped too, not just the
 * per-recipient `notify` calls it fans out to. `submitApplication` in
 * `@/app/(app)/actions.ts` calls this inside the same try block as
 * `submitApplicationTx` and `revalidatePath`, and `toActionError` does
 * not recognise a raw DB error, so an uncaught failure here would have
 * surfaced as a submission error to the traveller — after their
 * submission had already committed.
 */
export async function notifyStaff<K extends keyof NotificationPayload>(
  kind: K,
  payload: NotificationPayload[K],
  applicationId?: string
): Promise<void> {
  try {
    const staff = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.role, "staff"));

    await Promise.all(staff.map((s) => notify(s.id, kind, payload, applicationId)));
  } catch (error) {
    console.error(`[notifications] could not notify staff of "${kind}"`, error);
  }
}

/** The bell's list: newest first, capped. */
export async function getNotifications(
  recipientId: string,
  limit = 15
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, recipientId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** The bell's badge. */
export async function unreadNotificationCount(recipientId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt))
    );
  return rows.length;
}

/** Marks the caller's own unread rows read. Never anyone else's. */
export async function markNotificationsRead(recipientId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt))
    );
}
