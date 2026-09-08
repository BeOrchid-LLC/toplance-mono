import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * A new employer's first act: name an organisation and become its
 * owner, in one transaction. Before this existed, org rows came only
 * from seed SQL — nobody could sign themselves up.
 *
 * Like `submitApplicationTx`, the function decides nothing about who is
 * signed in; its caller (`createOrganisation` in
 * `@/app/[locale]/agency/actions.ts`) resolves `userId` from the session.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("createOrganisationTx", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, orgMembers, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { createOrganisationTx, provisionEmployerProfile } = await import(
    "@/lib/data/organisations"
  );

  const createdProfileIds: string[] = [];
  const createdOrgIds: string[] = [];

  async function makeProfile(
    id: string,
    overrides: Partial<typeof profiles.$inferInsert> = {}
  ) {
    await db.insert(profiles).values({
      id,
      email: `${id}@test.invalid`,
      fullName: "Test Person",
      ...overrides,
    });
    createdProfileIds.push(id);
  }

  afterEach(async () => {
    // Profiles first, and the order is load-bearing since v1.3:
    // `applications.org_id` is `restrict`, so deleting an organisation
    // while one of its cases still exists throws — and a throw here
    // aborts the rest of the cleanup, leaving rows that break the next
    // run's inserts. Deleting the profiles cascades the applications
    // out of the way first.
    if (createdProfileIds.length) {
      // Cascades to org_members and applications for these profiles.
      await db.delete(profiles).where(inArray(profiles.id, createdProfileIds));
      createdProfileIds.length = 0;
    }
    if (createdOrgIds.length) {
      await db.delete(organisations).where(inArray(organisations.id, createdOrgIds));
      createdOrgIds.length = 0;
    }
  });

  async function roleOf(userId: string) {
    const [row] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId));
    return row?.role;
  }

  async function membershipsOf(userId: string) {
    return db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId));
  }

  describe("provisionEmployerProfile", () => {
    /**
     * The employer half of the same safety net as
     * `provisionInvitedProfile`. `completeProfile` is a write from the
     * sign-up page, and Clerk activating the new session navigates that
     * page away mid-request; the employer who blinked used to be caught
     * by `getProfile`'s lazy provisioning and now lands on `/go` with no
     * account at all.
     *
     * There is no token to check here, and there does not need to be:
     * the employer door is open by design, so anyone reaching it could
     * have obtained this row through the form anyway. What matters is
     * that it writes `org_member` and never `traveler` — the invite-only
     * invariant lives in the role, not in this door.
     */
    const USER = "test_provision_employer";

    async function profileOf(id: string) {
      const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
      return row;
    }

    it("writes an org_member with no membership, never a traveller", async () => {
      createdProfileIds.push(USER);

      expect(
        await provisionEmployerProfile(USER, "founder@test.invalid", "Folake Adebayo")
      ).toBe(true);

      const profile = await profileOf(USER);
      expect(profile.role).toBe("org_member");
      expect(profile.fullName).toBe("Folake Adebayo");
      expect(profile.email).toBe("founder@test.invalid");
      expect(await membershipsOf(USER)).toEqual([]);
    });

    it("leaves the row alone when one already exists", async () => {
      // A traveller or a staff account opening /agency must not be
      // quietly turned into an employer by the safety net.
      await makeProfile(USER, { email: "existing@test.invalid", role: "traveler" });

      expect(
        await provisionEmployerProfile(USER, "existing@test.invalid", "Someone Else")
      ).toBe(true);

      const profile = await profileOf(USER);
      expect(profile.role).toBe("traveler");
      expect(profile.fullName).toBe("Test Person");
    });

    it("hands the new account straight on to naming an organisation", async () => {
      // The whole point: the row it writes must satisfy
      // `createOrganisationTx`, or the employer is still stuck.
      createdProfileIds.push(USER);
      await provisionEmployerProfile(USER, "founder@test.invalid", "Folake Adebayo");

      const result = await createOrganisationTx(USER, "Recovered Freight Ltd");

      expect(result).toMatchObject({ ok: true });
      if (!("ok" in result)) throw new Error("unreachable");
      createdOrgIds.push(result.orgId);
      expect(await membershipsOf(USER)).toEqual([
        { orgId: result.orgId, role: "owner" },
      ]);
    });
  });

  it("creates the organisation, an owner membership, and flips traveler to org_member", async () => {
    const userId = "test_org_traveller";
    await makeProfile(userId);

    const result = await createOrganisationTx(userId, "Acme Logistics Ltd");

    expect(result).toMatchObject({ ok: true });
    if (!("ok" in result)) throw new Error("unreachable");
    createdOrgIds.push(result.orgId);

    const [org] = await db
      .select({ name: organisations.name, seatsPurchased: organisations.seatsPurchased })
      .from(organisations)
      .where(eq(organisations.id, result.orgId));
    expect(org).toEqual({ name: "Acme Logistics Ltd", seatsPurchased: 0 });

    expect(await membershipsOf(userId)).toEqual([
      { orgId: result.orgId, role: "owner" },
    ]);
    expect(await roleOf(userId)).toBe("org_member");
  });

  it("names an organisation for the org_member sign-up leaves behind", async () => {
    // Since travellers became invite-only (2026-08-31) this is the
    // normal employer path, not an oddity: `completeProfile` writes
    // `org_member` at sign-up so no window exists in which an employer
    // reads as a traveller, and the membership arrives here.
    const userId = "test_org_member_no_membership";
    await makeProfile(userId, { role: "org_member" });

    const result = await createOrganisationTx(userId, "Beorchid Freight");

    expect(result).toMatchObject({ ok: true });
    if (!("ok" in result)) throw new Error("unreachable");
    createdOrgIds.push(result.orgId);

    expect(await membershipsOf(userId)).toEqual([
      { orgId: result.orgId, role: "owner" },
    ]);
    expect(await roleOf(userId)).toBe("org_member");
  });

  it("refuses a second organisation for someone who already belongs to one", async () => {
    const userId = "test_org_already_member";
    await makeProfile(userId, { role: "org_member" });

    const first = await createOrganisationTx(userId, "First Co");
    expect(first).toMatchObject({ ok: true });
    if (!("ok" in first)) throw new Error("unreachable");
    createdOrgIds.push(first.orgId);

    const second = await createOrganisationTx(userId, "Second Co");
    expect(second).toEqual({ error: "You already belong to an organisation." });

    expect(await membershipsOf(userId)).toHaveLength(1);
    const secondCo = await db
      .select()
      .from(organisations)
      .where(eq(organisations.name, "Second Co"));
    expect(secondCo).toHaveLength(0);
  });

  it("refuses a staff account", async () => {
    const userId = "test_org_staff";
    await makeProfile(userId, { role: "staff", staffRole: "reviewer" });

    const result = await createOrganisationTx(userId, "Staff Org");

    expect(result).toEqual({
      error: "Staff accounts cannot create an organisation.",
    });
    expect(await membershipsOf(userId)).toHaveLength(0);
    expect(await roleOf(userId)).toBe("staff");
  });

  it("refuses a traveller with an application in flight — they must not silently become an employer", async () => {
    const userId = "test_org_traveller_with_app";
    await makeProfile(userId);
    // Every case belongs to an agency since v1.3, so the application
    // this test needs in flight has to be held by one.
    const [holding] = await db
      .insert(organisations)
      .values({ name: "Holding Agency Ltd" })
      .returning({ id: organisations.id });
    createdOrgIds.push(holding.id);
    await db.insert(applications).values({ travelerId: userId, orgId: holding.id });

    const result = await createOrganisationTx(userId, "Side Hustle Inc");

    expect(result).toEqual({
      error:
        "This account is a traveler account — use a different email for your organisation.",
    });
    expect(await membershipsOf(userId)).toHaveLength(0);
    expect(await roleOf(userId)).toBe("traveler");
  });

  it("rejects an empty name without writing anything", async () => {
    const userId = "test_org_empty_name";
    await makeProfile(userId);

    expect(await createOrganisationTx(userId, "   ")).toEqual({
      error: "Your organisation needs a name.",
    });
    expect(await membershipsOf(userId)).toHaveLength(0);
  });

  it("rejects a name over 160 characters without writing anything", async () => {
    const userId = "test_org_long_name";
    await makeProfile(userId);

    expect(await createOrganisationTx(userId, "x".repeat(161))).toEqual({
      error: "That name is too long.",
    });
    expect(await membershipsOf(userId)).toHaveLength(0);
  });

  it("trims the name before storing it", async () => {
    const userId = "test_org_trims_name";
    await makeProfile(userId);

    const result = await createOrganisationTx(userId, "  Padded Co  ");
    expect(result).toMatchObject({ ok: true });
    if (!("ok" in result)) throw new Error("unreachable");
    createdOrgIds.push(result.orgId);

    const [org] = await db
      .select({ name: organisations.name })
      .from(organisations)
      .where(eq(organisations.id, result.orgId));
    expect(org.name).toBe("Padded Co");
  });

  it("creates only one organisation when two attempts land together — the transaction, not luck", async () => {
    // Same shape as `submitApplicationTx`'s double-click test: the
    // profile row is locked for the duration of the transaction, so a
    // second concurrent attempt blocks until the first commits, then
    // reads the membership it just wrote and refuses. Without the lock,
    // both could read "no membership yet" and each create an org.
    const userId = "test_org_concurrent";
    await makeProfile(userId);

    const [first, second] = await Promise.all([
      createOrganisationTx(userId, "Race Co A"),
      createOrganisationTx(userId, "Race Co B"),
    ]);

    const outcomes = [first, second];
    const oks = outcomes.filter((r): r is { ok: true; orgId: string } => "ok" in r);
    const errors = outcomes.filter((r) => "error" in r);
    expect(oks).toHaveLength(1);
    expect(errors).toHaveLength(1);
    createdOrgIds.push(oks[0].orgId);

    expect(await membershipsOf(userId)).toEqual([
      { orgId: oks[0].orgId, role: "owner" },
    ]);
    expect(await roleOf(userId)).toBe("org_member");
  });
});

