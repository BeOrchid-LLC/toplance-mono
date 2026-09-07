import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";

/**
 * `vitest.setup.mts` loads a developer's real `.env.local`, which could
 * carry a genuine `RESEND_API_KEY`. Nothing in `.env.local.example` sets
 * one, but a developer's own file might — so rather than trust it stays
 * absent, this suite deletes it up front. Every `notify()` call below is
 * then structurally guaranteed to take the "email skipped" path instead
 * of reaching resend.com.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("notify", async () => {
  delete process.env.RESEND_API_KEY;

  const { db } = await import("@/lib/db/client");
  const { notifications, profiles } = await import("@/lib/db/schema");
  const {
    notify,
    notifyStaff,
    getNotifications,
    unreadNotificationCount,
    markNotificationsRead,
    appUrl,
  } = await import("@/lib/notifications/notify");

  const TRAVELLER = "test_notify_traveller";
  const OTHER = "test_notify_other";
  const STAFF_A = "test_notify_staff_a";
  const STAFF_B = "test_notify_staff_b";

  beforeEach(async () => {
    await db.insert(profiles).values([
      { id: TRAVELLER, email: "notify-traveller@test.invalid", fullName: "Ada" },
      { id: OTHER, email: "notify-other@test.invalid", fullName: "Bola" },
      {
        id: STAFF_A,
        email: "notify-staff-a@test.invalid",
        fullName: "Grace",
        role: "staff",
      },
      {
        id: STAFF_B,
        email: "notify-staff-b@test.invalid",
        fullName: "Nkem",
        role: "staff",
      },
    ]);
  });

  afterEach(async () => {
    // `notifyStaff` fans out to EVERY `role: "staff"` profile — when this
    // suite runs against a developer's dev database, that includes their
    // real account. The fixture profiles' rows vanish with them via the
    // FK cascade below, but rows delivered to real staff would outlive
    // the suite as dead `/ops/cases/1` links in a real bell — so sweep by
    // the fixture case refs, whoever received them.
    await db
      .delete(notifications)
      .where(
        sql`${notifications.payload} ->> 'caseRef' in ('TPL-000001', 'TPL-000002')`
      );
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, OTHER));
    await db.delete(profiles).where(eq(profiles.id, STAFF_A));
    await db.delete(profiles).where(eq(profiles.id, STAFF_B));
  });

  it("writes a row with defaults", async () => {
    await notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") });

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, TRAVELLER));

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("itinerary_ready");
    expect(rows[0].readAt).toBeNull();
    expect(rows[0].payload).toEqual({ url: appUrl("/app") });
  });

  it("never throws when RESEND_API_KEY is unset", async () => {
    expect(process.env.RESEND_API_KEY).toBeUndefined();
    // Reported as sent: the in-app row is written, and skipping the email
    // for want of a key is not a delivery failure.
    await expect(
      notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") })
    ).resolves.toBe(true);
  });

  it("swallows the insert's foreign-key violation when the recipient has no profile row at all", async () => {
    // Not the "select finds nothing" branch inside `notify` — a
    // `recipientId` with no `profiles` row fails earlier, at the insert
    // itself, because `notifications.recipientId` carries a foreign key.
    // This is that DB error being caught, logged and swallowed.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    // Swallowed, but reported as failed — this is the case a caller that
    // counts what it sent, or emits an analytics event claiming a
    // delivery, has to be able to see.
    await expect(
      notify("no_such_profile", "itinerary_ready", { url: appUrl("/app") })
    ).resolves.toBe(false);

    expect(logged).toHaveBeenCalledOnce();

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, "no_such_profile"));
    expect(rows).toHaveLength(0);

    logged.mockRestore();
  });

  it("accumulates across calls, newest first from getNotifications", async () => {
    await notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") });
    await notify(TRAVELLER, "document_flagged", {
      documentName: "Passport",
      reason: "Blurry scan.",
      url: appUrl("/app/documents"),
    });

    const rows = await getNotifications(TRAVELLER);
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe("document_flagged");
    expect(rows[1].kind).toBe("itinerary_ready");
  });

  it("notifyStaff never throws when the staff lookup itself fails", async () => {
    // `submitApplication` calls `notifyStaff` inside the same try block
    // as `submitApplicationTx` and `revalidatePath`, and `toActionError`
    // does not recognise a raw DB error — so if this lookup threw
    // uncaught, a traveller would see a submission error after their
    // submission had already committed. Forcing `db.select` to throw
    // once reproduces exactly the transient-DB-error case.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingSelect = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("connection reset");
    });

    await expect(
      notifyStaff("application_submitted", {
        caseRef: "TPL-000002",
        url: appUrl("/ops/cases/2"),
      })
    ).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledOnce();

    failingSelect.mockRestore();
    logged.mockRestore();
  });

  it("notifyStaff reaches every staff profile and nobody else", async () => {
    await notifyStaff(
      "application_submitted",
      { caseRef: "TPL-000001", url: appUrl("/ops/cases/1") },
      undefined
    );

    expect(await getNotifications(STAFF_A)).toHaveLength(1);
    expect(await getNotifications(STAFF_B)).toHaveLength(1);
    expect(await getNotifications(TRAVELLER)).toHaveLength(0);
  });

  it("unreadNotificationCount counts only unread rows for that recipient", async () => {
    await notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") });
    await notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") });
    await notify(OTHER, "itinerary_ready", { url: appUrl("/app") });

    expect(await unreadNotificationCount(TRAVELLER)).toBe(2);
    expect(await unreadNotificationCount(OTHER)).toBe(1);
  });

  it("markNotificationsRead flips only that recipient's own rows", async () => {
    await notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") });
    await notify(OTHER, "itinerary_ready", { url: appUrl("/app") });

    await markNotificationsRead(TRAVELLER);

    expect(await unreadNotificationCount(TRAVELLER)).toBe(0);
    expect(await unreadNotificationCount(OTHER)).toBe(1);

    const own = await getNotifications(TRAVELLER);
    expect(own.every((n) => n.readAt !== null)).toBe(true);
  });
});

/**
 * Not gated on a database: `appUrl` is pure, and its production branch is
 * the one that decides whether an invitation email ships a working link
 * or a `localhost` one nobody can accept.
 */
