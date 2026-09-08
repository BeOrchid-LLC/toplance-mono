import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

/**
 * The KYB file, and the transaction that decides whether a business is
 * let in.
 *
 * What these pin down is `activateAgency`, because it is the only write
 * here that cannot be undone by doing the opposite thing. Its three
 * refusals — incomplete checklist, no director to write to, already
 * open — are each a real path somebody reaches on a Tuesday, not
 * defensive branches: a colleague un-verifies a row while a tab is
 * stale; `provisionTenant` seats the invitee as a reviewer and nobody
 * promotes them; two admins click the same button.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("agency KYB", async () => {
  const { db } = await import("@/lib/db/client");
  const { kybRequirements, orgMembers, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const {
    activateAgency,
    getAgencyKyb,
    kybQueue,
    seedKybRequirements,
    setRequirementState,
  } = await import("@/lib/data/kyb");
  const { KYB_REQUIREMENTS } = await import("@/lib/domain/kyb");

  // Fixed ids no other suite uses, so two files running against the same
  // database cannot delete each other's rows.
  const SEATED = "00000000-0000-4000-8000-0000000b0001";
  const OWNERLESS = "00000000-0000-4000-8000-0000000b0002";
  const DIRECTOR = "test_kyb_director";
  const REVIEWER = "test_kyb_reviewer";

  const ORGS = [SEATED, OWNERLESS];
  const PEOPLE = [DIRECTOR, REVIEWER];

  /** Mark every requirement on one agency verified, as an admin would. */
  async function verifyAll(orgId: string) {
    for (const requirement of KYB_REQUIREMENTS) {
      await setRequirementState({
        orgId,
        docKey: requirement.docKey,
        state: "verified",
        note: null,
        reviewedBy: REVIEWER,
      });
    }
  }

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values([
        {
          id: DIRECTOR,
          email: "director@kyb.invalid",
          fullName: "Ada Director",
          role: "org_member",
        },
        {
          id: REVIEWER,
          email: "staff@kyb.invalid",
          fullName: "Bo Reviewer",
          role: "staff",
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(organisations)
      .values([
        { id: SEATED, name: "Seated Agency" },
        // No owner, and no billing contact either — the shape
        // `provisionTenant` leaves behind before somebody promotes the
        // invitee it sent the link to.
        { id: OWNERLESS, name: "Ownerless Agency" },
      ])
      .onConflictDoNothing();

    await db
      .insert(orgMembers)
      .values([{ orgId: SEATED, userId: DIRECTOR, role: "owner" }])
      .onConflictDoNothing();

    for (const orgId of ORGS) await seedKybRequirements(db, orgId);
  });

  afterEach(async () => {
    await db.delete(kybRequirements).where(inArray(kybRequirements.orgId, ORGS));
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, ORGS));
    await db.delete(organisations).where(inArray(organisations.id, ORGS));
    await db.delete(profiles).where(inArray(profiles.id, PEOPLE));
  });

  describe("seedKybRequirements", () => {
    it("writes the whole checklist, in order", async () => {
      const agency = await getAgencyKyb(SEATED);

      expect(agency?.requirements.map((r) => r.docKey)).toEqual(
        KYB_REQUIREMENTS.map((r) => r.docKey)
      );
      expect(agency?.progress).toEqual({ verified: 0, total: 6, canActivate: false });
    });

    it("runs twice without clobbering a verdict somebody took", async () => {
      // The backfill and a fresh provision can both reach the same
      // agency. `onConflictDoNothing` is what makes that safe, and
      // "safe" has to mean the existing row is left exactly as it was —
      // not re-inserted at `not_started`.
      await setRequirementState({
        orgId: SEATED,
        docKey: "operating_licence",
        state: "verified",
        note: "Checked against the registry.",
        reviewedBy: REVIEWER,
      });

      await seedKybRequirements(db, SEATED);

      const agency = await getAgencyKyb(SEATED);
      const licence = agency?.requirements.find(
        (r) => r.docKey === "operating_licence"
      );

      expect(licence?.state).toBe("verified");
      expect(licence?.note).toBe("Checked against the registry.");
      expect(agency?.requirements).toHaveLength(6);
    });
  });

  describe("setRequirementState", () => {
    it("stamps who decided, and clears it when the row is un-decided", async () => {
      await setRequirementState({
        orgId: SEATED,
        docKey: "director_id",
        state: "rejected",
        note: "Expired in March.",
        reviewedBy: REVIEWER,
      });

      let row = (await getAgencyKyb(SEATED))?.requirements.find(
        (r) => r.docKey === "director_id"
      );
      expect(row?.state).toBe("rejected");
      expect(row?.reviewedByName).toBe("Bo Reviewer");
      expect(row?.checkedAt).not.toBeNull();

      // Back to `in_review` un-decides it. A `checked_at` left standing
      // under that would read as "somebody judged this" beside a state
      // saying nobody has.
      await setRequirementState({
        orgId: SEATED,
        docKey: "director_id",
        state: "in_review",
        note: null,
        reviewedBy: REVIEWER,
      });

      row = (await getAgencyKyb(SEATED))?.requirements.find(
        (r) => r.docKey === "director_id"
      );
      expect(row?.checkedAt).toBeNull();
      expect(row?.reviewedByName).toBeNull();
    });

    it("refuses a requirement that is not on this agency's checklist", async () => {
      const result = await setRequirementState({
        orgId: SEATED,
        docKey: "not_a_requirement",
        state: "verified",
        note: null,
        reviewedBy: REVIEWER,
      });

      expect(result).toEqual({ error: "requirement_not_found" });
    });
  });

  describe("kybQueue", () => {
    it("separates waiting-on-them from waiting-on-us", async () => {
      await setRequirementState({
        orgId: SEATED,
        docKey: "operating_licence",
        state: "in_review",
        note: null,
        reviewedBy: REVIEWER,
      });

      const rows = await kybQueue();
      expect(rows.find((r) => r.orgId === SEATED)?.standing).toBe("in_review");
      expect(rows.find((r) => r.orgId === OWNERLESS)?.standing).toBe("not_started");
    });

    it("calls a full checklist ready, and an activated agency activated", async () => {
      await verifyAll(SEATED);
      expect((await kybQueue()).find((r) => r.orgId === SEATED)?.standing).toBe("ready");

      await activateAgency(SEATED);
      expect((await kybQueue()).find((r) => r.orgId === SEATED)?.standing).toBe(
        "activated"
      );
    });
  });

  describe("activateAgency", () => {
    it("refuses while a requirement is unverified, and writes nothing", async () => {
      const result = await activateAgency(SEATED);

      expect(result).toEqual({ error: "kyb_incomplete" });

      const [org] = await db
        .select({ activatedAt: organisations.activatedAt })
        .from(organisations)
        .where(eq(organisations.id, SEATED));
      expect(org.activatedAt).toBeNull();
    });

    it("refuses a rejected row as firmly as a missing one", async () => {
      await verifyAll(SEATED);
      await setRequirementState({
        orgId: SEATED,
        docKey: "bank_account",
        state: "rejected",
        note: "Personal account, not the company's.",
        reviewedBy: REVIEWER,
      });

      expect(await activateAgency(SEATED)).toEqual({ error: "kyb_incomplete" });
    });

    it("refuses when there is no director to write to", async () => {
      // `provisionTenant` is two-step by design — the invitee joins as a
      // reviewer and somebody promotes them afterwards — so a fully
      // verified agency with no owner is a real state. Activating anyway
      // would open a console behind a paywall nobody was invited
      // through.
      await verifyAll(OWNERLESS);

      expect(await activateAgency(OWNERLESS)).toEqual({ error: "no_recipient" });

      const [org] = await db
        .select({ activatedAt: organisations.activatedAt })
        .from(organisations)
        .where(eq(organisations.id, OWNERLESS));
      expect(org.activatedAt).toBeNull();
    });

    it("falls back to the billing contact when no owner is seated", async () => {
      await db
        .update(organisations)
        .set({ billingContact: "accounts@ownerless.invalid" })
        .where(eq(organisations.id, OWNERLESS));
      await verifyAll(OWNERLESS);

      const result = await activateAgency(OWNERLESS);

      expect(result).toMatchObject({
        ok: true,
        alreadyActivated: false,
        recipient: { email: "accounts@ownerless.invalid", fullName: null },
      });
    });

    it("names the owner as the recipient and opens the console", async () => {
      await verifyAll(SEATED);

      const result = await activateAgency(SEATED);

      expect(result).toMatchObject({
        ok: true,
        alreadyActivated: false,
        name: "Seated Agency",
        recipient: { email: "director@kyb.invalid", fullName: "Ada Director" },
      });

      const [org] = await db
        .select({ activatedAt: organisations.activatedAt })
        .from(organisations)
        .where(eq(organisations.id, SEATED));
      expect(org.activatedAt).not.toBeNull();
    });

    it("sends one letter however many admins press the button", async () => {
      await verifyAll(SEATED);
      await activateAgency(SEATED);

      // The second caller meant the same thing and got it — so `ok`,
      // not an error. But it carries no recipient, which is what stops
      // the action above it sending a second letter.
      const second = await activateAgency(SEATED);
      expect(second).toEqual({ ok: true, alreadyActivated: true });
    });

    it("does not re-close on an agency whose row is edited afterwards", async () => {
      await verifyAll(SEATED);
      await activateAgency(SEATED);

      // A licence renewed a year later is re-filed and re-judged. That
      // is a requirement changing state, not a console closing —
      // closing one is `suspendTenant`.
      await setRequirementState({
        orgId: SEATED,
        docKey: "operating_licence",
        state: "in_review",
        note: null,
        reviewedBy: REVIEWER,
      });

      const agency = await getAgencyKyb(SEATED);
      expect(agency?.standing).toBe("activated");
      expect(agency?.activatedAt).not.toBeNull();
    });

    it("refuses an agency that does not exist", async () => {
      expect(await activateAgency("00000000-0000-4000-8000-0000000b9999")).toEqual({
        error: "agency_not_found",
      });
    });
  });

  describe("the boundary", () => {
    it("keeps one agency's checklist out of another's", async () => {
      await setRequirementState({
        orgId: SEATED,
        docKey: "operating_licence",
        state: "verified",
        note: null,
        reviewedBy: REVIEWER,
      });

      const [row] = await db
        .select({ state: kybRequirements.state })
        .from(kybRequirements)
        .where(
          and(
            eq(kybRequirements.orgId, OWNERLESS),
            eq(kybRequirements.docKey, "operating_licence")
          )
        );

      expect(row.state).toBe("not_started");
    });
  });
});