/**
 * Who inside an agency may invite a colleague.
 *
 * §1 of the tenancy gives an owner everything a reviewer can do plus
 * staff invitations and billing. Without this check any reviewer could
 * hire, which is the quiet kind of privilege escalation: nothing looks
 * broken, the agency simply grows people nobody senior approved.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("isAgencyOwner", async () => {
  const { inArray } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { orgMembers, organisations, profiles } = await import("@/lib/db/schema");
  const { isAgencyOwner } = await import("@/lib/data/organisations");

  const OWNER = "test_owner_check_owner";
  const REVIEWER = "test_owner_check_reviewer";
  const OUTSIDER = "test_owner_check_outsider";
  const IDS = [OWNER, REVIEWER, OUTSIDER];
  // A prefix of this suite's own. These were `…0e0001`/`…0e0002`, which
  // `payments.test.ts` also claims — and claims exclusively, in a comment
  // asserting no other file uses them. Two suites inserting the same
  // organisation ids only collide when they overlap, so it stayed hidden
  // until a third database suite shifted the scheduling: the loser's
  // `afterEach` then fails deleting an organisation whose applications
  // the winner still holds, and the failure surfaces in whichever file
  // happened to run second.
  const ORG = "00000000-0000-4000-8000-000000110001";
  const OTHER_ORG = "00000000-0000-4000-8000-000000110002";

  beforeEach(async () => {
    await db.insert(profiles).values([
      { id: OWNER, email: "oc-owner@test.invalid", fullName: "Amara" },
      { id: REVIEWER, email: "oc-reviewer@test.invalid", fullName: "Chidi" },
      { id: OUTSIDER, email: "oc-outsider@test.invalid", fullName: "Sade" },
    ]);
    await db.insert(organisations).values([
      { id: ORG, name: "Owner Check Agency" },
      { id: OTHER_ORG, name: "Other Agency" },
    ]);
    await db.insert(orgMembers).values([
      { orgId: ORG, userId: OWNER, role: "owner" },
      { orgId: ORG, userId: REVIEWER, role: "reviewer" },
      { orgId: OTHER_ORG, userId: OUTSIDER, role: "owner" },
    ]);
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, IDS));
    await db.delete(organisations).where(inArray(organisations.id, [ORG, OTHER_ORG]));
  });

  it("is true for the agency's owner", async () => {
    expect(await isAgencyOwner(OWNER, ORG)).toBe(true);
  });

  it("is false for a reviewer at the same agency", async () => {
    expect(await isAgencyOwner(REVIEWER, ORG)).toBe(false);
  });

  it("is false for an owner of a different agency", async () => {
    // Seniority does not travel between tenants.
    expect(await isAgencyOwner(OUTSIDER, ORG)).toBe(false);
  });

  it("is false for somebody with no membership at all", async () => {
    expect(await isAgencyOwner("test_owner_check_nobody", ORG)).toBe(false);
  });
});

/**
 * Who appears on the agency's client roster.
 *
 * `handlesCase` narrowed a case to its holder and the director in #58,
 * but the roster kept listing every case in the agency and linking each
 * row to a screen that answers 404 for most of them. The list and the
 * permission have to agree, and this is the list agreeing: a reviewer
 * sees the pool plus their own work, a director sees the whole book.
 */
