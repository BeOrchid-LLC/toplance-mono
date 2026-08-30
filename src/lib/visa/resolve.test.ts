import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveWith } from "@/lib/visa/resolve";
import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

const QUERY: CorridorQuery = {
  nationalityIso: "ng",
  destinationIso: "gb",
  purpose: "work",
};

const ruleSet = (over: Partial<CorridorRuleSet> = {}): CorridorRuleSet => ({
  corridorId: "corridor-1",
  provider: "curated",
  visaName: "Skilled Worker Visa",
  version: 1,
  effectiveFrom: "2026-01-15",
  sourceName: "UK Visas and Immigration",
  sourceUrl: "https://www.gov.uk/skilled-worker-visa",
  attribution: null,
  contributions: [],
  processingWeeksMin: 3,
  processingWeeksMax: 8,
  governmentFeeMinor: 71900,
  governmentFeeCurrency: "GBP",
  requirements: [
    {
      docKey: "passport",
      name: "International passport (bio page)",
      description: null,
      category: "identity",
      isRequired: true,
      sortOrder: 1,
    },
  ],
  ...over,
});

/** A provider that answers with whatever it was handed. */
function stub(name: string, answer: CorridorRuleSet | null): VisaDataProvider {
  return { name, fetch: vi.fn(async () => answer) };
}

function broken(name: string): VisaDataProvider {
  return {
    name,
    fetch: vi.fn(async () => {
      throw new Error("vendor down");
    }),
  };
}

describe("resolveWith", () => {
  afterEach(() => vi.restoreAllMocks());

  it("answers null when nobody serves the corridor", async () => {
    expect(await resolveWith([stub("a", null), stub("b", null)], QUERY)).toBeNull();
  });

  it("takes the first provider that answers as the spine", async () => {
    const first = stub("curated", ruleSet());
    const second = stub("doineedvisa", ruleSet({ provider: "doineedvisa" }));

    const resolved = await resolveWith([first, second], QUERY);

    expect(resolved!.provider).toBe("curated");
  });

  /**
   * The quota gate. Every provider behind a complete spine costs a
   * request against a metered plan for a figure already on the page, so
   * a rule set with nothing missing must end the walk. All four seeded
   * corridors are complete, which is why this is the live path today.
   */
  it("does not consult a second provider when the spine is complete", async () => {
    const first = stub("curated", ruleSet());
    const second = stub("doineedvisa", ruleSet({ provider: "doineedvisa" }));

    await resolveWith([first, second], QUERY);

    expect(second.fetch).not.toHaveBeenCalled();
  });

  it("fills a figure the spine lacks from the next provider", async () => {
    const first = stub(
      "curated",
      ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null })
    );
    const second = stub(
      "doineedvisa",
      ruleSet({
        provider: "doineedvisa",
        sourceName: "DoINeedVisa",
        governmentFeeMinor: 5160,
        governmentFeeCurrency: "GBP",
      })
    );

    const resolved = await resolveWith([first, second], QUERY);

    expect(resolved!.provider).toBe("curated");
    expect(resolved!.governmentFeeMinor).toBe(5160);
    expect(resolved!.contributions).toEqual([
      expect.objectContaining({
        provider: "doineedvisa",
        fields: ["Government fee"],
      }),
    ]);
  });

  it("stops as soon as the last gap is filled", async () => {
    const first = stub(
      "curated",
      ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null })
    );
    const second = stub(
      "doineedvisa",
      ruleSet({
        provider: "doineedvisa",
        governmentFeeMinor: 5160,
        governmentFeeCurrency: "GBP",
      })
    );
    const third = stub("travelbuddy", ruleSet({ provider: "travelbuddy" }));

    await resolveWith([first, second, third], QUERY);

    expect(second.fetch).toHaveBeenCalledTimes(1);
    expect(third.fetch).not.toHaveBeenCalled();
  });

  it("keeps walking when a provider has nothing to add", async () => {
    const first = stub(
      "curated",
      ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null })
    );
    const silent = stub("doineedvisa", null);
    const third = stub(
      "travelbuddy",
      ruleSet({
        provider: "travelbuddy",
        governmentFeeMinor: 4000,
        governmentFeeCurrency: "GBP",
      })
    );

    const resolved = await resolveWith([first, silent, third], QUERY);

    expect(resolved!.governmentFeeMinor).toBe(4000);
    expect(resolved!.contributions[0].provider).toBe("travelbuddy");
  });

  /**
   * One vendor being down must not take down a screen another vendor —
   * or the curated table — can already serve.
   */
  it("skips a provider that throws rather than failing the corridor", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const first = stub(
      "curated",
      ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null })
    );
    const third = stub(
      "travelbuddy",
      ruleSet({
        provider: "travelbuddy",
        governmentFeeMinor: 4000,
        governmentFeeCurrency: "GBP",
      })
    );

    const resolved = await resolveWith([first, broken("doineedvisa"), third], QUERY);

    expect(resolved!.governmentFeeMinor).toBe(4000);
  });

  it("survives a broken provider before anyone has answered", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const resolved = await resolveWith([broken("a"), stub("curated", ruleSet())], QUERY);

    expect(resolved!.provider).toBe("curated");
  });

  it("never lets a later provider replace the spine's documents", async () => {
    const first = stub(
      "curated",
      ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null })
    );
    const second = stub(
      "doineedvisa",
      ruleSet({
        provider: "doineedvisa",
        governmentFeeMinor: 5160,
        governmentFeeCurrency: "GBP",
        requirements: [
          {
            docKey: "passport",
            name: "Valid passport",
            description: null,
            category: "general",
            isRequired: true,
            sortOrder: 1,
          },
        ],
      })
    );

    const resolved = await resolveWith([first, second], QUERY);

    expect(resolved!.requirements).toHaveLength(1);
    expect(resolved!.requirements[0].name).toBe("International passport (bio page)");
  });
});
