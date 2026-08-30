import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

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
  const { applications, documents, intakeAnswers, profiles } = await import(
    "@/lib/db/schema"
  );
  const { recordIntakeAnswer } = await import("@/lib/data/intake");

  const TRAVELLER = "test_intake_traveller";
  let applicationId = "";

  /** The one corridor shape the seeded `corridors` table can serve. */
  const SERVED: Record<string, string> = {
    nationality: "Nigeria",
    destination: "United Kingdom",
    purpose: "Work",
  };

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "intake@test.invalid", fullName: "Ada" });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER })
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
});