describe.skipIf(!process.env.DATABASE_URL)("listOrgRoster", async () => {
  const { inArray } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { applications, orgMembers, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { countOrgClients, listOrgRoster } = await import(
    "@/lib/data/organisations"
  );
  type Actor = import("@/lib/auth/policy").Actor;

  const REVIEWER = "test_roster_reviewer";
  const COLLEAGUE = "test_roster_colleague";
  const DIRECTOR = "test_roster_director";
  const T_UNHELD = "test_roster_t_unheld";
  const T_MINE = "test_roster_t_mine";
  const T_THEIRS = "test_roster_t_theirs";
  const IDS = [REVIEWER, COLLEAGUE, DIRECTOR, T_UNHELD, T_MINE, T_THEIRS];

  const ORG = "00000000-0000-4000-8000-0000000f0001";

  /** An agency member, shaped as `getActor` builds one. */
  const member = (userId: string, role: "reviewer" | "owner"): Actor => ({
    userId,
    role: "org_member",
    staffRole: null,
    orgIds: [ORG],
    orgs: [{ orgId: ORG, role }],
  });

  const refs = async (actor: Actor) =>
    (await listOrgRoster(actor)).map((r) => r.caseRef).sort();

  let unheldRef = "";
  let mineRef = "";
  let theirsRef = "";

  beforeEach(async () => {
    await db.insert(organisations).values({ id: ORG, name: "Roster agency" });
    await db.insert(profiles).values([
      { id: REVIEWER, email: "rr-reviewer@test.invalid", fullName: "Chidi" },
      { id: COLLEAGUE, email: "rr-colleague@test.invalid", fullName: "Ngozi" },
      { id: DIRECTOR, email: "rr-director@test.invalid", fullName: "Emeka" },
      { id: T_UNHELD, email: "rr-t-unheld@test.invalid", fullName: "Ada" },
      { id: T_MINE, email: "rr-t-mine@test.invalid", fullName: "Bola" },
      { id: T_THEIRS, email: "rr-t-theirs@test.invalid", fullName: "Sade" },
    ]);
    await db.insert(orgMembers).values([
      { orgId: ORG, userId: REVIEWER, role: "reviewer" },
      { orgId: ORG, userId: COLLEAGUE, role: "reviewer" },
      { orgId: ORG, userId: DIRECTOR, role: "owner" },
    ]);

    const rows = await db
      .insert(applications)
      .values([
        { orgId: ORG, travelerId: T_UNHELD, status: "submitted" },
        { orgId: ORG, travelerId: T_MINE, status: "submitted", assigneeId: REVIEWER },
        { orgId: ORG, travelerId: T_THEIRS, status: "submitted", assigneeId: COLLEAGUE },
      ])
      .returning({ id: applications.id, caseRef: applications.caseRef });

    [unheldRef, mineRef, theirsRef] = rows.map((r) => r.caseRef);
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, IDS));
    await db.delete(organisations).where(inArray(organisations.id, [ORG]));
  });

  it("shows a reviewer the pool and their own cases", async () => {
    expect(await refs(member(REVIEWER, "reviewer"))).toEqual(
      [unheldRef, mineRef].sort()
    );
  });

  /**
   * The whole point. This row links to a case screen that calls
   * `notFound()` for this reviewer, so listing it offered a dead end and
   * named a colleague's client while doing it.
   */
  it("hides a case a colleague is holding", async () => {
    expect(await refs(member(REVIEWER, "reviewer"))).not.toContain(theirsRef);
  });

  it("shows the director the whole book", async () => {
    expect(await refs(member(DIRECTOR, "owner"))).toEqual(
      [unheldRef, mineRef, theirsRef].sort()
    );
  });

  /**
   * Seat usage is the agency's number, not the viewer's.
   *
   * The dashboard divides this by `seats_purchased`, so scoping it the
   * way the roster is scoped would show a reviewer "1 of 10 used" for an
   * agency running three cases — a billing figure that changes depending
   * on who is looking at it. A count reveals no client, so there is
   * nothing here for `handlesCase` to protect.
   */
  it("counts every case the agency holds, whoever is asking", async () => {
    expect(await countOrgClients([ORG])).toBe(3);
  });

  it("counts nothing for no agency", async () => {
    expect(await countOrgClients([])).toBe(0);
  });

  it("shows nothing to someone with no agency", async () => {
    const stranger: Actor = {
      userId: "test_roster_stranger",
      role: "org_member",
      staffRole: null,
      orgIds: [],
      orgs: [],
    };

    expect(await listOrgRoster(stranger)).toEqual([]);
  });
});
