import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The one write a brand-new account depends on.
 *
 * Clerk's email-code sign-up collects an email address and nothing else,
 * so the passport name the form asked for reaches `profiles` only if this
 * action runs — and `getProfile`'s lazy provisioning, which has no name to
 * fall back on, writes `""` for anyone it does not. `auth-form.tsx` awaits
 * this between `finalize()` and the navigation for that reason, and tries
 * twice; both of those rest on the action being an idempotent upsert that
 * can also repair a row somebody else created first, which is what this
 * proves.
 *
 * The browser half — that the navigation really does wait — is not
 * testable here. It needs a real sign-up in a real browser.
 *
 * Skipped without a database. Run `npm run db:up` to include these.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

const USER_ID = "test_complete_profile_user";
const EMAIL = "complete-profile@test.invalid";

/** The Clerk session no test process has. Everything else is real. */
let userId: string | null = USER_ID;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId }),
  currentUser: async () => ({
    emailAddresses: [{ emailAddress: EMAIL }],
  }),
}));

// Outside a request, `revalidatePath` has no store to talk to.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

describe.skipIf(!hasDb)("completeProfile", async () => {
  const { db } = await import("@/lib/db/client");
  const { profiles } = await import("@/lib/db/schema");
  const { completeProfile } = await import("@/app/(auth)/actions");

  const FIELDS = {
    fullName: "Chukwuemeka Obi",
    phone: "801 234 5678",
    countryIso: "ng",
    locale: "en",
  };

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

  it("writes the fields Clerk has no opinion about", async () => {
    expect(await completeProfile(FIELDS)).toEqual({});

    const profile = await row();
    expect(profile.fullName).toBe("Chukwuemeka Obi");
    expect(profile.email).toBe(EMAIL);
    expect(profile.phone).toBe("+2348012345678");
    expect(profile.countryIso).toBe("ng");
  });

  it("is safe to run twice — the sign-up form retries it", async () => {
    await completeProfile(FIELDS);
    expect(await completeProfile(FIELDS)).toEqual({});

    expect((await row()).fullName).toBe("Chukwuemeka Obi");
  });

  it("repairs a row lazy provisioning had to create with no name", async () => {
    // Exactly what `getProfile` inserts when it is the first thing to
    // see a Clerk account: an email, and an empty name because Clerk's
    // email-code sign-up never asked for one.
    await db.insert(profiles).values({ id: USER_ID, email: EMAIL, fullName: "" });

    expect(await completeProfile(FIELDS)).toEqual({});
    expect((await row()).fullName).toBe("Chukwuemeka Obi");
  });

  it("refuses a call with no session rather than inventing a row", async () => {
    userId = null;

    expect(await completeProfile(FIELDS)).toEqual({
      error: "Your session did not carry through. Sign in again.",
    });
    expect(await row()).toBeUndefined();
  });
});
