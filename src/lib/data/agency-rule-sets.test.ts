import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * The agency's read of the rule sets behind its own checklists.
 *
 * Two claims, and the second is the one that matters: an agency sees
 * the corridor versions its cases were actually built from, and it sees
 * **nothing else**. The screen exists so a director never needs an ops
 * account, and an ownership check that leaks would make that trade a
 * bad one.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("agency rule sets", async () => {
  const { db } = await import("@/lib/db/client");
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, corridorRequirements, corridors, profiles } = await import(
    "@/lib/db/schema"
  );
  const { agencyRuleSet, agencyRuleSets } = await import(
    "@/lib/data/agency-rule-sets"
  );

  // Two agencies, so "only mine" is a claim the data can actually
  // falsify rather than a single-tenant tautology. The ids are ours
  // alone: vitest runs these files in parallel against one database,
  // so sharing `...0d0001` with tenants.test.ts had each suite tearing
  // down the other's org mid-run.
  const OURS = "00000000-0000-4000-8000-0000000d0021";
  const THEIRS = "00000000-0000-4000-8000-0000000d0022";
  // One application per traveller — `applications_traveler_key`. Each
  // case therefore needs a person of its own.
  const travellerIds: string[] = [];

  // A corridor triple no seed or other suite uses.
  const QUERY = {
    nationalityIso: "zq",
    destinationIso: "zr",
    purpose: "work" as const,
  };

  const corridorIds: string[] = [];
  const applicationIds: string[] = [];

  async function version(opts: {
    version: number;
    isLive: boolean;
    requirements?: number;
  }) {
    const [row] = await db
      .insert(corridors)
      .values({
        ...QUERY,
        visaName: `Rule Set Visa v${opts.version}`,
        version: opts.version,
        isLive: opts.isLive,
        reviewState: "approved",
        governmentFeeMinor: 11500,
        governmentFeeCurrency: "GBP",
      })
      .returning({ id: corridors.id });

    const howMany = opts.requirements ?? 2;
    if (howMany > 0) {
      await db.insert(corridorRequirements).values(
        Array.from({ length: howMany }, (_, i) => ({
          corridorId: row.id,
          docKey: `rule_doc_${i}`,
          name: `Rule document ${i}`,
          sortOrder: i,
        }))
      );
    }

    corridorIds.push(row.id);
    return row.id;
  }

  async function caseOn(orgId: string, corridorId: string | null) {
    const travelerId = `test_rule_sets_${travellerIds.length}`;
    await db
      .insert(profiles)
      .values({
        id: travelerId,
        email: `${travelerId}@test.invalid`,
        fullName: "Ada Traveller",
      })
      .onConflictDoNothing();
    travellerIds.push(travelerId);

    const [app] = await db
      .insert(applications)
      .values({
        orgId,
        travelerId,
        corridorId,
        status: "collecting_documents",
      })
      .returning({ id: applications.id });
    applicationIds.push(app.id);
    return app.id;
  }

  beforeEach(async () => {
    await seedTestAgency(OURS, "Our agency");
    await seedTestAgency(THEIRS, "Their agency");
  });

  afterEach(async () => {
    if (applicationIds.length) {
      await db.delete(applications).where(inArray(applications.id, applicationIds));
    }
    applicationIds.length = 0;
    if (corridorIds.length) {
      await db.delete(corridors).where(inArray(corridors.id, corridorIds));
    }
    corridorIds.length = 0;
    if (travellerIds.length) {
      await db.delete(profiles).where(inArray(profiles.id, travellerIds));
    }
    travellerIds.length = 0;
  });

  it("returns the version this agency's case was built from", async () => {
    const live = await version({ version: 2, isLive: true, requirements: 3 });
    await caseOn(OURS, live);

    const rows = await agencyRuleSets(OURS);
    const row = rows.find((r) => r.id === live);

    expect(row).toBeDefined();
    expect(row).toMatchObject({
      version: 2,
      isLive: true,
      requirementCount: 3,
      caseCount: 1,
      visaName: "Rule Set Visa v2",
    });
  });

  it("shows a superseded version, because it still built somebody's checklist", async () => {
    // The corridor engine snapshots the version per application, so a
    // case opened last month keeps the rules it was opened under. A
    // list of live versions only would show that traveller's handler
    // the wrong document list.
    const old = await version({ version: 1, isLive: false });
    await version({ version: 2, isLive: true });
    await caseOn(OURS, old);

    const rows = await agencyRuleSets(OURS);
    expect(rows.map((r) => r.id)).toContain(old);
    expect(rows.find((r) => r.id === old)?.isLive).toBe(false);
  });

  it("does not list a corridor only another agency files on", async () => {
    const theirs = await version({ version: 1, isLive: true });
    await caseOn(THEIRS, theirs);

    expect((await agencyRuleSets(OURS)).map((r) => r.id)).not.toContain(theirs);
  });

  it("counts only this agency's cases on a corridor they share", async () => {
    const shared = await version({ version: 1, isLive: true });
    await caseOn(OURS, shared);
    await caseOn(THEIRS, shared);
    await caseOn(THEIRS, shared);

    const row = (await agencyRuleSets(OURS)).find((r) => r.id === shared);
    expect(row?.caseCount).toBe(1);
  });

  it("ignores a case that never resolved a route", async () => {
    await caseOn(OURS, null);
    expect(await agencyRuleSets(OURS)).toEqual([]);
  });

  it("orders the busiest route first", async () => {
    const quiet = await version({ version: 1, isLive: false });
    const busy = await version({ version: 2, isLive: true });
    await caseOn(OURS, quiet);
    await caseOn(OURS, busy);
    await caseOn(OURS, busy);

    const rows = await agencyRuleSets(OURS);
    const ours = rows.filter((r) => r.id === busy || r.id === quiet);
    expect(ours[0].id).toBe(busy);
  });

  describe("agencyRuleSet", () => {
    it("returns the requirements in checklist order", async () => {
      const live = await version({ version: 1, isLive: true, requirements: 3 });
      await caseOn(OURS, live);

      const detail = await agencyRuleSet(OURS, live);
      expect(detail?.requirements.map((r) => r.sortOrder)).toEqual([0, 1, 2]);
      expect(detail?.requirementCount).toBe(3);
      expect(detail?.caseCount).toBe(1);
    });

    it("is null for a corridor this agency has no case on", async () => {
      // Null rather than a refusal: telling "forbidden" from "no such
      // row" would confirm to a director that a corridor exists and
      // that somebody else is filing on it.
      const theirs = await version({ version: 1, isLive: true });
      await caseOn(THEIRS, theirs);

      expect(await agencyRuleSet(OURS, theirs)).toBeNull();
    });

    it("is null for a corridor nobody has a case on", async () => {
      const orphan = await version({ version: 1, isLive: true });
      expect(await agencyRuleSet(OURS, orphan)).toBeNull();
    });
  });
});
