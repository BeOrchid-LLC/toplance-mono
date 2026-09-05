import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, corridors, notifications } from "@/lib/db/schema";
import { EXPIRY_THRESHOLDS, dueThreshold } from "@/lib/domain/expiry";

/** The widest notice, and so how far ahead a row is worth looking at at all. */
const WIDEST_THRESHOLD = Math.max(...EXPIRY_THRESHOLDS);

export type ExpiryReminder = {
  applicationId: string;
  travelerId: string;
  /** Null when no corridor resolved — the email falls back to "your visa". */
  visaName: string | null;
  /** `YYYY-MM-DD`, exactly as the traveller supplied it. */
  expiresOn: string;
  /** Which notice this is: 60, 30 or 7. */
  daysOut: number;
};

/**
 * The approved travellers owed a visa-expiry warning right now.
 *
 * Deliberately NOT joined to `notificationPrefs`. `companionDigest: "off"`
 * silences the weekly orientation email; it does not silence a warning
 * that someone's leave to remain is ending. A test pins this, because
 * the obvious "make it consistent with the digest" edit is wrong.
 *
 * The split of work is on purpose. SQL narrows to candidates — approved,
 * a date on file, that date inside the widest threshold and not yet past
 * — and `dueThreshold` decides which notice is actually owed. Writing
 * that escalation a second time in SQL would put the same rule in two
 * places, and the two would drift the first time a threshold moved.
 *
 * The candidate set is bounded by its own definition (an approved
 * traveller whose visa expires within sixty days), so it is read whole
 * rather than paged; `limit` caps the *emails* one run sends, which is
 * the cost worth bounding. Most urgent first, so a capped run spends its
 * slots on whoever is closest to losing their status.
 */
export async function travellersDueForExpiryReminder(
  limit: number,
  now: Date = new Date()
): Promise<ExpiryReminder[]> {
  const today = now.toISOString().slice(0, 10);

  // Which notices each application has already had. Read back off the
  // notifications table itself — the same way the digest reads its own
  // history — rather than kept in a column that could drift from what
  // was actually delivered.
  const sentNotices = db
    .select({
      applicationId: notifications.applicationId,
      daysOut: sql<
        number[]
      >`array_agg((${notifications.payload} ->> 'daysOut')::int)`.as("days_out"),
    })
    .from(notifications)
    .where(eq(notifications.kind, "visa_expiring"))
    .groupBy(notifications.applicationId)
    .as("sent_notices");

  const candidates = await db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
      visaName: corridors.visaName,
      expiresOn: applications.visaExpiresOn,
      sentDaysOut: sentNotices.daysOut,
    })
    .from(applications)
    .leftJoin(corridors, eq(corridors.id, applications.corridorId))
    .leftJoin(sentNotices, eq(sentNotices.applicationId, applications.id))
    .where(
      and(
        eq(applications.status, "approved"),
        isNotNull(applications.visaExpiresOn),
        // The `::int` is not decoration — the same trap the digest query
        // documents. A bound number is inferred as `text`, and `date +
        // text` is a runtime 42883 no typechecking would have caught.
        sql`${applications.visaExpiresOn} between ${today}::date and ${today}::date + ${WIDEST_THRESHOLD}::int`
      )
    )
    .orderBy(sql`${applications.visaExpiresOn} asc`);

  const due: ExpiryReminder[] = [];

  for (const row of candidates) {
    if (!row.expiresOn) continue;

    const daysOut = dueThreshold(row.expiresOn, row.sentDaysOut ?? [], now);
    if (daysOut === null) continue;

    due.push({
      applicationId: row.applicationId,
      travelerId: row.travelerId,
      visaName: row.visaName,
      expiresOn: row.expiresOn,
      daysOut,
    });

    if (due.length >= limit) break;
  }

  return due;
}
