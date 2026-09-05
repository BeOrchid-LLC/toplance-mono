import { describe, expect, it } from "vitest";

import { STALE_AFTER_DAYS, freshnessOf } from "@/lib/domain/freshness";

/**
 * The staleness policy, asserted directly.
 *
 * This is copy and a threshold, which is exactly the shape of thing that
 * goes wrong quietly: a corridor nobody has checked must never read as
 * one somebody has, and the boundary day must fall on the safe side.
 */
const NOW = new Date("2026-09-02T12:00:00Z");

/** `days` before NOW, as the ISO string the column hands over. */
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("freshnessOf", () => {
  it("says plainly when nobody has ever checked", () => {
    const result = freshnessOf(null, "work", NOW);

    expect(result.state).toBe("unverified");
    // No date is claimed at all — the state carries no `checked` field,
    // so there is nothing a screen could accidentally render as one.
    expect(result).not.toHaveProperty("checked");
    expect(result.notice).toContain("Nobody has checked this route");
  });

  it("treats an unreadable timestamp as never checked", () => {
    // Failing closed: a column we cannot parse is not evidence that
    // someone verified the corridor.
    expect(freshnessOf("not a date", "work", NOW).state).toBe("unverified");
  });

  it("reports a recent check as fresh, with no notice", () => {
    const result = freshnessOf(daysAgo(10), "work", NOW);

    expect(result.state).toBe("fresh");
    expect(result.notice).toBeNull();
    expect(result).toMatchObject({ checked: "23 August 2026" });
  });

  it("holds on the last day of the window and turns on the next", () => {
    const window = STALE_AFTER_DAYS.work;

    expect(freshnessOf(daysAgo(window), "work", NOW).state).toBe("fresh");
    expect(freshnessOf(daysAgo(window + 1), "work", NOW).state).toBe("stale");
  });

  it("gives study a longer window than work for the same date", () => {
    // 120 days: past the work window, inside the study one. The same
    // corridor age is a different answer depending on how fast that kind
    // of rule actually moves.
    const at = daysAgo(120);

    expect(freshnessOf(at, "work", NOW).state).toBe("stale");
    expect(freshnessOf(at, "study", NOW).state).toBe("fresh");
  });

  it("keeps serving a stale corridor, and says how old it is", () => {
    const result = freshnessOf(daysAgo(200), "work", NOW);

    expect(result.state).toBe("stale");
    // Still carries its date: the checklist is dated, not withdrawn.
    expect(result).toMatchObject({ checked: "14 February 2026" });
    expect(result.notice).toContain("200 days ago");
  });
});

describe("who the notices are written for", () => {
  /**
   * These sentences moved from the traveller's requirements screen to
   * the ops console after the 01/09 review, and the reason they moved
   * is the reason this test exists: a traveller cannot act on doubt
   * about our own sourcing, and telling them about it only spends the
   * credibility of a checklist that is very probably right. Whoever
   * rewrites this copy should keep it addressed to the person who can
   * open the source and record a check.
   */
  it("asks staff to check, rather than asking the traveller to", () => {
    const notices = [
      freshnessOf(null, "work", NOW).notice,
      freshnessOf(daysAgo(200), "work", NOW).notice,
    ];

    for (const notice of notices) {
      expect(notice).not.toMatch(/your trip|your visa|you should/i);
    }
  });
});

/**
 * `business` was added to the purpose enum after the rest, so these pin
 * the two things a new purpose can silently get wrong: no staleness
 * window at all, or one copied from the wrong neighbour.
 */
describe("business as a purpose", () => {
  it("has a staleness window", () => {
    // `STALE_AFTER_DAYS` is a `Record<TravelPurpose, …>`, so a missing
    // purpose is a compile error — but a *wrong* one is not.
    expect(STALE_AFTER_DAYS.business).toBe(90);
  });

  it("ages like work, not like tourism", () => {
    // Both turn on sponsor and company evidence and move when a mission
    // changes what it wants from an employer. Tourism's 180 days would
    // let a stale business corridor run twice as long unflagged.
    expect(STALE_AFTER_DAYS.business).toBe(STALE_AFTER_DAYS.work);
    expect(STALE_AFTER_DAYS.business).toBeLessThan(STALE_AFTER_DAYS.tourism);
  });

  it("goes stale on the same boundary as every other purpose", () => {
    const at = new Date(NOW.getTime() - 91 * 86_400_000).toISOString();
    expect(freshnessOf(at, "business", NOW).state).toBe("stale");
  });
});
