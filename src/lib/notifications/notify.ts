import "server-only";

import { and, desc, eq, inArray, isNull, lte, ne, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  notificationKind,
  notifications,
  orgMembers,
  profiles,
  type Notification,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/notifications/email";
import { emailDueFor } from "@/lib/notifications/email-buffer";
import {
  advisoryChangedEmail,
  attendanceRequestedEmail,
  supportRepliedEmail,
  checklistChangedEmail,
  checklistCompleteEmail,
  companionDigestEmail,
  documentFlaggedEmail,
  itineraryReadyEmail,
  messageReceivedEmail,
  statusChangedEmail,
  submissionEmail,
  visaExpiringEmail,
  interviewReminderEmail,
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
  /**
   * Two day-counts, deliberately. `thresholdDays` is which of the three
   * notices this is (60, 30 or 7) and exists so the next run can see it
   * has already gone out — it is a dedupe key and is never shown to
   * anyone. `daysRemaining` is the true count to `expiresOn` on the day
   * of sending, and is the only one the copy may use.
   */
  visa_expiring: {
    visaName: string | null;
    expiresOn: string;
    thresholdDays: number;
    daysRemaining: number;
    url: string;
  };
  companion_digest: { url: string; highlights: string[] };
  document_uploaded: { documentName: string; caseRef: string; url: string };
  checklist_changed: {
    visaName: string;
    added: string[];
    removed: string[];
    url: string;
  };
  /**
   * `when` is already formatted, and null means the agency has not
   * fixed a time yet — the copy says "we will confirm" rather than
   * inventing one. `place` is free text because it is an address.
   */
  /**
   * `preview` and not the whole message: this is read in a bell menu
   * and in an inbox, and a support reply can be a page long. The link
   * is what carries somebody to the rest of it.
   */
  support_replied: {
    subject: string;
    preview: string;
    fromStaff: boolean;
    url: string;
  };
  attendance_requested: {
    kind: "biometrics" | "interview";
    when: string | null;
    place: string;
    note: string | null;
    url: string;
  };
  /**
   * Two day-counts and a date, on the same discipline as `visa_expiring`
   * above. `thresholdDays` is which notice this is (7 or 1) and
   * `scheduledFor` is the appointment it was about — together they are
   * the dedupe key `travellersDueForInterviewReminder` reads back, and
   * neither is ever shown to anyone. `daysRemaining` is the true count
   * on the day of sending, and is the only one the copy may use.
   *
   * `scheduledFor` being half the key is what makes a rescheduled
   * interview re-arm the whole run: a new date has no notices against it.
   * `when` is the same instant already formatted for the email.
   */
  interview_reminder: {
    when: string;
    place: string;
    note: string | null;
    scheduledFor: string;
    thresholdDays: number;
    daysRemaining: number;
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
    case "support_replied":
      return supportRepliedEmail(payload as NotificationPayload["support_replied"]);
    case "attendance_requested":
      return attendanceRequestedEmail(
        payload as NotificationPayload["attendance_requested"]
      );
    case "interview_reminder":
      return interviewReminderEmail(
        payload as NotificationPayload["interview_reminder"]
      );
    case "checklist_changed":
      return checklistChangedEmail(
        payload as NotificationPayload["checklist_changed"]
      );
    // In-app only, deliberately — see the enum note in `schema.ts`. A
    // kind with no template sends no email; it does not send a blank
    // one, and it is not an oversight to be filled in later.
    case "document_uploaded":
      return null;
  }
}

/**
 * The whole point of the module: one in-app row plus its matching email,
 * for one person. Entire body try/caught — never throws. A notification
 * is not worth failing the write that triggered it, the same philosophy
 * as `track()` in `@/lib/analytics/track`.
 *
 * Because it never throws, it *reports*: `true` once the row and the
 * email are both away, `false` when either failed. Callers are free to
 * ignore that — most do, and the return is additive for them — but a
 * caller that counts what it sent, or emits an analytics event claiming
 * a delivery, has no other way to know. Wrapping a call to this in a
 * try/catch and counting in the happy path counts every failure as a
 * success, because there is no throw for the catch to see.
 */
export async function notify<K extends keyof NotificationPayload>(
  recipientId: string,
  kind: K,
  payload: NotificationPayload[K],
  applicationId?: string
): Promise<boolean> {
  try {
    /**
     * Two kinds do not email here at all — they are written owing an
     * email, and `api/cron/notification-emails` sends it only if nobody
     * has read the row by the time it falls due. See `emailDueFor` for
     * which and why. Every other kind is unchanged: due `null`, emailed
     * below, in this call.
     */
    const emailDueAt = emailDueFor(kind, new Date());

    await db.insert(notifications).values({
      recipientId,
      kind,
      applicationId: applicationId ?? null,
      payload,
      emailDueAt,
    });

    // Reported as sent, because it is scheduled: the in-app row is
    // written and the bell shows it now, which is the whole point of
    // holding the email back. A caller counting deliveries is counting
    // notifications, not messages that have left the building.
    if (emailDueAt) return true;

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
    // Reported as sent, not failed: the in-app row is the notification
    // (it is what the bell reads and what dedupe checks), and it is
    // written. There is simply nowhere left to deliver a copy to.
    if (!recipient) return true;

    const template = templateFor(kind, payload);
    if (template) await sendEmail({ to: recipient.email, ...template });
    return true;
  } catch (error) {
    console.error(`[notifications] could not notify "${kind}"`, error);
    return false;
  }
}

/**
 * The same event to every member of staff. A thin fan-out over `notify`
 * rather than a batched insert — fine at current team size; revisit if
 * the review desk ever grows past a handful of reviewers.
 *
 * Also never throws — the staff lookup is wrapped too, not just the
 * per-recipient `notify` calls it fans out to. `submitApplication` in
 * `@/app/[locale]/(app)/actions.ts` calls this inside the same try block as
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

/**
 * The same event to everyone at the agency that holds a case.
 *
 * This replaces `notifyStaff` on every case event. Under the v1.3
 * tenancy the agency reviews the documents, decides the application and
 * receives the completion alert; BeOrchid hears about none of it, so a
 * fan-out over `profiles.role = "staff"` would now be both a dead link
 * and a leak of which of an agency's clients are active.
 *
 * A case with no agency notifies nobody. There is no reviewer to tell —
 * see `isAgencyFor` in `@/lib/auth/policy` for why that state is
 * unservable rather than merely unbilled.
 *
 * Not the whole agency once the case is held. These notifications carry
 * a link to the case, and `handlesCase` decides who may open one: an
 * unheld case is anyone's at the agency, a held one is the assignee's
 * and the director's. Telling the rest would send them a link that
 * answers 404, and say which of a colleague's clients are active while
 * doing it — the reach this fan-out is scoped to is the reach the policy
 * grants, which is what keeps the two from drifting apart.
 *
 * Never throws, for the same reason `notifyStaff` did not: callers run
 * this beside a committed write, and `toActionError` does not recognise
 * a raw database error, so an uncaught failure here would surface to a
 * traveller as a failed upload that actually succeeded.
 */
export async function notifyAgency<K extends keyof NotificationPayload>(
  applicationId: string,
  kind: K,
  payload: NotificationPayload[K]
): Promise<void> {
  try {
    const members = await db
      .select({ id: orgMembers.userId })
      .from(applications)
      .innerJoin(orgMembers, eq(orgMembers.orgId, applications.orgId))
      .where(
        and(
          eq(applications.id, applicationId),
          or(
            // Unheld: the whole agency, because somebody has to be able
            // to look before they can pick it up.
            isNull(applications.assigneeId),
            eq(orgMembers.userId, applications.assigneeId),
            eq(orgMembers.role, "owner")
          )
        )
      );

    await Promise.all(members.map((m) => notify(m.id, kind, payload, applicationId)));
  } catch (error) {
    console.error(
      `[notifications] could not notify the agency for application ${applicationId} of "${kind}"`,
      error
    );
  }
}

/**
 * The buffered emails that have now fallen due, oldest first.
 *
 * `readAt is null` is belt-and-braces rather than the mechanism:
 * `markNotificationsRead` nulls `emailDueAt` in the same statement that
 * sets `readAt`, so a read row is already invisible to this query. The
 * predicate stays because a row read by any future path that forgets to
 * null the column would otherwise be emailed about after the traveller
 * had read it, which is the one outcome this whole feature exists to
 * prevent.
 *
 * Capped, like every other sweep in this codebase: this is a loop of
 * serial email sends inside one HTTP handler with a function timeout.
 * What a capped run leaves behind is picked up by the next one, and the
 * ordering means the longest-overdue go first.
 */
export async function dueNotificationEmails(
  now: Date,
  limit = 100
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(
      and(lte(notifications.emailDueAt, now), isNull(notifications.readAt))
    )
    .orderBy(notifications.emailDueAt)
    .limit(limit);
}

/**
 * Send one due notification's email and settle it.
 *
 * `emailDueAt` is nulled whatever happens, including on a send that
 * threw: a mail provider that is refusing this address will refuse it on
 * the next run too, and a row that retries forever is a row that emails
 * forever the moment the provider recovers — an hour of backlog arriving
 * at once, about documents the traveller has long since replaced. One
 * attempt, then settled, and the in-app notification is still there.
 *
 * Returns whether an email actually went out, so the route can report a
 * count that means something rather than the size of the batch.
 */
export async function sendDueNotificationEmail(
  notification: Notification
): Promise<boolean> {
  const settle = () =>
    db
      .update(notifications)
      .set({ emailDueAt: null })
      .where(eq(notifications.id, notification.id));

  try {
    const [recipient] = await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, notification.recipientId))
      .limit(1);

    if (!recipient) {
      await settle();
      return false;
    }

    const template = templateFor(
      notification.kind,
      notification.payload as NotificationPayload[keyof NotificationPayload]
    );

    if (!template) {
      await settle();
      return false;
    }

    await sendEmail({ to: recipient.email, ...template });
    await settle();
    return true;
  } catch (error) {
    console.error(
      `[notifications] could not send the buffered email for ${notification.id}`,
      error
    );
    await settle().catch(() => {});
    return false;
  }
}

