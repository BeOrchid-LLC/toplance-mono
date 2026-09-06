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
 * `getApplication` concurrently in the same request, and on a
 * traveller's very first visit both used to find nothing and both
 * insert — leaving two applications, with the intake agent writing
 * answers to one while the requirements screen read the other. The
 * constraint makes that race lose loudly instead of forking silently.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("one application per traveller", async () => {
  const { eq, inArray } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { applications, organisations, profiles } = await import("@/lib/db/schema");

  const TRAVELLER = "test_unique_app_traveller";
  const ORG = "00000000-0000-4000-8000-0000000b0001";

  it("rejects a second application for the same traveller", async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "unique@test.invalid", fullName: "Ada" });
    await db.insert(organisations).values({ id: ORG, name: "Unique Agency" });

    try {
      await db.insert(applications).values({ travelerId: TRAVELLER, orgId: ORG });
      await expect(
        db.insert(applications).values({ travelerId: TRAVELLER, orgId: ORG })
      ).rejects.toThrow();
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
      await db.delete(organisations).where(inArray(organisations.id, [ORG]));
    }
  });
});

/**
 * The v1.3 tenancy, in the schema. An agency is a tenant and every case
 * belongs to exactly one; a traveller with no agency has no reviewer, so
 * the record is unservable rather than merely unbilled.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("every case belongs to an agency", async () => {
  const { eq, inArray, sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { applications, organisations, profiles } = await import("@/lib/db/schema");

  const TRAVELLER = "test_tenancy_traveller";
  const ORG = "00000000-0000-4000-8000-0000000b1001";

  it("refuses an application with no agency", async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "tenancy@test.invalid", fullName: "Ada" });

    try {
      await expect(
        db.execute(
          sql`insert into applications (traveler_id) values (${TRAVELLER})`
        )
      ).rejects.toThrow();
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    }
  });

  it("refuses to delete an agency that still holds a case", async () => {
    // Suspension is how an agency is removed. A cascade here would let a
    // billing decision destroy a live visa case, and a `set null` would
    // recreate the orphan this tenancy exists to forbid.
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "tenancy@test.invalid", fullName: "Ada" });
    await db.insert(organisations).values({ id: ORG, name: "Held Agency" });
    await db.insert(applications).values({ travelerId: TRAVELLER, orgId: ORG });

    try {
      await expect(
        db.delete(organisations).where(eq(organisations.id, ORG))
      ).rejects.toThrow();
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
      await db.delete(organisations).where(inArray(organisations.id, [ORG]));
    }
  });
});

/**
 * Agency roles are owner and reviewer. `hr_admin` arrived with the
 * employer console and describes nobody in a travel agency.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("org_role", async () => {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");

  it("offers exactly owner and reviewer", async () => {
    const result = await db.execute<{ value: string }>(
      sql`select unnest(enum_range(null::org_role))::text as value`
    );

    expect(result.rows.map((r) => r.value).sort()).toEqual(["owner", "reviewer"]);
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
  const { applications, companionUpdates, organisations, profiles } = await import(
    "@/lib/db/schema"
  );

  const TRAVELLER = "test_companion_updates_traveller";
  /** Every case belongs to an agency since v1.3. */
  const COMPANION_ORG = "00000000-0000-4000-8000-0000000b2001";

  it("rejects a second row for the same application and kind", async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "companion@test.invalid",
      fullName: "Nkem",
    });
    await db
      .insert(organisations)
      .values({ id: COMPANION_ORG, name: "Companion Agency" });

    try {
      const [app] = await db
        .insert(applications)
        .values({ travelerId: TRAVELLER, orgId: COMPANION_ORG })
        .returning({ id: applications.id });

      await db.insert(companionUpdates).values({ applicationId: app.id });
      await expect(
        db.insert(companionUpdates).values({ applicationId: app.id })
      ).rejects.toThrow();
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
      await db.delete(organisations).where(eq(organisations.id, COMPANION_ORG));
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

/**
 * The profile photo's storage key. Nullable — a profile without a photo
 * shows initials, never a placeholder image. Skipped without a database.
 * Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("profiles.avatarPath", async () => {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { profiles } = await import("@/lib/db/schema");

  const TRAVELLER = "test_avatar_path_traveller";

  it("round-trips a storage key and defaults to null", async () => {
    try {
      const [row] = await db
        .insert(profiles)
        .values({ id: TRAVELLER, email: "avatar@test.invalid", fullName: "Eze" })
        .returning();

      expect(row.avatarPath).toBeNull();

      const [updated] = await db
        .update(profiles)
        .set({ avatarPath: "avatars/test_avatar_path_traveller/1.jpg" })
        .where(eq(profiles.id, TRAVELLER))
        .returning();

      expect(updated.avatarPath).toBe(
        "avatars/test_avatar_path_traveller/1.jpg"
      );
    } finally {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    }
  });
});

/**
 * Every foreign key on `applications` is indexed.
 *
 * Not a performance nicety — a correctness-of-the-suite one. An
 * unindexed `on delete set null` foreign key makes Postgres scan the
 * whole child table for every parent row deleted, taking locks as it
 * goes, and that is how a fixture tearing down one corridor came to time
 * out unrelated suites inserting applications in parallel. It read as
 * flakiness for days.
 *
 * Written as a test rather than trusted to the schema file because this
 * table has lost an index to a migration before: `applications_traveler_idx`
 * was created in `0000` and dropped in `0002`.
 *
 * Skipped without a database. Run `npm run db:up` to include it.
 */
describe.skipIf(!process.env.DATABASE_URL)("applications indexes", async () => {
  const { db } = await import("@/lib/db/client");
  const { sql } = await import("drizzle-orm");

  it("indexes every column that points at another table", async () => {
    const { rows } = (await db.execute(
      sql`select indexdef from pg_indexes where tablename = 'applications'`
    )) as unknown as { rows: { indexdef: string }[] };

    const definitions = rows.map((r) => r.indexdef).join("\n");

    for (const column of ["traveler_id", "org_id", "corridor_id", "assignee_id"]) {
      expect(definitions, `${column} needs an index`).toContain(`(${column}`);
    }
  });
});
