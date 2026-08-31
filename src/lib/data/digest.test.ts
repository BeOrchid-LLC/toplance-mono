import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Who is owed a post-arrival digest right now.
 *
 * The cadence is enforced here rather than by the deployment's
 * scheduler, so this is the test that stands between "the traveller
 * chose monthly" and a monthly traveller getting a daily email. The
 * decision itself is pure and unit-tested in `@/lib/domain/digest`;
 * what needs a database is the SQL that asks it of every traveller at
 * once.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("travellersDueForDigest", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, notifications, profiles } = await import("@/lib/db/schema");
  const { travellersDueForDigest } = await import("@/lib/data/digest");

  const TRAVELLER = "test_digest_traveller";
  let applicationId = "";

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

  /** Give the traveller a frequency, or leave the key absent entirely. */
  const setFrequency = async (frequency: string | null) =>
    db
      .update(profiles)
      .set({ notificationPrefs: frequency ? { companionDigest: frequency } : {} })
      .where(eq(profiles.id, TRAVELLER));

  const sentDigest = async (at: Date) =>
    db.insert(notifications).values({
      recipientId: TRAVELLER,
      kind: "companion_digest",
      applicationId,
      payload: {},
      createdAt: at,
    });

  const dueIds = async () =>
    (await travellersDueForDigest(25)).map((r) => r.applicationId);

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "digest@test.invalid",
      fullName: "Ada",
    });
    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, intakeComplete: true, status: "approved" })
      .returning({ id: applications.id });
    applicationId = app.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
  });

  it("includes an approved traveller who has never had one", async () => {
    expect(await dueIds()).toContain(applicationId);
  });

  /**
   * The default lives in one place. A traveller who never opened the
   * setting has no key at all, and must still be subscribed.
   */
  it("treats an untouched preference as weekly", async () => {
    await setFrequency(null);
    await sentDigest(daysAgo(3));
    expect(await dueIds()).not.toContain(applicationId);

    await db.delete(notifications).where(eq(notifications.recipientId, TRAVELLER));
    await sentDigest(daysAgo(9));
    expect(await dueIds()).toContain(applicationId);
  });

  it("never includes a traveller who turned it off", async () => {
    await setFrequency("off");
    expect(await dueIds()).not.toContain(applicationId);
  });

  it("waits a week for a weekly traveller", async () => {
    await setFrequency("weekly");
    await sentDigest(daysAgo(3));
    expect(await dueIds()).not.toContain(applicationId);
  });

  it("waits only a day for a daily traveller", async () => {
    await setFrequency("daily");
    await sentDigest(daysAgo(3));
    expect(await dueIds()).toContain(applicationId);
  });

  it("waits a month for a monthly traveller", async () => {
    await setFrequency("monthly");
    await sentDigest(daysAgo(9));
    expect(await dueIds()).not.toContain(applicationId);

    await db.delete(notifications).where(eq(notifications.recipientId, TRAVELLER));
    await sentDigest(daysAgo(31));
    expect(await dueIds()).toContain(applicationId);
  });

  /** Only the last one counts, not the first. */
  it("measures from the most recent digest, not the oldest", async () => {
    await setFrequency("weekly");
    await sentDigest(daysAgo(40));
    await sentDigest(daysAgo(2));
    expect(await dueIds()).not.toContain(applicationId);
  });

  it("ignores an application that is not approved", async () => {
    await db
      .update(applications)
      .set({ status: "under_review" })
      .where(eq(applications.id, applicationId));
    expect(await dueIds()).not.toContain(applicationId);
  });

  /**
   * Another kind of notification is not a digest. Reading `max(createdAt)`
   * across every kind would let a status email suppress a digest.
   */
  it("is not silenced by an unrelated notification", async () => {
    await setFrequency("weekly");
    await db.insert(notifications).values({
      recipientId: TRAVELLER,
      kind: "message_received",
      applicationId,
      payload: {},
      createdAt: new Date(),
    });
    expect(await dueIds()).toContain(applicationId);
  });

  it("honours the batch limit", async () => {
    expect((await travellersDueForDigest(0)).length).toBe(0);
  });
});
