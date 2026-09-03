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

  /** `[docKey, name, sortOrder, description?]`. */
  type Req = [string, string, number, (string | null)?];

  const ruleSet = (requirements: Req[], corridor: string | null = corridorId) => ({
    corridorId: corridor,
    provider: "curated",
    attribution: null,
    contributions: [],
    allowedStay: null,
    passportValidity: null,
    embassyUrl: null,
    evisaUrl: null,
    registrationName: null,
    registrationUrl: null,
    visaName: "Test Visa",
    version: 1,
    effectiveFrom: "2026-01-01",
    lastVerifiedAt: null,
    sourceName: null,
    sourceUrl: null,
    processingWeeksMin: null,
    processingWeeksMax: null,
    governmentFeeMinor: null,
    governmentFeeCurrency: null,
    requirements: requirements.map(([docKey, name, sortOrder, description]) => ({
      docKey,
      name,
      description: description ?? null,
      category: "identity",
      isRequired: true,
      sortOrder,
      sourceUrl: null,
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

  /**
   * The upload screen used to read guidance by joining
   * `applications.corridor_id` → `corridor_requirements`. That link is
   * null for every rule set with no row of ours behind it — an API
   * provider answering, or an application a re-seed detached — and the
   * traveller silently got bare document names with no instructions.
   *
   * The fix is that a checklist row carries its own guidance, so these
   * three pin the property the screen now depends on.
   */
  it("copies each requirement's guidance onto the checklist row", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1, "Valid for the whole period of stay."],
        ["funds", "Bank statements", 2, "Three full months, every page."],
      ])
    );

    const docs = await checklist();
    expect(docs.map((d) => d.description)).toEqual([
      "Valid for the whole period of stay.",
      "Three full months, every page.",
    ]);
  });

  it("carries guidance for a rule set with no corridor row behind it", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([["passport", "Passport", 1, "Bio page only."]], null)
    );

    const [doc] = await checklist();
    expect(doc.description).toBe("Bio page only.");

    // The condition that made this a latent bug rather than a visible
    // one: nothing to join through, and the guidance survives anyway.
    const [app] = await db
      .select({ corridorId: applications.corridorId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    expect(app.corridorId).toBeNull();
  });

  it("refreshes guidance on a row the traveller has already uploaded", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([["passport", "Passport", 1, "Old wording."]])
    );

    await db
      .update(documents)
      .set({ state: "verified", storagePath: "somewhere/passport.jpg" })
      .where(eq(documents.applicationId, applicationId));

    await adoptRuleSet(
      applicationId,
      ruleSet([["passport", "Passport", 1, "The mission reworded this."]])
    );

    const [doc] = await checklist();
    // Guidance updates for everyone the moment a mission changes it —
    // the property the old join gave for free and a copy must not lose.
    expect(doc.description).toBe("The mission reworded this.");
    // ...without disturbing the upload it describes.
    expect(doc.state).toBe("verified");
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
