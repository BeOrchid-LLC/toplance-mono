import { describe, expect, it } from "vitest";

import { curatedProvider } from "@/lib/visa/curated";
import { GAP_FIELDS } from "@/lib/visa/merge";
import { travelBuddyProvider } from "@/lib/visa/travelbuddy";
import { visaListProvider } from "@/lib/visa/visalist";
import type { GapField } from "@/lib/visa/types";

/**
 * The live precedence order, mirrored from `@/lib/visa`. Imported as
 * the providers themselves rather than as stubs: the bug this file
 * exists to catch is a mismatch between what the list can collectively
 * supply and what `GAP_FIELDS` asks for, and a stub cannot be wrong
 * about that.
 */
const ORDER = [curatedProvider, visaListProvider, travelBuddyProvider];

describe("the live provider list", () => {
  it("reaches Travel Buddy only for gaps nobody ahead of it fills", () => {
    const earlier = new Set<GapField>(
      [curatedProvider, visaListProvider].flatMap((p) => [...p.fills])
    );
    const onlyTravelBuddy = travelBuddyProvider.fills.filter(
      (f) => !earlier.has(f)
    );

    // If this is ever empty, Travel Buddy has stopped being worth a
    // place in the walk at all.
    expect(onlyTravelBuddy).toEqual(["passportValidity"]);
  });

  /**
   * Whether a best-case walk still pays for Travel Buddy.
   *
   * Best case: every provider ahead of it answered with everything it
   * declares. If a gap survives that, the walk reaches Travel Buddy on
   * every corridor, and the free tier of 120 requests a month is spent
   * on page views rather than on coverage.
   */
  it("still pays for Travel Buddy even when everyone ahead answers fully", () => {
    const supplied = new Set<GapField>(
      [curatedProvider, visaListProvider].flatMap((p) => [...p.fills])
    );
    const remaining = GAP_FIELDS.filter((f) => !supplied.has(f));

    expect(remaining).toEqual(["passportValidity"]);

    const reached = ORDER.at(-1)!.fills.some((f) => remaining.includes(f));
    expect(reached).toBe(true);
  });
});
