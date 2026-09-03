import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

/**
 * The draft → approve lifecycle, against the real database.
 *
 * The claim this suite exists to prove is the one the whole plan rests
 * on: **a draft is invisible to travellers by construction, not by a
 * gate someone remembered to add.** `curatedProvider` serves
 * `is_live = true` at the highest version and knows nothing about review
 * states, so the test that matters most asks the *provider* — not the
 * corridors table — what a traveller would have been served.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("corridor approval", async () => {
  const { db } = await import("@/lib/db/client");
  const { corridorRequirements, corridors, profiles } = await import(
    "@/lib/db/schema"
  );
  const { approveCorridorTx, getCorridor, listCorridors, liveVersionOf, rejectCorridorTx } =
    await import("@/lib/data/corridors");
  const { curatedProvider } = await import("@/lib/visa/curated");

  const OWNER = "test_corridor_owner";
  // A corridor triple no seed or other suite uses.
  const QUERY = {
    nationalityIso: "zx",
    destinationIso: "zy",
    purpose: "work" as const,
  };

  const ids: string[] = [];

  /** One corridor version, with `count` requirements unless told otherwise. */
  async function version(
    opts: { version: number; isLive: boolean; reviewState: "pending" | "approved" | "rejected"; requirements?: number }
  ) {
    const [row] = await db
      .insert(corridors)
      .values({
        ...QUERY,
        visaName: `Test Visa v${opts.version}`,
        version: opts.version,
        isLive: opts.isLive,
        reviewState: opts.reviewState,
      })
      .returning({ id: corridors.id });

    const howMany = opts.requirements ?? 2;
    if (howMany > 0) {
      await db.insert(corridorRequirements).values(
        Array.from({ length: howMany }, (_, i) => ({
          corridorId: row.id,
          docKey: `doc_${i}`,
          name: `Document ${i}`,
          sortOrder: i,
        }))
      );
    }

    ids.push(row.id);
    return row.id;
  }

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: OWNER, email: "owner@test.invalid", fullName: "Ada Owner" });
  });

  afterEach(async () => {
    if (ids.length) await db.delete(corridors).where(inArray(corridors.id, ids));
    ids.length = 0;
    await db.delete(profiles).where(eq(profiles.id, OWNER));
  });

  it("does not serve a pending draft to a traveller", async () => {
    await version({ version: 1, isLive: false, reviewState: "pending" });

    // Asked of the provider, not the table: this is exactly what the
    // requirements screen would have resolved.
    expect(await curatedProvider.fetch(QUERY)).toBeNull();
  });

  it("serves the draft the moment an owner approves it", async () => {
    const draft = await version({ version: 1, isLive: false, reviewState: "pending" });

    expect(await approveCorridorTx(draft, OWNER)).toEqual({ ok: true });

    const ruleSet = await curatedProvider.fetch(QUERY);
    expect(ruleSet?.corridorId).toBe(draft);
    expect(ruleSet?.requirements).toHaveLength(2);
  });

  it("supersedes the live version and leaves exactly one live", async () => {
    const live = await version({ version: 1, isLive: true, reviewState: "approved" });
    const draft = await version({ version: 2, isLive: false, reviewState: "pending" });

    await approveCorridorTx(draft, OWNER);

    const rows = await db
      .select({ id: corridors.id, isLive: corridors.isLive })
      .from(corridors)
      .where(inArray(corridors.id, [live, draft]));

    // The old version goes dark in the same commit that raises the new
    // one. Two live versions would leave the winner to whichever
    // `order by` the provider happens to run.
    expect(rows.filter((r) => r.isLive).map((r) => r.id)).toEqual([draft]);
    expect((await curatedProvider.fetch(QUERY))?.version).toBe(2);
  });

  it("stamps the approver and marks the corridor verified", async () => {
    const draft = await version({ version: 1, isLive: false, reviewState: "pending" });
    const before = new Date();

    await approveCorridorTx(draft, OWNER);

    const after = await getCorridor(draft);
    expect(after?.reviewState).toBe("approved");
    expect(after?.approverName).toBe("Ada Owner");
    expect(after?.approvedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
    // Approval *is* the verification — nothing else in the system sets
    // this, which is why the seeded corridors read as never checked.
    expect(after?.lastVerifiedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("refuses a draft with no requirements", async () => {
    const empty = await version({
      version: 1,
      isLive: false,
      reviewState: "pending",
      requirements: 0,
    });

    const result = await approveCorridorTx(empty, OWNER);

    expect(result).toMatchObject({ error: expect.stringContaining("empty checklist") });
    // And it stayed dark, so no traveller can reach it.
    expect(await curatedProvider.fetch(QUERY)).toBeNull();
  });

  it("records a rejection reason and leaves the draft dark", async () => {
    const draft = await version({ version: 1, isLive: false, reviewState: "pending" });

    expect(await rejectCorridorTx(draft, "  Fee cites a dead page.  ")).toEqual({
      ok: true,
    });

    const after = await getCorridor(draft);
    expect(after?.reviewState).toBe("rejected");
    expect(after?.rejectReason).toBe("Fee cites a dead page.");
    expect(after?.isLive).toBe(false);
  });

  it("will not reject a version travellers are being served", async () => {
    const live = await version({ version: 1, isLive: true, reviewState: "approved" });

    const result = await rejectCorridorTx(live, "Out of date");

    expect(result).toMatchObject({ error: expect.stringContaining("live") });
    // Still serving — rejecting must not silently strand the corridor
    // with no live version at all.
    expect((await curatedProvider.fetch(QUERY))?.corridorId).toBe(live);
  });

  it("demands a reason", async () => {
    const draft = await version({ version: 1, isLive: false, reviewState: "pending" });

    expect(await rejectCorridorTx(draft, "   ")).toMatchObject({
      error: expect.stringContaining("Say why"),
    });
    expect((await getCorridor(draft))?.reviewState).toBe("pending");
  });

  it("finds the live version a draft would replace", async () => {
    const live = await version({ version: 1, isLive: true, reviewState: "approved" });
    const draft = await version({ version: 2, isLive: false, reviewState: "pending" });

    const detail = await getCorridor(draft);
    expect((await liveVersionOf(detail!))?.id).toBe(live);
  });

  it("has no live version to diff against for a first draft", async () => {
    const draft = await version({ version: 1, isLive: false, reviewState: "pending" });

    const detail = await getCorridor(draft);
    expect(await liveVersionOf(detail!)).toBeNull();
  });

  it("lists pending drafts above settled versions", async () => {
    await version({ version: 1, isLive: true, reviewState: "approved" });
    const draft = await version({ version: 2, isLive: false, reviewState: "pending" });

    const listed = (await listCorridors()).filter((c) => ids.includes(c.id));
    expect(listed[0].id).toBe(draft);
    expect(listed[0].requirementCount).toBe(2);
  });
});

/**
 * Milestone 10 — who gets told their checklist moved.
 *
 * The interesting behaviour is all restraint: not emailing someone whose
 * file is already submitted, and not emailing anybody at all when a
 * revision changed only wording. An over-eager notification here reads
 * as a decision being reopened.
 */
describe.skipIf(!process.env.DATABASE_URL)("checklistChangesFrom", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, corridorRequirements, corridors, documents, profiles } =
    await import("@/lib/db/schema");
  const { checklistChangesFrom } = await import("@/lib/data/corridors");

  const TRAVELLER = "test_corridor_change_traveller";
  const QUERY = {
    nationalityIso: "zm",
    destinationIso: "zn",
    purpose: "work" as const,
  };

  let liveId = "";
  let applicationId = "";

  /** A corridor version asking for exactly `docKeys`. */
  async function versionAsking(version: number, docKeys: string[], isLive: boolean) {
    const [row] = await db
      .insert(corridors)
      .values({
        ...QUERY,
        visaName: "Notify Test Visa",
        version,
        isLive,
        reviewState: isLive ? "approved" : "pending",
      })
      .returning({ id: corridors.id });

    if (docKeys.length) {
      await db.insert(corridorRequirements).values(
        docKeys.map((docKey, i) => ({
          corridorId: row.id,
          docKey,
          name: `Doc ${docKey}`,
          sortOrder: i,
        }))
      );
    }
    return row.id;
  }

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "corridor-change@test.invalid", fullName: "Ola" });

    liveId = await versionAsking(1, ["passport", "funds"], true);

    const [app] = await db
      .insert(applications)
      .values({
        travelerId: TRAVELLER,
        intakeComplete: true,
        corridorId: liveId,
        status: "collecting_documents",
      })
      .returning({ id: applications.id });
    applicationId = app.id;

    await db.insert(documents).values([
      { applicationId, docKey: "passport", name: "Doc passport", sortOrder: 0 },
      { applicationId, docKey: "funds", name: "Doc funds", sortOrder: 1 },
    ]);
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    const rows = await db
      .select({ id: corridors.id })
      .from(corridors)
      .where(eq(corridors.nationalityIso, QUERY.nationalityIso));
    if (rows.length) {
      await db.delete(corridors).where(inArray(corridors.id, rows.map((r) => r.id)));
    }
  });

  it("says nothing when the revision changed no document", async () => {
    const same = await versionAsking(2, ["passport", "funds"], false);

    // A reworded description is not work for the traveller, so it is not
    // news. Emailing here would train people to ignore the mail that
    // matters.
    expect(await checklistChangesFrom(same)).toEqual([]);
  });

  it("names what is newly required", async () => {
    const revised = await versionAsking(2, ["passport", "funds", "tb_test"], false);

    const [change] = await checklistChangesFrom(revised);
    expect(change).toMatchObject({
      applicationId,
      travelerId: TRAVELLER,
      visaName: "Notify Test Visa",
      added: ["Doc tb_test"],
      removed: [],
    });
  });

  it("names what is no longer wanted", async () => {
    const revised = await versionAsking(2, ["passport"], false);

    const [change] = await checklistChangesFrom(revised);
    expect(change.removed).toEqual(["Doc funds"]);
    expect(change.added).toEqual([]);
  });

  it("leaves a submitted file alone", async () => {
    await db
      .update(applications)
      .set({ status: "submitted" })
      .where(eq(applications.id, applicationId));

    const revised = await versionAsking(2, ["passport", "funds", "tb_test"], false);

    // Past the point where a checklist is theirs to act on. Telling them
    // their paperwork changed would read as their decision being
    // reopened.
    expect(await checklistChangesFrom(revised)).toEqual([]);
  });

  it("still reports a document the traveller already uploaded as dropped", async () => {
    await db
      .update(documents)
      .set({ state: "verified", storagePath: "somewhere/funds.pdf" })
      .where(and(eq(documents.applicationId, applicationId), eq(documents.docKey, "funds")));

    const revised = await versionAsking(2, ["passport"], false);

    const [change] = await checklistChangesFrom(revised);
    // `adoptRuleSet` keeps the file; the traveller is told it is no
    // longer required. Both halves matter — silence would leave them
    // believing they still need it.
    expect(change.removed).toEqual(["Doc funds"]);
  });
});
