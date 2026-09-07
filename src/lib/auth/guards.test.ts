import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";

import type { Actor } from "@/lib/auth/policy";

/**
 * The cross-account boundary, checked against the real database.
 *
 * `src/lib/auth/policy.test.ts` proves the predicates decide correctly.
 * This proves the guard actually applies them to the row it loaded — the
 * half that used to be row-level security's job, and that now exists
 * only in application code. A predicate that is right and a guard that
 * forgets to call it look identical in a unit test.
 *
 * Skipped without a database rather than mocked: mocking the query would
 * test the mock. Run `npm run db:up` to include these.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

/**
 * `getActor` reads the Clerk session, which no test process has. It is
 * the one seam here — everything downstream of it is real.
 */
let actor: Actor | null = null;

vi.mock("@/lib/data/applications", () => ({
  getActor: async () => actor,
}));

const OWNER = "test_guard_owner";
const STRANGER = "test_guard_stranger";
const AGENCY = "test_guard_agency";
const COLLEAGUE = "test_guard_colleague";
const DIRECTOR = "test_guard_director";
const RIVAL = "test_guard_rival";
const PLATFORM = "test_guard_platform";
const USER_IDS = [OWNER, STRANGER, AGENCY, COLLEAGUE, DIRECTOR, RIVAL, PLATFORM];

const ORG_ID = "00000000-0000-4000-8000-00000000f001";
const RIVAL_ORG_ID = "00000000-0000-4000-8000-00000000f002";
const ORG_IDS = [ORG_ID, RIVAL_ORG_ID];
const ABSENT_APPLICATION = "00000000-0000-4000-8000-00000000dead";

