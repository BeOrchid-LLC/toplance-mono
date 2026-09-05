import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * A reviewer's verdict on one document: `checking` → `verified` or
 * `flagged`. Until this existed, nothing in the codebase ever left the
 * `checking` state — the ring never moved and no case could ever be
 * submitted. Like `submitApplicationTx`, the function decides nothing
 * about access; its caller guards with `isStaff` first.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("reviewDocumentTx", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, documents, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { reviewDocumentTx } = await import("@/lib/data/review");

  const TRAVELLER = "test_review_traveller";
  const REVIEWER = "test_review_reviewer";
  let applicationId = "";
  let orgId: string | null = null;

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "review@test.invalid",
      fullName: "Ada",
    });
    await db.insert(profiles).values({
      id: REVIEWER,
      email: "reviewer@test.invalid",
      fullName: "Grace",
      role: "staff",
    });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, intakeComplete: true })
      .returning({ id: applications.id });
    applicationId = app.id;

    await db.insert(documents).values({
      applicationId,
      docKey: "passport",
      name: "Passport",
      isRequired: true,
      sortOrder: 1,
      state: "checking",
      storagePath: `${applicationId}/passport/scan.pdf`,
    });
    await db.insert(documents).values({
      applicationId,
      docKey: "funds",
      name: "Bank statements",
      isRequired: true,
      sortOrder: 2,
      state: "not_started",
    });
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, REVIEWER));
    // After the profiles, so the application is already gone by cascade
    // and nothing is left pointing at the organisation.
    if (orgId) {
      await db.delete(organisations).where(eq(organisations.id, orgId));
      orgId = null;
    }
  });

  async function docState(docKey: string) {
    const [row] = await db
      .select({ state: documents.state, reason: documents.reason })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      );
    return row;
  }

  it("verifies a checking document and clears any reason", async () => {
    const result = await reviewDocumentTx(applicationId, "passport", {
      verdict: "verified",
    }, REVIEWER);

    expect(result).toEqual({
      ok: true,
      documentName: "Passport",
      travelerId: TRAVELLER,
      // No org on this fixture, so no business to bill — the flag is
      // reported out on every verdict, not only the billable ones.
      becameBillable: false,
    });
    expect(await docState("passport")).toEqual({
      state: "verified",
      reason: null,
    });
  });

  it("flags a document with the reason the traveller will read", async () => {
    const result = await reviewDocumentTx(applicationId, "passport", {
      verdict: "flagged",
      reason: "The photo page is cut off.",
    }, REVIEWER);

    // The two fields `reviewDocument` needs to tell the traveller their
    // document was flagged: what to call it, and who to tell.
    expect(result).toEqual({
      ok: true,
      documentName: "Passport",
      travelerId: TRAVELLER,
      // No org on this fixture, so no business to bill — the flag is
      // reported out on every verdict, not only the billable ones.
      becameBillable: false,
    });
    expect(await docState("passport")).toEqual({
      state: "flagged",
      reason: "The photo page is cut off.",
    });
  });

  it("refuses to flag without a reason — the traveller must know why", async () => {
    const result = await reviewDocumentTx(applicationId, "passport", {
      verdict: "flagged",
      reason: "   ",
    }, REVIEWER);

    expect(result).toHaveProperty("error");
    expect((await docState("passport")).state).toBe("checking");
  });

  it("refuses a verdict on a document nobody has uploaded", async () => {
    const result = await reviewDocumentTx(applicationId, "funds", {
      verdict: "verified",
    }, REVIEWER);

    expect(result).toHaveProperty("error");
    expect((await docState("funds")).state).toBe("not_started");
  });

  it("refuses a verdict on a document that is not on the checklist", async () => {
    const result = await reviewDocumentTx(applicationId, "no_such_doc", {
      verdict: "verified",
    }, REVIEWER);

    expect(result).toHaveProperty("error");
  });

  it("records who judged it and when — the schema's audit columns", async () => {
    await reviewDocumentTx(
      applicationId,
      "passport",
      { verdict: "verified" },
      REVIEWER
    );

    const [row] = await db
      .select({
        verifiedBy: documents.verifiedBy,
        checkedAt: documents.checkedAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, "passport")
        )
      );
    expect(row.verifiedBy).toBe(REVIEWER);
    expect(row.checkedAt).toBeInstanceOf(Date);
  });

  it("lets a second look overturn a flag, clearing the reason with it", async () => {
    await reviewDocumentTx(applicationId, "passport", {
      verdict: "flagged",
      reason: "Blurry scan.",
    }, REVIEWER);
    const result = await reviewDocumentTx(applicationId, "passport", {
      verdict: "verified",
    }, REVIEWER);

    expect(result).toEqual({
      ok: true,
      documentName: "Passport",
      travelerId: TRAVELLER,
      // No org on this fixture, so no business to bill — the flag is
      // reported out on every verdict, not only the billable ones.
      becameBillable: false,
    });
    expect(await docState("passport")).toEqual({
      state: "verified",
      reason: null,
    });
  });

  it("reports the verdict that made an application billable", async () => {
    /**
     * The reviewer's route to `billable_at`. It is not the usual one —
     * an upload normally completes a checklist by itself — but it is the
     * one that happens when a document went up before the pre-check
     * could reach it, or came back after a flag. `reviewDocument` reads
     * this flag to emit `toplance.application_became_billable`; the
     * result used to be discarded here, so every case a person finished
     * was billed correctly and counted nowhere.
     */
    const [org] = await db
      .insert(organisations)
      .values({ name: "Review Billing Agency" })
      .returning({ id: organisations.id });
    orgId = org.id;

    await db
      .update(applications)
      .set({ orgId })
      .where(eq(applications.id, applicationId));

    // `funds` is still `not_started`, so this verdict completes nothing.
    const first = await reviewDocumentTx(applicationId, "passport", {
      verdict: "verified",
    }, REVIEWER);
    expect(first).toMatchObject({ ok: true, becameBillable: false });

    // Scoped to this application as well as the key — `passport` and
    // `funds` are doc keys half the database shares.
    await db
      .update(documents)
      .set({ state: "checking" })
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, "funds")
        )
      );

    const second = await reviewDocumentTx(applicationId, "funds", {
      verdict: "verified",
    }, REVIEWER);
    expect(second).toMatchObject({ ok: true, becameBillable: true });

    // And once only. A second look that flags the document and a third
    // that clears it walk the checklist back to complete, and must not
    // bill the agency for the same case again.
    const third = await reviewDocumentTx(applicationId, "funds", {
      verdict: "flagged",
      reason: "Second look — the statement is unreadable.",
    }, REVIEWER);
    expect(third).toMatchObject({ ok: true, becameBillable: false });

    const fourth = await reviewDocumentTx(applicationId, "funds", {
      verdict: "verified",
    }, REVIEWER);
    expect(fourth).toMatchObject({ ok: true, becameBillable: false });
  });
});
