import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * The submission transition under concurrency.
 *
 * The three-statement version of this — read the status, count the
 * documents, write the new status — passed every single-threaded test
 * and was still wrong: nothing stopped two clicks submitting the same
 * case twice, or a traveller pushing a case back underneath the reviewer
 * already working on it. These tests fail against that version and pass
 * against the transaction.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("submitApplicationTx", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, documents, profiles, statusEvents } = await import(
    "@/lib/db/schema"
  );
  const { submitApplicationTx } = await import("@/lib/data/submissions");

  const TRAVELLER = "test_submit_traveller";
  let applicationId = "";

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "submit@test.invalid", fullName: "Ada" });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, status: "collecting_documents" })
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
    await db.delete(profiles).where(inArray(profiles.id, [TRAVELLER]));
  });

  async function statusOf() {
    const [row] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId));
    return row.status;
  }

  async function eventCount() {
    const rows = await db
      .select({ id: statusEvents.id })
      .from(statusEvents)
      .where(eq(statusEvents.applicationId, applicationId));
    return rows.length;
  }

  it("submits a complete application and records one event", async () => {
    await expect(submitApplicationTx(applicationId)).resolves.toEqual({ ok: true });

    expect(await statusOf()).toBe("submitted");
    expect(await eventCount()).toBe(1);
  });

  it("submits once when two clicks land together", async () => {
    // The double-tap on a bad connection this audience actually makes.
    // Note this does not reliably exercise the race on its own — the
    // window is sub-millisecond, so it passes with or without the lock.
    // It asserts the invariant; the test below is what proves it.
    const [first, second] = await Promise.all([
      submitApplicationTx(applicationId),
      submitApplicationTx(applicationId),
    ]);

    const outcomes = [first, second];
    expect(outcomes.filter((r) => "ok" in r)).toHaveLength(1);
    expect(outcomes.filter((r) => "error" in r)).toHaveLength(1);

    // The half that matters: one event, not two, in the traveller's
    // timeline.
    expect(await eventCount()).toBe(1);
  });

  it("waits for a reviewer holding the row, then sees their change", async () => {
    /**
     * The interleaving forced rather than hoped for. A reviewer's
     * transaction takes the row lock and moves the case to
     * `under_review` while holding it.
     *
     * With `for("update")`, the submit blocks at its first statement and
     * reads `under_review` when it resumes — so it refuses. Without it,
     * the submit reads the pre-update `collecting_documents`, sails past
     * the status guard, and its UPDATE lands after the reviewer's,
     * pushing the case back to `submitted` underneath them. Delete the
     * lock and this test fails.
     */
    let reviewerCommitted = false;

    const reviewer = db.transaction(async (tx) => {
      await tx
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .for("update");

      await new Promise((resolve) => setTimeout(resolve, 300));

      await tx
        .update(applications)
        .set({ status: "under_review" })
        .where(eq(applications.id, applicationId));

      reviewerCommitted = true;
    });

    // Let the reviewer take the lock before the traveller submits.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await submitApplicationTx(applicationId);
    await reviewer;

    expect(reviewerCommitted).toBe(true);
    expect(result).toEqual({
      error: "That application has already gone to the review team.",
    });
    expect(await statusOf()).toBe("under_review");
    expect(await eventCount()).toBe(0);
  });

  it("refuses to pull a case back from under review", async () => {
    await db
      .update(applications)
      .set({ status: "under_review" })
      .where(eq(applications.id, applicationId));

    await expect(submitApplicationTx(applicationId)).resolves.toEqual({
      error: "That application has already gone to the review team.",
    });

    expect(await statusOf()).toBe("under_review");
    expect(await eventCount()).toBe(0);
  });

  it("allows resubmission when more documents were asked for", async () => {
    await db
      .update(applications)
      .set({ status: "additional_documents" })
      .where(eq(applications.id, applicationId));

    await expect(submitApplicationTx(applicationId)).resolves.toEqual({ ok: true });
    expect(await statusOf()).toBe("submitted");
  });

  it("refuses while a required document is unverified", async () => {
    await db
      .update(documents)
      .set({ state: "flagged" })
      .where(eq(documents.applicationId, applicationId));

    await expect(submitApplicationTx(applicationId)).resolves.toEqual({
      error: "1 document still to verify.",
    });

    expect(await statusOf()).toBe("collecting_documents");
  });

  it("ignores optional documents when counting what is outstanding", async () => {
    await db.insert(documents).values({
      applicationId,
      docKey: "sponsorship_letter",
      name: "Sponsorship letter",
      isRequired: false,
      state: "not_started",
    });

    await expect(submitApplicationTx(applicationId)).resolves.toEqual({ ok: true });
  });
});
