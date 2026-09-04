import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DESTINATION_ISO } from "@/lib/domain/corridors";

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
    // The destination is derived, not named. This assertion was
    // `ng→jp/tourism` until Japan was approved, then `ng→us` until the
    // United States was approved. Reading the live export for a
    // destination it does not contain keeps the test about the
    // provider's behaviour — returning null is how `corridorGap` gets
    // reached instead of a traveller being handed someone else's list.
    const live: { destinationIso: string }[] = JSON.parse(
      readFileSync(new URL("../db/corridors.live.json", import.meta.url), "utf8")
    );
    const served = new Set(live.map((c) => c.destinationIso));
    const unserved = Object.values(DESTINATION_ISO).find((iso) => !served.has(iso));

    expect(unserved, "every destination is served — rewrite this test").toBeDefined();

    await expect(
      curatedProvider.fetch({
        nationalityIso: "ng",
        destinationIso: unserved!,
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
