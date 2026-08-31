import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

/**
 * Who is allowed to become a row in `profiles`.
 *
 * `getProfile` used to create one for any Clerk session it had not seen
 * before, defaulting to the schema's `role: "traveler"`. That was the
 * right call while anyone could sign up: it guaranteed a row existed
 * before any foreign key needed it, without depending on a webhook
 * being fast or configured.
 *
 * Under invite-only travellers (client decision, 2026-08-31) it became
 * the bypass that made every other check decorative — a Clerk account
 * obtained by any means, plus one request to `/app`, minted a traveller.
 * Provisioning now belongs to `completeProfile` alone, which is the only
 * place that can see an invitation token.
 *
 * Skipped without a database. Run `npm run db:up` to include these.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

const USER_ID = "test_provisioning_user";
const EMAIL = "provisioning@test.invalid";

let userId: string | null = USER_ID;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: EMAIL }],
    firstName: "Adaeze",
    lastName: "Okonkwo",
  }),
}));

describe.skipIf(!hasDb)("getProfile", async () => {
  const { db } = await import("@/lib/db/client");
  const { profiles } = await import("@/lib/db/schema");
  const { getProfile } = await import("@/lib/data/applications");

  afterEach(async () => {
    userId = USER_ID;
    await db.delete(profiles).where(eq(profiles.id, USER_ID));
  });

  async function row() {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, USER_ID))
      .limit(1);
    return profile;
  }

  it("returns null for a session with no profile instead of minting a traveller", async () => {
    expect(await getProfile()).toBeNull();
    expect(await row()).toBeUndefined();
  });

  it("returns the row when one already exists", async () => {
    await db.insert(profiles).values({
      id: USER_ID,
      email: EMAIL,
      fullName: "Adaeze Okonkwo",
    });

    const profile = await getProfile();

    expect(profile?.id).toBe(USER_ID);
    expect(profile?.fullName).toBe("Adaeze Okonkwo");
  });

  it("returns null with no session at all", async () => {
    userId = null;

    expect(await getProfile()).toBeNull();
  });
});