/**
 * Messages have their own place now, so they are not also in the bell.
 *
 * `message_received` is counted on the Messages nav item and cleared by
 * visiting the thread. Leaving the rows in the bell as well reported one
 * event in two places and kept the bell's count inflated — a traveller
 * with nine unread messages saw "9+" on a bell whose list was nine
 * copies of "you have a new message", and the flag they actually needed
 * to act on was underneath them.
 *
 * A predicate rather than two hand-written `ne(...)` clauses, so the
 * bell's list and the bell's count cannot come to disagree about what
 * the bell is for.
 */
const notInTheBell = ne(notifications.kind, "message_received");

/**
 * The kinds the bell actually shows, so opening it marks those and only
 * those read.
 *
 * Derived from the enum by subtraction rather than listed by hand: a
 * kind added to `notification_kind` later appears in the bell without
 * anyone remembering to add it here, which is the same direction
 * `notInTheBell` decides in. A hand-written allowlist would silently
 * leave new kinds unreadable-forever, unread count stuck at one.
 */
export const BELL_KINDS = notificationKind.enumValues.filter(
  (k) => k !== "message_received"
);

/** The bell's list: newest first, capped. Messages excluded — see above. */
export async function getNotifications(
  recipientId: string,
  limit = 15
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), notInTheBell))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** The bell's badge. Messages excluded — see `notInTheBell`. */
export async function unreadNotificationCount(recipientId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
        notInTheBell
      )
    );
  return rows.length;
}

/**
 * The Messages nav badge: unread message notifications, and only those.
 *
 * The counterpart to `notInTheBell` — between them every unread
 * notification is counted exactly once, on exactly one surface.
 */
export async function unreadMessageCount(recipientId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
        eq(notifications.kind, "message_received")
      )
    );
  return rows.length;
}

/**
 * Marks the caller's own unread rows read. Never anyone else's.
 *
 * `emailDueAt: null` in the same statement is what cancels a buffered
 * email, and it has to be the same statement: two writes would leave a
 * window in which the sweep sees a row that has just been read and
 * emails about it anyway. Harmless on a row that owed nothing, which is
 * most of them.
 *
 * `kinds` narrows it to one surface's own notifications — the bell
 * passes everything but `message_received`, the messages page passes
 * only that. Omitted, it marks the lot, which is what a "read
 * everything" affordance would want.
 */
export async function markNotificationsRead(
  recipientId: string,
  kinds?: readonly Notification["kind"][]
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date(), emailDueAt: null })
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
        kinds ? inArray(notifications.kind, [...kinds]) : undefined
      )
    );
}
