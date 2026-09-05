/**
 * When to warn a traveller that their visa is running out.
 *
 * Pure and dependency-free, the same split `@/lib/domain/digest` makes
 * and for the same reason: the schedule that polls `/api/cron/companion`
 * is deploy-time config no test can reach, so the poll decides only how
 * often we *look* — this module decides who is actually owed a warning.
 *
 * The date itself is never derived. `applications.visa_expires_on` holds
 * what the traveller read off their own document, because a corridor's
 * validity is not a fact this product stores and a calculated expiry
 * would be a guess about someone's legal status — the same rule
 * `renewalGuidance` was written to keep.
 */

/**
 * How many days before expiry a warning goes out, widest first.
 *
 * Three notices, not a countdown: sixty days is enough lead time to
 * start an extension, thirty is enough to chase one, seven is the last
 * useful moment to act. Anything more often reads as nagging about a
 * date the traveller cannot change.
 */
export const EXPIRY_THRESHOLDS = [60, 30, 7] as const;

export type ExpiryThreshold = (typeof EXPIRY_THRESHOLDS)[number];

/**
 * How far either side of today an expiry date is worth believing.
 *
 * A visa that lapsed a decade ago and one issued for the 2090s are both
 * far likelier to be a typo than a fact, and a typo here is not
 * harmless: it either fires three urgent emails about nothing or
 * silently guarantees none ever fire. Out of range is refused outright
 * rather than clamped — silently moving somebody's expiry date would be
 * this module inventing exactly the fact it refuses to derive.
 */
const PLAUSIBLE_YEARS_PAST = 10;
const PLAUSIBLE_YEARS_FUTURE = 15;

export type ParsedVisaExpiry =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Validate what a traveller typed into the renewal card.
 *
 * Empty clears the date — nobody is obliged to tell us — so it is a
 * successful `null`, not an error.
 *
 * Strict `YYYY-MM-DD` and a round-trip check, because `new Date()` is
 * far too willing: it reads "2027-02-30" as 2 March rather than
 * refusing, and storing a silently-shifted date under the label the
 * traveller gave it is worse than rejecting the input.
 */
export function parseVisaExpiry(
  input: string,
  now: Date = new Date()
): ParsedVisaExpiry {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: "Enter the date as YYYY-MM-DD." };
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "That is not a date we recognise." };
  }

  // The round trip is the real check: a rolled-over date formats back to
  // something other than what was typed.
  if (parsed.toISOString().slice(0, 10) !== trimmed) {
    return { ok: false, error: "That date does not exist — check the day and month." };
  }

  const year = parsed.getUTCFullYear();
  const thisYear = now.getUTCFullYear();
  if (
    year < thisYear - PLAUSIBLE_YEARS_PAST ||
    year > thisYear + PLAUSIBLE_YEARS_FUTURE
  ) {
    return {
      ok: false,
      error: "That date looks too far from today — check the year.",
    };
  }

  return { ok: true, value: trimmed };
}

/** Midnight UTC on a `YYYY-MM-DD` date, which is what a `date` column hands back. */
function startOfUtcDay(value: string | Date): number {
  if (typeof value === "string") return Date.parse(`${value}T00:00:00Z`);
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/**
 * Whole days from today until the visa expires — negative once it has.
 *
 * Both sides are truncated to a UTC day before subtracting, so the
 * answer does not depend on what time of day the cron happened to run.
 * A visa expires on a date, not at an instant.
 */
export function daysUntilExpiry(expiresOn: string | Date, now: Date = new Date()): number {
  return Math.round((startOfUtcDay(expiresOn) - startOfUtcDay(now)) / 86_400_000);
}

/** Whether the expiry date is behind us. The expiry day itself still counts as valid. */
export function hasExpired(expiresOn: string | Date, now: Date = new Date()): boolean {
  return daysUntilExpiry(expiresOn, now) < 0;
}

/**
 * Which warning, if any, is owed right now.
 *
 * `alreadySent` is the `daysOut` value of every `visa_expiring`
 * notification this application has already had — read back off the
 * notifications table itself, the way the digest reads its own history,
 * rather than kept in a column that could drift from what was sent.
 *
 * The rule is "the most urgent threshold crossed, provided nothing at
 * least that urgent has gone out". Picking the smallest *unsent*
 * threshold instead would mail someone a reassuring "30 days left" three
 * days before their visa lapses, because 30 is still unsent by then. It
 * also means a traveller who supplies their date a week before expiry
 * gets one urgent notice rather than all three at once.
 *
 * Returns null past the expiry date. A warning then would only distress
 * someone who already knows, and there is nothing left to warn about.
 */
export function dueThreshold(
  expiresOn: string | Date,
  alreadySent: readonly number[],
  now: Date = new Date()
): ExpiryThreshold | null {
  const days = daysUntilExpiry(expiresOn, now);
  if (days < 0) return null;

  // The boundary counts as crossed: a run landing exactly on the
  // sixtieth day must send that notice rather than defer it to the
  // thirty-day one, which is the same call `isDigestDue` makes.
  const candidate = [...EXPIRY_THRESHOLDS]
    .sort((a, b) => a - b)
    .find((threshold) => days <= threshold);

  if (candidate === undefined) return null;

  const mostUrgentSent = alreadySent.length ? Math.min(...alreadySent) : Infinity;
  return candidate < mostUrgentSent ? candidate : null;
}
