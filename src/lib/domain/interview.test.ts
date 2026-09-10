import { describe, expect, it } from "vitest";

import {
  INTERVIEW_REMINDER_THRESHOLDS,
  daysUntilInterview,
  dueInterviewReminder,
  interviewOutcomeOverdue,
  interviewNudge,
} from "@/lib/domain/interview";

const DAY = 86_400_000;
const NOW = new Date("2026-09-10T09:00:00Z");
/** A date `days` from now, at an hour that is not midnight — see the day-boundary tests. */
const inDays = (days: number, hour = 14) =>
  new Date(new Date(NOW.getTime() + days * DAY).setUTCHours(hour, 0, 0, 0));

describe("daysUntilInterview", () => {
  it("counts whole days, not hours", () => {
    // An appointment at 08:00 tomorrow is one day away whether the cron
    // runs at 09:00 today or at 23:00 today. Anything else makes the
    // notice a traveller receives depend on the scheduler's clock.
    expect(daysUntilInterview(inDays(1, 8), NOW)).toBe(1);
    expect(daysUntilInterview(inDays(1, 23), NOW)).toBe(1);
  });

  it("is zero on the day itself, whatever the hour", () => {
    expect(daysUntilInterview(inDays(0, 6), NOW)).toBe(0);
    expect(daysUntilInterview(inDays(0, 22), NOW)).toBe(0);
  });

  it("goes negative once the day has passed", () => {
    expect(daysUntilInterview(inDays(-1), NOW)).toBe(-1);
  });
});

describe("dueInterviewReminder", () => {
  it("has nothing to remind anyone of without a time", () => {
    // `scheduled_for` is nullable on purpose — an agency often knows the
    // office and the week before it knows the slot. "We will confirm"
    // is an honest state, and there is no date to count down to.
    expect(dueInterviewReminder(null, [], NOW)).toBeNull();
  });

  it("sends the widest notice first", () => {
    expect(dueInterviewReminder(inDays(7), [], NOW)).toBe(7);
  });

  it("treats the threshold day itself as crossed", () => {
    // A run landing exactly on the seventh day must send that notice
    // rather than defer it — the same call `dueThreshold` makes for an
    // expiring visa.
    expect(dueInterviewReminder(inDays(7), [], NOW)).toBe(7);
    expect(dueInterviewReminder(inDays(8), [], NOW)).toBeNull();
  });

  it("does not repeat a notice already sent", () => {
    expect(dueInterviewReminder(inDays(7), [7], NOW)).toBeNull();
  });

  /**
   * The rule that matters: the most urgent threshold crossed, provided
   * nothing at least that urgent has gone out. Choosing the smallest
   * *unsent* threshold instead would mail a relaxed "a week to go" on
   * the eve of the interview, because 7 is still unsent by then.
   */
  it("sends one urgent notice, not the whole run, to a late booking", () => {
    // Booked the day before. The traveller gets tomorrow's reminder and
    // is not also told their interview is a week away.
    expect(dueInterviewReminder(inDays(1), [], NOW)).toBe(1);
  });

  it("still reminds on the morning of the interview if nothing has gone out", () => {
    // A case booked and interviewed the same week can reach the day
    // itself with no notice sent. The day-of nudge is the last useful
    // one there is.
    expect(dueInterviewReminder(inDays(0), [], NOW)).toBe(1);
  });

  it("says nothing once the interview is behind them", () => {
    // A reminder about an appointment that has already happened is
    // noise at best, and at worst tells somebody who missed it something
    // they cannot act on.
    expect(dueInterviewReminder(inDays(-1), [], NOW)).toBeNull();
  });

  it("offers two notices and no more", () => {
    // Widest first, so the list reads in the order a traveller meets it.
    expect(INTERVIEW_REMINDER_THRESHOLDS).toEqual([7, 1]);
  });
});

/**
 * The chase, and the blind spot it closes.
 *
 * A case whose interview has happened sits in `interview_scheduled`
 * until a person moves it, and nothing else in the product notices. That
 * is how a case goes quiet: the traveller was interviewed in March, the
 * embassy answered in April, and the status still says an interview is
 * coming. The only pressure against it was `sla_due_at`, which is about
 * the review desk rather than about a mission.
 */
