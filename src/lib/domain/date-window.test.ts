import { describe, expect, it } from "vitest";

import {
  matchesDateWindow,
  windowCutoff,
  type DateWindow,
} from "@/lib/domain/date-window";

const NOW = new Date("2026-09-08T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("windowCutoff", () => {
  it("opens a window the stated number of days back", () => {
    expect(windowCutoff("7", NOW)).toEqual(daysAgo(7));
    expect(windowCutoff("30", NOW)).toEqual(daysAgo(30));
    expect(windowCutoff("90", NOW)).toEqual(daysAgo(90));
  });

  it("has no cutoff for the options that are not ranges", () => {
    // `none` is a set, not a span, and nothing selected is not a filter.
    expect(windowCutoff("none", NOW)).toBeNull();
    expect(windowCutoff(undefined, NOW)).toBeNull();
  });

  it("has no cutoff for a value nobody offered", () => {
    // Straight off the query string, so this is a typed URL, not a bug.
    expect(windowCutoff("365", NOW)).toBeNull();
    expect(windowCutoff("../../etc", NOW)).toBeNull();
  });
});

describe("matchesDateWindow", () => {
  it("keeps a submission inside the window and drops one outside it", () => {
    const cutoff = windowCutoff("30", NOW);
    expect(matchesDateWindow(daysAgo(29), "30", cutoff)).toBe(true);
    expect(matchesDateWindow(daysAgo(31), "30", cutoff)).toBe(false);
  });

  it("counts a submission exactly on the boundary as inside", () => {
    // The window is "the last 30 days", and the 30-day-old row is one of
    // them. An exclusive bound would silently drop a row every midnight.
    const cutoff = windowCutoff("30", NOW);
    expect(matchesDateWindow(daysAgo(30), "30", cutoff)).toBe(true);
  });

  it("drops an unsubmitted row from every range", () => {
    // The whole point of the fourth option: a row with no date is not
    // recent, and putting it in "Last 7 days" would be a claim we cannot
    // make about a file nobody has sent.
    for (const w of ["7", "30", "90"] as DateWindow[]) {
      expect(matchesDateWindow(null, w, windowCutoff(w, NOW))).toBe(false);
    }
  });

  it("selects exactly the unsubmitted rows for `none`", () => {
    expect(matchesDateWindow(null, "none", null)).toBe(true);
    expect(matchesDateWindow(daysAgo(1), "none", null)).toBe(false);
  });

  it("matches everything when nothing is selected", () => {
    expect(matchesDateWindow(null, undefined, null)).toBe(true);
    expect(matchesDateWindow(daysAgo(400), undefined, null)).toBe(true);
  });

  it("matches everything for a window nobody offered", () => {
    // A nonsense URL renders the roster, not an empty screen that reads
    // as an agency with no clients.
    expect(matchesDateWindow(daysAgo(400), "365", windowCutoff("365", NOW))).toBe(true);
    expect(matchesDateWindow(null, "365", windowCutoff("365", NOW))).toBe(true);
  });
});
