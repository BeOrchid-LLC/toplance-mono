import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The review desk's notes on a case. Like `reviewDocumentTx`, these
 * functions decide nothing about access — callers guard with
 * `canWriteCaseNotes` / `canReadCaseNotes` first.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("case notes", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, profiles } = await import("@/lib/db/schema");
  const { addCaseNote, getCaseNotes } = await import("@/lib/data/case-notes");

  const TRAVELLER = "test_notes_traveller";
  const REVIEWER = "test_notes_reviewer";
  let applicationId = "";

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "notes@test.invalid",
      fullName: "Ada",
    });
    await db.insert(profiles).values({
      id: REVIEWER,
      email: "notes-reviewer@test.invalid",
      fullName: "Grace",
      role: "staff",
    });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, intakeComplete: true })
      .returning({ id: applications.id });
    applicationId = app.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, REVIEWER));
  });

  it("records a note with its author", async () => {
    const result = await addCaseNote(
      applicationId,
      REVIEWER,
      "Passport arrives Tuesday — hold the file until then."
    );

    expect(result).toEqual({ ok: true });
    const notes = await getCaseNotes(applicationId);
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe(
      "Passport arrives Tuesday — hold the file until then."
    );
    expect(notes[0].authorName).toBe("Grace");
  });

  it("refuses an empty note", async () => {
    const result = await addCaseNote(applicationId, REVIEWER, "   ");

    expect(result).toHaveProperty("error");
    expect(await getCaseNotes(applicationId)).toHaveLength(0);
  });

  it("refuses a note on an application that does not exist", async () => {
    const result = await addCaseNote(
      "00000000-0000-0000-0000-000000000000",
      REVIEWER,
      "Orphan note."
    );

    expect(result).toHaveProperty("error");
  });

  it("returns notes newest first — the desk reads the latest word", async () => {
    await addCaseNote(applicationId, REVIEWER, "First.");
    await addCaseNote(applicationId, REVIEWER, "Second.");

    const notes = await getCaseNotes(applicationId);
    expect(notes.map((n) => n.body)).toEqual(["Second.", "First."]);
  });

  it("keeps the note but drops the name when the author is deleted", async () => {
    await addCaseNote(applicationId, REVIEWER, "Kept after the author goes.");
    await db.delete(profiles).where(eq(profiles.id, REVIEWER));

    const notes = await getCaseNotes(applicationId);
    expect(notes).toHaveLength(1);
    expect(notes[0].authorName).toBeNull();
  });
});
