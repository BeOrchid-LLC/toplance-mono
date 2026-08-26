import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The staff decision transitions: `submitted`/`under_review` through to
 * `approved`/`rejected`, plus the `additional_documents` detour. Until
 * this existed, nothing in the codebase could move a case past
 * `submitted` — the queue filled up and nothing ever left it.
 *
 * Same reasoning as `submitApplicationTx`: the three-statement version
 * (read status, count documents, write status) looks correct and is not
 * — a reviewer double-clicking "Start review" must move a case exactly
 * once, and two reviewers racing the same case must not both win. These
 * tests fail against the naive version and pass against the transaction.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("changeStatusTx", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, documents, profiles, statusEvents } = await import(
    "@/lib/db/schema"
  );
  const { changeStatusTx } = await import("@/lib/data/transitions");
  const { submitApplicationTx } = await import("@/lib/data/submissions");

  const TRAVELLER = "test_transitions_traveller";
  const REVIEWER = "test_transitions_reviewer";
  let applicationId = "";

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "transitions@test.invalid",
      fullName: "Ada",
    });
    await db.insert(profiles).values({
      id: REVIEWER,
      email: "transitions-reviewer@test.invalid",
      fullName: "Grace",
      role: "staff",
      staffRole: "reviewer",
    });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, status: "submitted" })
      .returning({ id: applications.id });
    applicationId = app.id;

    await db.insert(documents).values({
      applicationId,
      docKey: "passport",
      name: "Passport",
      isRequired: true,
      state: "verified",
    });
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, REVIEWER));
  });

  async function statusOf() {
    const [row] = await db
      .select({ status: applications.status, decidedAt: applications.decidedAt })
      .from(applications)
      .where(eq(applications.id, applicationId));
    return row;
  }

  async function events() {
    return db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, applicationId));
  }

  it("moves submitted to under_review and writes one status event", async () => {
    const result = await changeStatusTx(
      applicationId,
      "under_review",
      "A case handler now has your file.",
      REVIEWER
    );

    expect(result).toEqual({
      ok: true,
      from: "submitted",
      travelerId: TRAVELLER,
    });
    expect((await statusOf()).status).toBe("under_review");

    const rows = await events();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fromStatus: "submitted",
      toStatus: "under_review",
      message: "A case handler now has your file.",
      actorId: REVIEWER,
    });
  });

  it("moves under_review to additional_documents", async () => {
    await changeStatusTx(applicationId, "under_review", "Looking now.", REVIEWER);

    const result = await changeStatusTx(
      applicationId,
      "additional_documents",
      "Please re-upload your passport photo page.",
      REVIEWER
    );

    expect(result).toMatchObject({ ok: true, from: "under_review" });
    expect((await statusOf()).status).toBe("additional_documents");
    expect(await events()).toHaveLength(2);
  });

  it("approves when every required document is verified, and sets decidedAt", async () => {
    await changeStatusTx(applicationId, "under_review", "Looking now.", REVIEWER);

    const result = await changeStatusTx(
      applicationId,
      "approved",
      "Congratulations — you're approved.",
      REVIEWER
    );

    expect(result).toMatchObject({ ok: true, from: "under_review" });
    const row = await statusOf();
    expect(row.status).toBe("approved");
    expect(row.decidedAt).toBeInstanceOf(Date);
  });

  it("rejects and sets decidedAt too", async () => {
    await changeStatusTx(applicationId, "under_review", "Looking now.", REVIEWER);

    const result = await changeStatusTx(
      applicationId,
      "rejected",
      "This corridor does not accept your document type.",
      REVIEWER
    );

    expect(result).toMatchObject({ ok: true, from: "under_review" });
    const row = await statusOf();
    expect(row.status).toBe("rejected");
    expect(row.decidedAt).toBeInstanceOf(Date);
  });

  it("refuses to approve while a required document is unverified", async () => {
    await changeStatusTx(applicationId, "under_review", "Looking now.", REVIEWER);
    await db
      .update(documents)
      .set({ state: "flagged" })
      .where(eq(documents.applicationId, applicationId));

    const result = await changeStatusTx(
      applicationId,
      "approved",
      "Congratulations — you're approved.",
      REVIEWER
    );

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      expect(result.error).toMatch(/additional documents/i);
    }
    expect((await statusOf()).status).toBe("under_review");
    expect(await events()).toHaveLength(1);
  });

  it("has no gate on rejection — a flagged required document does not block it", async () => {
    await changeStatusTx(applicationId, "under_review", "Looking now.", REVIEWER);
    await db
      .update(documents)
      .set({ state: "flagged" })
      .where(eq(documents.applicationId, applicationId));

    const result = await changeStatusTx(
      applicationId,
      "rejected",
      "This corridor does not accept your document type.",
      REVIEWER
    );

    expect(result).toMatchObject({ ok: true });
  });

  it("refuses an illegal transition — draft can never be approved directly", async () => {
    await db
      .update(applications)
      .set({ status: "draft" })
      .where(eq(applications.id, applicationId));

    const result = await changeStatusTx(
      applicationId,
      "approved",
      "Congratulations — you're approved.",
      REVIEWER
    );

    expect(result).toHaveProperty("error");
    expect((await statusOf()).status).toBe("draft");
    expect(await events()).toHaveLength(0);
  });

  it("refuses to move a terminal state — approved can never become rejected", async () => {
    await db
      .update(applications)
      .set({ status: "approved" })
      .where(eq(applications.id, applicationId));

    const result = await changeStatusTx(
      applicationId,
      "rejected",
      "Changed our minds.",
      REVIEWER
    );

    expect(result).toHaveProperty("error");
    expect((await statusOf()).status).toBe("approved");
  });

  it("refuses an empty message — every status change carries one", async () => {
    const result = await changeStatusTx(applicationId, "under_review", "   ", REVIEWER);

    expect(result).toHaveProperty("error");
    expect((await statusOf()).status).toBe("submitted");
    expect(await events()).toHaveLength(0);
  });

  it("refuses a message over 2,000 characters", async () => {
    const result = await changeStatusTx(
      applicationId,
      "under_review",
      "x".repeat(2001),
      REVIEWER
    );

    expect(result).toHaveProperty("error");
  });

  it("lets exactly one of two concurrent reviewers win the same case", async () => {
    const [first, second] = await Promise.all([
      changeStatusTx(applicationId, "under_review", "I've got this one.", REVIEWER),
      changeStatusTx(applicationId, "under_review", "I've got this one.", REVIEWER),
    ]);

    const outcomes = [first, second];
    expect(outcomes.filter((r) => "ok" in r)).toHaveLength(1);
    expect(outcomes.filter((r) => "error" in r)).toHaveLength(1);
    expect(await events()).toHaveLength(1);
  });

  it("still lets the traveller resubmit after additional_documents", async () => {
    await changeStatusTx(applicationId, "under_review", "Looking now.", REVIEWER);
    await changeStatusTx(
      applicationId,
      "additional_documents",
      "Please re-upload your passport photo page.",
      REVIEWER
    );

    await expect(submitApplicationTx(applicationId)).resolves.toEqual({ ok: true });
    expect((await statusOf()).status).toBe("submitted");
  });
});
