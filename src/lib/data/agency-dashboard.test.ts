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
  const { applications, attendanceRequests, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { agencyDashboard } = await import("@/lib/data/agency-dashboard");

  const NOW = new Date("2026-08-20T12:00:00Z");
  const SIGNUP = new Date("2026-06-10T00:00:00Z");

  // Two agencies, because the claim under test is separation. A suite
  // with one agency passes just as happily against a missing `where`.
  const OURS = ["test_agdash_a", "test_agdash_b", "test_agdash_c", "test_agdash_d"];
  const THEIRS = ["test_agdash_x", "test_agdash_y", "test_agdash_z"];

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
      // Interviewed a fortnight ago and never moved on — the case the
      // chase exists to surface.
      {
        travelerId: OURS[3],
        orgId,
        status: "interview_scheduled" as const,
        intakeComplete: true,
        checklistCompleteAt: new Date("2026-08-01T00:00:00Z"),
        submittedAt: new Date("2026-08-02T00:00:00Z"),
      },

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
      // The other agency's forgotten interview. A missing `where` on
      // the chase would put this director's name on their screen.
      {
        travelerId: THEIRS[2],
        orgId: otherOrgId,
        status: "interview_scheduled" as const,
        intakeComplete: true,
        submittedAt: new Date("2026-08-02T00:00:00Z"),
      },
    ]);

    for (const travelerId of [OURS[3], THEIRS[2]]) {
      const [app] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(inArray(applications.travelerId, [travelerId]));
      await db.insert(attendanceRequests).values({
        applicationId: app.id,
        kind: "interview",
        scheduledFor: new Date("2026-08-06T09:00:00Z"),
        place: "British High Commission, Lagos",
        note: null,
      });
    }
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, [...OURS, ...THEIRS]));
    await db
      .delete(organisations)
      .where(inArray(organisations.id, [orgId, otherOrgId]));
  });

  it("counts only this agency's cases at every stage of the funnel", async () => {
    const data = await read();

    // Four of ours, not the seven in the table. Exact, so a dropped
    // `where` fails here rather than passing quietly at a bigger number.
    expect(stage(data, "started")).toBe(4);
    expect(stage(data, "intake")).toBe(3);
    expect(stage(data, "collected")).toBe(3);
    // The interviewed case counts as Sent and not as Decided, which is
    // the whole of what the funnel has to say about the interview leg.
    expect(stage(data, "submitted")).toBe(2);
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

  /**
   * The blind spot the interview leg was added to close: a case sits in
   * `interview_scheduled` until a person moves it, so one interviewed in
   * March goes on telling its traveller an interview is coming. Nothing
   * else on this dashboard would show it — the funnel counts it under
   * Sent, which is true and is not the point.
   */
  describe("forgotten interviews", () => {
    it("names a case whose interview has been and gone", async () => {
      const data = await read();
      expect(data.staleInterviews.map((c) => c.travelerId)).toEqual([OURS[3]]);
    });

    it("carries enough to act on without opening the case", async () => {
      const [row] = (await read()).staleInterviews;
      expect(row.caseRef).toMatch(/^TPL-/);
      expect(row.travelerName).toBe("Agency Dashboard Test");
      expect(row.scheduledFor).toEqual(new Date("2026-08-06T09:00:00Z"));
    });

    it("is another agency's business, never this one's", async () => {
      // The claim this whole suite exists for, applied to the newest
      // read on the page.
      const data = await read();
      expect(data.staleInterviews.map((c) => c.travelerId)).not.toContain(THEIRS[2]);
    });

    it("says nothing before the interview has happened", async () => {
      // Read as though today were the day before the appointment.
      const data = await read(new Date("2026-08-05T12:00:00Z"));
      expect(data.staleInterviews).toEqual([]);
    });
  });
});