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
