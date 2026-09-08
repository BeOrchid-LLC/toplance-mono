import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * What one agency's dashboard reads.
 *
 * The arithmetic is tested without a database in `@/lib/domain/kpis`.
 * What is left here is the wiring, and one claim a unit test cannot
 * make: that these figures are **this agency's only**. The sibling
 * suite for the platform dashboard has to assert
 * `toBeGreaterThanOrEqual` throughout, because its read is perturbed by
 * every other row in the database. This one is filtered to a single
 * organisation, so it can assert exact counts — and the day the `where`
 * goes missing, those exact counts are what fails.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("agencyDashboard", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { agencyDashboard } = await import("@/lib/data/agency-dashboard");

  const NOW = new Date("2026-08-20T12:00:00Z");
  const SIGNUP = new Date("2026-06-10T00:00:00Z");

  // Two agencies, because the claim under test is separation. A suite
  // with one agency passes just as happily against a missing `where`.
  const OURS = ["test_agdash_a", "test_agdash_b", "test_agdash_c"];
  const THEIRS = ["test_agdash_x", "test_agdash_y"];

  let orgId = "";
  let otherOrgId = "";

  const read = (now = NOW) => agencyDashboard([orgId], orgId, { now });
  const stage = (data: { funnel: { key: string; count: number }[] }, key: string) =>
    data.funnel.find((s) => s.key === key)!.count;

  beforeEach(async () => {
    const [ours, theirs] = await db
      .insert(organisations)
      .values([
        { name: "Agency Dashboard Test", seatsPurchased: 5, createdAt: SIGNUP },
        { name: "Somebody Else Entirely", seatsPurchased: 5, createdAt: SIGNUP },
      ])
      .returning({ id: organisations.id });
    orgId = ours.id;
    otherOrgId = theirs.id;

    await db.insert(profiles).values(
      [...OURS, ...THEIRS].map((id) => ({
        id,
        fullName: "Agency Dashboard Test",
        email: `${id}@test.invalid`,
        countryIso: "ng",
      }))
    );

    await db.insert(applications).values([
      // Went the whole way.
      {
        travelerId: OURS[0],
        orgId,
        status: "approved" as const,
        intakeComplete: true,
        checklistCompleteAt: new Date("2026-08-02T00:00:00Z"),
        submittedAt: new Date("2026-08-03T00:00:00Z"),
        decidedAt: new Date("2026-08-07T00:00:00Z"),
      },
      // Uploaded everything, never pressed Submit — the one the
      // `stalled` figure exists to surface.
      {
        travelerId: OURS[1],
        orgId,
        status: "collecting_documents" as const,
        intakeComplete: true,
        checklistCompleteAt: new Date("2026-08-05T00:00:00Z"),
      },
      // Has not started.
      { travelerId: OURS[2], orgId, status: "draft" as const },

      // The other agency's, and never ours. Both submitted, so a
      // leak would be visible at more than one stage of the funnel.
      {
        travelerId: THEIRS[0],
        orgId: otherOrgId,
        status: "approved" as const,
        intakeComplete: true,
        checklistCompleteAt: new Date("2026-08-01T00:00:00Z"),
        submittedAt: new Date("2026-08-02T00:00:00Z"),
        decidedAt: new Date("2026-08-06T00:00:00Z"),
      },
      {
        travelerId: THEIRS[1],
        orgId: otherOrgId,
        status: "submitted" as const,
        intakeComplete: true,
        checklistCompleteAt: new Date("2026-08-04T00:00:00Z"),
        submittedAt: new Date("2026-08-05T00:00:00Z"),
      },
    ]);
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, [...OURS, ...THEIRS]));
    await db
      .delete(organisations)
      .where(inArray(organisations.id, [orgId, otherOrgId]));
  });

  it("counts only this agency's cases at every stage of the funnel", async () => {
    const data = await read();

    // Three of ours, not the five in the table. Exact, so a dropped
    // `where` fails here rather than passing quietly at a bigger number.
    expect(stage(data, "started")).toBe(3);
    expect(stage(data, "intake")).toBe(2);
    expect(stage(data, "collected")).toBe(2);
    expect(stage(data, "submitted")).toBe(1);
    expect(stage(data, "decided")).toBe(1);
  });

  it("never widens, so the bars cannot overflow their track", async () => {
    const { funnel } = await read();
    const counts = funnel.map((s) => s.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("surfaces the client who uploaded everything and never submitted", async () => {
    // Ours only. The other agency has nobody stalled, so a leak would
    // read the same as no leak — which is why theirs both submitted.
    expect((await read()).stalled).toBe(1);
  });

  it("reads the funnel off the stamped columns, not off the status", async () => {
    // The draft case has `intake_complete` false and no stamps; the
    // approved one carries all three. A funnel read off `status` alone
    // would put the approved case at every stage and the other two at
    // none, which is the wiring mistake no pure test can catch.
    const data = await read();
    expect(stage(data, "started") - stage(data, "intake")).toBe(1);
  });

  it("bills this agency and no other", async () => {
    const { invoices } = await read();

    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices.every((i) => i.orgId === orgId)).toBe(true);
  });

  it("returns the bill oldest cycle first, so a chart reads left to right", async () => {
    const { invoices } = await read();
    const stamps = invoices.map((i) => i.cycleStart.getTime());
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
  });

  it("reads nothing at all for somebody with no membership", async () => {
    // The guard that matters: no org ids must mean no rows, never an
    // unfiltered select that hands one agency another's caseload.
    const data = await agencyDashboard([], null, { now: NOW });

    expect(data.stalled).toBe(0);
    expect(data.invoices).toEqual([]);
    expect(data.funnel.every((s) => s.count === 0)).toBe(true);
  });
});
