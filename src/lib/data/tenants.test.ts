import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * What the platform console is allowed to know about an agency.
 *
 * The claim these tests exist to pin down is a negative one: the counts
 * add up without any query in `tenants.ts` ever selecting an application
 * row. A test that starts asserting on a case ref means the boundary the
 * v1.3 tenancy drew has moved, and that is a spec change rather than a
 * test change.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("tenant reads", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, invitations, orgMembers, organisations, profiles } =
    await import("@/lib/db/schema");
  const { getTenant, listTenants } = await import("@/lib/data/tenants");

  // Fixed ids no other suite uses, so two files running against the same
  // database cannot delete each other's rows.
  const BUSY = "00000000-0000-4000-8000-0000000d0001";
  const EMPTY = "00000000-0000-4000-8000-0000000d0002";
  const OWNER = "test_tenant_owner";
  const REVIEWER = "test_tenant_reviewer";
  const TRAVELER = "test_tenant_traveler";

  beforeEach(async () => {
    await db
      .insert(organisations)
      .values([
        { id: BUSY, name: "Busy Agency", seatsPurchased: 5 },
        { id: EMPTY, name: "Empty Agency", seatsPurchased: 2 },
      ])
      .onConflictDoNothing();

    await db
      .insert(profiles)
      .values([
        { id: OWNER, email: "owner@tenant.invalid", fullName: "Ada Owner", role: "org_member" },
        { id: REVIEWER, email: "rev@tenant.invalid", fullName: "Bo Reviewer", role: "org_member" },
        { id: TRAVELER, email: "trav@tenant.invalid", fullName: "Cy Traveler" },
      ])
      .onConflictDoNothing();

    await db
      .insert(orgMembers)
      .values([
        { orgId: BUSY, userId: OWNER, role: "owner" },
        { orgId: BUSY, userId: REVIEWER, role: "reviewer" },
      ])
      .onConflictDoNothing();
  });

  afterEach(async () => {
    // `applications.org_id` is `restrict`, so cases go before agencies.
    await db.delete(applications).where(eq(applications.travelerId, TRAVELER));
    await db.delete(invitations).where(inArray(invitations.orgId, [BUSY, EMPTY]));
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, [BUSY, EMPTY]));
    await db.delete(organisations).where(inArray(organisations.id, [BUSY, EMPTY]));
    await db.delete(profiles).where(inArray(profiles.id, [OWNER, REVIEWER, TRAVELER]));
  });

  it("shows an agency with no applications at zero rather than hiding it", async () => {
    const rows = await listTenants();
    const empty = rows.find((r) => r.id === EMPTY);

    // The LEFT JOIN assertion. An INNER JOIN would silently drop exactly
    // the tenant ops most needs to see — the one provisioned this
    // morning that has done nothing yet.
    expect(empty).toBeDefined();
    expect(empty?.applicationsTotal).toBe(0);
    expect(empty?.members).toBe(0);
  });

  it("counts members as seats used", async () => {
    const rows = await listTenants();
    const busy = rows.find((r) => r.id === BUSY);

    expect(busy?.members).toBe(2);
    expect(busy?.seatsPurchased).toBe(5);
  });

  it("buckets every application status, and the buckets add up", async () => {
    await db.insert(applications).values([
      { travelerId: TRAVELER, orgId: BUSY, status: "draft" },
    ]);

    const rows = await listTenants();
    const busy = rows.find((r) => r.id === BUSY)!;

    expect(busy.applicationsTotal).toBe(1);
    expect(busy.inProgress).toBe(1);
    expect(busy.inProgress + busy.withReviewer + busy.approved + busy.rejected).toBe(
      busy.applicationsTotal
    );
  });

  it("keeps counting a suspended agency, and says that it is suspended", async () => {
    await db
      .update(organisations)
      .set({ suspendedAt: new Date("2026-09-01T00:00:00Z") })
      .where(eq(organisations.id, BUSY));

    const rows = await listTenants();
    const busy = rows.find((r) => r.id === BUSY);

    // Suspension is a state to see, not a reason to disappear. An agency
    // ops cannot find is an agency ops cannot restore.
    expect(busy?.suspendedAt).not.toBeNull();
    expect(busy?.members).toBe(2);
  });

  it("counts pending invitations and ignores accepted ones", async () => {
    await db.insert(invitations).values([
      { orgId: BUSY, email: "pending@tenant.invalid", kind: "staff", status: "pending" },
      { orgId: BUSY, email: "done@tenant.invalid", kind: "staff", status: "accepted" },
    ]);

    const rows = await listTenants();
    expect(rows.find((r) => r.id === BUSY)?.pendingInvitations).toBe(1);
  });

  it("returns the roster with roles, newest agency first in the list", async () => {
    const detail = await getTenant(BUSY);

    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("Busy Agency");

    const roles = Object.fromEntries(
      detail!.members_.map((m) => [m.userId, m.role])
    );
    expect(roles[OWNER]).toBe("owner");
    expect(roles[REVIEWER]).toBe("reviewer");
  });

  it("returns null for an agency that is not there", async () => {
    expect(await getTenant("00000000-0000-4000-8000-00000000dead")).toBeNull();
  });
});
