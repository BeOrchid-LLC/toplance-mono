import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * A new employer's first act: name an organisation and become its
 * owner, in one transaction. Before this existed, org rows came only
 * from seed SQL — nobody could sign themselves up.
 *
 * Like `submitApplicationTx`, the function decides nothing about who is
 * signed in; its caller (`createOrganisation` in
 * `@/app/employer/actions.ts`) resolves `userId` from the session.
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
    if (createdOrgIds.length) {
      await db.delete(organisations).where(inArray(organisations.id, createdOrgIds));
      createdOrgIds.length = 0;
    }
    if (createdProfileIds.length) {
      // Cascades to org_members and applications for these profiles.
      await db.delete(profiles).where(inArray(profiles.id, createdProfileIds));
      createdProfileIds.length = 0;
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
      // A traveller or a staff account opening /employer must not be
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
    await db.insert(applications).values({ travelerId: userId });

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
