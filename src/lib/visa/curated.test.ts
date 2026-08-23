import { describe, expect, it } from "vitest";

/**
 * The curated provider over the seeded corridors. These are the four
 * rule sets `npm run db:seed` loads, so the test doubles as a check that
 * the seed still matches what the requirements engine expects.
 *
 * Skipped without a database. Run `npm run db:up && npm run db:seed`.
 */
describe.skipIf(!process.env.DATABASE_URL)("curatedProvider", async () => {
  const { curatedProvider } = await import("@/lib/visa/curated");
  const { resolveRuleSet } = await import("@/lib/visa");

  it("returns the UK skilled worker rule set with its source", async () => {
    const ruleSet = await curatedProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    expect(ruleSet).not.toBeNull();
    expect(ruleSet!.visaName).toBe("Skilled Worker Visa");
    expect(ruleSet!.sourceName).toBe("UK Visas and Immigration");
    expect(ruleSet!.sourceUrl).toMatch(/^https:\/\//);
    expect(ruleSet!.corridorId).not.toBeNull();
  });

  it("carries the requirements in checklist order", async () => {
    const ruleSet = await curatedProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    const orders = ruleSet!.requirements.map((r) => r.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(ruleSet!.requirements[0].docKey).toBe("passport");

    // The optional/required split is what stops an applicant being held
    // below 100% by a document nobody asked them for.
    expect(ruleSet!.requirements.some((r) => !r.isRequired)).toBe(true);
  });

  it("returns null for a corridor nobody has curated", async () => {
    await expect(
      curatedProvider.fetch({
        nationalityIso: "ng",
        destinationIso: "jp",
        purpose: "tourism",
      })
    ).resolves.toBeNull();
  });

  it("resolves through the provider list", async () => {
    const ruleSet = await resolveRuleSet({
      nationalityIso: "ng",
      destinationIso: "ca",
      purpose: "study",
    });

    expect(ruleSet!.visaName).toBe("Study Permit");
  });
});