describe.skipIf(!hasDb)("requireApplicationAccess", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, orgMembers, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { requireApplicationAccess, requireActor } = await import(
    "@/lib/auth/guards"
  );
  const { ForbiddenError, UnauthenticatedError } = await import(
    "@/lib/auth/errors"
  );
  const {
    canReadApplication,
    canReadDocuments,
    canWriteIntakeAnswers,
  } = await import("@/lib/auth/policy");

  let tenantApplicationId = "";
  /** The same agency's case, already taken by `AGENCY`. */
  let claimedApplicationId = "";

  beforeAll(async () => {
    await db.insert(profiles).values([
      { id: OWNER, email: "owner@test.invalid", fullName: "Owner" },
      { id: STRANGER, email: "stranger@test.invalid", fullName: "Stranger" },
      { id: AGENCY, email: "agency@test.invalid", fullName: "Agency" },
      { id: COLLEAGUE, email: "colleague@test.invalid", fullName: "Colleague" },
      { id: DIRECTOR, email: "director@test.invalid", fullName: "Director" },
      { id: RIVAL, email: "rival@test.invalid", fullName: "Rival" },
      { id: PLATFORM, email: "platform@test.invalid", fullName: "Platform" },
    ]);

    await db.insert(organisations).values([
      { id: ORG_ID, name: "Test Agency Ltd" },
      { id: RIVAL_ORG_ID, name: "Rival Agency Ltd" },
    ]);

    await db.insert(orgMembers).values([
      { orgId: ORG_ID, userId: AGENCY, role: "reviewer" },
      { orgId: ORG_ID, userId: COLLEAGUE, role: "reviewer" },
      { orgId: ORG_ID, userId: DIRECTOR, role: "owner" },
      { orgId: RIVAL_ORG_ID, userId: RIVAL, role: "reviewer" },
    ]);

    const [tenantCase] = await db
      .insert(applications)
      .values({ travelerId: OWNER, orgId: ORG_ID })
      .returning({ id: applications.id });

    const [claimedCase] = await db
      .insert(applications)
      .values({ travelerId: STRANGER, orgId: ORG_ID, assigneeId: AGENCY })
      .returning({ id: applications.id });
    claimedApplicationId = claimedCase.id;

    tenantApplicationId = tenantCase.id;
  });

  afterAll(async () => {
    // Cascades take the applications and the memberships with them.
    await db.delete(profiles).where(inArray(profiles.id, USER_IDS));
    await db.delete(organisations).where(inArray(organisations.id, ORG_IDS));
  });

  function signIn(
    userId: string,
    { orgIds = [], role = "traveler", staffRole = null, orgs }: Partial<Actor> = {}
  ) {
    // Rank defaults to `reviewer`, the narrower of the two: these tests
    // are about tenancy, and one that means "the director" says so by
    // passing `orgs` itself.
    actor = {
      userId,
      role,
      staffRole,
      orgIds,
      orgs: orgs ?? orgIds.map((orgId) => ({ orgId, role: "reviewer" as const })),
    };
  }

  it("lets the traveller write their own intake answers", async () => {
    signIn(OWNER);

    const { application } = await requireApplicationAccess(
      tenantApplicationId,
      canWriteIntakeAnswers
    );

    expect(application.travelerId).toBe(OWNER);
  });

  it("refuses another traveller's application", async () => {
    signIn(STRANGER);

    await expect(
      requireApplicationAccess(tenantApplicationId, canWriteIntakeAnswers)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses an application that does not exist, in the same words", async () => {
    signIn(STRANGER);

    // A distinguishable error would confirm that someone else's case
    // reference exists, which is why both paths raise ForbiddenError.
    const absent = await requireApplicationAccess(
      ABSENT_APPLICATION,
      canReadApplication
    ).catch((error: unknown) => error);

    const forbidden = await requireApplicationAccess(
      tenantApplicationId,
      canReadApplication
    ).catch((error: unknown) => error);

    expect(absent).toBeInstanceOf(ForbiddenError);
    expect(forbidden).toBeInstanceOf(ForbiddenError);
    expect((absent as Error).message).toBe((forbidden as Error).message);
  });

  it("lets the agency that holds the case see the application", async () => {
    // "Holds" literally, since 2026-09-07: the colleague the case was
    // handed to. Working at the agency is no longer reaching its
    // clients — see the narrowing tests below.
    signIn(AGENCY, { orgIds: [ORG_ID], role: "org_member" });

    const { application } = await requireApplicationAccess(
      claimedApplicationId,
      canReadApplication
    );

    expect(application.orgId).toBe(ORG_ID);
  });

  it("lets the agency that holds the case reach the documents", async () => {
    signIn(AGENCY, { orgIds: [ORG_ID], role: "org_member" });

    // Inverted by the v1.3 tenancy: the agency is the reviewer, so
    // reviewing its own traveller's documents is the job it was hired
    // for. This assertion used to say the exact opposite.
    const { application } = await requireApplicationAccess(
      claimedApplicationId,
      canReadDocuments
    );

    expect(application.orgId).toBe(ORG_ID);
  });

  it("never lets another agency reach the case at all", async () => {
    signIn(RIVAL, { orgIds: [RIVAL_ORG_ID], role: "org_member" });

    await expect(
      requireApplicationAccess(tenantApplicationId, canReadApplication)
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      requireApplicationAccess(tenantApplicationId, canReadDocuments)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("never lets platform staff reach a traveller's case", async () => {
    signIn(PLATFORM, { role: "staff", staffRole: "owner" });

    // The claim in every agency's client terms: no one at BeOrchid can
    // open your clients' documents. Not narrowed to an audited
    // exception — there is no branch to narrow.
    await expect(
      requireApplicationAccess(tenantApplicationId, canReadApplication)
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      requireApplicationAccess(tenantApplicationId, canReadDocuments)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("does not let a traveller carrying an org id inherit agency reach", async () => {
    // The hole the old `sponsorsApplication` left: it matched on
    // `orgIds` alone, so any actor holding the id passed. `isAgencyFor`
    // checks the role too.
    signIn(STRANGER, { orgIds: [ORG_ID] });

    await expect(
      requireApplicationAccess(tenantApplicationId, canReadApplication)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  /**
   * The half `policy.test.ts` cannot prove: that the guard hands the
   * predicate a row carrying `assignee_id`.
   *
   * Drop that column from the select and every case looks unheld, so
   * `handlesCase` says yes to the whole agency and the narrowing quietly
   * stops existing. Nothing on screen would change — which is exactly
   * why it is worth a database test.
   */
  describe("the assignment narrowing, through a real row", () => {
    it("refuses a colleague a case nobody has taken", async () => {
      // The correction of 2026-09-07: working at the agency is not
      // reaching a client. Taking the case is, and `canAssignCase` —
      // not this policy — is what allows that.
      signIn(COLLEAGUE, { role: "org_member", orgIds: [ORG_ID] });

      await expect(
        requireApplicationAccess(tenantApplicationId, canReadDocuments)
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("lets the director open the case nobody has taken", async () => {
      signIn(DIRECTOR, {
        role: "org_member",
        orgIds: [ORG_ID],
        orgs: [{ orgId: ORG_ID, role: "owner" }],
      });

      const { application } = await requireApplicationAccess(
        tenantApplicationId,
        canReadDocuments
      );

      expect(application.assigneeId).toBeNull();
    });

    it("refuses a colleague who is not handling the case", async () => {
      signIn(COLLEAGUE, { role: "org_member", orgIds: [ORG_ID] });

      await expect(
        requireApplicationAccess(claimedApplicationId, canReadDocuments)
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("lets the colleague who holds it through", async () => {
      signIn(AGENCY, { role: "org_member", orgIds: [ORG_ID] });

      const { application } = await requireApplicationAccess(
        claimedApplicationId,
        canReadDocuments
      );

      expect(application.assigneeId).toBe(AGENCY);
    });

    it("lets the agency's director through whoever holds it", async () => {
      signIn(DIRECTOR, {
        role: "org_member",
        orgIds: [ORG_ID],
        orgs: [{ orgId: ORG_ID, role: "owner" }],
      });

      await expect(
        requireApplicationAccess(claimedApplicationId, canReadDocuments)
      ).resolves.toBeDefined();
    });

    it("still refuses a rival agency, held or not", async () => {
      signIn(RIVAL, { role: "org_member", orgIds: [RIVAL_ORG_ID] });

      await expect(
        requireApplicationAccess(tenantApplicationId, canReadDocuments)
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        requireApplicationAccess(claimedApplicationId, canReadDocuments)
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  it("refuses a request with no session", async () => {
    actor = null;

    await expect(requireActor()).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      requireApplicationAccess(tenantApplicationId, canReadApplication)
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
