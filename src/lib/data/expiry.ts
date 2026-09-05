import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, corridors, notifications } from "@/lib/db/schema";
import {
  EXPIRY_THRESHOLDS,
  daysUntilExpiry,
  dueThreshold,
} from "@/lib/domain/expiry";

/** The widest notice, and so how far ahead a row is worth looking at at all. */
const WIDEST_THRESHOLD = Math.max(...EXPIRY_THRESHOLDS);

export type ExpiryReminder = {
  applicationId: string;
  travelerId: string;
  /** Null when no corridor resolved — the email falls back to "your visa". */
  visaName: string | null;
  /** `YYYY-MM-DD`, exactly as the traveller supplied it. */
  expiresOn: string;
  /** Which notice this is: 60, 30 or 7. A dedupe key, never shown to anyone. */
  thresholdDays: number;
  /** Whole days from today to `expiresOn`. The only count the email may print. */
  daysRemaining: number;
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

  // Which notices each application has already had, **for which expiry
  // date**. Read back off the notifications table itself — the same way
  // the digest reads its own history — rather than kept in a column that
  // could drift from what was actually delivered.
  //
  // The date is half the key, not decoration. A notice is only a reason
  // to stay quiet about the date it was actually about: a traveller who
  // got the 60-day notice for a 2027 expiry, then had their visa extended
  // and updated the field to 2028, must get the whole run of notices
  // again. Grouped on `applicationId` alone they would silently drop
  // straight to the 30-day one a year later.
  const sentNotices = db
    .select({
      applicationId: notifications.applicationId,
      expiresOn: sql<string>`${notifications.payload} ->> 'expiresOn'`.as(
        "expires_on"
      ),
      thresholdDays: sql<
        number[]
      >`array_agg((${notifications.payload} ->> 'thresholdDays')::int)`.as(
        "threshold_days"
      ),
    })
    .from(notifications)
    .where(eq(notifications.kind, "visa_expiring"))
    .groupBy(notifications.applicationId, sql`${notifications.payload} ->> 'expiresOn'`)
    .as("sent_notices");

  const candidates = await db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
      visaName: corridors.visaName,
      expiresOn: applications.visaExpiresOn,
      sentThresholds: sentNotices.thresholdDays,
    })
    .from(applications)
    .leftJoin(corridors, eq(corridors.id, applications.corridorId))
    .leftJoin(
      sentNotices,
      and(
        eq(sentNotices.applicationId, applications.id),
        // The column is cast to text, not the JSON value to a date. Both
        // sides are then `YYYY-MM-DD` — that is what `parseVisaExpiry`
        // stores and what a `date` renders as under ISO DateStyle — and
        // no row can make this throw. Casting the other way would put
        // `::date` over arbitrary payload text, where one malformed
        // value is a 22007 that takes down the whole sweep.
        sql`${sentNotices.expiresOn} = ${applications.visaExpiresOn}::text`
      )
    )
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

    const thresholdDays = dueThreshold(row.expiresOn, row.sentThresholds ?? [], now);
    if (thresholdDays === null) continue;

    due.push({
      applicationId: row.applicationId,
      travelerId: row.travelerId,
      visaName: row.visaName,
      expiresOn: row.expiresOn,
      thresholdDays,
      // The threshold says which notice this is; this says what is
      // actually true on the day it goes out. Computed here, from the
      // same `now` the threshold was chosen with, so the email can never
      // print one while meaning the other.
      daysRemaining: daysUntilExpiry(row.expiresOn, now),
    });

    if (due.length >= limit) break;
  }

  return due;
}
