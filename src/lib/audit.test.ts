import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

/**
 * `audit()` — the write behind the audit-trail promise in
 * `@/lib/auth/policy`. Modelled on `track()`'s own test: one happy path,
 * and proof the never-throw catch actually swallows a real database
 * error rather than something that merely looks like one.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("audit", async () => {
  const { db } = await import("@/lib/db/client");
  const { auditLog, profiles } = await import("@/lib/db/schema");
  const { audit } = await import("@/lib/audit");

  const ACTOR = "test_audit_actor";

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: ACTOR, email: "audit@test.invalid", fullName: "Ada", role: "staff" });
  });

  afterEach(async () => {
    await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR));
    await db.delete(profiles).where(eq(profiles.id, ACTOR));
  });

  it("writes a row", async () => {
    const subjectId = "11111111-1111-1111-1111-111111111111";
    await audit(ACTOR, "document.viewed", "document", subjectId, { docKey: "passport" });

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, ACTOR));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorId: ACTOR,
      action: "document.viewed",
      subjectType: "document",
      subjectId,
      meta: { docKey: "passport" },
    });
  });

  it("never throws, even when the write fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // `actorId` names no profile that exists, so the foreign key on
    // `audit_log.actor_id` rejects the insert — a real database error,
    // not a simulated one.
    await expect(
      audit("no_such_profile", "document.viewed", "document", null)
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
