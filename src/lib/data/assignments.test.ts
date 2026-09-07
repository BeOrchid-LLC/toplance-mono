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
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, orgMembers, profiles } = await import("@/lib/db/schema");
  const { assignCaseTo, claimCase, releaseCase } = await import(
    "@/lib/data/assignments"
  );

  const TRAVELLER = "test_assign_traveller";
  const REVIEWER_A = "test_assign_reviewer_a";
  const REVIEWER_B = "test_assign_reviewer_b";
  const OWNER = "test_assign_owner";

  /** Every case belongs to an agency since v1.3. */
  const TEST_AGENCY = "00000000-0000-4000-8000-0000000c0002";

  let applicationId = "";

  beforeEach(async () => {
    await seedTestAgency(TEST_AGENCY);
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

    // `assignCaseTo` will only name a colleague who actually works at the
    // agency holding the case, so the fixture has to say that they do.
    await db.insert(orgMembers).values([
      { orgId: TEST_AGENCY, userId: REVIEWER_A, role: "reviewer" },
      { orgId: TEST_AGENCY, userId: REVIEWER_B, role: "reviewer" },
      { orgId: TEST_AGENCY, userId: OWNER, role: "owner" },
    ]);

    const [app] = await db
      .insert(applications)
      .values({ orgId: TEST_AGENCY, travelerId: TRAVELLER, status: "submitted" })
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

  /**
   * Handing a case to a named colleague.
   *
   * `assignee_id` stopped being a label when `handlesCase` started
   * reading it, so each of these writes grants or withdraws somebody's
   * reach into a traveller's passport — which is why the target's
   * membership and the case's current holder are both conditions on the
   * write rather than checks beside it.
   */
  describe("assignCaseTo", () => {
    it("hands an unheld case to a colleague", async () => {
      await expect(assignCaseTo(applicationId, REVIEWER_B, null)).resolves.toEqual({
        ok: true,
      });
      expect(await assigneeOf()).toBe(REVIEWER_B);
    });

    it("lets a director move a held case to someone else", async () => {
      await claimCase(applicationId, REVIEWER_A);

      await expect(
        assignCaseTo(applicationId, REVIEWER_B, REVIEWER_A)
      ).resolves.toEqual({ ok: true });
      expect(await assigneeOf()).toBe(REVIEWER_B);
    });

    it("refuses a target who does not work at this agency", async () => {
      await expect(assignCaseTo(applicationId, TRAVELLER, null)).resolves.toEqual({
        error: "That colleague is not at this agency.",
      });
      expect(await assigneeOf()).toBeNull();
    });

    /**
     * The race `claimCase` is careful about, on the other branch of the
     * same action. The guard reads `assignee_id` to decide the caller may
     * reassign; if a colleague claims the case between that read and this
     * write, an unconditional update silently takes the case off them.
     */
    it("refuses when someone else claimed the case since it was read", async () => {
      await claimCase(applicationId, REVIEWER_A);

      // The caller believed it was unheld — that is the stale read.
      await expect(assignCaseTo(applicationId, REVIEWER_B, null)).resolves.toEqual({
        error: "Someone else picked this case up. Reload and try again.",
      });
      expect(await assigneeOf()).toBe(REVIEWER_A);
    });

    it("refuses when the case was released since it was read", async () => {
      await expect(
        assignCaseTo(applicationId, REVIEWER_B, REVIEWER_A)
      ).resolves.toEqual({
        error: "Someone else picked this case up. Reload and try again.",
      });
      expect(await assigneeOf()).toBeNull();
    });
  });
});
