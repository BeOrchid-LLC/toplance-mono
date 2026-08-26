import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * The companion's cached AI content: one row per application per kind,
 * upserted on `(applicationId, kind)`, plus the pure staleness check the
 * page and the cron both gate regeneration on.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("companion data", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, companionUpdates, profiles } = await import("@/lib/db/schema");
  const { getCompanionUpdate, upsertCompanionUpdate, isStale } = await import(
    "@/lib/data/companion"
  );

  const TRAVELLER = "test_companion_traveller";
  let applicationId = "";

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "companion@test.invalid",
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

  describe("getCompanionUpdate / upsertCompanionUpdate", () => {
    it("returns null when nothing has been generated yet", async () => {
      expect(await getCompanionUpdate(applicationId, "local_tips")).toBeNull();
    });

    it("writes a row that getCompanionUpdate then reads back", async () => {
      await upsertCompanionUpdate(applicationId, "local_tips", { markdown: "Hello" });

      const row = await getCompanionUpdate(applicationId, "local_tips");
      expect(row?.payload).toEqual({ markdown: "Hello" });
    });

    it("upserting again refreshes the payload and generatedAt rather than inserting a second row", async () => {
      await upsertCompanionUpdate(applicationId, "local_tips", { markdown: "First" });
      const first = await getCompanionUpdate(applicationId, "local_tips");

      // Ensure a measurable clock difference between the two writes.
      await new Promise((r) => setTimeout(r, 10));

      await upsertCompanionUpdate(applicationId, "local_tips", { markdown: "Second" });
      const second = await getCompanionUpdate(applicationId, "local_tips");

      expect(second?.payload).toEqual({ markdown: "Second" });
      expect(second!.generatedAt.getTime()).toBeGreaterThan(first!.generatedAt.getTime());

      const rows = await db
        .select()
        .from(companionUpdates)
        .where(
          and(
            eq(companionUpdates.applicationId, applicationId),
            eq(companionUpdates.kind, "local_tips")
          )
        );
      expect(rows).toHaveLength(1);
    });

    it("keeps different kinds on the same application as separate rows", async () => {
      await upsertCompanionUpdate(applicationId, "local_tips", { markdown: "Tips" });
      await upsertCompanionUpdate(applicationId, "checklist", { items: [] });

      expect((await getCompanionUpdate(applicationId, "local_tips"))?.payload).toEqual({
        markdown: "Tips",
      });
      expect((await getCompanionUpdate(applicationId, "checklist"))?.payload).toEqual({
        items: [],
      });
    });
  });

  describe("isStale", () => {
    it("is false for a row generated moments ago", () => {
      const row = { generatedAt: new Date() };
      expect(isStale(row)).toBe(false);
    });

    it("is true for a row generated 8 days ago against the default 7-day window", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      expect(isStale({ generatedAt: eightDaysAgo })).toBe(true);
    });

    it("is false for a row generated 6 days ago against the default 7-day window", () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      expect(isStale({ generatedAt: sixDaysAgo })).toBe(false);
    });

    it("honours a custom staleness window", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(isStale({ generatedAt: twoDaysAgo }, 1)).toBe(true);
      expect(isStale({ generatedAt: twoDaysAgo }, 3)).toBe(false);
    });
  });
});
