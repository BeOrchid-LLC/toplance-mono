import { describe, expect, it } from "vitest";

import { fillGaps, hasGaps } from "@/lib/visa/merge";
import type { CorridorRuleSet } from "@/lib/visa/types";

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
  allowedStay: "5 years",
  passportValidity: "valid for the whole period of stay",
  embassyUrl: "https://example.gov/embassy",
  // Neither is a gap: not every route has an eVisa portal, and most
  // have no arrival registration at all.
  evisaUrl: null,
  registrationName: null,
  registrationUrl: null,
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

describe("hasGaps", () => {
  it("is false for a rule set that answers every figure", () => {
    expect(hasGaps(ruleSet())).toBe(false);
  });

  it("is true when the fee is missing", () => {
    expect(hasGaps(ruleSet({ governmentFeeMinor: null }))).toBe(true);
  });

  it("is true when the processing window is missing", () => {
    expect(hasGaps(ruleSet({ processingWeeksMin: null }))).toBe(true);
  });

  it.each([
    ["allowedStay", { allowedStay: null }],
    ["passportValidity", { passportValidity: null }],
    ["embassyUrl", { embassyUrl: null }],
  ])("is true when %s is missing", (_label, over) => {
    expect(hasGaps(ruleSet(over))).toBe(true);
  });

  /**
   * Absent is not the same as not applicable. Plenty of routes have no
   * eVisa portal and no arrival registration, so treating either as a
   * gap would send every corridor shopping for a figure that does not
   * exist — and spend a metered request finding that out, every time.
   */
  it.each([
    ["an eVisa portal", { evisaUrl: null }],
    ["arrival registration", { registrationName: null, registrationUrl: null }],
  ])("does not count a missing %s as a gap", (_label, over) => {
    expect(hasGaps(ruleSet(over))).toBe(false);
  });

  /**
   * The gate that keeps a complete corridor free. Every provider behind
   * the spine costs a request against a metered quota — Travel Buddy's
   * free tier is 120 a month — so a rule set with nothing missing must
   * stop the walk rather than shop around for a second opinion.
   */
  it("is what stops a complete rule set costing a second API call", () => {
    expect(hasGaps(ruleSet())).toBe(false);
  });
});

