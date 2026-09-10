import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, notInArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, attendanceRequests, notifications, profiles } from "@/lib/db/schema";
import {
  INTERVIEW_REMINDER_THRESHOLDS,
  daysUntilInterview,
  dueInterviewReminder,
} from "@/lib/domain/interview";
import { TERMINAL_STATUSES } from "@/lib/domain/status";

/** The widest notice, and so how far ahead an appointment is worth looking at at all. */
const WIDEST_THRESHOLD = Math.max(...INTERVIEW_REMINDER_THRESHOLDS);

export type InterviewReminder = {
  applicationId: string;
  travelerId: string;
  /** The appointment itself. Never null — a reminder needs something to count to. */
  scheduledFor: Date;
  /** Free text, as the agency typed it. It is an address. */
  place: string;
  note: string | null;
  /** Which notice this is: 7 or 1. A dedupe key, never shown to anyone. */
  thresholdDays: number;
  /** Whole days from today to the interview. The only count the email may print. */
  daysRemaining: number;
};

/**
 * The travellers owed a reminder about a consulate interview right now.
 *
 * **Keyed on the appointment, not on the status.** The obvious edit is to
 * filter on `interview_scheduled`, and it is wrong: a handler who books
 * an interview and forgets to press the button on the case screen has
 * still booked an interview, and the traveller still has to be there.
 * Gating on the status would make one person's forgetfulness cost
 * somebody else their visa. What the status *is* good for is the desk's
 * own view, which is `casesAwaitingInterviewOutcome` below.
 *
 * A decided case is excluded, because nothing turns on the appointment
 * once an answer has landed and a reminder then would contradict the
 * decision this product had just sent them.
 *
 * The split of work matches `travellersDueForExpiryReminder`: SQL
 * narrows to candidates — an interview booked, a time fixed, that time
 * inside the widest threshold and not yet past — and
 * `dueInterviewReminder` decides which notice is actually owed. Writing
 * that escalation a second time in SQL would put one rule in two places.
 */
export async function travellersDueForInterviewReminder(
  limit: number,
  now: Date = new Date()
): Promise<InterviewReminder[]> {
  const today = now.toISOString().slice(0, 10);

  /**
   * The appointment that is true right now, one row per application.
   *
   * The latest rather than every one, exactly as `latestAttendanceRequest`
   * reads it for the traveller's own notice: if an agency has moved an
   * interview twice, the third row is the one anybody should be reminded
   * about. The earlier rows stay in the table as the record that they
   * were sent.
   */
  const latestInterview = db
    .selectDistinctOn([attendanceRequests.applicationId], {
      applicationId: attendanceRequests.applicationId,
      scheduledFor: attendanceRequests.scheduledFor,
      place: attendanceRequests.place,
      note: attendanceRequests.note,
    })
    .from(attendanceRequests)
    .where(eq(attendanceRequests.kind, "interview"))
    .orderBy(attendanceRequests.applicationId, desc(attendanceRequests.createdAt))
    .as("latest_interview");

  /**
   * Which notices each application has already had, **for which day**.
   *
   * The day is half the key, not decoration — the same lesson
   * `travellersDueForExpiryReminder` documents. A traveller who had the
   * seven-day notice for the 14th and was then rebooked to the 30th must
   * get the whole run again; grouped on `applicationId` alone they would
   * get nothing for the new date at all.
   *
   * Compared as the first ten characters of an ISO instant, which are
   * exactly `YYYY-MM-DD`, against `to_char` on the column. Neither side
   * casts arbitrary payload text to a date, so no single malformed
   * payload can throw a 22007 and take down the whole sweep. Comparing
   * whole instants would also be wrong for a softer reason: an agency
   * that corrects 09:00 to 09:30 has not made a new appointment, and
   * re-arming the run would email the traveller twice about one morning.
   */
  const sentNotices = db
    .select({
      applicationId: notifications.applicationId,
      day: sql<string>`left(${notifications.payload} ->> 'scheduledFor', 10)`.as(
        "day"
      ),
      thresholdDays: sql<
        number[]
      >`array_agg((${notifications.payload} ->> 'thresholdDays')::int)`.as(
        "threshold_days"
      ),
    })
    .from(notifications)
    .where(eq(notifications.kind, "interview_reminder"))
    .groupBy(
      notifications.applicationId,
      sql`left(${notifications.payload} ->> 'scheduledFor', 10)`
    )
    .as("sent_notices");

  const candidates = await db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
      scheduledFor: latestInterview.scheduledFor,
      place: latestInterview.place,
      note: latestInterview.note,
      sentThresholds: sentNotices.thresholdDays,
    })
    .from(applications)
    .innerJoin(latestInterview, eq(latestInterview.applicationId, applications.id))
    .leftJoin(
      sentNotices,
      and(
        eq(sentNotices.applicationId, applications.id),
        sql`${sentNotices.day} = to_char(${latestInterview.scheduledFor} at time zone 'UTC', 'YYYY-MM-DD')`
      )
    )
    .where(
      and(
        notInArray(applications.status, [...TERMINAL_STATUSES]),
        isNotNull(latestInterview.scheduledFor),
        // The `::int` is not decoration — a bound number is inferred as
        // `text`, and `date + text` is a runtime 42883 no typechecking
        // would have caught. The same trap the digest query documents.
        sql`${latestInterview.scheduledFor} >= ${today}::date`,
        sql`${latestInterview.scheduledFor} < ${today}::date + ${WIDEST_THRESHOLD + 1}::int`
      )
    )
    // Soonest first, so a capped run spends its slots on whoever is
    // closest to missing an appointment.
    .orderBy(asc(latestInterview.scheduledFor));

  const due: InterviewReminder[] = [];

  for (const row of candidates) {
    if (!row.scheduledFor) continue;

    const thresholdDays = dueInterviewReminder(
      row.scheduledFor,
      row.sentThresholds ?? [],
      now
    );
    if (thresholdDays === null) continue;

    due.push({
      applicationId: row.applicationId,
      travelerId: row.travelerId,
      scheduledFor: row.scheduledFor,
      place: row.place,
      note: row.note,
      thresholdDays,
      // The threshold says which notice this is; this says what is
      // actually true on the day it goes out. Computed from the same
      // `now` the threshold was chosen with, so the email can never
      // print one while meaning the other.
      daysRemaining: daysUntilInterview(row.scheduledFor, now),
    });

    if (due.length >= limit) break;
  }

  return due;
}