describe("appUrl", async () => {
  const { appUrl } = await import("@/lib/notifications/notify");

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds an absolute URL from APP_URL", () => {
    vi.stubEnv("APP_URL", "https://toplance.ca");

    expect(appUrl("/invite/abc123")).toBe("https://toplance.ca/invite/abc123");
  });

  it("falls back to the local dev origin when APP_URL is unset outside production", () => {
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("NODE_ENV", "development");

    expect(appUrl("/invite/abc123")).toBe("http://localhost:3000/invite/abc123");
  });

  it("refuses to build a localhost link in production when APP_URL is unset", () => {
    // The failure this prevents is silent and outward-facing: every
    // invitation email would carry a link to the reader's own machine,
    // and nothing in the app would report it.
    vi.stubEnv("APP_URL", undefined);
    vi.stubEnv("NODE_ENV", "production");

    expect(() => appUrl("/invite/abc123")).toThrow(/APP_URL/);
  });
});

/**
 * The v1.3 tenancy: a case belongs to an agency, and the agency is who
 * hears about it. `notifyStaff` used to carry these events to every
 * BeOrchid profile, with a link to a review screen that no longer
 * exists.
 */
describe.skipIf(!process.env.DATABASE_URL)("notifyAgency", async () => {
  delete process.env.RESEND_API_KEY;

  const { db } = await import("@/lib/db/client");
  const { applications, orgMembers, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { notifyAgency, getNotifications } = await import(
    "@/lib/notifications/notify"
  );

  const TRAVELLER = "test_agencynotify_traveller";
  const REVIEWER = "test_agencynotify_reviewer";
  const RIVAL = "test_agencynotify_rival";
  const COLLEAGUE = "test_agencynotify_colleague";
  const DIRECTOR = "test_agencynotify_director";
  const STAFF = "test_agencynotify_staff";
  /** `applications_traveler_key` is unique, so an orphan case needs its own. */
  const LONE = "test_agencynotify_lone";
  const IDS = [TRAVELLER, REVIEWER, RIVAL, STAFF, LONE, COLLEAGUE, DIRECTOR];

  const ORG = "00000000-0000-4000-8000-0000000a9001";
  const RIVAL_ORG = "00000000-0000-4000-8000-0000000a9002";

  let applicationId = "";

  beforeEach(async () => {
    await db.insert(profiles).values([
      { id: TRAVELLER, email: "an-traveller@test.invalid", fullName: "Ada" },
      { id: REVIEWER, email: "an-reviewer@test.invalid", fullName: "Chidi" },
      { id: RIVAL, email: "an-rival@test.invalid", fullName: "Sade" },
      { id: STAFF, email: "an-staff@test.invalid", fullName: "Grace", role: "staff" },
      { id: LONE, email: "an-lone@test.invalid", fullName: "Tunde" },
      { id: COLLEAGUE, email: "an-colleague@test.invalid", fullName: "Ngozi" },
      { id: DIRECTOR, email: "an-director@test.invalid", fullName: "Emeka" },
    ]);

    await db.insert(organisations).values([
      { id: ORG, name: "Agency of record" },
      { id: RIVAL_ORG, name: "Rival agency" },
    ]);

    await db.insert(orgMembers).values([
      { orgId: ORG, userId: REVIEWER, role: "reviewer" },
      { orgId: ORG, userId: COLLEAGUE, role: "reviewer" },
      { orgId: ORG, userId: DIRECTOR, role: "owner" },
      { orgId: RIVAL_ORG, userId: RIVAL, role: "reviewer" },
    ]);

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, orgId: ORG })
      .returning({ id: applications.id });

    applicationId = app.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, IDS));
    await db.delete(organisations).where(inArray(organisations.id, [ORG, RIVAL_ORG]));
  });

  it("reaches the reviewer at the agency the case belongs to", async () => {
    await notifyAgency(applicationId, "checklist_complete", {
      caseRef: "TPL-000042",
      url: "https://x.test/agency/cases/1",
    });

    const received = await getNotifications(REVIEWER);
    expect(received).toHaveLength(1);
    expect(received[0].kind).toBe("checklist_complete");
  });

  it("reaches nobody at another agency", async () => {
    await notifyAgency(applicationId, "checklist_complete", {
      caseRef: "TPL-000042",
      url: "https://x.test/agency/cases/1",
    });

    expect(await getNotifications(RIVAL)).toHaveLength(0);
  });

  it("reaches no BeOrchid staff — that is the whole point of the change", async () => {
    await notifyAgency(applicationId, "checklist_complete", {
      caseRef: "TPL-000042",
      url: "https://x.test/agency/cases/1",
    });

    expect(await getNotifications(STAFF)).toHaveLength(0);
  });

  // A case with no agency used to need a test here. It is no longer
  // expressible: `applications.org_id` is `not null`, which
  // `schema.test.ts` proves directly. What is left of that path is the
  // missing-application case below.

  /**
   * Who at the agency a case notification is actually for.
   *
   * These carry a deep link to the case, and since #58 `handlesCase`
   * decides who may open one: an unheld case is the whole agency's, a
   * held one is the assignee's and the director's. Notifying past that
   * line sends colleagues a link that answers 404 — which is both a dead
   * end and a statement about a client they are not on.
   */
  describe("once a case is held", () => {
    const claim = (userId: string) =>
      db
        .update(applications)
        .set({ assigneeId: userId })
        .where(eq(applications.id, applicationId));

    const send = () =>
      notifyAgency(applicationId, "checklist_complete", {
        caseRef: "TPL-000042",
        url: "https://x.test/agency/clients/1",
      });

    it("reaches the colleague holding it", async () => {
      await claim(REVIEWER);
      await send();

      expect(await getNotifications(REVIEWER)).toHaveLength(1);
    });

    it("reaches the director, who can open any of the agency's cases", async () => {
      await claim(REVIEWER);
      await send();

      expect(await getNotifications(DIRECTOR)).toHaveLength(1);
    });

    it("reaches no other reviewer, whose link would 404", async () => {
      await claim(REVIEWER);
      await send();

      expect(await getNotifications(COLLEAGUE)).toHaveLength(0);
    });

    it("still reaches everyone while it is unheld", async () => {
      await send();

      expect(await getNotifications(REVIEWER)).toHaveLength(1);
      expect(await getNotifications(COLLEAGUE)).toHaveLength(1);
      expect(await getNotifications(DIRECTOR)).toHaveLength(1);
    });
  });

  it("never throws on an application that does not exist", async () => {
    await expect(
      notifyAgency("00000000-0000-4000-8000-00000000dead", "checklist_complete", {
        caseRef: "TPL-000044",
        url: "https://x.test/agency/cases/3",
      })
    ).resolves.toBeUndefined();
  });
});
