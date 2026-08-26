import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * `RESEND_API_KEY` stays unset for the whole suite (nothing in
 * `.env.local.example` sets it, and nothing here does either), so every
 * `notify()` call below exercises the real "email skipped" path rather
 * than reaching resend.com.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("notify", async () => {
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
    await expect(
      notify(TRAVELLER, "itinerary_ready", { url: appUrl("/app") })
    ).resolves.toBeUndefined();
  });

  it("never throws for a recipient with no profile row", async () => {
    await expect(
      notify("no_such_profile", "itinerary_ready", { url: appUrl("/app") })
    ).resolves.toBeUndefined();
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
