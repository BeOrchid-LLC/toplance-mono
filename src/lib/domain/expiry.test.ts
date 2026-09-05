import { describe, expect, it } from "vitest";

import {
  EXPIRY_THRESHOLDS,
  daysUntilExpiry,
  dueThreshold,
  hasExpired,
  parseVisaExpiry,
} from "@/lib/domain/expiry";

/** A fixed "today" so none of these tests depend on when they run. */
const NOW = new Date("2026-09-05T12:00:00Z");

describe("daysUntilExpiry", () => {
  it("counts whole days from today to the expiry date", () => {
    expect(daysUntilExpiry("2026-09-12", NOW)).toBe(7);
    expect(daysUntilExpiry("2026-11-04", NOW)).toBe(60);
  });

  it("is zero on the day the visa expires", () => {
    expect(daysUntilExpiry("2026-09-05", NOW)).toBe(0);
  });

  it("goes negative once the date has passed", () => {
    expect(daysUntilExpiry("2026-09-01", NOW)).toBe(-4);
  });

  it("ignores the time of day, so a late-evening run is not a day short", () => {
    const lateEvening = new Date("2026-09-05T23:59:59Z");
    const earlyMorning = new Date("2026-09-05T00:00:01Z");
    expect(daysUntilExpiry("2026-09-12", lateEvening)).toBe(
      daysUntilExpiry("2026-09-12", earlyMorning)
    );
  });
});

describe("hasExpired", () => {
  it("is false while the date is still ahead, true once it is behind", () => {
    expect(hasExpired("2026-09-06", NOW)).toBe(false);
    expect(hasExpired("2026-09-04", NOW)).toBe(true);
  });

  it("is false on the expiry day itself — the visa is valid that day", () => {
    expect(hasExpired("2026-09-05", NOW)).toBe(false);
  });
});

describe("dueThreshold", () => {
  it("returns nothing while the visa is further out than the widest threshold", () => {
    // 90 days out, nothing sent — too early for the 60-day notice.
    expect(dueThreshold("2026-12-04", [], NOW)).toBeNull();
  });

  it("returns the widest threshold once it is crossed", () => {
    // 45 days out: past 60, not yet 30.
    expect(dueThreshold("2026-10-20", [], NOW)).toBe(60);
  });

  it("counts the boundary day itself as due", () => {
    // Exactly 60 days. A run landing on the boundary must not defer the
    // traveller by a whole further threshold — the same rule isDigestDue
    // applies to its own interval.
    expect(dueThreshold("2026-11-04", [], NOW)).toBe(60);
  });

  it("does not repeat a threshold that has already been sent", () => {
    expect(dueThreshold("2026-10-20", [60], NOW)).toBeNull();
  });

  it("moves to the next threshold down as the date approaches", () => {
    // 25 days out, the 60-day notice already sent.
    expect(dueThreshold("2026-09-30", [60], NOW)).toBe(30);
    // 5 days out, 60 and 30 both sent.
    expect(dueThreshold("2026-09-10", [60, 30], NOW)).toBe(7);
  });

  it("sends only the most urgent notice when a date is entered late", () => {
    // A traveller who supplies their expiry five days before it lands has
    // crossed all three thresholds at once. That is one urgent email, not
    // three — and never the reassuring "60 days" one.
    expect(dueThreshold("2026-09-10", [], NOW)).toBe(7);
  });

  it("stays quiet after the most urgent notice has gone out", () => {
    // The regression this guards: picking the smallest *unsent* threshold
    // would send a "30 days left" notice three days before expiry.
    expect(dueThreshold("2026-09-08", [7], NOW)).toBeNull();
    expect(dueThreshold("2026-09-08", [60, 30, 7], NOW)).toBeNull();
  });

  it("stops entirely once the visa has expired", () => {
    // Past the date there is nothing useful left to warn about, and a
    // reminder would only distress someone who already knows.
    expect(dueThreshold("2026-09-04", [], NOW)).toBeNull();
    expect(dueThreshold("2026-01-01", [60, 30], NOW)).toBeNull();
  });
});

describe("parseVisaExpiry", () => {
  it("accepts a real date in ISO form", () => {
    expect(parseVisaExpiry("2027-03-14", NOW)).toEqual({ ok: true, value: "2027-03-14" });
  });

  it("reads an empty field as clearing the date, not as an error", () => {
    // The traveller is never required to hold a date here, so removing
    // one they entered has to be possible.
    expect(parseVisaExpiry("", NOW)).toEqual({ ok: true, value: null });
    expect(parseVisaExpiry("   ", NOW)).toEqual({ ok: true, value: null });
  });

  it("rejects anything that is not an ISO date", () => {
    expect(parseVisaExpiry("14/03/2027", NOW).ok).toBe(false);
    expect(parseVisaExpiry("next March", NOW).ok).toBe(false);
    expect(parseVisaExpiry("2027-3-4", NOW).ok).toBe(false);
  });

  it("rejects a date that does not exist", () => {
    // Well-formed but not a real day — Date would roll this to 2 March.
    expect(parseVisaExpiry("2027-02-30", NOW).ok).toBe(false);
  });

  it("rejects dates implausibly far from today", () => {
    expect(parseVisaExpiry("1999-01-01", NOW).ok).toBe(false);
    expect(parseVisaExpiry("2099-01-01", NOW).ok).toBe(false);
  });

  it("accepts a date already in the past, within the plausible window", () => {
    // Someone entering an expiry that has just passed is telling us
    // something true and useful — the card says so rather than refusing it.
    expect(parseVisaExpiry("2026-08-01", NOW).ok).toBe(true);
  });

  it("gives a message a traveller could act on when it refuses", () => {
    const result = parseVisaExpiry("2099-01-01", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("EXPIRY_THRESHOLDS", () => {
  it("is ordered widest to most urgent, so the table reads as an escalation", () => {
    expect([...EXPIRY_THRESHOLDS]).toEqual([...EXPIRY_THRESHOLDS].sort((a, b) => b - a));
  });
});
