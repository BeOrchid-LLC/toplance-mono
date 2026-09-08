import { describe, expect, it } from "vitest";

import { describePlanState, ENDING_SOON_DAYS } from "@/lib/payments/plan-state";

const NOW = new Date("2026-09-08T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY);

/**
 * Which of five sentences the till is showing.
 *
 * Pure, and separate from the page, for the reason `gates.ts` gives
 * about the paywall beside it: the difference between "your plan ends
 * on Friday" and "you ended your plan on Friday" is a decision, and a
 * decision buried in JSX is one nobody can test or find again.
 */
describe("describePlanState", () => {
  it("says nothing was ever bought when there is no payment", () => {
    expect(describePlanState({ activeUntil: null, latest: null, now: NOW })).toEqual({
      kind: "never",
    });
  });

  it("reports a plan with room left as simply running", () => {
    const until = inDays(20);

    expect(
      describePlanState({
        activeUntil: until,
        latest: { periodEnd: until, cancelledAt: null },
        now: NOW,
      })
    ).toEqual({ kind: "running", until });
  });

  it("warns once the end is close enough to matter", () => {
    const until = inDays(3);

    expect(
      describePlanState({
        activeUntil: until,
        latest: { periodEnd: until, cancelledAt: null },
        now: NOW,
      })
    ).toEqual({ kind: "ending-soon", until });
  });

  it("still warns on the last part-day", () => {
    // Twelve hours left. Rounding the remainder down would make this
    // zero days and drop the warning on the one day it matters most.
    const until = new Date(NOW.getTime() + DAY / 2);

    expect(
      describePlanState({
        activeUntil: until,
        latest: { periodEnd: until, cancelledAt: null },
        now: NOW,
      })
    ).toEqual({ kind: "ending-soon", until });
  });

  it("does not warn on the day the window opens", () => {
    // The boundary itself. One day further out is still just running.
    const inside = inDays(ENDING_SOON_DAYS);
    const outside = inDays(ENDING_SOON_DAYS + 1);

    expect(
      describePlanState({
        activeUntil: inside,
        latest: { periodEnd: inside, cancelledAt: null },
        now: NOW,
      }).kind
    ).toBe("ending-soon");

    expect(
      describePlanState({
        activeUntil: outside,
        latest: { periodEnd: outside, cancelledAt: null },
        now: NOW,
      }).kind
    ).toBe("running");
  });

  it("says a plan ran out, and when", () => {
    const endedOn = inDays(-2);

    expect(
      describePlanState({
        activeUntil: null,
        latest: { periodEnd: endedOn, cancelledAt: null },
        now: NOW,
      })
    ).toEqual({ kind: "lapsed", endedOn });
  });

  it("says the agency ended it, and when they did", () => {
    // Not the same sentence as lapsing, and not the same date either:
    // the month still had three weeks on it when they walked out.
    const cancelledAt = inDays(-2);

    expect(
      describePlanState({
        activeUntil: null,
        latest: { periodEnd: inDays(19), cancelledAt },
        now: NOW,
      })
    ).toEqual({ kind: "cancelled", endedOn: cancelledAt });
  });

  it("still calls a cancelled plan cancelled after its period would have run out", () => {
    // A month given up early and since expired. "You ended this" is the
    // truer of the two, and the one that explains the missing days.
    const cancelledAt = inDays(-20);

    expect(
      describePlanState({
        activeUntil: null,
        latest: { periodEnd: inDays(-1), cancelledAt },
        now: NOW,
      })
    ).toEqual({ kind: "cancelled", endedOn: cancelledAt });
  });

  it("prefers the live plan over whatever the agency did last month", () => {
    // Bought again after leaving. The screen is about the plan they
    // hold now, not the one they walked out of.
    const until = inDays(25);

    expect(
      describePlanState({
        activeUntil: until,
        latest: { periodEnd: until, cancelledAt: null },
        now: NOW,
      }).kind
    ).toBe("running");
  });
});
