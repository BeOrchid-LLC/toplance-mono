import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * The demo queue, against the real database.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("demo requests", async () => {
  const { db } = await import("@/lib/db/client");
  const { demoRequests, organisations, profiles } = await import("@/lib/db/schema");
  const {
    listDemoRequests,
    listPlatformStaff,
    setDemoRequestAssignee,
    setDemoRequestStatus,
  } = await import("@/lib/data/demo-requests");

  const ids: string[] = [];
  const profileIds: string[] = [];

  /**
   * A profile at a given rank. `profiles.id` is the Clerk user id — a
   * `text` column, not a uuid — so a fixture id is a string of our own
   * choosing rather than something generated.
   */
  async function profile(
    id: string,
    role: "staff" | "traveler",
    fullName: string
  ) {
    await db
      .insert(profiles)
      .values({
        id,
        fullName,
        email: `${id}@test.invalid`,
        role,
        staffRole: role === "staff" ? "reviewer" : null,
      })
      .onConflictDoNothing();
    profileIds.push(id);
    return id;
  }

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
    // Enquiries first: `assignee_id` is `on delete set null`, so the
    // order is not strictly required, but deleting the rows that point
    // before the rows pointed at keeps the teardown honest if that ever
    // becomes a restrict.
    if (ids.length) await db.delete(demoRequests).where(inArray(demoRequests.id, ids));
    ids.length = 0;
    if (profileIds.length) {
      await db.delete(profiles).where(inArray(profiles.id, profileIds));
    }
    profileIds.length = 0;
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

  describe("assignment", () => {
    it("starts unassigned, which is a normal state and not a defect", async () => {
      const id = await request("Kite Travel");

      const rows = await listDemoRequests();
      const row = rows.find((r) => r.id === id);

      expect(row?.assigneeId).toBeNull();
      expect(row?.assigneeName).toBeNull();
    });

    it("names the member of staff working it", async () => {
      const id = await request("Kite Travel");
      const staffId = await profile("staff_assignee_1", "staff", "Ngozi Balogun");

      expect(await setDemoRequestAssignee(id, staffId)).toEqual({ ok: true });

      const row = (await listDemoRequests()).find((r) => r.id === id);
      expect(row?.assigneeId).toBe(staffId);
      expect(row?.assigneeName).toBe("Ngozi Balogun");
    });

    /** Putting an enquiry back in the pool is as ordinary as taking it. */
    it("clears an assignment", async () => {
      const id = await request("Kite Travel");
      const staffId = await profile("staff_assignee_2", "staff", "Ngozi Balogun");

      await setDemoRequestAssignee(id, staffId);
      expect(await setDemoRequestAssignee(id, null)).toEqual({ ok: true });

      const row = (await listDemoRequests()).find((r) => r.id === id);
      expect(row?.assigneeId).toBeNull();
    });

    /**
     * The picker only ever offers staff, but it posts an id and this is
     * what stops a hand-made POST filing BeOrchid's sales queue against
     * a traveller — whose name would then appear on an ops screen they
     * have no part in.
     */
    it("refuses a profile who is not staff, and writes nothing", async () => {
      const id = await request("Kite Travel");
      const travellerId = await profile("traveller_assignee_1", "traveler", "Ada Traveller");

      expect(await setDemoRequestAssignee(id, travellerId)).toEqual({
        error: "not_staff",
      });

      const row = (await listDemoRequests()).find((r) => r.id === id);
      expect(row?.assigneeId).toBeNull();
    });

    it("refuses an enquiry that is not there", async () => {
      const staffId = await profile("staff_assignee_3", "staff", "Ngozi Balogun");

      expect(
        await setDemoRequestAssignee("00000000-0000-4000-8000-00000000dead", staffId)
      ).toEqual({ error: "not_found" });
    });

    /**
     * A converted enquiry is finished — it is an agency now. Assigning
     * one would put a name against work nobody is going to do.
     */
    it("refuses a converted enquiry", async () => {
      const id = await request("Kite Travel");
      const staffId = await profile("staff_assignee_4", "staff", "Ngozi Balogun");
      const orgId = "00000000-0000-4000-8000-0000000d00f2";

      await db
        .insert(organisations)
        .values({ id: orgId, name: "Kite Travel Agency" })
        .onConflictDoNothing();

      try {
        await db
          .update(demoRequests)
          .set({ status: "converted", convertedOrgId: orgId })
          .where(inArray(demoRequests.id, [id]));

        expect(await setDemoRequestAssignee(id, staffId)).toEqual({
          error: "already_converted",
        });
      } finally {
        await db.delete(organisations).where(inArray(organisations.id, [orgId]));
      }
    });
  });

  describe("the staff picker's list", () => {
    it("offers staff and nobody else", async () => {
      const staffId = await profile("staff_picker_1", "staff", "Ngozi Balogun");
      const travellerId = await profile("traveller_picker_1", "traveler", "Ada Traveller");

      const staff = await listPlatformStaff();
      const listed = staff.map((s) => s.id);

      expect(listed).toContain(staffId);
      expect(listed).not.toContain(travellerId);
    });
  });
});
