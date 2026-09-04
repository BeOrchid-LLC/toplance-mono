import { describe, expect, it } from "vitest";

import { entryCheck } from "@/lib/visa/entry-check";
import type { CorridorRuleSet } from "@/lib/visa/types";

/** A Travel Buddy rule set, as `toEntryRules` actually builds one. */
const ruleSet = (over: Partial<CorridorRuleSet> = {}): CorridorRuleSet => ({
  corridorId: null,
  provider: "travelbuddy",
  visaName: "Visa required",
  version: 1,
  effectiveFrom: "2026-08-31",
  lastVerifiedAt: null,
  sourceName: "Travel Buddy",
  sourceUrl: null,
  attribution: null,
  contributions: [],
  allowedStay: null,
  passportValidity: "Valid for period of stay",
  embassyUrl: "https://example.gov/embassy",
  evisaUrl: null,
  registrationName: null,
  registrationUrl: null,
  processingWeeksMin: null,
  processingWeeksMax: null,
  governmentFeeMinor: null,
  governmentFeeCurrency: null,
  requirements: [],
  ...over,
});

describe("entryCheck", () => {
  /**
   * Whether a visa is needed at all, separated from the sentence that
   * says so. The dead-end screen branches on this: a corridor nobody
   * curated because *nothing needs curating* is an answer, not a gap,
   * and it must not be reached by matching on the headline string.
   */
  describe("requiresVisa", () => {
    it("is false when the passport needs no visa", () => {
      expect(entryCheck(ruleSet({ visaName: "Visa not required" }))!.requiresVisa).toBe(false);
      expect(entryCheck(ruleSet({ visaName: "Visa free" }))!.requiresVisa).toBe(false);
    });

    it("is true for every verdict that sends someone to a government", () => {
      for (const visaName of [
        "Visa required",
        "Online visa required",
        "E-visa",
        // Issued at the border, but still issued: there is paperwork to
        // carry, so this is a corridor to curate rather than one to
        // answer with "you need nothing".
        "Visa on arrival",
      ]) {
        expect(entryCheck(ruleSet({ visaName }))!.requiresVisa).toBe(true);
      }
    });
  });

  it("states a plain visa requirement", () => {
    const check = entryCheck(ruleSet({ visaName: "Visa required" }))!;

    expect(check.headline).toBe("A visa is required for your passport.");
    expect(check.passportValidity).toBe("Valid for period of stay");
    expect(check.embassyUrl).toBe("https://example.gov/embassy");
  });

  it("distinguishes an online visa from one applied for in person", () => {
    const check = entryCheck(ruleSet({ visaName: "Online visa required" }))!;

    expect(check.headline).toBe("An online visa is required for your passport.");
  });

  it("states when no visa is needed", () => {
    const check = entryCheck(
      ruleSet({ visaName: "Visa not required", allowedStay: "90 days" })
    )!;

    expect(check.headline).toBe("No visa is required for your passport.");
    expect(check.allowedStay).toBe("90 days");
  });

  /**
   * The reason this module exists rather than the screen reading
   * `visaName` directly.
   *
   * Travel Buddy answers NG→US with "Not admitted" — a categorical claim
   * about a whole nationality, with no scope, no date and no source we
   * can show. Rendered on a screen a traveller reached by answering ten
   * questions honestly, that is alarming, unverifiable and quite
   * possibly wrong.
   *
   * The product already refuses to repeat vendor claims it cannot stand
   * behind: `toEntryRules` declines to state a fee or a decision time,
   * and the itinerary prompt is forbidden from stating any entry
   * requirement. A verdict this heavy belongs on the same list. Null
   * here means the screen falls back to the plain gap copy — which says
   * only that we cannot build a checklist, and is always true.
   */
  it("refuses a verdict it cannot stand behind", () => {
    expect(entryCheck(ruleSet({ visaName: "Not admitted" }))).toBeNull();
  });

  /**
   * An allowlist, not a blocklist. A vendor is free to add a category
   * tomorrow, and the failure mode of guessing at an unrecognised one is
   * exactly the failure mode above — so anything unrecognised is
   * declined rather than passed through.
   */
  it("declines an unrecognised verdict rather than guessing", () => {
    expect(entryCheck(ruleSet({ visaName: "Entry banned" }))).toBeNull();
    expect(entryCheck(ruleSet({ visaName: "Consult the embassy" }))).toBeNull();
    expect(entryCheck(ruleSet({ visaName: "" }))).toBeNull();
  });

  it("is null for no rule set at all", () => {
    expect(entryCheck(null)).toBeNull();
  });

  /**
   * Matching is on the vendor's category, which it capitalises
   * inconsistently across corridors ("Visa required", "Online visa
   * required"). Case is not a category.
   */
  it("matches a verdict whatever its casing", () => {
    expect(entryCheck(ruleSet({ visaName: "VISA REQUIRED" }))).not.toBeNull();
    expect(entryCheck(ruleSet({ visaName: "visa not required" }))).not.toBeNull();
  });

  /**
   * A rule set carrying a recognised verdict but nothing else is still
   * worth showing: "a visa is required" is the answer the traveller came
   * for, and the two supporting figures are extras.
   */
  it("shows a bare verdict with no supporting figures", () => {
    const check = entryCheck(
      ruleSet({ passportValidity: null, embassyUrl: null, allowedStay: null })
    )!;

    expect(check.headline).toBe("A visa is required for your passport.");
    expect(check.passportValidity).toBeNull();
    expect(check.allowedStay).toBeNull();
    expect(check.embassyUrl).toBeNull();
  });
});

