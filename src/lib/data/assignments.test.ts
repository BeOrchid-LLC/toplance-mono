import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Case ownership under concurrency, and the release scoping rule.
 *
 * `claimCase` is a single `update ... where assignee_id is null`, so the
 * race is proven the same way `submissions.test.ts` proves the submit
 * lock: fire two claims together and check exactly one wins.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("assignments", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, profiles } = await import("@/lib/db/schema");
  const { claimCase, releaseCase } = await import("@/lib/data/assignments");

  const TRAVELLER = "test_assign_traveller";
  const REVIEWER_A = "test_assign_reviewer_a";
  const REVIEWER_B = "test_assign_reviewer_b";
  const OWNER = "test_assign_owner";
  let applicationId = "";

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "assign-t@test.invalid", fullName: "Ada" });
    await db.insert(profiles).values({
      id: REVIEWER_A,
      email: "assign-a@test.invalid",
      fullName: "Grace",
      role: "staff",
      staffRole: "reviewer",
    });
    await db.insert(profiles).values({
      id: REVIEWER_B,
      email: "assign-b@test.invalid",
      fullName: "Amara",
      role: "staff",
      staffRole: "reviewer",
    });
    await db.insert(profiles).values({
      id: OWNER,
      email: "assign-o@test.invalid",
      fullName: "Chidi",
      role: "staff",
      staffRole: "owner",
    });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, status: "submitted" })
      .returning({ id: applications.id });
    applicationId = app.id;
  });

  afterEach(async () => {
    await db
      .delete(profiles)
      .where(eq(profiles.id, TRAVELLER));
    for (const id of [REVIEWER_A, REVIEWER_B, OWNER]) {
      await db.delete(profiles).where(eq(profiles.id, id));
    }
  });

  async function assigneeOf() {
    const [row] = await db
      .select({ assigneeId: applications.assigneeId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    return row.assigneeId;
  }

  it("claims an unassigned case", async () => {
    await expect(claimCase(applicationId, REVIEWER_A)).resolves.toEqual({ ok: true });
    expect(await assigneeOf()).toBe(REVIEWER_A);
  });

  it("refuses to claim a case someone already owns", async () => {
    await claimCase(applicationId, REVIEWER_A);

    await expect(claimCase(applicationId, REVIEWER_B)).resolves.toEqual({
      error: "Someone already owns this case.",
    });
    expect(await assigneeOf()).toBe(REVIEWER_A);
  });

  it("claim wins once under two concurrent claims", async () => {
    const [first, second] = await Promise.all([
      claimCase(applicationId, REVIEWER_A),
      claimCase(applicationId, REVIEWER_B),
    ]);

    const outcomes = [first, second];
    expect(outcomes.filter((r) => "ok" in r)).toHaveLength(1);
    expect(outcomes.filter((r) => "error" in r)).toHaveLength(1);

    const owner = await assigneeOf();
    expect([REVIEWER_A, REVIEWER_B]).toContain(owner);
  });

  it("lets a reviewer release their own case", async () => {
    await claimCase(applicationId, REVIEWER_A);

    await expect(releaseCase(applicationId, REVIEWER_A, false)).resolves.toEqual({
      ok: true,
    });
    expect(await assigneeOf()).toBeNull();
  });

  it("refuses to let a reviewer release someone else's case", async () => {
    await claimCase(applicationId, REVIEWER_A);

    await expect(releaseCase(applicationId, REVIEWER_B, false)).resolves.toEqual({
      error: "This case is not yours to release.",
    });
    expect(await assigneeOf()).toBe(REVIEWER_A);
  });

  it("lets an owner release any case", async () => {
    await claimCase(applicationId, REVIEWER_A);

    await expect(releaseCase(applicationId, OWNER, true)).resolves.toEqual({ ok: true });
    expect(await assigneeOf()).toBeNull();
  });

  it("refuses to release a case that has no owner", async () => {
    await expect(releaseCase(applicationId, REVIEWER_A, false)).resolves.toEqual({
      error: "This case is not yours to release.",
    });
  });
});
