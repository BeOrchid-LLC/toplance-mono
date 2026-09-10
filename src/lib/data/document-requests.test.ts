import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

/**
 * A reviewer asking one traveller for a document the corridor never
 * listed.
 *
 * Until this existed the desk could send a case back with "Additional
 * documents needed" and write a sentence about what it wanted, but had
 * no way to put the document on the checklist — every `documents` row
 * came out of `adoptRuleSet`, from corridor requirements. The traveller
 * read "Everything is verified. Nothing else is waiting on you" beside a
 * status card asking for documents, and had nowhere to upload to.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("document requests", async () => {
  const { db } = await import("@/lib/db/client");
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, documents, profiles } = await import("@/lib/db/schema");
  const { requestDocumentTx, withdrawDocumentRequestTx } = await import(
    "@/lib/data/document-requests"
  );

  const TRAVELLER = "test_docreq_traveller";
  const REVIEWER = "test_docreq_reviewer";
  const TEST_AGENCY = "00000000-0000-4000-8000-0000000c0015";

  let applicationId = "";

  beforeEach(async () => {
    await seedTestAgency(TEST_AGENCY);

    await db.insert(profiles).values([
      { id: TRAVELLER, email: "docreq-traveller@test.invalid", fullName: "Ada" },
      { id: REVIEWER, email: "docreq-reviewer@test.invalid", fullName: "Remi" },
    ]);

    const [app] = await db
      .insert(applications)
      .values({
        orgId: TEST_AGENCY,
        travelerId: TRAVELLER,
        intakeComplete: true,
        status: "under_review",
      })
      .returning({ id: applications.id });
    applicationId = app.id;

    await db.insert(documents).values({
      applicationId,
      docKey: "passport",
      name: "Passport",
      sortOrder: 0,
    });
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, REVIEWER));
  });

  async function rowFor(docKey: string) {
    const [row] = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.applicationId, applicationId), eq(documents.docKey, docKey))
      );
    return row;
  }

  describe("requestDocumentTx", () => {
    it("puts the document on the traveller's checklist", async () => {
      const result = await requestDocumentTx(
        applicationId,
        "Bank statements, last 6 months",
        "Every page, showing your name.",
        REVIEWER
      );

      expect(result).toMatchObject({ ok: true, travelerId: TRAVELLER });

      const row = await rowFor("bank_statements_last_6_months");
      expect(row).toMatchObject({
        name: "Bank statements, last 6 months",
        description: "Every page, showing your name.",
        source: "agency",
        requestedBy: REVIEWER,
        state: "not_started",
      });
    });

    it("makes it required, so the case cannot be sent back without it", async () => {
      // The desk is asking because they need it. An optional request is
      // a request the traveller can submit straight past, which is the
      // state this whole feature exists to end.
      await requestDocumentTx(applicationId, "Police certificate", "", REVIEWER);

      expect((await rowFor("police_certificate")).isRequired).toBe(true);
    });

    it("refuses a document already on the checklist", async () => {
      // `unique(applicationId, docKey)` would refuse this anyway, as a
      // 23505 reaching the reviewer as a 500. The point of catching it
      // here is that they get a sentence instead.
      const result = await requestDocumentTx(applicationId, "Passport", "", REVIEWER);

      expect(result).toEqual({
        error: "That document is already on their checklist.",
      });
    });

    it("refuses a name that slugifies to nothing", async () => {
      // `toDocKey` strips everything but letters and digits, so a name
      // of punctuation alone would key the row on an empty string.
      const result = await requestDocumentTx(applicationId, "???", "", REVIEWER);

      expect(result).toEqual({ error: "Give the document a name." });
    });

    it("refuses on a case that has already been decided", async () => {
      // `approved` and `rejected` are terminal and the traveller cannot
      // submit from either, so a required row added here could never be
      // cleared by anyone — it would sit on a closed checklist dragging
      // the completion ring down with no way out.
      await db
        .update(applications)
        .set({ status: "approved" })
        .where(eq(applications.id, applicationId));

      const result = await requestDocumentTx(
        applicationId,
        "Police certificate",
        "",
        REVIEWER
      );

      expect(result).toEqual({
        error: "That case has been decided. Nothing more can be asked for.",
      });
    });
  });

  describe("withdrawDocumentRequestTx", () => {
    it("takes an untouched request back off the checklist", async () => {
      await requestDocumentTx(applicationId, "Police certificate", "", REVIEWER);

      const result = await withdrawDocumentRequestTx(
        applicationId,
        "police_certificate"
      );

      expect(result).toMatchObject({ ok: true, documentName: "Police certificate" });
      expect(await rowFor("police_certificate")).toBeUndefined();
    });

    it("refuses once the traveller has uploaded to it", async () => {
      // The guarantee the confirm dialog is allowed to make: no click on
      // the agency side destroys a file somebody uploaded. This product
      // keeps no other copy of it.
      await requestDocumentTx(applicationId, "Police certificate", "", REVIEWER);
      await db
        .update(documents)
        .set({ state: "checking", storagePath: "somewhere/police.pdf" })
        .where(
          and(
            eq(documents.applicationId, applicationId),
            eq(documents.docKey, "police_certificate")
          )
        );

      const result = await withdrawDocumentRequestTx(
        applicationId,
        "police_certificate"
      );

      expect(result).toEqual({
        error: "They have already uploaded this. Review the file instead.",
      });
      expect(await rowFor("police_certificate")).toBeDefined();
    });

    it("refuses to touch a document the corridor asked for", async () => {
      // Withdrawing is the undo of requesting, not a delete button for
      // the checklist. A corridor requirement is removed by revising the
      // corridor, which reaches every traveller on it.
      const result = await withdrawDocumentRequestTx(applicationId, "passport");

      expect(result).toEqual({
        error: "The corridor asks for that one. Revise the corridor to drop it.",
      });
      expect(await rowFor("passport")).toBeDefined();
    });
  });
});