describe("fillGaps", () => {
  it("takes a fee the spine does not have", () => {
    const spine = ruleSet({
      governmentFeeMinor: null,
      governmentFeeCurrency: null,
    });
    const other = ruleSet({
      provider: "doineedvisa",
      sourceName: "DoINeedVisa",
      sourceUrl: "https://example.gov/evisa",
      attribution: "Rule data from DoINeedVisa, MIT licence.",
      governmentFeeMinor: 5160,
      governmentFeeCurrency: "GBP",
    });

    const merged = fillGaps(spine, other);

    expect(merged.governmentFeeMinor).toBe(5160);
    expect(merged.governmentFeeCurrency).toBe("GBP");
    expect(merged.contributions).toEqual([
      {
        provider: "doineedvisa",
        sourceName: "DoINeedVisa",
        sourceUrl: "https://example.gov/evisa",
        attribution: "Rule data from DoINeedVisa, MIT licence.",
        fields: ["Government fee"],
      },
    ]);
  });

  it("takes a processing window the spine does not have", () => {
    const spine = ruleSet({ processingWeeksMin: null, processingWeeksMax: null });
    const other = ruleSet({
      provider: "doineedvisa",
      processingWeeksMin: 2,
      processingWeeksMax: 3,
    });

    const merged = fillGaps(spine, other);

    expect(merged.processingWeeksMin).toBe(2);
    expect(merged.processingWeeksMax).toBe(3);
    expect(merged.contributions[0].fields).toEqual(["Typical decision time"]);
  });

  /**
   * Precedence, not consensus. The spine is whoever answered first, and
   * the order is curated before any API — a figure someone checked
   * against the mission is not up for revision by a vendor that has a
   * different one.
   */
  it("never overwrites a figure the spine already carries", () => {
    const spine = ruleSet();
    const other = ruleSet({
      provider: "doineedvisa",
      governmentFeeMinor: 999,
      governmentFeeCurrency: "USD",
      processingWeeksMin: 99,
      processingWeeksMax: 99,
    });

    const merged = fillGaps(spine, other);

    expect(merged.governmentFeeMinor).toBe(71900);
    expect(merged.governmentFeeCurrency).toBe("GBP");
    expect(merged.processingWeeksMin).toBe(3);
    expect(merged.contributions).toEqual([]);
  });

  /**
   * A number without its currency is not a fee, it is a number. The two
   * columns move together or not at all.
   */
  it("refuses a fee amount that arrives without a currency", () => {
    const spine = ruleSet({
      governmentFeeMinor: null,
      governmentFeeCurrency: null,
    });
    const other = ruleSet({
      provider: "doineedvisa",
      governmentFeeMinor: 5160,
      governmentFeeCurrency: null,
    });

    const merged = fillGaps(spine, other);

    expect(merged.governmentFeeMinor).toBeNull();
    expect(merged.contributions).toEqual([]);
  });

  it.each([
    ["Allowed stay", { allowedStay: "6 months" }, "allowedStay"],
    [
      "Passport validity",
      { passportValidity: "6 months beyond stay" },
      "passportValidity",
    ],
    ["Embassy contact", { embassyUrl: "https://other.gov/embassy" }, "embassyUrl"],
    ["Official eVisa portal", { evisaUrl: "https://other.gov/evisa" }, "evisaUrl"],
  ])("takes %s when the spine lacks it", (label, over, key) => {
    const spine = ruleSet({ [key]: null });
    const merged = fillGaps(spine, ruleSet({ provider: "travelbuddy", ...over }));

    expect(merged[key as keyof typeof merged]).toBe(
      over[key as keyof typeof over]
    );
    expect(merged.contributions[0].fields).toEqual([label]);
  });

  /**
   * A registration is a name and the form to do it. Half of that is a
   * traveller told they must register, with nowhere to go.
   */
  it("takes an arrival registration only with its form link", () => {
    const spine = ruleSet();
    const partial = fillGaps(
      spine,
      ruleSet({ provider: "travelbuddy", registrationName: "e-Arrival" })
    );
    expect(partial.registrationName).toBeNull();

    const whole = fillGaps(
      spine,
      ruleSet({
        provider: "travelbuddy",
        registrationName: "e-Arrival",
        registrationUrl: "https://other.gov/arrival",
      })
    );
    expect(whole.registrationName).toBe("e-Arrival");
    expect(whole.contributions[0].fields).toEqual(["Arrival registration"]);
  });

  it("names every figure one provider supplied in a single contribution", () => {
    const spine = ruleSet({
      allowedStay: null,
      embassyUrl: null,
      governmentFeeMinor: null,
      governmentFeeCurrency: null,
    });
    const merged = fillGaps(
      spine,
      ruleSet({
        provider: "travelbuddy",
        sourceName: "Travel Buddy",
        allowedStay: "6 months",
        embassyUrl: "https://other.gov/embassy",
        governmentFeeMinor: 5160,
        governmentFeeCurrency: "GBP",
      })
    );

    // One provider, one line on the sheet — not three. Passport
    // validity is absent from the list because the spine already had it.
    expect(merged.contributions).toHaveLength(1);
    expect(merged.contributions[0].fields).toEqual([
      "Government fee",
      "Allowed stay",
      "Embassy contact",
    ]);
  });

  it("records nothing when the other provider adds nothing", () => {
    const spine = ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null });
    const other = ruleSet({
      provider: "doineedvisa",
      governmentFeeMinor: null,
      governmentFeeCurrency: null,
    });

    expect(fillGaps(spine, other).contributions).toEqual([]);
  });

  /**
   * The checklist is the one thing that cannot be composed: rows key on
   * `docKey`, so a second list either collides with the first or gives a
   * traveller two upload slots for one document.
   */
  it("never touches the spine's documents, corridor or identity", () => {
    const spine = ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null });
    const other = ruleSet({
      provider: "doineedvisa",
      corridorId: null,
      visaName: "eVisa",
      version: 7,
      effectiveFrom: "2026-08-01",
      sourceName: "DoINeedVisa",
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
    });

    const merged = fillGaps(spine, other);

    expect(merged.corridorId).toBe("corridor-1");
    expect(merged.provider).toBe("curated");
    expect(merged.visaName).toBe("Skilled Worker Visa");
    expect(merged.version).toBe(1);
    expect(merged.effectiveFrom).toBe("2026-01-15");
    expect(merged.sourceName).toBe("UK Visas and Immigration");
    expect(merged.requirements).toEqual(spine.requirements);
  });

  it("leaves the spine object itself unmodified", () => {
    const spine = ruleSet({ governmentFeeMinor: null, governmentFeeCurrency: null });
    const other = ruleSet({ provider: "doineedvisa", governmentFeeMinor: 5160 });

    fillGaps(spine, other);

    expect(spine.governmentFeeMinor).toBeNull();
    expect(spine.contributions).toEqual([]);
  });

  it("accumulates a second contributor alongside the first", () => {
    const spine = ruleSet({
      governmentFeeMinor: null,
      governmentFeeCurrency: null,
      processingWeeksMin: null,
      processingWeeksMax: null,
    });

    const withFee = fillGaps(
      spine,
      ruleSet({
        provider: "doineedvisa",
        processingWeeksMin: null,
        processingWeeksMax: null,
        governmentFeeMinor: 5160,
        governmentFeeCurrency: "GBP",
      })
    );
    const withBoth = fillGaps(
      withFee,
      ruleSet({
        provider: "visahq",
        sourceName: "VisaHQ",
        governmentFeeMinor: null,
        governmentFeeCurrency: null,
        processingWeeksMin: 2,
        processingWeeksMax: 4,
      })
    );

    expect(withBoth.governmentFeeMinor).toBe(5160);
    expect(withBoth.processingWeeksMin).toBe(2);
    expect(withBoth.contributions.map((c) => c.provider)).toEqual([
      "doineedvisa",
      "visahq",
    ]);
  });
});