export type StaleInterview = {
  applicationId: string;
  caseRef: string;
  travelerId: string;
  travelerName: string;
  /** The appointment that has already happened. Never null. */
  scheduledFor: Date;
};

/**
 * One agency's cases whose interview has been and gone with nobody
 * recording what happened.
 *
 * The complement of `travellersDueForInterviewReminder`, and the reason
 * the pair of statuses was worth adding at all. That one is keyed on the
 * appointment because a traveller must be reminded whatever the case
 * says; this one is keyed on the **status**, because the whole question
 * is whether a person has moved the case on. `interview_scheduled` with
 * a date behind it is the definition of a case nobody has touched.
 *
 * Not a stored flag, and not a notification. It is a reading of two
 * columns that already exist, so it cannot drift from them, and it
 * clears itself the moment a reviewer does the thing it is asking for.
 *
 * Scoped to the caller's agencies, like every other agency-facing read
 * here — an empty list of agencies is an empty result rather than every
 * case in the product, which is the failure mode worth being explicit
 * about.
 *
 * Oldest first: the case that has been quiet longest is the one whose
 * traveller has been waiting longest to be told anything.
 */
export async function casesAwaitingInterviewOutcome(
  orgIds: readonly string[],
  now: Date = new Date()
): Promise<StaleInterview[]> {
  if (orgIds.length === 0) return [];

  const today = now.toISOString().slice(0, 10);

  const latestInterview = db
    .selectDistinctOn([attendanceRequests.applicationId], {
      applicationId: attendanceRequests.applicationId,
      scheduledFor: attendanceRequests.scheduledFor,
    })
    .from(attendanceRequests)
    .where(eq(attendanceRequests.kind, "interview"))
    .orderBy(attendanceRequests.applicationId, desc(attendanceRequests.createdAt))
    .as("latest_interview");

  const rows = await db
    .select({
      applicationId: applications.id,
      caseRef: applications.caseRef,
      travelerId: applications.travelerId,
      travelerName: profiles.fullName,
      scheduledFor: latestInterview.scheduledFor,
    })
    .from(applications)
    .innerJoin(latestInterview, eq(latestInterview.applicationId, applications.id))
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .where(
      and(
        inArray(applications.orgId, [...orgIds]),
        eq(applications.status, "interview_scheduled"),
        isNotNull(latestInterview.scheduledFor),
        // Strictly before today, so the day of the interview is not
        // chased. `attendanceIsPast` draws the same boundary for the
        // traveller's own notice and the two must agree.
        sql`${latestInterview.scheduledFor} < ${today}::date`
      )
    )
    .orderBy(asc(latestInterview.scheduledFor));

  return rows.filter(
    (row): row is StaleInterview => row.scheduledFor !== null
  );
}
