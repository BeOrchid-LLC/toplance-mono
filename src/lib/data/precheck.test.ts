import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * The AI pre-check's write path: a guarded `UPDATE ... WHERE state =
 * 'checking' AND storage_path = :storagePath`, the same single-statement
 * atomicity argument as `claimCase` in `@/lib/data/assignments` — the
 * conditional `WHERE` is evaluated and applied under the same row lock,
 * so there is no window for a concurrent write to land between the check
 * and the write.
 *
 * That guard is what stops the AI clobbering a human verdict: a reviewer
 * who has already moved the row to `verified` (or `flagged`) fails the
 * `state = 'checking'` half, and a traveller who re-uploaded mid-check
 * fails the `storage_path` half, because `uploadDocument` writes the new
 * path before the old check's `after()` callback ever runs.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("applyPrecheckTx", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, documents, profiles } = await import("@/lib/db/schema");
  const { applyPrecheckTx } = await import("@/lib/data/precheck");

  const TRAVELLER = "test_precheck_traveller";
  let applicationId = "";
  const STORAGE_PATH_A = "app/passport/a.jpg";
  const STORAGE_PATH_B = "app/passport/b.jpg";

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "precheck@test.invalid",
      fullName: "Ada",
    });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, intakeComplete: true })
      .returning({ id: applications.id });
    applicationId = app.id;

    await db.insert(documents).values({
      applicationId,
      docKey: "passport",
      name: "International passport — photo page",
      isRequired: true,
      sortOrder: 1,
      state: "checking",
      storagePath: STORAGE_PATH_A,
    });
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
  });

  async function docRow() {
    const [row] = await db
      .select({
        state: documents.state,
        reason: documents.reason,
        precheck: documents.precheck,
        storagePath: documents.storagePath,
      })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, "passport")
        )
      );
    return row;
  }

  it("flags a checking document with a matching storage path", async () => {
    const result = await applyPrecheckTx({
      applicationId,
      docKey: "passport",
      storagePath: STORAGE_PATH_A,
      verdict: "flag",
      reason: "The photo page is too dark to read — retake it in better light.",
      raw: { verdict: "flag", reason: "too dark", notes: ["low light"] },
    });

    expect(result).toEqual({ applied: true, travelerId: TRAVELLER });

    const row = await docRow();
    expect(row.state).toBe("flagged");
    expect(row.reason).toBe(
      "The photo page is too dark to read — retake it in better light."
    );
    expect(row.precheck).toEqual({
      verdict: "flag",
      reason: "too dark",
      notes: ["low light"],
    });
  });

  it("leaves a document a human already verified untouched", async () => {
    await db
      .update(documents)
      .set({ state: "verified", verifiedBy: TRAVELLER, reason: null })
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, "passport")
        )
      );

    const result = await applyPrecheckTx({
      applicationId,
      docKey: "passport",
      storagePath: STORAGE_PATH_A,
      verdict: "flag",
      reason: "Should never land.",
      raw: { verdict: "flag", reason: "Should never land.", notes: [] },
    });

    expect(result).toEqual({ applied: false });

    const row = await docRow();
    expect(row.state).toBe("verified");
    expect(row.reason).toBeNull();
    expect(row.precheck).toBeNull();
  });

  it("leaves a document untouched once a re-upload has changed its storage path", async () => {
    // The re-upload the traveller made while the first check was still
    // running — `uploadDocument` has already pointed the row at the new
    // object by the time the stale check's `after()` callback resolves.
    await db
      .update(documents)
      .set({ storagePath: STORAGE_PATH_B })
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, "passport")
        )
      );

    const result = await applyPrecheckTx({
      applicationId,
      docKey: "passport",
      storagePath: STORAGE_PATH_A,
      verdict: "flag",
      reason: "Stale verdict for the old upload.",
      raw: { verdict: "flag", reason: "Stale verdict for the old upload.", notes: [] },
    });

    expect(result).toEqual({ applied: false });

    const row = await docRow();
    expect(row.state).toBe("checking");
    expect(row.storagePath).toBe(STORAGE_PATH_B);
    expect(row.precheck).toBeNull();
  });

  it("writes only the precheck column on a pass — state stays checking", async () => {
    const result = await applyPrecheckTx({
      applicationId,
      docKey: "passport",
      storagePath: STORAGE_PATH_A,
      verdict: "pass",
      reason: "",
      raw: { verdict: "pass", reason: "", notes: [] },
    });

    expect(result).toEqual({ applied: true, travelerId: TRAVELLER });

    const row = await docRow();
    expect(row.state).toBe("checking");
    expect(row.reason).toBeNull();
    expect(row.precheck).toEqual({ verdict: "pass", reason: "", notes: [] });
  });
});
