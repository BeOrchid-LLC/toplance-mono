/**
 * How often the post-arrival digest reaches a traveller.
 *
 * The brief (item 16) asks for a notification scheduler each traveller
 * sets their own frequency on. Two values — weekly or nothing — is a
 * switch, not a frequency, so the choice is widened here and the cadence
 * is enforced in code rather than by whatever interval the deployment
 * happens to poll on.
 *
 * That split matters. `/api/cron/companion` is triggered by external
 * config (a Coolify scheduled task hitting the URL), and config is the
 * one part of this system nobody can unit test. So the schedule is only
 * a *poll* — it decides how often we look — and this module decides who
 * is actually due. A deployment set to poll hourly still sends a weekly
 * traveller one email a week; a deployment that misses a run sends the
 * next one late rather than never.
 *
 * Pure and dependency-free so that policy is testable on its own.
 */

/** Stored on `profiles.notificationPrefs.companionDigest`. */
export const DIGEST_FREQUENCIES = ["weekly", "daily", "monthly", "off"] as const;

export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

/**
 * What an untouched preference means. `notificationPrefs` defaults to
 * `{}`, so most travellers have no key at all — and reading that as
 * "off" would quietly unsubscribe everyone who never visited the
 * setting.
 */
export const DEFAULT_DIGEST: DigestFrequency = "weekly";

/** How long between digests, per frequency. `off` has no interval. */
export const DIGEST_INTERVAL_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
} as const satisfies Record<Exclude<DigestFrequency, "off">, number>;

/** The choice as the profile editor offers it, default first. */
export const DIGEST_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "off", label: "Off" },
] as const satisfies ReadonlyArray<{ value: DigestFrequency; label: string }>;

export function isDigestFrequency(value: unknown): value is DigestFrequency {
  return (
    typeof value === "string" &&
    (DIGEST_FREQUENCIES as readonly string[]).includes(value)
  );
}

/**
 * The frequency stored in a `notificationPrefs` jsonb blob.
 *
 * Anything unreadable — no key, a null column, a value written by an
 * older build — reads as the default rather than throwing. A preference
 * column is not a place to fail a page render.
 */
export function readDigestFrequency(prefs: unknown): DigestFrequency {
  if (!prefs || typeof prefs !== "object") return DEFAULT_DIGEST;
  const value = (prefs as Record<string, unknown>).companionDigest;
  return isDigestFrequency(value) ? value : DEFAULT_DIGEST;
}

/**
 * Whether this traveller is owed a digest now.
 *
 * `lastSentAt` is when the last `companion_digest` notification was
 * written for them; null means none ever was, which is due immediately
 * — approval should not leave someone waiting a month for their first.
 *
 * The boundary counts as due: a scheduled run landing a few seconds
 * before the interval elapses would otherwise defer that traveller by a
 * whole further interval, every time, and drift them later each week.
 */
export function isDigestDue(
  frequency: DigestFrequency,
  lastSentAt: Date | null,
  now: Date = new Date()
): boolean {
  if (frequency === "off") return false;
  if (!lastSentAt) return true;

  const elapsedDays = (now.getTime() - lastSentAt.getTime()) / 86_400_000;
  return elapsedDays >= DIGEST_INTERVAL_DAYS[frequency];
}
