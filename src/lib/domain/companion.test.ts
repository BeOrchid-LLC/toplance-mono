import { describe, expect, it } from "vitest";

import { arrivalChecklist, renewalGuidance } from "@/lib/domain/companion";

describe("arrivalChecklist", () => {
  const DESTINATIONS = ["gb", "ae", "ca", "de"];

  it("returns a non-empty, curated checklist for each of the four live destinations", () => {
    for (const iso of DESTINATIONS) {
      const items = arrivalChecklist(iso, "work");
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("is case-insensitive on the destination code", () => {
    expect(arrivalChecklist("GB", "work")).toEqual(arrivalChecklist("gb", "work"));
  });

  it("falls back to a generic, non-empty checklist for a destination it does not curate", () => {
    const items = arrivalChecklist("fr", "tourism");
    expect(items.length).toBeGreaterThan(0);
  });

  it("adds a work-purpose item on top of the destination's base list", () => {
    const withWork = arrivalChecklist("gb", "work");
    const withoutPurpose = arrivalChecklist("gb", "tourism");
    expect(withWork.length).toBe(withoutPurpose.length + 1);
    expect(withWork.some((i) => /employer/i.test(i.title))).toBe(true);
  });

  it("adds a study-purpose item for the Canada study corridor", () => {
    const items = arrivalChecklist("ca", "study");
    expect(items.some((i) => /enrol/i.test(i.title))).toBe(true);
  });
});

describe("renewalGuidance", () => {
  const corridor = { visaName: "Skilled Worker visa", destinationIso: "gb" };

  it("names the visa and includes the approval date when given", () => {
    const text = renewalGuidance(corridor, new Date("2026-08-10T00:00:00Z"));
    expect(text).toContain("Skilled Worker visa");
    expect(text).toContain("10 Aug 2026");
  });

  it("still names the visa when no approval date is recorded", () => {
    const text = renewalGuidance(corridor, null);
    expect(text).toContain("Skilled Worker visa");
  });

  it("never invents an expiry date — only ever points at where the real one lives", () => {
    const text = renewalGuidance(corridor, new Date("2026-08-10T00:00:00Z"));
    // The only date-shaped text allowed anywhere in the string is the
    // approval date itself, "10 Aug 2026" — assert there is exactly one
    // occurrence of a day/month/year pattern, not a second, fabricated one.
    const dateLike = text.match(/\b\d{1,2}\s+\w{3,9}\s+\d{4}\b/g) ?? [];
    expect(dateLike).toEqual(["10 Aug 2026"]);
    expect(text.toLowerCase()).not.toContain("expires on");
    expect(text.toLowerCase()).not.toContain("valid until");
  });

  it("falls back to generic renewal phrasing for a destination it does not curate", () => {
    const text = renewalGuidance(
      { visaName: "Student visa", destinationIso: "fr" },
      null
    );
    expect(text).toContain("Student visa");
    expect(text.toLowerCase()).toContain("immigration authority");
  });

  it("gives different, destination-specific phrasing for each of the four live corridors", () => {
    const texts = new Set(
      ["gb", "ae", "ca", "de"].map(
        (iso) => renewalGuidance({ visaName: "Visa", destinationIso: iso }, null)
      )
    );
    expect(texts.size).toBe(4);
  });
});
