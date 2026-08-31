import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * Invitations end-to-end: an employer invites a traveller by email, and
 * accepting attaches the org to their application. `acceptInvitationTx`
 * gets the concurrency treatment `submitApplicationTx` and
 * `createOrganisationTx` got — one transaction, the invitation row
 * locked for its duration — because the same double-click and
 * two-tabs failure modes apply here: the tab that lost the token select
 * lock must read the winner's write, not race it.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("invitations", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, invitations, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const {
    acceptInvitationTx,
    checkInvitedAddress,
    createInvitation,
    getInvitationPreview,
    listInvitations,
    provisionInvitedProfile,
    resendableInvitation,
    revokeInvitation,
  } = await import("@/lib/data/invitations");

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

  async function makeOrg(name: string) {
    const [org] = await db
      .insert(organisations)
      .values({ name })
      .returning({ id: organisations.id });
    createdOrgIds.push(org.id);
    return org.id;
  }

  afterEach(async () => {
    if (createdOrgIds.length) {
      await db.delete(organisations).where(inArray(organisations.id, createdOrgIds));
      createdOrgIds.length = 0;
    }
    if (createdProfileIds.length) {
      // Cascades to org_members and applications for these profiles.
      // invitations.invitedBy / acceptedBy are `set null` on delete, not
      // cascaded — the invitation row itself is only removed with its org.
      await db.delete(profiles).where(inArray(profiles.id, createdProfileIds));
      createdProfileIds.length = 0;
    }
  });

  async function applicationOf(travelerId: string) {
    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.travelerId, travelerId));
    return row;
  }

  async function invitationOf(id: string) {
    const [row] = await db.select().from(invitations).where(eq(invitations.id, id));
    return row;
  }

  describe("createInvitation", () => {
    it("creates a pending invitation with a token", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_invite_inviter_1";
      await makeProfile(inviterId, { role: "org_member" });

      const result = await createInvitation(orgId, inviterId, {
        email: "New.Hire@Example.com",
        fullName: "Ada Lovelace",
      });

      expect(result).toMatchObject({ ok: true });
      if (!("ok" in result)) throw new Error("unreachable");
      expect(result.invitation.email).toBe("new.hire@example.com");
      expect(result.invitation.status).toBe("pending");
      expect(result.invitation.token).toMatch(/^[0-9a-f]{48}$/);
    });

    it("refuses an invalid email shape", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_invite_inviter_2";
      await makeProfile(inviterId, { role: "org_member" });

      const result = await createInvitation(orgId, inviterId, {
        email: "not-an-email",
      });

      expect(result).toEqual({ error: "Enter a valid email address." });
    });

    it("refuses a duplicate pending invitation for the same org and email", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_invite_inviter_3";
      await makeProfile(inviterId, { role: "org_member" });

      const first = await createInvitation(orgId, inviterId, {
        email: "dupe@example.com",
      });
      expect(first).toMatchObject({ ok: true });

      const second = await createInvitation(orgId, inviterId, {
        email: "dupe@example.com",
      });
      expect(second).toEqual({
        error: "There is already a pending invitation for that address.",
      });
    });
  });

  describe("listInvitations", () => {
    it("lists newest first and marks an overdue pending row as expired without writing", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_invite_inviter_4";
      await makeProfile(inviterId, { role: "org_member" });

      const older = await createInvitation(orgId, inviterId, {
        email: "older@example.com",
      });
      const newer = await createInvitation(orgId, inviterId, {
        email: "newer@example.com",
      });
      if (!("ok" in older) || !("ok" in newer)) throw new Error("unreachable");

      await db
        .update(invitations)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(invitations.id, older.invitation.id));

      const rows = await listInvitations(orgId);
      expect(rows.map((r) => r.email)).toEqual(["newer@example.com", "older@example.com"]);
      expect(rows.find((r) => r.email === "older@example.com")?.status).toBe("expired");

      // The read never writes: the stored column is untouched.
      const stored = await invitationOf(older.invitation.id);
      expect(stored.status).toBe("pending");
    });

    it("never selects the bearer token", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_invite_inviter_no_token";
      await makeProfile(inviterId, { role: "org_member" });

      await createInvitation(orgId, inviterId, { email: "no-token-leak@example.com" });

      const rows = await listInvitations(orgId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).not.toHaveProperty("token");
    });
  });

  describe("revokeInvitation", () => {
    it("revokes a pending invitation scoped to its own org", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_invite_inviter_5";
      await makeProfile(inviterId, { role: "org_member" });

      const created = await createInvitation(orgId, inviterId, {
        email: "revoke-me@example.com",
      });
      if (!("ok" in created)) throw new Error("unreachable");

      const result = await revokeInvitation(orgId, created.invitation.id);
      expect(result).toEqual({ ok: true });

      const stored = await invitationOf(created.invitation.id);
      expect(stored.status).toBe("revoked");
    });

    it("revokes nothing when scoped to the wrong org", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const otherOrgId = await makeOrg("Other Co");
      const inviterId = "test_invite_inviter_6";
      await makeProfile(inviterId, { role: "org_member" });

      const created = await createInvitation(orgId, inviterId, {
        email: "scoped@example.com",
      });
      if (!("ok" in created)) throw new Error("unreachable");

      const result = await revokeInvitation(otherOrgId, created.invitation.id);
      expect(result).toEqual({ error: "That invitation can no longer be revoked." });

      const stored = await invitationOf(created.invitation.id);
      expect(stored.status).toBe("pending");
    });
  });

  describe("getInvitationPreview", () => {
    it("returns the org name and details for a live invitation", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_preview_inviter_1";
      await makeProfile(inviterId, { role: "org_member" });

      const created = await createInvitation(orgId, inviterId, {
        email: "preview@example.com",
        fullName: "Ada Lovelace",
        destinationIso: "gb",
        purpose: "work",
      });
      if (!("ok" in created)) throw new Error("unreachable");

      const preview = await getInvitationPreview(created.invitation.token);
      expect(preview).toEqual({
        orgName: "Acme Logistics Ltd",
        fullName: "Ada Lovelace",
        destinationIso: "gb",
        purpose: "work",
        status: "pending",
      });
    });

    it("returns null for an unknown token", async () => {
      expect(await getInvitationPreview("0".repeat(48))).toBeNull();
    });

    it("reads an overdue pending row as expired without writing", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_preview_inviter_2";
      await makeProfile(inviterId, { role: "org_member" });

      const created = await createInvitation(orgId, inviterId, {
        email: "overdue-preview@example.com",
      });
      if (!("ok" in created)) throw new Error("unreachable");
      await db
        .update(invitations)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(invitations.id, created.invitation.id));

      const preview = await getInvitationPreview(created.invitation.token);
      expect(preview?.status).toBe("expired");

      const stored = await invitationOf(created.invitation.id);
      expect(stored.status).toBe("pending");
    });

    it("reports a revoked invitation's status without leaking a live one", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_preview_inviter_3";
      await makeProfile(inviterId, { role: "org_member" });

      const created = await createInvitation(orgId, inviterId, {
        email: "revoked-preview@example.com",
      });
      if (!("ok" in created)) throw new Error("unreachable");
      await revokeInvitation(orgId, created.invitation.id);

      const preview = await getInvitationPreview(created.invitation.token);
      expect(preview?.status).toBe("revoked");
    });
  });

  describe("checkInvitedAddress", () => {
    /**
     * The question the sign-up form should ask before it spends
     * anything.
     *
     * `roleFor` already refuses to mint a traveller for an address the
     * invitation does not name — but by the time it runs, Clerk has
     * created an account and the emailed code has been used, and the
     * form the visitor would retype into is gone. Asking the same
     * question first is what turns a typo into a corrected field rather
     * than a dead end.
     *
     * Three answers rather than a boolean: the two failures want
     * different sentences, and a caller holding only `false` would have
     * to guess which one it was looking at.
     */
    const EMAIL = "invited@test.invalid";

    async function invite(
      overrides: Partial<typeof invitations.$inferInsert> = {}
    ) {
      const orgId = await makeOrg("Check Address Test Org");
      const [row] = await db
        .insert(invitations)
        .values({ orgId, email: EMAIL, ...overrides })
        .returning();
      return row;
    }

    it("refuses an address the invitation does not name", async () => {
      const invitation = await invite();
      expect(
        await checkInvitedAddress(invitation.token, "someone.else@test.invalid")
      ).toBe("mismatch");
    });
  });

  describe("provisionInvitedProfile", () => {
    /**
     * The safety net under a sign-up that got torn down.
     *
     * `completeProfile` runs in the browser, and Clerk activating the new
     * session navigates the page out from under it — the write can be
     * cancelled in flight. That was survivable while `getProfile`
     * provisioned a row for anybody; it is not now that it does not. This
     * is the same write, done server-side on the page the token names, so
     * it cannot be interrupted by a navigation.
     *
     * It is not a second door. It writes only what the invitation already
     * entitles that email to, and never touches an existing row.
     */
    const USER = "test_provision_invited";

    async function profileOf(id: string) {
      const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
      return row;
    }

    it("writes the traveller the invitation names", async () => {
      const orgId = await makeOrg("Provision Test Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid", fullName: "Ada Nwosu" })
        .returning();
      createdProfileIds.push(USER);

      expect(
        await provisionInvitedProfile(invitation.token, USER, "invitee@test.invalid")
      ).toBe(true);

      const profile = await profileOf(USER);
      expect(profile.role).toBe("traveler");
      expect(profile.fullName).toBe("Ada Nwosu");
      expect(profile.email).toBe("invitee@test.invalid");
    });

    it("prefers the name the traveller gave over the one the employer typed", async () => {
      // The employer types a name into the invite dialog; the traveller
      // types the one in their passport. `signUp.create` hands theirs to
      // Clerk before the session exists, so it is the one name on this
      // path that cannot be lost to a cancelled write — and it is the
      // name the intake agent greets them by.
      const orgId = await makeOrg("Provision Name Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid", fullName: "A. Nwosu" })
        .returning();
      createdProfileIds.push(USER);

      await provisionInvitedProfile(
        invitation.token,
        USER,
        "invitee@test.invalid",
        "Adaeze Nwosu"
      );

      expect((await profileOf(USER)).fullName).toBe("Adaeze Nwosu");
    });

    it("falls back to the invitation when Clerk holds no name", async () => {
      const orgId = await makeOrg("Provision Fallback Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid", fullName: "Ada Nwosu" })
        .returning();
      createdProfileIds.push(USER);

      await provisionInvitedProfile(invitation.token, USER, "invitee@test.invalid", "  ");

      expect((await profileOf(USER)).fullName).toBe("Ada Nwosu");
    });

    it("matches the address case-insensitively, as the sign-up gate does", async () => {
      const orgId = await makeOrg("Provision Case Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "mixed@test.invalid" })
        .returning();
      createdProfileIds.push(USER);

      expect(
        await provisionInvitedProfile(invitation.token, USER, "Mixed@Test.Invalid")
      ).toBe(true);
    });

    it("refuses an address the invitation was not sent to", async () => {
      const orgId = await makeOrg("Provision Wrong Email Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid" })
        .returning();

      expect(
        await provisionInvitedProfile(invitation.token, USER, "someone.else@test.invalid")
      ).toBe(false);
      expect(await profileOf(USER)).toBeUndefined();
    });

    it("refuses a revoked invitation", async () => {
      const orgId = await makeOrg("Provision Revoked Org");
      const [invitation] = await db
        .insert(invitations)
        .values({
          orgId,
          email: "invitee@test.invalid",
          status: "revoked",
        })
        .returning();

      expect(
        await provisionInvitedProfile(invitation.token, USER, "invitee@test.invalid")
      ).toBe(false);
      expect(await profileOf(USER)).toBeUndefined();
    });

    it("refuses a token matching nothing", async () => {
      expect(
        await provisionInvitedProfile("no-such-token", USER, "invitee@test.invalid")
      ).toBe(false);
      expect(await profileOf(USER)).toBeUndefined();
    });

    it("never overwrites a profile that already exists", async () => {
      // An employer or a staff account opening an invitation link must
      // not be quietly demoted to a traveller by the safety net.
      const orgId = await makeOrg("Provision Existing Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "existing@test.invalid" })
        .returning();
      await makeProfile(USER, { email: "existing@test.invalid", role: "org_member" });

      await provisionInvitedProfile(invitation.token, USER, "existing@test.invalid");

      const profile = await profileOf(USER);
      expect(profile.role).toBe("org_member");
      expect(profile.fullName).toBe("Test Person");
    });
  });

  describe("resendableInvitation", () => {
    /**
     * What a resend needs and nothing else: the token, so the same link
     * goes out again rather than a second live one, plus the address and
     * name the email is addressed to.
     *
     * It exists because `listInvitations` deliberately never selects the
     * token — the roster has no business holding the bearer credential —
     * which leaves an employer whose invitation email silently failed
     * with no way to reach the link at all. Scoped to the caller's own
     * org in the same query as the id, exactly as `revokeInvitation` is:
     * the guard checks membership, this checks the row belongs to that
     * org, and a mismatch must return nothing rather than another org's
     * live token.
     */
    it("returns the token, address and name for a live invitation", async () => {
      const orgId = await makeOrg("Resend Live Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid", fullName: "Ada Nwosu" })
        .returning();

      expect(await resendableInvitation(orgId, invitation.id)).toEqual({
        token: invitation.token,
        email: "invitee@test.invalid",
        fullName: "Ada Nwosu",
      });
    });

    it("returns nothing for an invitation belonging to another org", async () => {
      const orgId = await makeOrg("Resend Owner Org");
      const otherOrgId = await makeOrg("Resend Stranger Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid" })
        .returning();

      expect(await resendableInvitation(otherOrgId, invitation.id)).toBeNull();
    });

    it("returns nothing for a revoked invitation", async () => {
      const orgId = await makeOrg("Resend Revoked Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid", status: "revoked" })
        .returning();

      expect(await resendableInvitation(orgId, invitation.id)).toBeNull();
    });

    it("returns nothing for one already accepted", async () => {
      const orgId = await makeOrg("Resend Accepted Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid", status: "accepted" })
        .returning();

      expect(await resendableInvitation(orgId, invitation.id)).toBeNull();
    });

    it("returns nothing once expired — that one needs inviting again", async () => {
      const orgId = await makeOrg("Resend Expired Org");
      const [invitation] = await db
        .insert(invitations)
        .values({
          orgId,
          email: "invitee@test.invalid",
          expiresAt: new Date(Date.now() - 1000),
        })
        .returning();

      expect(await resendableInvitation(orgId, invitation.id)).toBeNull();
    });

    it("is a read — the token and expiry are untouched", async () => {
      // Rotating the token on a resend would kill a first email that was
      // merely slow, and extending the expiry would quietly lengthen the
      // window a bearer link is live for. Neither is this function's call.
      const orgId = await makeOrg("Resend Read Only Org");
      const [invitation] = await db
        .insert(invitations)
        .values({ orgId, email: "invitee@test.invalid" })
        .returning();

      await resendableInvitation(orgId, invitation.id);

      const after = await invitationOf(invitation.id);
      expect(after.token).toBe(invitation.token);
      expect(after.expiresAt).toEqual(invitation.expiresAt);
      expect(after.status).toBe("pending");
    });
  });

  describe("acceptInvitationTx", () => {
    async function invite(orgId: string, inviterId: string, email: string) {
      const created = await createInvitation(orgId, inviterId, { email });
      if (!("ok" in created)) throw new Error("unreachable");
      return created.invitation;
    }

    it("attaches the org when the traveller has no application yet", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_1";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "no-app-yet@example.com");

      const travelerId = "test_accept_traveller_1";
      await makeProfile(travelerId, { email: "no-app-yet@example.com" });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ ok: true, orgId });

      const app = await applicationOf(travelerId);
      expect(app.orgId).toBe(orgId);

      const stored = await invitationOf(invitation.id);
      expect(stored.status).toBe("accepted");
      expect(stored.acceptedBy).toBe(travelerId);
      expect(stored.acceptedAt).not.toBeNull();
    });

    it("attaches the org when the traveller's application already exists", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_2";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "has-app-already@example.com");

      const travelerId = "test_accept_traveller_2";
      await makeProfile(travelerId, { email: "has-app-already@example.com" });
      await db.insert(applications).values({ travelerId });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ ok: true, orgId });

      const app = await applicationOf(travelerId);
      expect(app.orgId).toBe(orgId);
    });

    it("flips a pending invitation past its expiry to expired and refuses", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_3";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "overdue@example.com");
      await db
        .update(invitations)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(invitations.id, invitation.id));

      const travelerId = "test_accept_traveller_3";
      await makeProfile(travelerId, { email: "overdue@example.com" });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ error: "This invitation has expired." });

      const stored = await invitationOf(invitation.id);
      expect(stored.status).toBe("expired");

      const app = await applicationOf(travelerId);
      expect(app).toBeUndefined();
    });

    it("refuses a revoked invitation", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_4";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "revoked@example.com");
      await revokeInvitation(orgId, invitation.id);

      const travelerId = "test_accept_traveller_4";
      await makeProfile(travelerId, { email: "revoked@example.com" });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ error: "This invitation has been revoked." });
    });

    it("refuses an already-accepted invitation", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_5";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "twice@example.com");

      const firstTraveler = "test_accept_traveller_5a";
      await makeProfile(firstTraveler, { email: "twice@example.com" });
      await acceptInvitationTx(invitation.token, firstTraveler);

      const secondTraveler = "test_accept_traveller_5b";
      await makeProfile(secondTraveler, { email: "twice@example.com" });
      const result = await acceptInvitationTx(invitation.token, secondTraveler);

      expect(result).toEqual({ error: "This invitation has already been accepted." });
      const app = await applicationOf(secondTraveler);
      expect(app).toBeUndefined();
    });

    it("refuses an unknown token", async () => {
      const travelerId = "test_accept_traveller_unknown";
      await makeProfile(travelerId);

      const result = await acceptInvitationTx("0".repeat(48), travelerId);
      expect(result).toEqual({ error: "This invitation link is not valid." });
    });

    it("accepts exactly once when two accepts race on the same token", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_6";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "race@example.com");

      const travelerId = "test_accept_traveller_6";
      await makeProfile(travelerId, { email: "race@example.com" });

      const [first, second] = await Promise.all([
        acceptInvitationTx(invitation.token, travelerId),
        acceptInvitationTx(invitation.token, travelerId),
      ]);

      const outcomes = [first, second];
      expect(outcomes.filter((r) => "ok" in r)).toHaveLength(1);
      expect(outcomes.filter((r) => "error" in r)).toHaveLength(1);

      const app = await applicationOf(travelerId);
      expect(app.orgId).toBe(orgId);
    });

    it("refuses when the traveller is already sponsored by a different organisation", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const otherOrgId = await makeOrg("Other Co");
      const inviterId = "test_accept_inviter_7";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "cross-org@example.com");

      const travelerId = "test_accept_traveller_7";
      await makeProfile(travelerId, { email: "cross-org@example.com" });
      await db.insert(applications).values({ travelerId, orgId: otherOrgId });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({
        error: "This account is already sponsored by another organisation.",
      });

      const app = await applicationOf(travelerId);
      expect(app.orgId).toBe(otherOrgId);

      const stored = await invitationOf(invitation.id);
      expect(stored.status).toBe("pending");
    });

    it("refuses a traveller signed in as a different address", async () => {
      // The invited address is binding. Whoever holds the link is not
      // automatically whoever the employer meant to invite, and the
      // roster names one person — accepting as somebody else would put a
      // name on the employer's list that never belongs to the account
      // doing the work.
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_9";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "invited@example.com");

      const travelerId = "test_accept_traveller_9";
      await makeProfile(travelerId, { email: "someone.else@example.com" });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({
        error: "This invitation was sent to a different email address.",
      });

      // Refused, not consumed: the invitation is still there for the
      // person it names.
      const stored = await invitationOf(invitation.id);
      expect(stored.status).toBe("pending");
      expect(stored.acceptedBy).toBeNull();

      const app = await applicationOf(travelerId);
      expect(app).toBeUndefined();
    });

    it("matches the invited address regardless of case", async () => {
      // `createInvitation` lowercases what the employer typed; Clerk
      // keeps whatever case the traveller signed up with. Neither is
      // wrong, so neither may decide this.
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_10";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "Mixed.Case@Example.com");

      const travelerId = "test_accept_traveller_10";
      await makeProfile(travelerId, { email: "MIXED.CASE@example.com" });

      expect(await acceptInvitationTx(invitation.token, travelerId)).toEqual({
        ok: true,
        orgId,
      });
    });

    it("re-accepting the same org for an already-sponsored traveller is a no-op success", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_8";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "same-org@example.com");

      const travelerId = "test_accept_traveller_8";
      await makeProfile(travelerId, { email: "same-org@example.com" });
      await db.insert(applications).values({ travelerId, orgId });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ ok: true, orgId });
    });
  });
});
