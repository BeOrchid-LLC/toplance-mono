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
