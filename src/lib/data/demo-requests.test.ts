import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * The demo queue, against the real database.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("demo requests", async () => {
  const { db } = await import("@/lib/db/client");
  const { demoRequests } = await import("@/lib/db/schema");

  const ids: string[] = [];

  async function request(companyName: string) {
    const [row] = await db
      .insert(demoRequests)
      .values({
        fullName: "Ada Visitor",
        email: `ada+${companyName}@test.invalid`,
        companyName,
        jobTitle: "Director",
        preferredAt: new Date("2026-10-01T14:00:00Z"),
        preferredTz: "Africa/Lagos",
        locale: "en",
      })
      .returning({ id: demoRequests.id });

    ids.push(row.id);
    return row.id;
  }

  afterEach(async () => {
    if (ids.length) await db.delete(demoRequests).where(inArray(demoRequests.id, ids));
    ids.length = 0;
  });

  it("starts every new request at 'new' with nothing converted", async () => {
    const id = await request("Kite Travel");

    const [row] = await db.select().from(demoRequests).where(inArray(demoRequests.id, [id]));

    expect(row.status).toBe("new");
    expect(row.convertedOrgId).toBeNull();
  });
});
