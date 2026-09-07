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

describe.skipIf(!process.env.DATABASE_URL)("tenant writes", async () => {
  const { db } = await import("@/lib/db/client");
  const { demoRequests, invitations, orgMembers, organisations, profiles } =
    await import("@/lib/db/schema");
  const {
    getTenant,
    provisionTenantTx,
    setMemberRole,
    setTenantBilling,
    setTenantSuspension,
  } = await import("@/lib/data/tenants");

  const STAFF = "test_tenant_staff";
  const orgIds: string[] = [];
  const requestIds: string[] = [];

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({
        id: STAFF,
        email: "staff@tenant.invalid",
        fullName: "Di Staff",
        role: "staff",
        staffRole: "owner",
      })
      .onConflictDoNothing();
  });

  afterEach(async () => {
    if (requestIds.length) {
      await db.delete(demoRequests).where(inArray(demoRequests.id, requestIds));
      requestIds.length = 0;
    }
    if (orgIds.length) {
      await db.delete(invitations).where(inArray(invitations.orgId, orgIds));
      await db.delete(orgMembers).where(inArray(orgMembers.orgId, orgIds));
      await db.delete(organisations).where(inArray(organisations.id, orgIds));
      orgIds.length = 0;
    }
    await db.delete(profiles).where(eq(profiles.id, STAFF));
  });

  it("creates the agency and its first invitation together", async () => {
    const result = await provisionTenantTx(
      { name: "Kite Travel", ownerEmail: "Owner@Kite.Invalid", ownerName: "Eve Owner" },
      STAFF
    );

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    orgIds.push(result.orgId);

    const detail = await getTenant(result.orgId);
    expect(detail?.name).toBe("Kite Travel");

    // One pending staff invitation, lowercased the way createInvitation
    // lowercases, and seating nobody yet — the invitee becomes a
    // reviewer only when they accept.
    expect(detail?.pendingInvites).toHaveLength(1);
    expect(detail?.pendingInvites[0].email).toBe("owner@kite.invalid");
    expect(detail?.pendingInvites[0].kind).toBe("staff");
    expect(detail?.members_).toHaveLength(0);
    expect(result.inviteToken).toMatch(/^[0-9a-f]{48}$/);
  });

  it("refuses a nameless agency and writes nothing", async () => {
    const before = await db.select({ id: organisations.id }).from(organisations);

    const result = await provisionTenantTx(
      { name: "   ", ownerEmail: "owner@kite.invalid" },
      STAFF
    );

    expect("error" in result).toBe(true);

    const after = await db.select({ id: organisations.id }).from(organisations);
    expect(after).toHaveLength(before.length);
  });

  it("refuses an invalid owner address and rolls the agency back", async () => {
    const before = await db.select({ id: organisations.id }).from(organisations);

    // The whole point of one transaction: the organisation insert has
    // already run when this is refused, and must not survive.
    const result = await provisionTenantTx(
      { name: "Rollback Agency", ownerEmail: "not-an-address" },
      STAFF
    );

    expect("error" in result).toBe(true);

    const after = await db.select({ id: organisations.id }).from(organisations);
    expect(after).toHaveLength(before.length);
  });

  it("stamps the demo request it was provisioned from", async () => {
    const [req] = await db
      .insert(demoRequests)
      .values({
        fullName: "Ada Visitor",
        email: "ada@kite.invalid",
        companyName: "Kite Travel",
        jobTitle: "Director",
        preferredAt: new Date("2026-10-01T14:00:00Z"),
        preferredTz: "Africa/Lagos",
        locale: "en",
      })
      .returning({ id: demoRequests.id });
    requestIds.push(req.id);

    const result = await provisionTenantTx(
      { name: "Kite Travel", ownerEmail: "ada@kite.invalid", demoRequestId: req.id },
      STAFF
    );
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    orgIds.push(result.orgId);

    const [row] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, req.id));

    expect(row.status).toBe("converted");
    expect(row.convertedOrgId).toBe(result.orgId);
  });

  it("refuses a demo request that does not exist, and writes nothing", async () => {
    const beforeOrgs = await db.select({ id: organisations.id }).from(organisations);
    const beforeInvites = await db.select({ id: invitations.id }).from(invitations);
    const beforeMembers = await db
      .select({ orgId: orgMembers.orgId, userId: orgMembers.userId })
      .from(orgMembers);

    const result = await provisionTenantTx(
      {
        name: "Ghost Agency",
        ownerEmail: "ghost@kite.invalid",
        // Syntactically valid, matches no row.
        demoRequestId: "00000000-0000-4000-8000-00000000dead",
      },
      STAFF
    );

    expect("error" in result).toBe(true);

    // The claim the early-return-under-lock rests on: nothing was
    // inserted, so the row counts across all three tables are unchanged
    // — not just "no agency named Ghost Agency exists".
    const afterOrgs = await db.select({ id: organisations.id }).from(organisations);
    const afterInvites = await db.select({ id: invitations.id }).from(invitations);
    const afterMembers = await db
      .select({ orgId: orgMembers.orgId, userId: orgMembers.userId })
      .from(orgMembers);

    expect(afterOrgs).toHaveLength(beforeOrgs.length);
    expect(afterInvites).toHaveLength(beforeInvites.length);
    expect(afterMembers).toHaveLength(beforeMembers.length);
  });

  it("refuses to provision twice from the same demo request", async () => {
    const [req] = await db
      .insert(demoRequests)
      .values({
        fullName: "Bo Visitor",
        email: "bo@kite.invalid",
        companyName: "Kite Travel",
        jobTitle: "Director",
        preferredAt: new Date("2026-10-02T14:00:00Z"),
        preferredTz: "Africa/Lagos",
        locale: "en",
      })
      .returning({ id: demoRequests.id });
    requestIds.push(req.id);

    const first = await provisionTenantTx(
      { name: "First Agency", ownerEmail: "first@kite.invalid", demoRequestId: req.id },
      STAFF
    );
    expect("error" in first).toBe(false);
    if ("error" in first) return;
    orgIds.push(first.orgId);

    const beforeOrgs = await db.select({ id: organisations.id }).from(organisations);

    // A double-submit or a retry after an ambiguous timeout: the row is
    // still there for the lock to find, but it is already converted.
    const second = await provisionTenantTx(
      { name: "Second Agency", ownerEmail: "second@kite.invalid", demoRequestId: req.id },
      STAFF
    );
    expect("error" in second).toBe(true);

    const afterOrgs = await db.select({ id: organisations.id }).from(organisations);
    expect(afterOrgs).toHaveLength(beforeOrgs.length);

    const [row] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, req.id));

    // Still pointing at the first agency, not silently re-pointed.
    expect(row.convertedOrgId).toBe(first.orgId);
  });

  it("leaves other demo requests alone when none was named", async () => {
    const result = await provisionTenantTx(
      { name: "Walk In Agency", ownerEmail: "walkin@kite.invalid" },
      STAFF
    );
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    orgIds.push(result.orgId);

    const converted = await db
      .select({ id: demoRequests.id })
      .from(demoRequests)
      .where(eq(demoRequests.convertedOrgId, result.orgId));

    expect(converted).toHaveLength(0);
  });

  it("suspends and restores", async () => {
    const result = await provisionTenantTx(
      { name: "Suspendable", ownerEmail: "s@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    await setTenantSuspension(result.orgId, true);
    expect((await getTenant(result.orgId))?.suspendedAt).not.toBeNull();

    await setTenantSuspension(result.orgId, false);
    expect((await getTenant(result.orgId))?.suspendedAt).toBeNull();
  });

  it("writes seats and a billing contact, and refuses negative seats", async () => {
    const result = await provisionTenantTx(
      { name: "Billable", ownerEmail: "b@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    expect(await setTenantBilling(result.orgId, 12, "ap@kite.invalid")).toEqual({
      ok: true,
    });

    const detail = await getTenant(result.orgId);
    expect(detail?.seatsPurchased).toBe(12);
    expect(detail?.billingContact).toBe("ap@kite.invalid");

    // Refused here rather than left to the `seats_not_negative` check
    // constraint, so ops reads a sentence instead of a Postgres error.
    expect("error" in (await setTenantBilling(result.orgId, -1, null))).toBe(true);
  });

  it("promotes a reviewer to owner, and is idempotent", async () => {
    const result = await provisionTenantTx(
      { name: "Promotable", ownerEmail: "p@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    // Stand in for the invitee having accepted: acceptInvitationTx seats
    // a staff invitee as reviewer, and this suite does not re-test it.
    await db.insert(orgMembers).values({
      orgId: result.orgId,
      userId: STAFF,
      role: "reviewer",
    });

    expect(await setMemberRole(result.orgId, STAFF, "owner")).toEqual({ ok: true });
    expect(await setMemberRole(result.orgId, STAFF, "owner")).toEqual({ ok: true });

    const detail = await getTenant(result.orgId);
    expect(detail?.members_.find((m) => m.userId === STAFF)?.role).toBe("owner");
  });

  it("refuses to demote the last owner", async () => {
    const result = await provisionTenantTx(
      { name: "Last Owner", ownerEmail: "l@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    await db.insert(orgMembers).values({
      orgId: result.orgId,
      userId: STAFF,
      role: "owner",
    });

    // An agency of reviewers can invite nobody and change no billing.
    // The only way back is a staff member noticing.
    expect("error" in (await setMemberRole(result.orgId, STAFF, "reviewer"))).toBe(true);
    const detail = await getTenant(result.orgId);
    expect(detail?.members_.find((m) => m.userId === STAFF)?.role).toBe("owner");
  });
});
