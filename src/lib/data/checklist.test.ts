import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import type { AppliesWhen } from "@/lib/domain/applies-when";

/**
 * Materialising a rule set into an application's checklist.
 *
 * This used to live only inside the intake action, which ran it exactly
 * once — at the moment the final answer landed. Staging showed what that
 * assumption costs: intake completed while the corridors table was
 * empty, and the application was left permanently checklist-less even
 * after the data arrived, because nothing ever revisits the decision.
 * `adoptRuleSet` is the revisitable version, and these tests pin the
 * properties both callers rely on.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("adoptRuleSet", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, corridors, documents, profiles } = await import(
    "@/lib/db/schema"
  );
  const { adoptRuleSet } = await import("@/lib/data/checklist");

  const TRAVELLER = "test_adopt_traveller";
  let applicationId = "";
  let corridorId = "";

  /** `[docKey, name, sortOrder, description?]`. */
  type Req = [string, string, number, (string | null)?];

  const ruleSet = (requirements: Req[], corridor: string | null = corridorId) => ({
    corridorId: corridor,
    provider: "curated",
    attribution: null,
    contributions: [],
    allowedStay: null,
    passportValidity: null,
    embassyUrl: null,
    evisaUrl: null,
    registrationName: null,
    registrationUrl: null,
    visaName: "Test Visa",
    version: 1,
    effectiveFrom: "2026-01-01",
    lastVerifiedAt: null,
    sourceName: null,
    sourceUrl: null,
    processingWeeksMin: null,
    processingWeeksMax: null,
    governmentFeeMinor: null,
    governmentFeeCurrency: null,
    requirements: requirements.map(([docKey, name, sortOrder, description]) => ({
      docKey,
      name,
      description: description ?? null,
      category: "identity",
      isRequired: true,
      sortOrder,
      sourceUrl: null,
      // Widened so a test can attach a rule to a copy of this fixture;
      // inferred from `null` it would be typed as `null` forever.
      appliesWhen: null as AppliesWhen | null,
    })),
  });

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: TRAVELLER, email: "adopt@test.invalid", fullName: "Ada" });

    const [app] = await db
      .insert(applications)
      .values({ travelerId: TRAVELLER, intakeComplete: true })
      .returning({ id: applications.id });
    applicationId = app.id;

    const [corridor] = await db
      .insert(corridors)
      .values({
        nationalityIso: "zz",
        destinationIso: "zz",
        purpose: "work",
        visaName: "Test Visa",
      })
      .returning({ id: corridors.id });
    corridorId = corridor.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(corridors).where(eq(corridors.id, corridorId));
  });

  async function checklist() {
    return db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(documents.sortOrder);
  }

  it("materialises the checklist and points the application at the corridor", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1],
        ["funds", "Bank statements", 2],
      ])
    );

    const docs = await checklist();
    expect(docs.map((d) => d.docKey)).toEqual(["passport", "funds"]);
    expect(docs.every((d) => d.state === "not_started")).toBe(true);

    const [app] = await db
      .select({ corridorId: applications.corridorId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    expect(app.corridorId).toBe(corridorId);
  });

  it("is idempotent — adopting the same rule set twice adds nothing", async () => {
    const rules = ruleSet([["passport", "Passport", 1]]);
    await adoptRuleSet(applicationId, rules);
    await adoptRuleSet(applicationId, rules);

    expect(await checklist()).toHaveLength(1);
  });

  it("keeps an uploaded document when the corridor changes", async () => {
    await adoptRuleSet(applicationId, ruleSet([["passport", "Passport", 1]]));

    await db
      .update(documents)
      .set({ state: "verified", storagePath: "somewhere/passport.jpg" })
      .where(eq(documents.applicationId, applicationId));

    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1],
        ["photos", "Photographs", 2],
      ])
    );

    const docs = await checklist();
    expect(docs).toHaveLength(2);
    expect(docs.find((d) => d.docKey === "passport")?.state).toBe("verified");
  });

  /**
   * The upload screen used to read guidance by joining
   * `applications.corridor_id` → `corridor_requirements`. That link is
   * null for every rule set with no row of ours behind it — an API
   * provider answering, or an application a re-seed detached — and the
   * traveller silently got bare document names with no instructions.
   *
   * The fix is that a checklist row carries its own guidance, so these
   * three pin the property the screen now depends on.
   */
  it("copies each requirement's guidance onto the checklist row", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1, "Valid for the whole period of stay."],
        ["funds", "Bank statements", 2, "Three full months, every page."],
      ])
    );

    const docs = await checklist();
    expect(docs.map((d) => d.description)).toEqual([
      "Valid for the whole period of stay.",
      "Three full months, every page.",
    ]);
  });

  it("carries guidance for a rule set with no corridor row behind it", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([["passport", "Passport", 1, "Bio page only."]], null)
    );

    const [doc] = await checklist();
    expect(doc.description).toBe("Bio page only.");

    // The condition that made this a latent bug rather than a visible
    // one: nothing to join through, and the guidance survives anyway.
    const [app] = await db
      .select({ corridorId: applications.corridorId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    expect(app.corridorId).toBeNull();
  });

  it("refreshes guidance on a row the traveller has already uploaded", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([["passport", "Passport", 1, "Old wording."]])
    );

    await db
      .update(documents)
      .set({ state: "verified", storagePath: "somewhere/passport.jpg" })
      .where(eq(documents.applicationId, applicationId));

    await adoptRuleSet(
      applicationId,
      ruleSet([["passport", "Passport", 1, "The mission reworded this."]])
    );

    const [doc] = await checklist();
    // Guidance updates for everyone the moment a mission changes it —
    // the property the old join gave for free and a copy must not lose.
    expect(doc.description).toBe("The mission reworded this.");
    // ...without disturbing the upload it describes.
    expect(doc.state).toBe("verified");
  });

  it("drops an untouched row the rule set no longer asks for", async () => {
    await adoptRuleSet(
      applicationId,
      ruleSet([
        ["passport", "Passport", 1],
        ["tb_test", "TB test", 2],
      ])
    );

    await adoptRuleSet(applicationId, ruleSet([["passport", "Passport", 1]]));

    expect((await checklist()).map((d) => d.docKey)).toEqual(["passport"]);
  });

  /**
   * The 01/09 review, in the client's words: "We shouldn't give the
   * travellers a list with 'only if it applies'. That's exactly the
   * thing we exist to solve." A conditional requirement carrying a rule
   * is decided here, against the answers, before the traveller ever sees
   * it — so what reaches the checklist is theirs rather than a maybe.
   */
  describe("conditional requirements", () => {
    /** A rule set whose second document only applies to a partner. */
    const withSpouseRule = () => {
      const set = ruleSet([
        ["passport", "Passport", 1],
        ["marriage_cert", "Marriage certificate", 2],
      ]);

      set.requirements[1].isRequired = false;
      set.requirements[1].appliesWhen = [
        { answer: "companions", in: ["Partner", "Partner and children"] },
      ];

      return set;
    };

    it("makes a matched document required for that traveller", async () => {
      await adoptRuleSet(applicationId, withSpouseRule(), {
        companions: "Partner",
      });

      const row = (await checklist()).find((d) => d.docKey === "marriage_cert");

      // Not merely present: required. For this traveller it is not a
      // maybe, and a checklist that still called it optional would be
      // the same hedge in smaller type.
      expect(row?.isRequired).toBe(true);
    });

    it("leaves an unmatched document off the checklist entirely", async () => {
      await adoptRuleSet(applicationId, withSpouseRule(), {
        companions: "Just me",
      });

      expect((await checklist()).map((d) => d.docKey)).toEqual(["passport"]);
    });

    it("keeps the hedge when no rule has been written", async () => {
      const set = ruleSet([
        ["passport", "Passport", 1],
        ["bank_statement", "Bank statement", 2],
      ]);
      set.requirements[1].isRequired = false;

      await adoptRuleSet(applicationId, set, { companions: "Just me" });

      const row = (await checklist()).find((d) => d.docKey === "bank_statement");

      // Present, and still optional. Until somebody writes the rule, the
      // honest answer is "this might be yours" — dropping it would be a
      // confident guess against a traveller's file.
      expect(row?.isRequired).toBe(false);
    });

    it("behaves as it always did when given no answers at all", async () => {
      // The old two-argument call. Every conditional document is
      // materialised with its hedge intact, which is what the intake
      // did before conditions existed.
      await adoptRuleSet(applicationId, withSpouseRule());

      const row = (await checklist()).find((d) => d.docKey === "marriage_cert");

      expect(row?.isRequired).toBe(false);
    });

    it("removes a document that stops applying, unless it was uploaded", async () => {
      await adoptRuleSet(applicationId, withSpouseRule(), {
        companions: "Partner",
      });

      // The traveller reopens the answer and is now going alone.
      await adoptRuleSet(applicationId, withSpouseRule(), {
        companions: "Just me",
      });

      expect((await checklist()).map((d) => d.docKey)).toEqual(["passport"]);
    });

    it("keeps an uploaded document even after it stops applying", async () => {
      await adoptRuleSet(applicationId, withSpouseRule(), {
        companions: "Partner",
      });

      await db
        .update(documents)
        .set({ state: "checking" })
        .where(
          and(
            eq(documents.applicationId, applicationId),
            eq(documents.docKey, "marriage_cert")
          )
        );

      await adoptRuleSet(applicationId, withSpouseRule(), {
        companions: "Just me",
      });

      // Deleting a file somebody uploaded because they later changed an
      // answer is not a checklist decision, and their reviewer may
      // already be looking at it.
      expect((await checklist()).map((d) => d.docKey)).toContain("marriage_cert");
    });
  });
});

