import { attendanceIsPast } from "@/lib/domain/attendance";
import type { ApplicationStatus } from "@/lib/domain/status";

/**
 * When to remind a traveller about a consulate interview, and when to
 * chase the desk about one that has already happened.
 *
 * Pure and dependency-free, the same split `@/lib/domain/expiry` makes
 * and for the same reason: the schedule that polls the cron is
 * deploy-time config no test can reach, so the poll decides only how
 * often we *look* — this module decides who is actually owed something.
 *
 * The date is never derived. It is whatever a handler typed into
 * `InviteAttendance`, stored on `attendance_requests.scheduled_for`,
 * because an interview slot is a fact a consulate issued and this
 * product has no way to compute one. Null is a real value there — "we
 * will confirm the time" — and every function here answers it with
 * silence rather than a guess.
 */

/**
 * How many days before an interview a reminder goes out, widest first.
 *
 * Two notices, not a countdown. Seven days is enough lead time to book
 * travel, arrange leave and find the documents the notice asks for; one
 * day is the last moment the reminder can change anything. The three
 * thresholds `EXPIRY_THRESHOLDS` uses would be wrong here — a visa
 * expiry is months out and an interview is usually booked within weeks,
 * so a sixty-day notice would rarely fire and a thirty-day one would
 * arrive before most appointments even exist.
 */
export const INTERVIEW_REMINDER_THRESHOLDS = [7, 1] as const;

export type InterviewThreshold = (typeof INTERVIEW_REMINDER_THRESHOLDS)[number];

/** Midnight UTC on the day an instant falls in. */
function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/**
 * Whole days from today until the interview — negative once it is past.
 *
 * Both sides are truncated to a UTC day before subtracting, so the
 * answer does not depend on what time of day the cron happened to run.
 * `attendanceIsPast` compares appointments by day for the same reason,
 * and the two must agree: a notice that has stopped showing while a
 * reminder about it is still going out would be this product
 * contradicting itself in a traveller's inbox.
 */
export function daysUntilInterview(scheduledFor: Date, now: Date = new Date()): number {
  return Math.round((startOfUtcDay(scheduledFor) - startOfUtcDay(now)) / 86_400_000);
}

/**
 * Which reminder, if any, is owed right now.
 *
 * `alreadySent` is the `daysOut` value of every `interview_reminder`
 * this application has already had **for this appointment** — read back
 * off the notifications table rather than kept in a column that could
 * drift from what was delivered. Keying it to the appointment is what
 * makes a rescheduled interview re-arm the whole run; see
 * `travellersDueForInterviewReminder`, which does the keying.
 *
 * The rule is "the most urgent threshold crossed, provided nothing at
 * least that urgent has gone out". Picking the smallest *unsent*
 * threshold instead would mail somebody a relaxed "a week to go" on the
 * eve of their interview, because seven is still unsent by then. It also
 * means a traveller booked in at two days' notice gets one urgent
 * reminder rather than both at once.
 *
 * Null once the day has passed. A reminder then is noise at best, and at
 * worst tells somebody who missed their interview something they can no
 * longer act on.
 */
export function dueInterviewReminder(
  scheduledFor: Date | null,
  alreadySent: readonly number[],
  now: Date = new Date()
): InterviewThreshold | null {
  if (!scheduledFor) return null;

  const days = daysUntilInterview(scheduledFor, now);
  if (days < 0) return null;

  // The boundary counts as crossed, so a run landing exactly on the
  // seventh day sends that notice rather than deferring it.
  const candidate = [...INTERVIEW_REMINDER_THRESHOLDS]
    .sort((a, b) => a - b)
    .find((threshold) => days <= threshold);

  if (candidate === undefined) return null;

  const mostUrgentSent = alreadySent.length ? Math.min(...alreadySent) : Infinity;
  return candidate < mostUrgentSent ? candidate : null;
}

/**
 * A case whose interview has been and gone with nobody recording what
 * happened.
 *
 * The blind spot this closes: `interview_scheduled` is left behind by a
 * person, not by time, so a case interviewed in March sits there until
 * somebody moves it — telling the traveller an interview is coming
 * months after they sat it. The only pressure against a case going quiet
 * was `sla_due_at`, which measures the review desk and has nothing to
 * say about a mission.
 *
 * Deliberately not a stored flag. It is a reading of two columns that
 * already exist, so it cannot drift from them, and it clears itself the
 * moment a reviewer moves the case on — which is exactly the action it
 * is asking for.
 *
 * The day of the interview is not overdue. Somebody interviewed at 09:30
 * has not been neglected by that afternoon; `attendanceIsPast` draws
 * that boundary, and this defers to it rather than drawing a second one.
 */
export function interviewOutcomeOverdue(input: {
  status: ApplicationStatus;
  scheduledFor: Date | null;
  now: Date;
}): boolean {
  if (input.status !== "interview_scheduled") return false;
  return attendanceIsPast(input.scheduledFor, input.now);
}

/**
 * What the case screen should ask the reviewer, if anything.
 *
 * `"book"` — a lodged case has an appointment written down, and nobody
 * has told the case about it. The traveller's status still reads "With
 * the embassy" while an interview sits in their calendar.
 *
 * `"record"` — a booked case's day has passed with no outcome recorded.
 * The same fact `interviewOutcomeOverdue` reports to the dashboard, put
 * to the one person who can act on it, on the screen where the button is.
 *
 * Both ask rather than tell, which is the limit of what this product
 * knows: it watched somebody write down an appointment, and it saw a
 * date go by. Whether a consulate actually met the traveller is the
 * reviewer's fact to supply, and it arrives as a status change carrying
 * a message the traveller can read — the thing an automatic transition
 * could never write. The same argument `documents_exported_at` makes for
 * the lodgement question above it.
 *
 * A rule here rather than a condition in the JSX: four inputs, two
 * outcomes, and a screen is a bad place to keep something two people
 * will later disagree about.
 */
export function interviewNudge(input: {
  status: ApplicationStatus;
  scheduledFor: Date | null;
  now: Date;
}): "book" | "record" | null {
  // Only from `processing`, because that is the only status
  // `STAFF_TRANSITIONS` gives an exit to `interview_scheduled` from —
  // prompting anywhere else would ask for a button that is not drawn.
  //
  // Deliberately not gated on the date being in the future. A reviewer
  // who booked an interview and never pressed the button needs this
  // question more once the day has passed, not less.
  if (input.status === "processing") {
    return input.scheduledFor ? "book" : null;
  }

  return interviewOutcomeOverdue(input) ? "record" : null;
}
