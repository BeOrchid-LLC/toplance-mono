import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * The demo queue, against the real database.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("demo requests", async () => {
  const { db } = await import("@/lib/db/client");
  const { demoRequests, organisations } = await import("@/lib/db/schema");
  const { listDemoRequests, setDemoRequestStatus } = await import(
    "@/lib/data/demo-requests"
  );

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

  it("lists newest first", async () => {
    const older = await request("Older Agency");
    // Explicit timestamps, so the assertion does not depend on two
    // inserts landing in different microseconds.
    await db
      .update(demoRequests)
      .set({ createdAt: new Date("2026-09-01T09:00:00Z") })
      .where(inArray(demoRequests.id, [older]));

    const newer = await request("Newer Agency");
    await db
      .update(demoRequests)
      .set({ createdAt: new Date("2026-09-05T09:00:00Z") })
      .where(inArray(demoRequests.id, [newer]));

    const rows = await listDemoRequests();
    const ours = rows.filter((r) => ids.includes(r.id));

    expect(ours.map((r) => r.id)).toEqual([newer, older]);
  });

  it("persists a status change", async () => {
    const id = await request("Kite Travel");

    const result = await setDemoRequestStatus(id, "contacted");
    expect(result).toEqual({ ok: true });

    const rows = await listDemoRequests();
    expect(rows.find((r) => r.id === id)?.status).toBe("contacted");
  });

  it("refuses a status change for an id that is not there", async () => {
    const result = await setDemoRequestStatus(
      "00000000-0000-4000-8000-00000000dead",
      "declined"
    );

    expect("error" in result).toBe(true);
  });

  it("refuses to write 'converted' even if a caller gets past the type", async () => {
    const id = await request("Kite Travel");

    // A Server Action parses a raw POST string, so a value can reach
    // here without ever passing through `Exclude<..., "converted">`.
    // The cast stands in for that: the type system is bypassed on
    // purpose to prove the runtime guard still holds.
    const result = await setDemoRequestStatus(
      id,
      "converted" as unknown as Parameters<typeof setDemoRequestStatus>[1]
    );

    expect("error" in result).toBe(true);

    const rows = await listDemoRequests();
    expect(rows.find((r) => r.id === id)?.status).toBe("new");
  });

  it("refuses to change a converted request's status, and touches nothing", async () => {
    const id = await request("Kite Travel");

    // Stand in for what `provisionTenantTx` does in the same
    // transaction that creates the agency: stamp both halves of
    // "converted" together.
    const orgId = "00000000-0000-4000-8000-0000000d00f1";
    await db
      .insert(organisations)
      .values({ id: orgId, name: "Kite Travel Agency" })
      .onConflictDoNothing();

    try {
      await db
        .update(demoRequests)
        .set({ status: "converted", convertedOrgId: orgId })
        .where(inArray(demoRequests.id, [id]));

      // Un-converting this row would re-arm provisionTenantTx's guard
      // against provisioning the same enquiry a second time — the whole
      // point of the fix.
      const result = await setDemoRequestStatus(id, "contacted");
      expect(result).toEqual({ error: "already_converted" });

      const [row] = await db
        .select()
        .from(demoRequests)
        .where(inArray(demoRequests.id, [id]));

      expect(row.status).toBe("converted");
      expect(row.convertedOrgId).toBe(orgId);
    } finally {
      await db.delete(organisations).where(inArray(organisations.id, [orgId]));
    }
  });
});