describe("interviewOutcomeOverdue", () => {
  const overdue = (over: Parameters<typeof interviewOutcomeOverdue>[0]) =>
    interviewOutcomeOverdue(over);

  it("flags a booked interview whose day has passed", () => {
    expect(
      overdue({ status: "interview_scheduled", scheduledFor: inDays(-1), now: NOW })
    ).toBe(true);
  });

  it("leaves the day of the interview alone", () => {
    // Somebody interviewed at 09:30 has not been neglected at 14:00. The
    // desk is chased from the next day, not from the same afternoon.
    expect(
      overdue({ status: "interview_scheduled", scheduledFor: inDays(0), now: NOW })
    ).toBe(false);
  });

  it("does not chase an appointment with no time yet", () => {
    // Nothing has passed, because nothing was set. The agency owes the
    // traveller a date here, which is a different complaint.
    expect(
      overdue({ status: "interview_scheduled", scheduledFor: null, now: NOW })
    ).toBe(false);
  });

  it("stops chasing as soon as the case has moved on", () => {
    // The whole point is a case nobody has touched. A reviewer who has
    // recorded the outcome has done the thing being asked for, and a
    // decided case is beyond chasing entirely.
    for (const status of ["awaiting_decision", "approved", "rejected"] as const) {
      expect(overdue({ status, scheduledFor: inDays(-30), now: NOW })).toBe(false);
    }
  });
});

/**
 * What the case screen asks a reviewer, and when.
 *
 * The same shape `documents_exported_at` uses: this product knows an
 * appointment was written down, and knows nothing about what a consulate
 * did. So it asks, and the answer arrives as a status change carrying a
 * message the traveller can read — which is the thing an automatic
 * transition could never write.
 *
 * A rule rather than a condition in the JSX because it has four inputs
 * and two outcomes, and a screen is a bad place to keep something two
 * people will later disagree about.
 */
describe("interviewNudge", () => {
  it("asks a lodged case with an appointment whether it is booked", () => {
    expect(
      interviewNudge({ status: "processing", scheduledFor: inDays(7), now: NOW })
    ).toBe("book");
  });

  it("asks nothing of a lodged case with no appointment written down", () => {
    // Nothing has happened that this product saw. The reviewer has the
    // button either way; there is just no reason to prompt.
    expect(interviewNudge({ status: "processing", scheduledFor: null, now: NOW })).toBeNull();
  });

  it("still asks about an appointment whose day has passed", () => {
    // A reviewer who booked an interview and never pressed the button
    // needs the question more, not less, once the date is behind them.
    expect(
      interviewNudge({ status: "processing", scheduledFor: inDays(-3), now: NOW })
    ).toBe("book");
  });

  it("asks a booked case what happened once the day is behind it", () => {
    expect(
      interviewNudge({ status: "interview_scheduled", scheduledFor: inDays(-1), now: NOW })
    ).toBe("record");
  });

  it("does not ask what happened before it has happened", () => {
    expect(
      interviewNudge({ status: "interview_scheduled", scheduledFor: inDays(3), now: NOW })
    ).toBeNull();
    expect(
      interviewNudge({ status: "interview_scheduled", scheduledFor: inDays(0), now: NOW })
    ).toBeNull();
  });

  it("goes quiet once the case has moved on", () => {
    // Every one of these has either answered the question or ended the
    // case. A prompt on a decided case asks about something that is over.
    for (const status of ["awaiting_decision", "approved", "rejected"] as const) {
      expect(interviewNudge({ status, scheduledFor: inDays(-3), now: NOW })).toBeNull();
    }
  });

  it("says nothing on a case that has not been lodged yet", () => {
    // There is no exit to `interview_scheduled` from here, so a prompt
    // would ask for a button that is not on the screen.
    for (const status of ["submitted", "under_review"] as const) {
      expect(interviewNudge({ status, scheduledFor: inDays(7), now: NOW })).toBeNull();
    }
  });
});
