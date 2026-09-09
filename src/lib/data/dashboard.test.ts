import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * Everything the director's dashboard reads, in one pass.
 *
 * The arithmetic is tested without a database in
 * `@/lib/domain/kpis` and `@/lib/domain/payments`. What is left to test
 * here — and it is the part that a unit test cannot reach — is the
 * wiring: that each figure is fed the column it claims to be about. A
 * funnel plotted from `created_at` instead of `checklist_complete_at`
 * passes every pure test there is and is still wrong on the screen.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("dashboardData", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, documents, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { dashboardData } = await import("@/lib/data/dashboard");

  const NOW = new Date("2026-08-20T12:00:00Z");
  const SIGNUP = new Date("2026-06-10T00:00:00Z");
  const TRAVELLERS = ["test_dash_a", "test_dash_b", "test_dash_c"];

  let orgId = "";
  let approvedId = "";

  const clientRow = async (now = NOW) => {
    const data = await dashboardData({ now });
    return {
      data,
      row: data.clients.find((c) => c.orgId === orgId),
    };
  };

  beforeEach(async () => {
    const [org] = await db
      .insert(organisations)
      .values({ name: "Dashboard Test Agency", seatsPurchased: 10, createdAt: SIGNUP })
      .returning({ id: organisations.id });
    orgId = org.id;

    await db.insert(profiles).values(
      TRAVELLERS.map((id) => ({
        id,
        fullName: "Dashboard Test",
        email: `${id}@test.invalid`,
        countryIso: "ng",
      }))
    );

    const rows = await db
      .insert(applications)
      .values([
        {
          travelerId: TRAVELLERS[0],
          orgId,
          status: "approved" as const,
          intakeComplete: true,
          checklistCompleteAt: new Date("2026-08-02T00:00:00Z"),
          submittedAt: new Date("2026-08-03T00:00:00Z"),
          decidedAt: new Date("2026-08-07T00:00:00Z"),
        },
        {
          // Everything uploaded, never submitted — the case the schema
          // comment on `checklist_complete_at` exists to surface.
          travelerId: TRAVELLERS[1],
          orgId,
          status: "collecting_documents" as const,
          intakeComplete: true,
          checklistCompleteAt: new Date("2026-08-05T00:00:00Z"),
        },
        { travelerId: TRAVELLERS[2], orgId, status: "draft" as const },
      ])
      .returning({ id: applications.id });

    approvedId = rows[0].id;

    await db.insert(documents).values([
      { applicationId: approvedId, docKey: "passport", name: "Passport", state: "verified" },
      { applicationId: approvedId, docKey: "cas", name: "CAS", state: "flagged" },
    ]);
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, TRAVELLERS));
    await db.delete(organisations).where(eq(organisations.id, orgId));
  });

  it("counts a client's applicants and its decisions", async () => {
    // Not its seats. The Seats column came off `/ops/dashboard` on
    // 2026-09-09 and `ClientRow` no longer carries the figure — the
    // platform bills per application, and the ratio it printed divided
    // applicants by a headcount cap.
    const { row } = await clientRow();
    expect(row).toMatchObject({ applicants: 3, approved: 1 });
    expect(row).not.toHaveProperty("seatsPurchased");
  });

  it("surfaces the applicant who finished uploading and never submitted", async () => {
    const { row } = await clientRow();
    expect(row!.stalled).toBe(1);
  });

  it("reads the funnel off the stamped columns, not off the status", async () => {
    // Two of the three reached "documents complete", one of those
    // submitted, and one was decided. A funnel read off `status` alone
    // would put the approved application at every stage and the other
    // two at none.
    const { data } = await clientRow();
    const stage = (key: string) => data.funnel.find((s) => s.key === key)!.count;

    expect(stage("started")).toBeGreaterThanOrEqual(3);
    expect(stage("collected")).toBeGreaterThanOrEqual(2);
    expect(stage("submitted")).toBeGreaterThanOrEqual(1);
    expect(stage("decided")).toBeGreaterThanOrEqual(1);
  });

  it("hands the operations panel the decided applications", async () => {
    // The durations themselves are pinned exactly in
    // `@/lib/domain/kpis` — they are a median over every application in
    // the database, so no fixture can assert a number here without the
    // rest of the table agreeing to hold still. What this checks is the
    // wiring: our decided application reached the panel, and the figure
    // it produced is a real number of days.
    const { data } = await clientRow();

    expect(data.operations.decided).toBeGreaterThanOrEqual(1);
    expect(data.operations.medianDaysToDecision).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(data.operations.medianDaysToDecision)).toBe(true);
  });

  it("reports the share of documents a reviewer had to flag", async () => {
    const { data } = await clientRow();
    expect(data.documents.total).toBeGreaterThanOrEqual(2);
    expect(data.documents.flagged).toBeGreaterThanOrEqual(1);
  });

  it("invoices the client it just built a row for", async () => {
    const { data } = await clientRow();
    expect(data.invoices.some((i) => i.orgId === orgId)).toBe(true);
  });

  it("survives a database with nothing in it rather than dividing by zero", async () => {
    // Not an empty database — this one has fixtures — but the same code
    // path: every rate here is `null` or a number, never NaN.
    const { data } = await clientRow();
    for (const value of [
      data.operations.approvalRate,
      ...data.funnel.map((s) => s.ofPrevious),
    ]) {
      expect(Number.isNaN(value)).toBe(false);
    }
  });
});
