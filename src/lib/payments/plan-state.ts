/**
 * What the agency's own billing screen is looking at, as a pure
 * function.
 *
 * Kept out of the page for the reason `gates.ts` beside it gives about
 * the paywall: this is a decision, not a rendering detail. "Your plan
 * ends on Friday" and "you ended your plan on Friday" are different
 * sentences about different dates, and the rule for choosing between
 * them should be readable and testable without standing up a request.
 *
 * It is not a second paywall. Entitlement is `activeSubscription` and
 * only ever `activeSubscription` — #77 was two guards disagreeing about
 * one person, and this function is handed that answer rather than
 * re-deriving it. Nothing here decides whether a console opens.
 */

/** How close to the end the warning starts. */
export const ENDING_SOON_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

/** What `latestSubscription` returns, reduced to the two dates that matter. */
export type PlanRecord = {
  periodEnd: Date | null;
  cancelledAt: Date | null;
};

export type PlanState =
  /** Nobody has ever bought a month. */
  | { kind: "never" }
  /** Paid and with room left. */
  | { kind: "running"; until: Date }
  /**
   * Paid, and close enough to the end that the agency should be told.
   *
   * Carries the date and not the number of days left, deliberately. No
   * string in `BILLING` interpolates a count, and the first one to do so
   * would need a plural rule per locale — six of them in Arabic alone.
   * The date says the same thing and formats itself.
   */
  | { kind: "ending-soon"; until: Date }
  /** A month that ran its full course and stopped. */
  | { kind: "lapsed"; endedOn: Date }
  /** A month the agency walked out of, on the day it walked out. */
  | { kind: "cancelled"; endedOn: Date };

export function describePlanState(input: {
  /**
   * `activeSubscription`'s `period_end`, or `null`. The single question
   * that decides whether the console is open; everything below only
   * chooses words.
   */
  activeUntil: Date | null;
  /** `latestSubscription`, whatever became of it. */
  latest: PlanRecord | null;
  now: Date;
}): PlanState {
  const { activeUntil, latest, now } = input;

  if (activeUntil) {
    // Rounded up, so the last part-day still counts as a day of notice
    // and the warning does not start early on an agency with a week and
    // a half left.
    const days = Math.ceil((activeUntil.getTime() - now.getTime()) / DAY);
    return days <= ENDING_SOON_DAYS
      ? { kind: "ending-soon", until: activeUntil }
      : { kind: "running", until: activeUntil };
  }

  // Cancellation is checked before expiry, and stays true afterwards. A
  // month given up early and since run out is still a month the agency
  // walked out of — the truer of the two sentences, and the one that
  // explains the days they cannot see any more.
  if (latest?.cancelledAt) return { kind: "cancelled", endedOn: latest.cancelledAt };
  if (latest?.periodEnd) return { kind: "lapsed", endedOn: latest.periodEnd };

  // No row, or one carrying neither date — which `latestSubscription`
  // cannot return, since it requires a `period_end`. Saying nothing was
  // bought is the safe answer: it names no date the caller does not have.
  return { kind: "never" };
}
