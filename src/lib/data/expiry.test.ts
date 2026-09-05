import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("travellersDueForExpiryReminder", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, notifications, profiles } = await import("@/lib/db/schema");
  const { travellersDueForExpiryReminder } = await import("@/lib/data/expiry");

  /** A fixed "today", so the fixture dates below mean the same thing on every run. */
  const NOW = new Date("2026-09-05T12:00:00Z");

  /** `YYYY-MM-DD` this many days after NOW. */
  function inDays(days: number): string {
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // One application per traveller is a unique constraint, so every case
  // below needs its own profile.
  const DUE = "test_expiry_due";
  const SENT = "test_expiry_sent";
  const MUTED = "test_expiry_muted";
  const PENDING = "test_expiry_pending";
  const NO_DATE = "test_expiry_no_date";
  const EXPIRED = "test_expiry_expired";
  const FAR_OFF = "test_expiry_far_off";

  const IDS = [DUE, SENT, MUTED, PENDING, NO_DATE, EXPIRED, FAR_OFF];

  beforeEach(async () => {
    await db.insert(profiles).values(
      IDS.map((id) => ({
        id,
        email: `${id.replace(/_/g, "-")}@test.invalid`,
        fullName: "Ada",
        // Everyone but MUTED leaves the digest preference untouched, which
        // is the common case: `notificationPrefs` defaults to `{}`.
        notificationPrefs: id === MUTED ? { companionDigest: "off" } : {},
      }))
    );

    await db.insert(applications).values([
      { travelerId: DUE, status: "approved", visaExpiresOn: inDays(45) },
      { travelerId: SENT, status: "approved", visaExpiresOn: inDays(45) },
      { travelerId: MUTED, status: "approved", visaExpiresOn: inDays(45) },
      { travelerId: PENDING, status: "under_review", visaExpiresOn: inDays(45) },
      { travelerId: NO_DATE, status: "approved", visaExpiresOn: null },
      { travelerId: EXPIRED, status: "approved", visaExpiresOn: inDays(-3) },
      { travelerId: FAR_OFF, status: "approved", visaExpiresOn: inDays(120) },
    ]);

    // SENT has already had the sixty-day notice.
    const [sentApp] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(inArray(applications.travelerId, [SENT]));

    await db.insert(notifications).values({
      recipientId: SENT,
      applicationId: sentApp.id,
      kind: "visa_expiring",
      payload: { daysOut: 60, expiresOn: inDays(45), url: "https://example.invalid" },
    });
  });

  afterEach(async () => {
    await db.delete(notifications).where(inArray(notifications.recipientId, IDS));
    await db.delete(applications).where(inArray(applications.travelerId, IDS));
    await db.delete(profiles).where(inArray(profiles.id, IDS));
  });

  async function dueFor(limit = 50) {
    const rows = await travellersDueForExpiryReminder(limit, NOW);
    return rows.filter((r) => IDS.includes(r.travelerId));
  }

  it("returns a traveller who has crossed a threshold, with the notice that is owed", async () => {
    const rows = await dueFor();
    const row = rows.find((r) => r.travelerId === DUE);
    expect(row).toBeDefined();
    expect(row!.daysOut).toBe(60);
    expect(row!.expiresOn).toBe(inDays(45));
  });

  it("does not repeat a notice that has already been sent", async () => {
    const rows = await dueFor();
    expect(rows.map((r) => r.travelerId)).not.toContain(SENT);
  });

  it("still reminds a traveller who turned the companion digest off", async () => {
    // The decision this pins: 'off' silences weekly orientation email, not
    // a warning that someone's legal status is ending. If a future edit
    // copies the digest's preference predicate into this query, this fails.
    const rows = await dueFor();
    expect(rows.map((r) => r.travelerId)).toContain(MUTED);
  });

  it("ignores applications that are not approved", async () => {
    const rows = await dueFor();
    expect(rows.map((r) => r.travelerId)).not.toContain(PENDING);
  });

  it("ignores applications with no expiry date on file", async () => {
    const rows = await dueFor();
    expect(rows.map((r) => r.travelerId)).not.toContain(NO_DATE);
  });

  it("stops once the date has passed", async () => {
    const rows = await dueFor();
    expect(rows.map((r) => r.travelerId)).not.toContain(EXPIRED);
  });

  it("stays quiet while the expiry is beyond the widest threshold", async () => {
    const rows = await dueFor();
    expect(rows.map((r) => r.travelerId)).not.toContain(FAR_OFF);
  });

  it("honours the batch limit", async () => {
    const rows = await travellersDueForExpiryReminder(1, NOW);
    expect(rows.length).toBeLessThanOrEqual(1);
  });
});
