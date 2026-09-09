import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { attendanceRequests, type AttendanceKind, type AttendanceRequest } from "@/lib/db/schema";

/**
 * Appointments an agency has asked a traveller to attend.
 *
 * Reads and writes only — whether a notice is still worth showing is
 * `attendanceIsPast` in `@/lib/domain/attendance`, so the rule can be
 * tested without a database.
 */

export async function createAttendanceRequest(input: {
  applicationId: string;
  kind: AttendanceKind;
  scheduledFor: Date | null;
  place: string;
  note: string | null;
  requestedBy: string;
}): Promise<AttendanceRequest> {
  const [row] = await db.insert(attendanceRequests).values(input).returning();
  return row;
}

/**
 * The most recent request on one application, or null.
 *
 * The latest rather than every one: the traveller's page shows a single
 * notice, and if an agency has moved an appointment twice the third
 * message is the one that is true. The earlier rows stay in the table
 * as the record that they were sent.
 */
export async function latestAttendanceRequest(
  applicationId: string
): Promise<AttendanceRequest | null> {
  const [row] = await db
    .select()
    .from(attendanceRequests)
    .where(eq(attendanceRequests.applicationId, applicationId))
    .orderBy(desc(attendanceRequests.createdAt))
    .limit(1);
  return row ?? null;
}
