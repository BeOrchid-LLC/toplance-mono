import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * Who is owed a reminder about a consulate interview, and which cases
 * the desk has stopped following up.
 *
 * The decision itself is pure and unit-tested in
 * `@/lib/domain/interview`; what needs a database is asking it of every
 * traveller at once, and the dedupe — which is read back off the
 * notifications table rather than stored, so only real SQL can prove it.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("travellersDueForInterviewReminder", async () => {
  const { db } = await import("@/lib/db/client");
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, attendanceRequests, notifications, profiles } = await import(
    "@/lib/db/schema"
  );
  const { travellersDueForInterviewReminder } = await import("@/lib/data/interviews");

  /** A fixed "today", so the fixture dates below mean the same thing on every run. */
  const NOW = new Date("2026-09-05T12:00:00Z");

  /** An instant this many days after NOW, at 09:00 — an appointment has a time. */
  function inDays(days: number): Date {
    const d = new Date(NOW.getTime() + days * 86_400_000);
    d.setUTCHours(9, 0, 0, 0);
    return d;
  }

  // One application per traveller is a unique constraint, so every case
  // below needs its own profile.
  const DUE = "test_interview_due";
  const SENT = "test_interview_sent";
  const MOVED = "test_interview_moved";
  const NO_TIME = "test_interview_no_time";
  const PAST = "test_interview_past";
  const FAR_OFF = "test_interview_far_off";
  const BIOMETRICS = "test_interview_biometrics";
  const DECIDED = "test_interview_decided";
  const UNMOVED = "test_interview_unmoved";

  const IDS = [DUE, SENT, MOVED, NO_TIME, PAST, FAR_OFF, BIOMETRICS, DECIDED, UNMOVED];

  const TEST_AGENCY = "00000000-0000-4000-8000-0000000c0009";

  /** The application id for one traveller, once the fixture is in. */
  async function appOf(travelerId: string) {
    const [row] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(inArray(applications.travelerId, [travelerId]));
    return row.id;
  }

  beforeEach(async () => {
    await seedTestAgency(TEST_AGENCY);
    await db.insert(profiles).values(
      IDS.map((id) => ({
        id,
        email: `${id.replace(/_/g, "-")}@test.invalid`,
        fullName: "Ada",
      }))
    );

    await db.insert(applications).values(
      IDS.map((id) => ({
        orgId: TEST_AGENCY,
        travelerId: id,
        status:
          id === DECIDED
            ? ("approved" as const)
            : id === UNMOVED
              ? ("processing" as const)
              : ("interview_scheduled" as const),
      }))
    );

    const when: Record<string, Date | null> = {
      [DUE]: inDays(7),
      [SENT]: inDays(7),
      [MOVED]: inDays(7),
      [NO_TIME]: null,
      [PAST]: inDays(-1),
      [FAR_OFF]: inDays(20),
      [BIOMETRICS]: inDays(7),
      [DECIDED]: inDays(7),
      [UNMOVED]: inDays(7),
    };

    for (const id of IDS) {
      await db.insert(attendanceRequests).values({
        applicationId: await appOf(id),
        kind: id === BIOMETRICS ? "biometrics" : "interview",
        scheduledFor: when[id],
        place: "British High Commission, Lagos",
        note: null,
      });
    }

    // SENT has already had the seven-day notice for this appointment.
    await db.insert(notifications).values({
      recipientId: SENT,
      applicationId: await appOf(SENT),
      kind: "interview_reminder",
      payload: {
        thresholdDays: 7,
        daysRemaining: 7,
        scheduledFor: inDays(7).toISOString(),
        url: "https://example.invalid",
      },
    });

    // MOVED had the seven-day notice for an appointment that has since
    // been rescheduled. The old notice was about a different day and
    // must not silence the new one.
    await db.insert(notifications).values({
      recipientId: MOVED,
      applicationId: await appOf(MOVED),
      kind: "interview_reminder",
      payload: {
        thresholdDays: 7,
        daysRemaining: 7,
        scheduledFor: inDays(-40).toISOString(),
        url: "https://example.invalid",
      },
    });
  });

  afterEach(async () => {
    await db.delete(notifications).where(inArray(notifications.recipientId, IDS));
    await db.delete(applications).where(inArray(applications.travelerId, IDS));
    await db.delete(profiles).where(inArray(profiles.id, IDS));
  });

  async function dueFor(limit = 50) {
    const rows = await travellersDueForInterviewReminder(limit, NOW);
    return rows.filter((r) => IDS.includes(r.travelerId));
  }

  it("returns the traveller who has crossed a threshold, with the notice owed", async () => {
    const row = (await dueFor()).find((r) => r.travelerId === DUE);
    expect(row).toBeDefined();
    expect(row!.thresholdDays).toBe(7);
    expect(row!.daysRemaining).toBe(7);
    expect(row!.place).toBe("British High Commission, Lagos");
  });

  it("does not repeat a notice already sent for this appointment", async () => {
    expect((await dueFor()).map((r) => r.travelerId)).not.toContain(SENT);
  });

  it("starts the run again when the interview has been rescheduled", async () => {
    // The lesson `travellersDueForExpiryReminder` learned: a notice is
    // only a reason to stay quiet about the date it was actually about.
    // Keyed on the application alone, a traveller moved from the 14th to
    // the 30th would be reminded about neither.
    const row = (await dueFor()).find((r) => r.travelerId === MOVED);
    expect(row).toBeDefined();
    expect(row!.thresholdDays).toBe(7);
  });

  /**
   * The reminder is about the appointment, not about the status.
   *
   * A handler who books an interview and does not press the button on
   * the case screen has still booked an interview, and the traveller
   * still has to be there. Gating this on `interview_scheduled` would
   * make one person's forgetfulness cost somebody else their visa.
   */
  it("reminds about a booked interview even if nobody moved the case", async () => {
    expect((await dueFor()).map((r) => r.travelerId)).toContain(UNMOVED);
  });

  it("says nothing when the agency has not fixed a time", async () => {
    expect((await dueFor()).map((r) => r.travelerId)).not.toContain(NO_TIME);
  });

  it("stops once the day has passed", async () => {
    expect((await dueFor()).map((r) => r.travelerId)).not.toContain(PAST);
  });

  it("is silent well before the first threshold", async () => {
    expect((await dueFor()).map((r) => r.travelerId)).not.toContain(FAR_OFF);
  });

  it("leaves biometrics appointments alone", async () => {
    // The summons already told them, and a biometrics slot is not the
    // interview this reminder is worded for.
    expect((await dueFor()).map((r) => r.travelerId)).not.toContain(BIOMETRICS);
  });

  it("does not remind a traveller whose case is already decided", async () => {
    // Nothing turns on the appointment any more, and a reminder would
    // be this product contradicting the decision it just sent them.
    expect((await dueFor()).map((r) => r.travelerId)).not.toContain(DECIDED);
  });

  it("honours the limit, most urgent first", async () => {
    const rows = await travellersDueForInterviewReminder(1, NOW);
    expect(rows).toHaveLength(1);
  });
});

