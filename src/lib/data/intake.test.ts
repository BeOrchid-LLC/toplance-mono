import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { INTAKE_QUESTIONS } from "@/lib/domain/intake";

/**
 * Recording one intake answer, with the truncation and the checklist
 * build that follow it.
 *
 * This is the body the `answerQuestion` action used to carry inline,
 * lifted out so it can be tested against a real database — an action
 * carries a Clerk session and `revalidatePath`, neither of which exists
 * in a test process. Now that two callers write answers (the scripted
 * chips and the model's `record_answer` tool), the rules below are the
 * ones both of them inherit. It decides nothing about access; its
 * callers guard first.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("recordIntakeAnswer", async () => {
  const { db } = await import("@/lib/db/client");
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, documents, intakeAnswers, profiles } = await import(
    "@/lib/db/schema"
  );
  const { recordIntakeAnswer } = await import("@/lib/data/intake");

  const TRAVELLER = "test_intake_traveller";

  /** Every case belongs to an agency since v1.3. */
  const TEST_AGENCY = "00000000-0000-4000-8000-0000000c0009";

  let applicationId = "";

  /** The one corridor shape the seeded `corridors` table can serve. */
  const SERVED: Record<string, string> = {
    nationality: "Nigeria",
    destination: "United Kingdom",
    purpose: "Work",
  };

  beforeEach(async () => {
    await seedTestAgency(TEST_AGENCY);
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "intake@test.invalid", fullName: "Ada" });

    const [app] = await db
      .insert(applications)
      .values({ orgId: TEST_AGENCY, travelerId: TRAVELLER })
      .returning({ id: applications.id });
    applicationId = app.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
  });

  async function answerAll(overrides: Record<string, string> = {}) {
    let last;
    for (const question of INTAKE_QUESTIONS) {
      last = await recordIntakeAnswer(
        applicationId,
        question.key,
        overrides[question.key] ?? SERVED[question.key] ?? "Something",
        TRAVELLER
      );
    }
    return last;
  }

  async function storedAnswers() {
    const rows = await db
      .select({
        questionKey: intakeAnswers.questionKey,
        value: intakeAnswers.value,
      })
      .from(intakeAnswers)
      .where(eq(intakeAnswers.applicationId, applicationId));

    return Object.fromEntries(rows.map((r) => [r.questionKey, r.value]));
  }

  async function application() {
    const [row] = await db
      .select({
        intakeComplete: applications.intakeComplete,
        corridorId: applications.corridorId,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.id, applicationId));
    return row;
  }

  it("records an answer and reports the intake unfinished", async () => {
    const result = await recordIntakeAnswer(
      applicationId,
      "nationality",
      "Nigeria",
      TRAVELLER
    );

    expect(result).toEqual({ complete: false });
    expect(await storedAnswers()).toEqual({ nationality: "Nigeria" });
  });

  it("overwrites an answer rather than storing it twice", async () => {
    await recordIntakeAnswer(applicationId, "nationality", "Ghana", TRAVELLER);
    await recordIntakeAnswer(applicationId, "nationality", "Kenya", TRAVELLER);

    expect(await storedAnswers()).toEqual({ nationality: "Kenya" });
  });

  it("clears everything after a re-answered question", async () => {
    await recordIntakeAnswer(applicationId, "nationality", "Nigeria", TRAVELLER);
    await recordIntakeAnswer(applicationId, "residence", "Lagos", TRAVELLER);
    await recordIntakeAnswer(
      applicationId,
      "destination",
      "United Kingdom",
      TRAVELLER
    );

    await recordIntakeAnswer(applicationId, "nationality", "Ghana", TRAVELLER);

    expect(await storedAnswers()).toEqual({ nationality: "Ghana" });
  });

  it("builds the checklist once the last answer lands on a served corridor", async () => {
    const result = await answerAll();

    expect(result).toEqual({ complete: true });

    const app = await application();
    expect(app.intakeComplete).toBe(true);
    expect(app.corridorId).not.toBeNull();
    expect(app.status).toBe("collecting_documents");

    const checklist = await db
      .select({ docKey: documents.docKey })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
    expect(checklist.length).toBeGreaterThan(0);
  });

  it("completes an unserved corridor without inventing a checklist", async () => {
    const result = await answerAll({ destination: "Narnia" });

    expect(result).toEqual({ complete: true });

    const app = await application();
    expect(app.intakeComplete).toBe(true);
    expect(app.corridorId).toBeNull();

    const checklist = await db
      .select({ docKey: documents.docKey })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
    expect(checklist).toHaveLength(0);
  });

  it("clears a resolved corridor when a correction lands on an unserved one", async () => {
    await answerAll();
    expect((await application()).corridorId).not.toBeNull();

    // Correcting nationality to a passport we have no code for must not
    // leave the old corridor on the application — the laminate header
    // reads `corridorId`, and a stale link shows the traveller a
    // corridor their answers no longer describe.
    const result = await answerAll({ nationality: "Uzbekistan" });

    expect(result).toEqual({ complete: true });
    expect((await application()).corridorId).toBeNull();
  });

  it("reopens a completed intake when an earlier answer changes", async () => {
    await answerAll();

    const result = await recordIntakeAnswer(
      applicationId,
      "purpose",
      "Study",
      TRAVELLER
    );

    expect(result).toEqual({ complete: false });
    expect((await application()).intakeComplete).toBe(false);
  });

  it("refuses a question key that is not on the list", async () => {
    const result = await recordIntakeAnswer(
      applicationId,
      "favourite_colour",
      "Blue",
      TRAVELLER
    );

    expect(result).toEqual({ error: "Unknown question." });
    expect(await storedAnswers()).toEqual({});
  });

  it("flags a passport nothing covers yet, and still records the answer", async () => {
    // At selection, not eleven questions later. Without this a Ghanaian
    // traveller answers the whole intake and meets an empty checklist
    // with no explanation — the product silently failing rather than
    // honestly declining.
    const result = await recordIntakeAnswer(
      applicationId,
      "nationality",
      "Ghana",
      TRAVELLER
    );

    expect(result).toEqual({ complete: false, unservedNationality: true });

    // Recorded regardless: the answer is what the interest log counts,
    // and which passport to curate next should come from who asked.
    const stored = await db
      .select({ value: intakeAnswers.value, code: intakeAnswers.code })
      .from(intakeAnswers)
      .where(
        and(
          eq(intakeAnswers.applicationId, applicationId),
          eq(intakeAnswers.questionKey, "nationality")
        )
      );
    expect(stored).toEqual([{ value: "Ghana", code: "Ghana" }]);
  });

  it("says nothing about a passport that is covered", async () => {
    const result = await recordIntakeAnswer(
      applicationId,
      "nationality",
      "Nigeria",
      TRAVELLER
    );

    expect(result).toEqual({ complete: false });
  });

  /**
   * The intake once the case has left the traveller's hands — the bug of
   * 10 September.
   *
   * Both branches of `recordIntakeAnswer` wrote to the application row
   * unconditionally, and both of them undid a submission.
   *
   * The complete branch ended `buildChecklist` with
   * `status: "collecting_documents"`, so one re-answered question put a
   * case that was already with the desk back into the traveller's hands.
   * It carried no `status_events` row — this is not `changeStatusTx` —
   * so nothing appeared in the timeline and nobody was told. What the
   * traveller saw was the green sheet and their Submit button back, on a
   * checklist still fully verified, immediately after being told the
   * file had gone.
   *
   * The incomplete branch reached the same place by the other column:
   * answering anything but the last question deletes the answers after
   * it, `intake_complete` went false, and `/app/documents` redirects on
   * that — so a submitted case bounced its own owner to the intake
   * agent.
   *
   * The answers themselves are still recorded on both paths. A traveller
   * correcting their name after submitting is telling the truth about
   * something, and the desk should read it; what must not follow is the
   * case moving.
   */
  describe("after the case has been submitted", () => {
    beforeEach(async () => {
      await answerAll();
      await db
        .update(applications)
        .set({ status: "submitted", submittedAt: new Date() })
        .where(eq(applications.id, applicationId));
    });

    it("does not un-submit a case by rebuilding its checklist", async () => {
      const last = INTAKE_QUESTIONS[INTAKE_QUESTIONS.length - 1];
      await recordIntakeAnswer(applicationId, last.key, "Within a month", TRAVELLER);

      const app = await application();
      expect(app.status).toBe("submitted");
      expect(app.intakeComplete).toBe(true);
    });

    it("does not send a submitted traveller back to the intake agent", async () => {
      // Re-answering question one truncates the rest, so this is the
      // branch that writes `intake_complete = false`.
      await recordIntakeAnswer(
        applicationId,
        INTAKE_QUESTIONS[0].key,
        "Ada Lovelace",
        TRAVELLER
      );

      const app = await application();
      expect(app.status).toBe("submitted");
      expect(app.intakeComplete).toBe(true);
    });

    it("records the answer all the same", async () => {
      await recordIntakeAnswer(
        applicationId,
        INTAKE_QUESTIONS[0].key,
        "Ada Lovelace",
        TRAVELLER
      );

      expect(await storedAnswers()).toMatchObject({
        [INTAKE_QUESTIONS[0].key]: "Ada Lovelace",
      });
    });
  });

});
