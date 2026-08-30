import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Materialising a rule set into an application's checklist.
 *
 * This used to live only inside the intake action, which ran it exactly
 * once — at the moment the final answer landed. Staging showed what that
 * assumption costs: intake completed while the corridors table was
 * empty, and the application was left permanently checklist-less even
 * after the data arrived, because nothing ever revisits the decision.
 * `adoptRuleSet` is the revisitable version, and these tests pin the
 * properties both callers rely on.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("adoptRuleSet", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, corridors, documents, profiles } = await import(
    "@/lib/db/schema"
  );
  const { adoptRuleSet } = await import("@/lib/data/checklist");

  const TRAVELLER = "test_adopt_traveller";
  let applicationId = "";
  let corridorId = "";

  const ruleSet = (requirements: Array<[string, string, number]>) => ({
    corridorId,
    provider: "curated",
    attribution: null,
    contributions: [],
    visaName: "Test Visa",
    version: 1,
    effectiveFrom: "2026-01-01",
    sourceName: null,
    sourceUrl: null,
    processingWeeksMin: null,
    processingWeeksMax: null,
    governmentFeeMinor: null,
    governmentFeeCurrency: null,
    requirements: requirements.map(([docKey, name, sortOrder]) => ({
      docKey,
      name,
      description: null,
      category: "identity",
      isRequired: true,
      sortOrder,
    })),
  });

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "adopt@test.invalid", fullName: "Ada" });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, intakeComplete: true })
      .returning({ id: applications.id });
    applicationId = app.id;

    const [corridor] = await db
      .insert(corridors)
      .values({
        nationalityIso: "zz",
        destinationIso: "zz",
        purpose: "work",
        visaName: "Test Visa",
      })
      .returning({ id: corridors.id });
    corridorId = corridor.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(corridors).where(eq(corridors.id, corridorId));
  });

  async function checklist() {
    return db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(documents.sortOrder);
  }

  it("materialises the checklist and points the application at the corridor", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1],
        ["funds", "Bank statements", 2],
      ])
    );

    const docs = await checklist();
    expect(docs.map((d) => d.docKey)).toEqual(["passport", "funds"]);
    expect(docs.every((d) => d.state === "not_started")).toBe(true);

    const [app] = await db
      .select({ corridorId: applications.corridorId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    expect(app.corridorId).toBe(corridorId);
  });

  it("is idempotent — adopting the same rule set twice adds nothing", async () => {
    const rules = ruleSet([["passport", "Passport", 1]]);
    await adoptRuleSet(applicationId, rules);
    await adoptRuleSet(applicationId, rules);

    expect(await checklist()).toHaveLength(1);
  });

  it("keeps an uploaded document when the corridor changes", async () => {
    await adoptRuleSet(applicationId, ruleSet([["passport", "Passport", 1]]));

    await db
      .update(documents)
      .set({ state: "verified", storagePath: "somewhere/passport.jpg" })
      .where(eq(documents.applicationId, applicationId));

    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1],
        ["photos", "Photographs", 2],
      ])
    );

    const docs = await checklist();
    expect(docs).toHaveLength(2);
    expect(docs.find((d) => d.docKey === "passport")?.state).toBe("verified");
  });

  it("drops an untouched row the rule set no longer asks for", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1],
        ["tb_test", "TB test", 2],
      ])
    );

    await adoptRuleSet(applicationId, ruleSet([["passport", "Passport", 1]]));

    expect((await checklist()).map((d) => d.docKey)).toEqual(["passport"]);
  });
});
