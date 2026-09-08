import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";

import type { Actor } from "@/lib/auth/policy";
import type { Profile } from "@/lib/db/schema";

/**
 * The console's preamble, against the real database.
 *
 * One claim, and it is about a redirect that must not happen. A member
 * of a suspended agency holds an `org_members` row and no live `orgId`
 * — `liveMembershipsFor` drops the membership, which is how suspension
 * is enforced everywhere at once. The paywall added in `cd6e81c` read
 * the membership row instead, decided the agency owed money, and sent
 * the visitor to `/agency/billing`; that page cannot open without an
 * `orgId` and sends them back. The browser gives up with
 * ERR_TOO_MANY_REDIRECTS.
 *
 * Skipped without a database rather than mocked — mocking the two
 * queries that disagreed would test the mock, and the disagreement was
 * the bug.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

/** The Clerk session is the one seam; everything below it is real. */
let profile: Profile | null = null;
let actor: Actor | null = null;

vi.mock("@/lib/data/applications", () => ({
  getProfile: async () => profile,
  getActor: async () => actor,
}));

/**
 * `redirect()` throws in Next so the caller never continues. Throwing a
 * marker keeps that shape and makes the destination assertable.
 */
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect(${to})`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
  notFound: () => {
    throw new Error("notFound()");
  },
}));

const SUSPENDED_MEMBER = "test_console_suspended";
const LIVE_MEMBER = "test_console_live";
const USER_IDS = [SUSPENDED_MEMBER, LIVE_MEMBER];

const SUSPENDED_ORG = "00000000-0000-4000-8000-00000000c001";
const LIVE_ORG = "00000000-0000-4000-8000-00000000c002";
const ORG_IDS = [SUSPENDED_ORG, LIVE_ORG];

describe.skipIf(!hasDb)("resolveAgencyConsole", async () => {
  const { db } = await import("@/lib/db/client");
  const { orgMembers, organisations, profiles } = await import(
    "@/lib/db/schema"
  );
  const { resolveAgencyConsole } = await import(
    "@/app/[locale]/agency/console"
  );

  beforeAll(async () => {
    await db.insert(organisations).values([
      { id: SUSPENDED_ORG, name: "Suspended Agency", suspendedAt: new Date() },
      { id: LIVE_ORG, name: "Live Agency" },
    ]);

    await db.insert(profiles).values([
      {
        id: SUSPENDED_MEMBER,
        email: "suspended@test.invalid",
        fullName: "Suspended Owner",
        role: "org_member",
      },
      {
        id: LIVE_MEMBER,
        email: "live@test.invalid",
        fullName: "Live Owner",
        role: "org_member",
      },
    ]);

    await db.insert(orgMembers).values([
      { orgId: SUSPENDED_ORG, userId: SUSPENDED_MEMBER, role: "owner" },
      { orgId: LIVE_ORG, userId: LIVE_MEMBER, role: "owner" },
    ]);
  });

  afterAll(async () => {
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, ORG_IDS));
    await db.delete(organisations).where(inArray(organisations.id, ORG_IDS));
    await db.delete(profiles).where(inArray(profiles.id, USER_IDS));
  });

  /** Signs the given fixture in, with the `orgIds` suspension leaves them. */
  async function signIn(userId: string, orgIds: string[]) {
    const [row] = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.id, [userId]));

    profile = row;
    actor = {
      userId,
      role: "org_member",
      staffRole: null,
      orgIds,
      orgs: orgIds.map((orgId) => ({ orgId, role: "owner" as const })),
    };
  }

  it("does not send a suspended agency's member to the paywall", async () => {
    // The loop. `liveMembershipsFor` has already dropped the membership,
    // so there is no agency to buy a plan for — and `/agency/billing`
    // would bounce them straight back here.
    await signIn(SUSPENDED_MEMBER, []);

    const console_ = await resolveAgencyConsole();

    expect(console_.orgId).toBeNull();
    expect(console_.subscriptionActive).toBe(false);
    // The bar still names the agency, which is the one thing the
    // membership row is read for.
    expect(console_.membership?.name).toBe("Suspended Agency");
  });

  it("still sends a live, unpaid agency to the paywall", async () => {
    // The other half: the fix must not be a hole in the paywall.
    await signIn(LIVE_MEMBER, [LIVE_ORG]);

    await expect(resolveAgencyConsole()).rejects.toThrow(
      "redirect(/agency/billing)"
    );
  });

  it("lets the billing page itself resolve without redirecting", async () => {
    await signIn(LIVE_MEMBER, [LIVE_ORG]);

    const console_ = await resolveAgencyConsole({ allowUnpaid: true });

    expect(console_.orgId).toBe(LIVE_ORG);
    expect(console_.subscriptionActive).toBe(false);
  });
});
