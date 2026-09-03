import type { TravelPurpose } from "@/lib/visa/types";

/**
 * How old a rule set is allowed to get before we say so.
 *
 * The engine's honesty rests on one promise — "Nothing here is our
 * interpretation" — and that promise quietly expires. A checklist read
 * off a mission's page in January is not wrong in September; it is
 * *unknown*, and a screen that presents the two identically is the
 * failure this module exists to prevent. A UK fee sat £100 wrong for
 * eight months looking merely dated.
 *
 * Pure and free of I/O, like `corridorGap`: the thresholds are a policy
 * argument, not a query, so they can be read, tested and changed without
 * a database.
 */

export type Freshness =
  | { state: "unverified"; notice: string }
  | { state: "fresh"; checked: string; notice: null }
  | { state: "stale"; checked: string; notice: string };

/**
 * Days before a corridor is called stale, by purpose.
 *
 * PROPOSED, not agreed — PRD open question 3. Work and relocation move
 * fastest (salary thresholds, shortage lists, sponsor rules), study is
 * set once an academic year, and tourism follows whatever the vendor
 * last published. Whoever settles this changes these numbers and
 * nothing else.
 */
export const STALE_AFTER_DAYS: Record<TravelPurpose, number> = {
  work: 90,
  relocation: 90,
  medical: 90,
  study: 180,
  tourism: 180,
};

const DAY_MS = 86_400_000;

function formatDate(at: Date): string {
  return at.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * What to say about when this rule set was last checked.
 *
 * Three outcomes, and the first is the one that matters most:
 *
 * - **unverified** — nobody has ever checked it. Every corridor seeded
 *   before the approval flow existed is in this state, and saying so is
 *   the entire point of adding the column. Inventing a date from
 *   `effectiveFrom` would have hidden exactly the corridors most worth
 *   distrusting.
 * - **fresh** — checked within the window for its purpose.
 * - **stale** — checked, but long enough ago that the traveller should
 *   weigh it themselves. The corridor is still served: pulling it would
 *   replace a dated checklist with no checklist, which helps nobody.
 *   Dropping a corridor out of `is_live` past a hard limit is the
 *   re-check job's decision, not this screen's.
 */
export function freshnessOf(
  lastVerifiedAt: string | null,
  purpose: TravelPurpose,
  now: Date = new Date()
): Freshness {
  if (!lastVerifiedAt) {
    return {
      state: "unverified",
      notice:
        "No one has checked this against the mission since it was added. " +
        "Confirm anything that decides your trip with the mission itself.",
    };
  }

  const at = new Date(lastVerifiedAt);
  if (Number.isNaN(at.getTime())) {
    // A column we cannot read is not a verification we can claim.
    return freshnessOf(null, purpose, now);
  }

  const checked = formatDate(at);
  const days = Math.floor((now.getTime() - at.getTime()) / DAY_MS);

  if (days <= STALE_AFTER_DAYS[purpose]) {
    return { state: "fresh", checked, notice: null };
  }

  return {
    state: "stale",
    checked,
    notice:
      `This was last checked ${days} days ago. Missions change fees and ` +
      "paperwork without notice — confirm anything that decides your trip.",
  };
}
