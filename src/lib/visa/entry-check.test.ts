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
