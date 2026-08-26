import { getViewSelectedFields } from "drizzle-orm";
import { describe, expect, it } from "vitest";

/**
 * `org_application_progress` is created in `sql-objects.sql` and
 * declared separately in `schema.ts` with `.existing()`, so nothing
 * checks that the two agree. Drizzle Kit does not generate the view, and
 * a wrong column name here compiles, passes typecheck, and fails only
 * when an employer opens the console.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("org_application_progress", async () => {
  const { db } = await import("@/lib/db/client");
  const { orgApplicationProgress } = await import("@/lib/db/schema");

  it("selects every declared column from the real view", async () => {
    await expect(db.select().from(orgApplicationProgress).limit(1)).resolves.toBeInstanceOf(
      Array
    );
  });

  it("carries no column that could reveal a document", () => {
    const columns = Object.keys(getViewSelectedFields(orgApplicationProgress));

    // An employer sees a completion score, never a file. If a column is
    // added here that names or locates a document, this fails — which is
    // the point: the promise is made on the marketing site and in the
    // console, and this view is where it would quietly break.
    expect(columns).not.toContain("storagePath");
    expect(columns).not.toContain("docKey");
    expect(columns.filter((c) => /document/i.test(c)).sort()).toEqual([
      "documentsTotal",
      "documentsVerified",
    ]);
  });
});

/**
 * One application per traveller, enforced by the database.
 *
 * The `(app)` layout and every page under it call
 * `getOrCreateApplication` concurrently in the same request, and on a
 * traveller's very first visit both used to find nothing and both
 * insert — leaving two applications, with the intake agent writing
 * answers to one while the requirements screen read the other. The
 * constraint makes that race lose loudly instead of forking silently.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("one application per traveller", async () => {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { applications, profiles } = await import("@/lib/db/schema");

  const TRAVELLER = "test_unique_app_traveller";

  it("rejects a second application for the same traveller", async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "unique@test.invalid", fullName: "Ada" });

    try {
      await db.insert(applications).values({ travelerId: TRAVELLER });
      await expect(
        db.insert(applications).values({ travelerId: TRAVELLER })
      ).rejects.toThrow();
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    }
  });
});

/**
 * A row per person per event, with defaults doing most of the work — a
 * caller only ever supplies `recipientId` and `kind`.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("notifications", async () => {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { notifications, profiles } = await import("@/lib/db/schema");

  const RECIPIENT = "test_notifications_recipient";

  it("defaults payload, readAt and createdAt when only the required fields are given", async () => {
    await db.insert(profiles).values({
      id: RECIPIENT,
      email: "notifications@test.invalid",
      fullName: "Chidi",
    });

    try {
      const [row] = await db
        .insert(notifications)
        .values({ recipientId: RECIPIENT, kind: "status_changed" })
        .returning();

      expect(row.payload).toEqual({});
      expect(row.readAt).toBeNull();
      expect(row.applicationId).toBeNull();
      expect(row.createdAt).toBeInstanceOf(Date);
    } finally {
      await db.delete(profiles).where(eq(profiles.id, RECIPIENT));
    }
  });
});

/**
 * Cached AI companion content, one row per application per kind.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("companion_updates", async () => {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { applications, companionUpdates, profiles } = await import("@/lib/db/schema");

  const TRAVELLER = "test_companion_updates_traveller";

  it("rejects a second row for the same application and kind", async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "companion@test.invalid",
      fullName: "Nkem",
    });

    try {
      const [app] = await db
        .insert(applications)
        .values({ travelerId: TRAVELLER })
        .returning({ id: applications.id });

      await db.insert(companionUpdates).values({ applicationId: app.id });
      await expect(
        db.insert(companionUpdates).values({ applicationId: app.id })
      ).rejects.toThrow();
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    }
  });
});

/**
 * Per-person notification switches. Skipped without a database. Run
 * `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("profiles.notificationPrefs", async () => {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { profiles } = await import("@/lib/db/schema");

  const TRAVELLER = "test_notification_prefs_traveller";

  it("defaults to an empty object", async () => {
    try {
      const [row] = await db
        .insert(profiles)
        .values({ id: TRAVELLER, email: "prefs@test.invalid", fullName: "Bola" })
        .returning();

      expect(row.notificationPrefs).toEqual({});
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    }
  });
});