/**
 * VisaList's four category names, which is what its rule sets carry in
 * `visaName`. Added to the allowlist so the gap screen can say something
 * on the 238 destinations it covers — the screen this product shows most
 * often, because curated coverage is four corridors.
 */
describe("entryCheck for VisaList categories", () => {
  const withName = (visaName: string) => ruleSet({ provider: "visalist", visaName });

  it("repeats each of the four categories in our own words", () => {
    expect(entryCheck(withName("Visa Required"))?.headline).toBe(
      "A visa is required for your passport."
    );
    expect(entryCheck(withName("Visa Free"))?.headline).toBe(
      "No visa is required for your passport."
    );
    expect(entryCheck(withName("E-visa"))?.headline).toBe(
      "An online visa is required for your passport."
    );
    expect(entryCheck(withName("Visa on Arrival"))?.headline).toBe(
      "A visa is required, and is issued on arrival rather than beforehand."
    );
  });

  it("still refuses a verdict nobody put on the list", () => {
    // The allowlist's whole reason for existing: an unanticipated
    // category is declined rather than rendered raw.
    expect(entryCheck(withName("Not admitted"))).toBeNull();
    expect(entryCheck(withName("Refused"))).toBeNull();
  });
});

/**
 * Attribution. This screen hardcoded "Travel Buddy" in its copy, and the
 * moment a second contributor could answer it, that became a citation
 * pointing at a vendor the figure never came from — which is worse than
 * no citation at all.
 */
describe("entryCheck attribution", () => {
  it("names whoever actually answered", () => {
    expect(
      entryCheck(ruleSet({ provider: "visalist", sourceName: "VisaList" }))
        ?.sourceName
    ).toBe("VisaList");

    expect(
      entryCheck(ruleSet({ provider: "travelbuddy", sourceName: "Travel Buddy" }))
        ?.sourceName
    ).toBe("Travel Buddy");
  });

  it("falls back to the provider id rather than crediting nobody", () => {
    expect(
      entryCheck(ruleSet({ provider: "somevendor", sourceName: null }))?.sourceName
    ).toBe("somevendor");
  });

  it("carries a licence credit through to the screen", () => {
    expect(
      entryCheck(ruleSet({ attribution: "Visa data provided by VisaList." }))
        ?.attribution
    ).toBe("Visa data provided by VisaList.");
  });
});
