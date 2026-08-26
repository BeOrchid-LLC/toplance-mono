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
const SPONSOR = "test_guard_sponsor";
const USER_IDS = [OWNER, STRANGER, SPONSOR];

const ORG_ID = "00000000-0000-4000-8000-00000000f001";
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

  let sponsoredApplicationId = "";

  beforeAll(async () => {
    await db.insert(profiles).values([
      { id: OWNER, email: "owner@test.invalid", fullName: "Owner" },
      { id: STRANGER, email: "stranger@test.invalid", fullName: "Stranger" },
      { id: SPONSOR, email: "sponsor@test.invalid", fullName: "Sponsor" },
    ]);

    await db
      .insert(organisations)
      .values({ id: ORG_ID, name: "Test Sponsor Ltd" });

    await db
      .insert(orgMembers)
      .values({ orgId: ORG_ID, userId: SPONSOR, role: "hr_admin" });

    const [sponsored] = await db
      .insert(applications)
      .values({ travelerId: OWNER, orgId: ORG_ID })
      .returning({ id: applications.id });

    sponsoredApplicationId = sponsored.id;
  });

  afterAll(async () => {
    // Cascades take the applications and the membership with them.
    await db.delete(profiles).where(inArray(profiles.id, USER_IDS));
    await db.delete(organisations).where(inArray(organisations.id, [ORG_ID]));
  });

  function signIn(userId: string, orgIds: string[] = []) {
    actor = { userId, role: "traveler", staffRole: null, orgIds };
  }

  it("lets the traveller write their own intake answers", async () => {
    signIn(OWNER);

    const { application } = await requireApplicationAccess(
      sponsoredApplicationId,
      canWriteIntakeAnswers
    );

    expect(application.travelerId).toBe(OWNER);
  });

  it("refuses another traveller's application", async () => {
    signIn(STRANGER);

    await expect(
      requireApplicationAccess(sponsoredApplicationId, canWriteIntakeAnswers)
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
      sponsoredApplicationId,
      canReadApplication
    ).catch((error: unknown) => error);

    expect(absent).toBeInstanceOf(ForbiddenError);
    expect(forbidden).toBeInstanceOf(ForbiddenError);
    expect((absent as Error).message).toBe((forbidden as Error).message);
  });

  it("lets a sponsoring organisation see the application", async () => {
    signIn(SPONSOR, [ORG_ID]);

    const { application } = await requireApplicationAccess(
      sponsoredApplicationId,
      canReadApplication
    );

    expect(application.orgId).toBe(ORG_ID);
  });

  it("never lets a sponsoring organisation reach the documents", async () => {
    signIn(SPONSOR, [ORG_ID]);

    // The privacy boundary the employer console is built on: an employer
    // sees that someone is at 60%, never which passport page failed.
    await expect(
      requireApplicationAccess(sponsoredApplicationId, canReadDocuments)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a request with no session", async () => {
    actor = null;

    await expect(requireActor()).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      requireApplicationAccess(sponsoredApplicationId, canReadApplication)
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
