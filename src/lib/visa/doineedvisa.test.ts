import { afterEach, describe, expect, it, vi } from "vitest";

import { doINeedVisaProvider, toRuleSet } from "@/lib/visa/doineedvisa";

/** A realistic pair payload, per the vendor's documented shape. */
const pair = (over: Record<string, unknown> = {}) => ({
  requirement: "e_visa",
  fee: { amount: 51.6, currency: "GBP", last_verified_at: "2026-05-01" },
  required_documents: {
    items: ["Valid passport (6 months minimum)", "Recent passport photo"],
    note: null,
    source_url: "https://example.gov/evisa",
    last_verified_at: "2026-05-08",
  },
  processing_time: { min_days: 10, max_days: 21 },
  visa_info_link: "https://example.gov/visas",
  last_verified_at: "2026-05-08",
  ...over,
});

describe("toRuleSet", () => {
  it("maps a documented pair into a rule set", () => {
    const rs = toRuleSet(pair());
    expect(rs).not.toBeNull();
    expect(rs!.provider).toBe("doineedvisa");
    expect(rs!.corridorId).toBeNull();
    expect(rs!.visaName).toBe("eVisa");
    expect(rs!.sourceName).toBe("DoINeedVisa");
    expect(rs!.sourceUrl).toBe("https://example.gov/evisa");
    expect(rs!.effectiveFrom).toBe("2026-05-08");
    // 10 and 21 days → 2 and 3 weeks, never rounded down to zero.
    expect(rs!.processingWeeksMin).toBe(2);
    expect(rs!.processingWeeksMax).toBe(3);
    expect(rs!.governmentFeeMinor).toBe(5160);
    expect(rs!.governmentFeeCurrency).toBe("GBP");
    expect(rs!.requirements).toEqual([
      expect.objectContaining({
        docKey: "valid_passport_6_months_minimum_1",
        name: "Valid passport (6 months minimum)",
        isRequired: true,
        sortOrder: 1,
      }),
      expect.objectContaining({
        docKey: "recent_passport_photo_2",
        sortOrder: 2,
      }),
    ]);
  });

  it("answers null when the API has no document list", () => {
    expect(toRuleSet(pair({ required_documents: null }))).toBeNull();
    expect(
      toRuleSet(pair({ required_documents: { items: [] } }))
    ).toBeNull();
  });

  it("answers null for requirements no checklist serves", () => {
    for (const requirement of ["visa_free", "eta", "citizen", "no_admission"]) {
      expect(toRuleSet(pair({ requirement }))).toBeNull();
    }
  });

  it("answers null rather than throwing on a reshaped payload", () => {
    expect(toRuleSet({ nonsense: true })).toBeNull();
    expect(toRuleSet(null)).toBeNull();
    expect(toRuleSet("<html>")).toBeNull();
  });

  it("survives absent fee and processing blocks", () => {
    const rs = toRuleSet(pair({ fee: null, processing_time: null }));
    expect(rs!.governmentFeeMinor).toBeNull();
    expect(rs!.processingWeeksMin).toBeNull();
  });
});

describe("doINeedVisaProvider gates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is inert without an API key", async () => {
    vi.stubEnv("DINV_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await doINeedVisaProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "ke",
      purpose: "tourism",
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stands down for the process after a rejected key", async () => {
    vi.stubEnv("DINV_API_KEY", "wrong-key");
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchSpy);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // A fresh module instance, so the stand-down flag this test trips
    // cannot leak into the other tests' provider.
    vi.resetModules();
    const { doINeedVisaProvider: provider } = await import(
      "@/lib/visa/doineedvisa"
    );

    const query = {
      nationalityIso: "ng",
      destinationIso: "ke",
      purpose: "tourism",
    } as const;

    expect(await provider.fetch(query)).toBeNull();
    expect(await provider.fetch(query)).toBeNull();
    // One network call, one log line — not one per page view.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("refuses non-tourism purposes on the purpose-blind tier", async () => {
    vi.stubEnv("DINV_API_KEY", "test-key");
    vi.stubEnv("DINV_PURPOSE_TIER", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await doINeedVisaProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
