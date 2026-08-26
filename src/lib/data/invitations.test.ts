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
    createInvitation,
    getInvitationPreview,
    listInvitations,
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
      await makeProfile(travelerId);

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
      await makeProfile(travelerId);
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
      await makeProfile(travelerId);

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
      await makeProfile(travelerId);

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ error: "This invitation has been revoked." });
    });

    it("refuses an already-accepted invitation", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_5";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "twice@example.com");

      const firstTraveler = "test_accept_traveller_5a";
      await makeProfile(firstTraveler);
      await acceptInvitationTx(invitation.token, firstTraveler);

      const secondTraveler = "test_accept_traveller_5b";
      await makeProfile(secondTraveler);
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
      await makeProfile(travelerId);

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
      await makeProfile(travelerId);
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

    it("re-accepting the same org for an already-sponsored traveller is a no-op success", async () => {
      const orgId = await makeOrg("Acme Logistics Ltd");
      const inviterId = "test_accept_inviter_8";
      await makeProfile(inviterId, { role: "org_member" });
      const invitation = await invite(orgId, inviterId, "same-org@example.com");

      const travelerId = "test_accept_traveller_8";
      await makeProfile(travelerId);
      await db.insert(applications).values({ travelerId, orgId });

      const result = await acceptInvitationTx(invitation.token, travelerId);
      expect(result).toEqual({ ok: true, orgId });
    });
  });
});
