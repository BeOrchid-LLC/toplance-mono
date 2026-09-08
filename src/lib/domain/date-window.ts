/**
 * The clients table's date filter.
 *
 * Four options, and only three of them are ranges. `none` selects the
 * rows with no submission date at all — the client who was invited,
 * accepted, and then stopped — which is the set somebody is actually
 * chasing and the one no range of dates can reach. That is why this is
 * not simply "days ago as a number".
 *
 * `now` is a parameter with a default rather than a call inside the
 * filter, for the reason `expiry.ts` and `digest.ts` take it the same
 * way: a rule that reads the clock cannot be tested, and calling
 * `Date.now()` while a component renders is impure — React's own lint
 * rule refuses it.
 */
export const DATE_WINDOWS = ["7", "30", "90", "none"] as const;

export type DateWindow = (typeof DATE_WINDOWS)[number];

const DAYS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

const DAY_MS = 86_400_000;

/**
 * The instant a "last N days" window opens, or `null` when the chosen
 * option is not a range — either nothing is selected, it is `none`, or
 * it is a value somebody typed into the URL that we do not offer.
 */
export function windowCutoff(
  window: string | undefined,
  now: Date = new Date()
): Date | null {
  const days = window ? DAYS[window] : undefined;
  return days === undefined ? null : new Date(now.getTime() - days * DAY_MS);
}

/**
 * Whether a row belongs in the chosen window.
 *
 * An unrecognised window matches everything rather than nothing: the
 * value arrives from the query string, which anybody can type, and a
 * nonsense one should render the unfiltered roster rather than an empty
 * screen that looks like an agency with no clients.
 */
export function matchesDateWindow(
  submittedAt: Date | null,
  window: string | undefined,
  cutoff: Date | null
): boolean {
  if (window === "none") return submittedAt === null;
  if (cutoff === null) return true;
  return submittedAt !== null && submittedAt.getTime() >= cutoff.getTime();
}
