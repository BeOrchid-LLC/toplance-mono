import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * When a business becomes chargeable for an application.
 *
 * The rule is Peace's: an application is billed once its checklist is
 * complete, and "invited, in-progress and abandoned applications are not
 * charged". The subtlety these tests exist for is that completion is not
 * one-way — a reviewer flagging a document after the checklist was full
 * drops it back below 100%, and re-uploading fills it again. Read as
 * live state that is two sales of one application, so it is recorded as
 * an event instead, and this file pins that it stays one.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("markBillableIfComplete", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, documents, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { markBillableIfComplete, cycleUsage } = await import("@/lib/data/billing");

  const TRAVELLER = "test_billing_traveller";
  let orgId = "";
  let applicationId = "";

  const billableAt = async () => {
    const [row] = await db
      .select({ billableAt: applications.billableAt })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    return row?.billableAt ?? null;
  };

  const setState = async (docKey: string, state: "checking" | "flagged" | "verified") => {
    // Scoped to this application. `passport` is a docKey on essentially
    // every application in the database, so a where-clause on docKey
    // alone rewrites other tests' fixtures and the seeded data with them.
    await db
      .update(documents)
      .set({ state })
      .where(
        and(eq(documents.applicationId, applicationId), eq(documents.docKey, docKey))
      );
  };

  beforeEach(async () => {
    const [org] = await db
      .insert(organisations)
      .values({ name: "Billing Test Agency" })
      .returning({ id: organisations.id });
    orgId = org.id;

    await db.insert(profiles).values({
      id: TRAVELLER,
      fullName: "Billing Test",
      email: `${TRAVELLER}@test.invalid`,
    });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, orgId })
      .returning({ id: applications.id });
    applicationId = app.id;

    // Two required documents and one optional — the optional one must
    // never hold up a bill, the same way it never holds up submission.
    await db.insert(documents).values([
      { applicationId, docKey: "passport", name: "Passport", isRequired: true, sortOrder: 1 },
      { applicationId, docKey: "cas", name: "CAS", isRequired: true, sortOrder: 2 },
      { applicationId, docKey: "tb", name: "TB test", isRequired: false, sortOrder: 3 },
    ]);
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(organisations).where(eq(organisations.id, orgId));
  });

  it("does not charge for a checklist still being filled", async () => {
    await setState("passport", "checking");

    await markBillableIfComplete(db, applicationId);

    expect(await billableAt()).toBeNull();
  });

  it("charges once every required document is in", async () => {
    await setState("passport", "checking");
    await setState("cas", "checking");

    const result = await markBillableIfComplete(db, applicationId);

    expect(result.becameBillable).toBe(true);
    expect(await billableAt()).toBeInstanceOf(Date);
  });

  it("does not wait on an optional document", async () => {
    // `tb` stays `not_started`. Peace's rule is the required checklist,
    // and the submit gate agrees — an optional row never blocks either.
    await setState("passport", "checking");
    await setState("cas", "verified");

    await markBillableIfComplete(db, applicationId);

    expect(await billableAt()).toBeInstanceOf(Date);
  });

  it("bills the same application only once, however often it completes", async () => {
    // The case this column exists for: complete, a reviewer flags one,
    // the traveller re-uploads, it completes again.
    await setState("passport", "checking");
    await setState("cas", "checking");
    await markBillableIfComplete(db, applicationId);
    const first = await billableAt();

    await setState("cas", "flagged");
    await markBillableIfComplete(db, applicationId);

    await setState("cas", "verified");
    const second = await markBillableIfComplete(db, applicationId);

    expect(second.becameBillable).toBe(false);
    expect((await billableAt())?.getTime()).toBe(first?.getTime());
  });

  it("charges nobody for a traveller who came on their own", async () => {
    // No `org_id` — there is no business to bill, and stamping the
    // column anyway would put the application into a cycle count that
    // belongs to no one.
    await db
      .update(applications)
      .set({ orgId: null })
      .where(eq(applications.id, applicationId));

    await setState("passport", "checking");
    await setState("cas", "checking");

    const result = await markBillableIfComplete(db, applicationId);

    expect(result.becameBillable).toBe(false);
    expect(await billableAt()).toBeNull();
  });

  it("counts a completed application in the cycle it completed in", async () => {
    await setState("passport", "checking");
    await setState("cas", "checking");
    await markBillableIfComplete(db, applicationId);

    // Anchored a year back on the same day, so `now` sits inside a cycle
    // whose bounds are unambiguous.
    const anchor = new Date(Date.now() - 365 * 24 * 3_600_000);
    const usage = await cycleUsage(orgId, anchor);

    expect(usage.applications).toBe(1);
    // $300 base + one application at the first band's $18.
    expect(usage.quote.totalMinor).toBe(300_00 + 18_00);
  });
});
