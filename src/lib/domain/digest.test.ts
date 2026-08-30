import { describe, expect, it } from "vitest";

import {
  DEFAULT_DIGEST,
  DIGEST_INTERVAL_DAYS,
  DIGEST_OPTIONS,
  isDigestDue,
  isDigestFrequency,
  readDigestFrequency,
} from "@/lib/domain/digest";

describe("isDigestFrequency", () => {
  it("accepts the four the traveller can choose", () => {
    for (const f of ["daily", "weekly", "monthly", "off"]) {
      expect(isDigestFrequency(f)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isDigestFrequency("hourly")).toBe(false);
    expect(isDigestFrequency("")).toBe(false);
    expect(isDigestFrequency(null)).toBe(false);
    expect(isDigestFrequency(7)).toBe(false);
  });
});

describe("readDigestFrequency", () => {
  /**
   * A traveller who has never touched the setting has no key at all —
   * `notificationPrefs` defaults to `{}`. That must read as the
   * documented default, not as "off", or approval would silently
   * subscribe nobody.
   */
  it("reads an untouched preference as the default", () => {
    expect(readDigestFrequency({})).toBe(DEFAULT_DIGEST);
    expect(readDigestFrequency(null)).toBe(DEFAULT_DIGEST);
    expect(readDigestFrequency(undefined)).toBe(DEFAULT_DIGEST);
  });

  it("reads a stored choice", () => {
    expect(readDigestFrequency({ companionDigest: "daily" })).toBe("daily");
    expect(readDigestFrequency({ companionDigest: "off" })).toBe("off");
  });

  /** A value written by an older build, or by hand. */
  it("falls back to the default for an unrecognised value", () => {
    expect(readDigestFrequency({ companionDigest: "hourly" })).toBe(DEFAULT_DIGEST);
  });
});

describe("isDigestDue", () => {
  const now = new Date("2026-08-30T09:00:00Z");
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it("is never due when the traveller turned it off", () => {
    expect(isDigestDue("off", null, now)).toBe(false);
    expect(isDigestDue("off", daysAgo(400), now)).toBe(false);
  });

  /** Never sent one — approval should not wait a week for the first. */
  it("is due when none has ever been sent", () => {
    expect(isDigestDue("weekly", null, now)).toBe(true);
    expect(isDigestDue("monthly", null, now)).toBe(true);
  });

  it("waits the chosen interval", () => {
    expect(isDigestDue("daily", daysAgo(0.5), now)).toBe(false);
    expect(isDigestDue("daily", daysAgo(1.5), now)).toBe(true);

    expect(isDigestDue("weekly", daysAgo(3), now)).toBe(false);
    expect(isDigestDue("weekly", daysAgo(8), now)).toBe(true);

    expect(isDigestDue("monthly", daysAgo(20), now)).toBe(false);
    expect(isDigestDue("monthly", daysAgo(31), now)).toBe(true);
  });

  /**
   * The scheduler polls more often than the slowest cadence, so a run
   * landing a few minutes early must not skip a traveller for a whole
   * further interval. Exactly on the boundary counts as due.
   */
  it("counts the boundary itself as due", () => {
    expect(isDigestDue("weekly", daysAgo(7), now)).toBe(true);
  });
});

describe("DIGEST_OPTIONS", () => {
  it("offers every frequency, in cadence order, with the default first", () => {
    expect(DIGEST_OPTIONS.map((o) => o.value)).toEqual([
      "weekly",
      "daily",
      "monthly",
      "off",
    ]);
  });

  it("keeps the intervals and the options in step", () => {
    for (const option of DIGEST_OPTIONS) {
      if (option.value === "off") continue;
      expect(DIGEST_INTERVAL_DAYS[option.value]).toBeGreaterThan(0);
    }
  });
});
