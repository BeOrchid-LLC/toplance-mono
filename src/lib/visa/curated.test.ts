import { describe, expect, it } from "vitest";

/**
 * The curated provider over the seeded corridors, which are
 * `npm run db:seed` *and* `npm run db:corridors` — the four hand-written
 * rule sets plus the exported approvals. The test doubles as a check
 * that both still match what the requirements engine expects.
 *
 * `db:corridors` is not optional here. Without it the database holds
 * `gb/work` v1 only, and the assertions below — which describe the v2
 * that supersedes it — fail on a corridor that is simply absent.
 *
 * Skipped without a database. Run
 * `npm run db:up && npm run db:seed && npm run db:corridors`.
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
    // v2, drafted from gov.uk itself, which titles the page "Skilled
    // Worker visa" — lowercase v. The provider must serve the highest
    // live version, so this asserting v1's "Visa" would mean v1 is
    // still being served after being superseded.
    expect(ruleSet!.visaName).toBe("Skilled Worker visa");
    // v1 was hand-written and named the department; the drafter records
    // the host it read. Worth a nicer name later — but the test should
    // say what is served, not what we wish were.
    expect(ruleSet!.sourceName).toBe("www.gov.uk");
    expect(ruleSet!.sourceUrl).toMatch(/^https:\/\/www\.gov\.uk\//);
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
    // The source's own order, not ours. gov.uk's "documents you must
    // provide" opens on the certificate of sponsorship, because without
    // a sponsor there is nothing to apply for — v1 led with the
    // passport because a person wrote it that way.
    expect(ruleSet!.requirements[0].docKey).toBe(
      "certificate_of_sponsorship_reference_number"
    );

    // The optional/required split is what stops an applicant being held
    // below 100% by a document nobody asked them for.
    expect(ruleSet!.requirements.some((r) => !r.isRequired)).toBe(true);
  });

  it("returns null for a corridor nobody has curated", async () => {
    // Was `ng→jp/tourism`, which is now curated. The United States has
    // no corridor row at any version or purpose, which is what this
    // needs: the provider returning null is how `corridorGap` gets
    // reached instead of a traveller being handed someone else's list.
    await expect(
      curatedProvider.fetch({
        nationalityIso: "ng",
        destinationIso: "us",
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
