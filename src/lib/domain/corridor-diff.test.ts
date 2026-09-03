import { describe, expect, it } from "vitest";

import { corridorDiff, isUnchanged } from "@/lib/domain/corridor-diff";

const requirement = (over: Partial<{
  docKey: string;
  name: string;
  description: string | null;
  category: string;
  isRequired: boolean;
  sourceUrl: string | null;
}> = {}) => ({
  docKey: "passport",
  name: "International passport",
  description: "Bio page, valid for the period of stay.",
  category: "identity",
  isRequired: true,
  sourceUrl: null,
  ...over,
});

const version = (over: Partial<Parameters<typeof corridorDiff>[0]> = {}) => ({
  visaName: "Skilled Worker Visa",
  effectiveFrom: "2026-01-15",
  sourceName: "UK Visas and Immigration",
  sourceUrl: "https://www.gov.uk/skilled-worker-visa",
  processingWeeksMin: 3,
  processingWeeksMax: 8,
  governmentFeeMinor: 71900,
  governmentFeeCurrency: "GBP",
  requirements: [requirement()],
  ...over,
});

describe("corridorDiff", () => {
  it("says a first version has nothing to compare against", () => {
    const diff = corridorDiff(version(), null);

    expect(diff.isFirstVersion).toBe(true);
    // The caller shows the full list instead — a first draft has to be
    // read end to end whatever this returns.
    expect(diff.fields).toEqual([]);
    expect(diff.requirements).toEqual([]);
  });

  it("reports nothing when the two versions match", () => {
    expect(isUnchanged(corridorDiff(version(), version()))).toBe(true);
  });

  it("surfaces a corrected fee as one field, not a whole re-read", () => {
    // The real case: the seeded UK fee is £719, gov.uk publishes £819.
    const diff = corridorDiff(
      version({ governmentFeeMinor: 81900 }),
      version()
    );

    expect(diff.fields).toEqual([
      { label: "Government fee", before: "71900", after: "81900" },
    ]);
    expect(diff.requirements).toEqual([]);
  });

  it("distinguishes an added requirement from a changed one", () => {
    const diff = corridorDiff(
      version({
        requirements: [
          requirement({ description: "Reworded by the mission." }),
          requirement({ docKey: "tb_test", name: "TB certificate" }),
        ],
      }),
      version()
    );

    expect(diff.requirements).toEqual([
      {
        kind: "changed",
        docKey: "passport",
        name: "International passport",
        fields: [
          {
            label: "Guidance",
            before: "Bio page, valid for the period of stay.",
            after: "Reworded by the mission.",
          },
        ],
      },
      { kind: "added", docKey: "tb_test", name: "TB certificate" },
    ]);
  });

  it("reports a dropped requirement last", () => {
    const diff = corridorDiff(
      version({ requirements: [requirement({ docKey: "tb_test", name: "TB certificate" })] }),
      version()
    );

    // Added first, removed last: a removal is the change that can strand
    // a traveller who already uploaded the document.
    expect(diff.requirements.map((r) => r.kind)).toEqual(["added", "removed"]);
    expect(diff.requirements.at(-1)).toMatchObject({ docKey: "passport" });
  });

  it("reads a required flag flipping in words, not booleans", () => {
    const diff = corridorDiff(
      version({ requirements: [requirement({ isRequired: false })] }),
      version()
    );

    expect(diff.requirements[0]).toMatchObject({
      kind: "changed",
      fields: [
        { label: "Requirement", before: "Required", after: "Only if it applies" },
      ],
    });
  });

  it("treats a source link appearing as a change worth showing", () => {
    const diff = corridorDiff(
      version({
        requirements: [requirement({ sourceUrl: "https://www.gov.uk/passport" })],
      }),
      version()
    );

    expect(diff.requirements[0]).toMatchObject({
      fields: [
        { label: "Source link", before: null, after: "https://www.gov.uk/passport" },
      ],
    });
  });
});
