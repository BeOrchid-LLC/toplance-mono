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
  const { applications, documents, profiles } = await import("@/lib/db/schema");
  const { reviewDocumentTx } = await import("@/lib/data/review");

  const TRAVELLER = "test_review_traveller";
  const REVIEWER = "test_review_reviewer";
  let applicationId = "";

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
    });
    expect(await docState("passport")).toEqual({
      state: "verified",
      reason: null,
    });
  });
});
