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

  it("does not count a pending client invitation as a pending invitation", async () => {
    await db.insert(invitations).values([
      { orgId: BUSY, email: "staff@tenant.invalid", kind: "staff", status: "pending" },
      {
        orgId: BUSY,
        email: "traveler@tenant.invalid",
        fullName: "Traveler Name",
        kind: "client",
        status: "pending",
      },
    ]);

    const rows = await listTenants();
    // One staff invite is pending; the client invite is a traveller's
    // own outstanding invite, not this agency's — the count must agree
    // with what `getTenant`'s `pendingInvites` shows below, or the list
    // page and the detail page contradict each other about the same
    // agency.
    expect(rows.find((r) => r.id === BUSY)?.pendingInvitations).toBe(1);
  });

  it("does not show a traveller's own pending invitation on the agency's panel", async () => {
    await db.insert(invitations).values([
      { orgId: BUSY, email: "staff@tenant.invalid", kind: "staff", status: "pending" },
      {
        orgId: BUSY,
        email: "traveler@tenant.invalid",
        fullName: "Traveler Name",
        kind: "client",
        status: "pending",
      },
    ]);

    const detail = await getTenant(BUSY);

    // The whole point of the fix: a named traveller tied to a named
    // agency is exactly what this module's own header says ops must
    // never learn. Only the staff invitation belongs on this panel.
    expect(detail?.pendingInvites).toHaveLength(1);
    expect(detail?.pendingInvites[0].email).toBe("staff@tenant.invalid");
    expect(detail?.pendingInvites.some((i) => i.kind === "client")).toBe(false);
  });

  it("stops counting a pending invitation once it has expired", async () => {
    await db.insert(invitations).values([
      {
        orgId: BUSY,
        email: "live@tenant.invalid",
        kind: "staff",
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        orgId: BUSY,
        email: "dead@tenant.invalid",
        kind: "staff",
        status: "pending",
        // `status` is only flipped off `pending` when somebody opens the
        // link, so this row stays `pending` in the column forever. The
        // agency's own roster already reads it as expired; the console
        // has to agree, or one screen tells the operator to keep waiting
        // for a link that died a month ago.
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ]);

    const rows = await listTenants();
    expect(rows.find((r) => r.id === BUSY)?.pendingInvitations).toBe(1);

    const detail = await getTenant(BUSY);
    // Still listed — nothing in the product can resend an invitation, so
    // an operator looking at an agency with no owner needs to see that a
    // link was sent and has died. It is labelled, not counted.
    expect(detail?.pendingInvites).toHaveLength(2);
    expect(detail?.pendingInvitations).toBe(1);

    const byEmail = Object.fromEntries(
      detail!.pendingInvites.map((i) => [i.email, i.expired])
    );
    expect(byEmail["live@tenant.invalid"]).toBe(false);
    expect(byEmail["dead@tenant.invalid"]).toBe(true);
  });

  it("finds an agency whose id arrives in a different letter case", async () => {
    // Postgres compares `uuid` case-insensitively and this used to be a
    // JS `===` against `listTenants()`'s output, so an id typed or
    // bookmarked in upper case 404'd an agency that exists.
    const detail = await getTenant(BUSY.toUpperCase());
    expect(detail?.name).toBe("Busy Agency");
  });

  it("returns null for an id that is not a uuid at all", async () => {
    // Postgres throws on a malformed uuid before any row logic runs, so
    // without the shape check this is a 500 where a wrong-but-well-formed
    // id is a 404.
    expect(await getTenant("1")).toBeNull();
    expect(await getTenant("")).toBeNull();
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
    const result = await provisionTenantTx(
      { name: "   ", ownerEmail: "owner@kite.invalid" },
      STAFF
    );

    expect(result).toEqual({ error: "agency_name_required" });

    // Scoped to what this call could have written, not a table-wide
    // count — vitest runs test FILES in parallel, so a whole-table
    // count can be changed by another file's insert between the two
    // reads for a reason that has nothing to do with this code. `""`
    // rather than the raw `"   "`: provisionTenantTx trims before the
    // guard and inserts the trimmed `name`, so a row this input could
    // produce (if the guard were deleted) would be named `""`, never
    // the padded string nobody writes anywhere.
    const orgs = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.name, ""));
    expect(orgs).toHaveLength(0);

    const invites = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.email, "owner@kite.invalid"));
    expect(invites).toHaveLength(0);
  });

  it("refuses an invalid owner address and rolls the agency back", async () => {
    // The whole point of one transaction: the organisation insert has
    // already run when this is refused, and must not survive.
    const result = await provisionTenantTx(
      { name: "Rollback Agency", ownerEmail: "not-an-address" },
      STAFF
    );

    expect(result).toEqual({ error: "owner_email_invalid" });

    // Scoped by name rather than a table-wide count, for the same
    // reason as above: this name is distinctive to this test, so
    // another file's unrelated insert can't make this assertion flaky.
    const orgs = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.name, "Rollback Agency"));
    expect(orgs).toHaveLength(0);
  });

  it("refuses an invalid billing contact and rolls the agency back", async () => {
    // `setTenantBilling` has always refused this; provisioning did not,
    // so a value that got past the form's `type="email"` was stored and
    // then blocked every later billing save with `billing_email_invalid`
    // on a field the operator never typed.
    const result = await provisionTenantTx(
      {
        name: "Bad Billing Agency",
        ownerEmail: "owner@kite.invalid",
        billingContact: "not-an-address",
      },
      STAFF
    );

    expect(result).toEqual({ error: "billing_email_invalid" });

    const orgs = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.name, "Bad Billing Agency"));
    expect(orgs).toHaveLength(0);
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
    const result = await provisionTenantTx(
      {
        name: "Ghost Agency",
        ownerEmail: "ghost@kite.invalid",
        // Syntactically valid, matches no row.
        demoRequestId: "00000000-0000-4000-8000-00000000dead",
      },
      STAFF
    );

    expect(result).toEqual({ error: "demo_request_not_found" });

    // The claim the early-return-under-lock rests on: nothing was
    // inserted. Scoped by this call's distinctive name and email rather
    // than a table-wide count — vitest runs test FILES in parallel, so
    // counting every row in `organisations` can be changed by another
    // file's insert between the two reads, which fails this test for a
    // reason that has nothing to do with the code under test.
    const orgs = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.name, "Ghost Agency"));
    expect(orgs).toHaveLength(0);

    const invites = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.email, "ghost@kite.invalid"));
    expect(invites).toHaveLength(0);
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

    // A double-submit or a retry after an ambiguous timeout: the row is
    // still there for the lock to find, but it is already converted.
    const second = await provisionTenantTx(
      { name: "Second Agency", ownerEmail: "second@kite.invalid", demoRequestId: req.id },
      STAFF
    );
    expect(second).toEqual({ error: "demo_request_already_converted" });

    // Scoped by this call's distinctive name rather than a table-wide
    // count, for the same reason as the "does not exist" test above.
    const secondOrgs = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.name, "Second Agency"));
    expect(secondOrgs).toHaveLength(0);

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
    // constraint, so this returns `seats_invalid` instead of a Postgres
    // error.
    expect(await setTenantBilling(result.orgId, -1, null)).toEqual({
      error: "seats_invalid",
    });

    // `updateTenantBilling` (`@/app/[locale]/ops/tenants/actions.ts`)
    // leans on this guard to catch a non-numeric seats value once it
    // has ruled out an empty one — `Number.isInteger(NaN)` is false, so
    // this refuses the same way a negative number does, and the
    // agency's real seat count from above is untouched.
    expect(await setTenantBilling(result.orgId, NaN, null)).toEqual({
      error: "seats_invalid",
    });

    // A deliberate zero — typed, not merely absent — is a legitimate
    // value and must still be accepted.
    expect(await setTenantBilling(result.orgId, 0, null)).toEqual({ ok: true });
    expect((await getTenant(result.orgId))?.seatsPurchased).toBe(0);
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
    expect(await setMemberRole(result.orgId, STAFF, "reviewer")).toEqual({
      error: "last_owner",
    });
    const detail = await getTenant(result.orgId);
    expect(detail?.members_.find((m) => m.userId === STAFF)?.role).toBe("owner");
  });

  it("refuses one of two concurrent demotions of two different owners, leaving an owner behind", async () => {
    const result = await provisionTenantTx(
      { name: "Two Owners", ownerEmail: "two@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    const SECOND_OWNER = "test_tenant_second_owner";
    await db
      .insert(profiles)
      .values({
        id: SECOND_OWNER,
        email: "second@tenant.invalid",
        fullName: "Fi Second",
        role: "org_member",
      })
      .onConflictDoNothing();

    try {
      await db.insert(orgMembers).values([
        { orgId: result.orgId, userId: STAFF, role: "owner" },
        { orgId: result.orgId, userId: SECOND_OWNER, role: "owner" },
      ]);

      // Two owners, each demoted by a transaction that starts at the
      // same time. The fix locks the whole org's membership in one
      // statement per call, so the second call always waits for the
      // first to commit (or roll back) and then decides against a
      // count that already reflects it — this outcome holds no matter
      // how the two calls happen to interleave, which the next test
      // proves directly by forcing that interleaving rather than
      // hoping `Promise.all` happens to produce it.
      const [first, second] = await Promise.all([
        setMemberRole(result.orgId, STAFF, "reviewer"),
        setMemberRole(result.orgId, SECOND_OWNER, "reviewer"),
      ]);

      const outcomes = [first, second];
      const succeeded = outcomes.filter((r) => "ok" in r);
      const refused = outcomes.filter((r) => "error" in r && r.error === "last_owner");

      // Exactly one demotion goes through; the other is refused as the
      // one that would have zeroed the agency out.
      expect(succeeded).toHaveLength(1);
      expect(refused).toHaveLength(1);

      const detail = await getTenant(result.orgId);
      const owners = detail!.members_.filter((m) => m.role === "owner");
      expect(owners).toHaveLength(1);
    } finally {
      await db.delete(profiles).where(eq(profiles.id, SECOND_OWNER));
    }
  });

  it("a demotion waits on a lock held on the OTHER owner's row, not just its own", async () => {
    // `Promise.all` above proves the *outcome* is always safe, but on a
    // local database the two calls often don't truly overlap — one can
    // finish before the other's first query even lands, which would
    // pass that test for the wrong reason even against the old code.
    // This test proves the actual mechanism instead: it holds a raw
    // lock on SECOND_OWNER's row — deliberately not STAFF's, the row
    // `setMemberRole(orgId, STAFF, "reviewer")` is about to write — and
    // shows the call still cannot proceed. The old implementation only
    // ever locked the row being changed and read every other owner
    // with a plain `SELECT`, so it would have sailed straight through
    // a lock on a row it never touches; the fix locks every membership
    // row of the org before it decides, this one included.
    const result = await provisionTenantTx(
      { name: "Lock Coverage", ownerEmail: "lockcov@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    const SECOND_OWNER = "test_tenant_lock_second_owner";
    await db
      .insert(profiles)
      .values({
        id: SECOND_OWNER,
        email: "lockcov2@tenant.invalid",
        fullName: "Lo Second",
        role: "org_member",
      })
      .onConflictDoNothing();

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    // Declared here, not inside `try`, so `finally` can still await it
    // if an assertion throws while `demote` is still in flight.
    let demote: ReturnType<typeof setMemberRole> | undefined;

    try {
      await db.insert(orgMembers).values([
        { orgId: result.orgId, userId: STAFF, role: "owner" },
        { orgId: result.orgId, userId: SECOND_OWNER, role: "owner" },
      ]);

      await client.query("BEGIN");
      await client.query(
        "SELECT user_id FROM org_members WHERE org_id = $1 AND user_id = $2 FOR UPDATE",
        [result.orgId, SECOND_OWNER]
      );

      demote = setMemberRole(result.orgId, STAFF, "reviewer");

      const outcome = await Promise.race([
        demote.then(() => "resolved" as const),
        new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 300)),
      ]);

      // Still waiting 300ms later, even though nothing here has locked
      // (or is about to write) STAFF's own row.
      expect(outcome).toBe("timeout");

      // Releasing the lock on the other owner's row is what lets the
      // demotion proceed — and it succeeds, because with the lock
      // gone the org genuinely still has two owners.
      await client.query("COMMIT");
      expect(await demote).toEqual({ ok: true });
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      await (demote ?? Promise.resolve()).catch(() => {});
      client.release();
      await pool.end();
      await db.delete(profiles).where(eq(profiles.id, SECOND_OWNER));
    }
  });
});
