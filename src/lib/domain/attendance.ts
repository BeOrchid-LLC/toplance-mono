import type { AttendanceKind } from "@/lib/db/schema";

/**
 * Being asked to come in.
 *
 * Biometric capture happens on a government portal and an interview
 * happens at a consulate — this product performs neither and never
 * will, because neither offers an API. What it owns is the summons, so
 * everything here is about saying the appointment clearly rather than
 * about scheduling it.
 */

/** One sentence a traveller can act on. */
export function attendanceSummary({
  kind,
  when,
  place,
}: {
  kind: AttendanceKind;
  /** Already formatted for the reader's locale, or null for "not set". */
  when: string | null;
  place: string;
}): string {
  const what =
    kind === "biometrics"
      ? "your biometrics appointment"
      : "your interview";
  // A missing time is said out loud. A blank where a date should be is
  // a phone call to the agency; "we will confirm the time" is not.
  const time = when ? `on ${when}` : "— your agency will confirm the time";
  return `Please come to ${place} for ${what} ${time}.`;
}

/**
 * Narrow a posted value against the enum rather than casting it.
 *
 * The kind arrives in a form body, and a value Postgres has never heard
 * of should be a refusal here rather than an error from the driver.
 */
export function readAttendanceKind(raw: string | undefined): AttendanceKind | null {
  return raw === "biometrics" || raw === "interview" ? raw : null;
}

/**
 * Whether the notice has stopped being news.
 *
 * Compared by day rather than by instant, deliberately: an appointment
 * at 09:30 should still show its notice at 14:00 on the same day. A
 * traveller who is late, or who is reading it in the waiting room,
 * needs the address more than anyone.
 *
 * An appointment with no time never expires — there is nothing to have
 * passed.
 */
export function attendanceIsPast(scheduledFor: Date | null, now: Date): boolean {
  if (!scheduledFor) return false;
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return day(scheduledFor) < day(now);
}
