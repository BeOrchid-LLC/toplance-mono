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
    expect(result.notice).toContain("No one has checked this");
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