/**
 * The blind spot: a case interviewed and then forgotten.
 *
 * `interview_scheduled` is left behind by a person, not by time, so a
 * case whose interview was in March sits there until somebody moves it
 * — telling the traveller an interview is coming months after they sat
 * it, and quietly holding the desk's approval rate at whatever it was.
 * Nothing else in the product notices: `sla_due_at` measures the review
 * desk and has nothing to say about a mission.
 */
describe.skipIf(!process.env.DATABASE_URL)("casesAwaitingInterviewOutcome", async () => {
  const { db } = await import("@/lib/db/client");
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, attendanceRequests, profiles } = await import("@/lib/db/schema");
  const { casesAwaitingInterviewOutcome } = await import("@/lib/data/interviews");

  const NOW = new Date("2026-09-05T12:00:00Z");
  function inDays(days: number): Date {
    const d = new Date(NOW.getTime() + days * 86_400_000);
    d.setUTCHours(9, 0, 0, 0);
    return d;
  }

  const OVERDUE = "test_chase_overdue";
  const TODAY = "test_chase_today";
  const UPCOMING = "test_chase_upcoming";
  const NO_TIME = "test_chase_no_time";
  const RECORDED = "test_chase_recorded";
  const OTHER_AGENCY = "test_chase_other_agency";

  const IDS = [OVERDUE, TODAY, UPCOMING, NO_TIME, RECORDED, OTHER_AGENCY];
  const TEST_AGENCY = "00000000-0000-4000-8000-0000000c0010";
  const RIVAL_AGENCY = "00000000-0000-4000-8000-0000000c0011";

  beforeEach(async () => {
    await seedTestAgency(TEST_AGENCY);
    await seedTestAgency(RIVAL_AGENCY);
    await db.insert(profiles).values(
      IDS.map((id) => ({ id, email: `${id.replace(/_/g, "-")}@test.invalid`, fullName: "Ada" }))
    );

    await db.insert(applications).values(
      IDS.map((id) => ({
        orgId: id === OTHER_AGENCY ? RIVAL_AGENCY : TEST_AGENCY,
        travelerId: id,
        status:
          id === RECORDED ? ("awaiting_decision" as const) : ("interview_scheduled" as const),
      }))
    );

    const when: Record<string, Date | null> = {
      [OVERDUE]: inDays(-3),
      [TODAY]: inDays(0),
      [UPCOMING]: inDays(3),
      [NO_TIME]: null,
      [RECORDED]: inDays(-3),
      [OTHER_AGENCY]: inDays(-3),
    };

    for (const id of IDS) {
      const [app] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(inArray(applications.travelerId, [id]));
      await db.insert(attendanceRequests).values({
        applicationId: app.id,
        kind: "interview",
        scheduledFor: when[id],
        place: "Lagos",
        note: null,
      });
    }
  });

  afterEach(async () => {
    await db.delete(applications).where(inArray(applications.travelerId, IDS));
    await db.delete(profiles).where(inArray(profiles.id, IDS));
  });

  it("names a case whose interview has been and gone", async () => {
    const rows = await casesAwaitingInterviewOutcome([TEST_AGENCY], NOW);
    expect(rows.map((r) => r.travelerId)).toContain(OVERDUE);
  });

  it("leaves the day of the interview alone", async () => {
    // Somebody interviewed at 09:30 has not been neglected at lunchtime.
    const rows = await casesAwaitingInterviewOutcome([TEST_AGENCY], NOW);
    expect(rows.map((r) => r.travelerId)).not.toContain(TODAY);
  });

  it("says nothing about an interview still to come", async () => {
    const rows = await casesAwaitingInterviewOutcome([TEST_AGENCY], NOW);
    expect(rows.map((r) => r.travelerId)).not.toContain(UPCOMING);
  });

  it("does not chase an appointment with no time yet", async () => {
    // Nothing has passed, because nothing was set. The agency owes the
    // traveller a date here, which is a different complaint.
    const rows = await casesAwaitingInterviewOutcome([TEST_AGENCY], NOW);
    expect(rows.map((r) => r.travelerId)).not.toContain(NO_TIME);
  });

  it("stops as soon as the outcome has been recorded", async () => {
    // The list exists to be driven to zero, and moving the case on is
    // exactly the action it asks for.
    const rows = await casesAwaitingInterviewOutcome([TEST_AGENCY], NOW);
    expect(rows.map((r) => r.travelerId)).not.toContain(RECORDED);
  });

  it("never reaches across agencies", async () => {
    // The same rule every agency-scoped read in this product follows:
    // a director sees their own clients and nobody else's.
    const rows = await casesAwaitingInterviewOutcome([TEST_AGENCY], NOW);
    expect(rows.map((r) => r.travelerId)).not.toContain(OTHER_AGENCY);
  });

  it("is empty for an agency with nothing outstanding", async () => {
    expect(await casesAwaitingInterviewOutcome([], NOW)).toEqual([]);
  });
});