/**
 * When a traveller's required checklist reaches 100%.
 *
 * Brief items 9 and 11: "When score reaches 100%, trigger an automatic
 * admin notification", and the admin "must be notified immediately
 * (email + dashboard alert) when any user reaches 100% document
 * completion". Until this existed the only thing that reached the review
 * desk was the traveller pressing Submit — so somebody who uploaded
 * every document and then stopped was invisible, which is exactly the
 * person most worth a nudge.
 *
 * It deliberately mirrors `markBillableIfComplete` and deliberately
 * differs from it in one place: billing needs an organisation to charge
 * and returns early without one, while a traveller who came on their own
 * still has to reach a reviewer.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "markChecklistCompleteIfDone",
  async () => {
    const { db } = await import("@/lib/db/client");
    const { applications, documents, profiles } = await import("@/lib/db/schema");
    const { markChecklistCompleteIfDone } = await import("@/lib/data/checklist");

    const TRAVELLER = "test_complete_traveller";
    let applicationId = "";

    const completeAt = async () => {
      const [row] = await db
        .select({ at: applications.checklistCompleteAt })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1);
      return row?.at ?? null;
    };

    const setState = async (
      docKey: string,
      state: "checking" | "flagged" | "verified"
    ) => {
      // Scoped to this application as well as the key. `passport` is a
      // docKey on nearly every application in the database, so a clause
      // on docKey alone rewrites other suites' fixtures.
      await db
        .update(documents)
        .set({ state })
        .where(
          and(
            eq(documents.applicationId, applicationId),
            eq(documents.docKey, docKey)
          )
        );
    };

    beforeEach(async () => {
      // Delete-then-insert: an interrupted run leaves the profile behind,
      // and a bare insert would fail every later run on the primary key.
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
      await db.insert(profiles).values({
        id: TRAVELLER,
        fullName: "Completion Test",
        email: `${TRAVELLER}@test.invalid`,
      });

      const [app] = await db
        .insert(applications)
        .values({ travelerId: TRAVELLER })
        .returning({ id: applications.id });
      applicationId = app.id;

      await db.insert(documents).values([
        { applicationId, docKey: "passport", name: "Passport", isRequired: true, sortOrder: 1 },
        { applicationId, docKey: "cas", name: "CAS", isRequired: true, sortOrder: 2 },
        { applicationId, docKey: "tb", name: "TB test", isRequired: false, sortOrder: 3 },
      ]);
    });

    afterEach(async () => {
      await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    });

    it("stays quiet while the checklist is still being filled", async () => {
      await setState("passport", "checking");

      const result = await markChecklistCompleteIfDone(db, applicationId);

      expect(result.becameComplete).toBe(false);
      expect(await completeAt()).toBeNull();
    });

    it("fires once every required document is collected", async () => {
      await setState("passport", "checking");
      await setState("cas", "checking");

      const result = await markChecklistCompleteIfDone(db, applicationId);

      expect(result.becameComplete).toBe(true);
      expect(await completeAt()).toBeInstanceOf(Date);
    });

    it("does not wait on an optional document", async () => {
      await setState("passport", "checking");
      await setState("cas", "verified");

      const result = await markChecklistCompleteIfDone(db, applicationId);

      expect(result.becameComplete).toBe(true);
    });

    it("fires for a traveller who came on their own", async () => {
      // The one place this parts company with `markBillableIfComplete`,
      // which returns early without an `org_id` because there is nobody
      // to charge. There is still somebody to review.
      await setState("passport", "checking");
      await setState("cas", "checking");

      const result = await markChecklistCompleteIfDone(db, applicationId);

      expect(result.becameComplete).toBe(true);
    });

    it("notifies once, however often the checklist re-completes", async () => {
      // Complete, a reviewer flags one, the traveller re-uploads. That is
      // one traveller reaching the desk, not two.
      await setState("passport", "checking");
      await setState("cas", "checking");
      await markChecklistCompleteIfDone(db, applicationId);
      const first = await completeAt();

      await setState("cas", "flagged");
      await markChecklistCompleteIfDone(db, applicationId);

      await setState("cas", "verified");
      const again = await markChecklistCompleteIfDone(db, applicationId);

      expect(again.becameComplete).toBe(false);
      expect((await completeAt())?.getTime()).toBe(first?.getTime());
    });

    it("says nothing about an application with no required documents", async () => {
      await db.delete(documents).where(eq(documents.applicationId, applicationId));

      const result = await markChecklistCompleteIfDone(db, applicationId);

      expect(result.becameComplete).toBe(false);
      expect(await completeAt()).toBeNull();
    });
  }
);
