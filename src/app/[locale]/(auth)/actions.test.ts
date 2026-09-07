import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The one write a brand-new account depends on, and the gate that
 * decides which kind of account it may become.
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
 * Since 2026-08-31 travellers exist only by invitation, so the action
 * also carries the invariant: no `traveler` profile without a live
 * invitation naming that email. The page gate on `/sign-up` is a
 * courtesy to the visitor; this is the thing that actually holds.
 *
 * The browser half — that the navigation really does wait — is not
 * testable here. It needs a real sign-up in a real browser.
 *
 * Skipped without a database. Run `npm run db:up` to include these.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

const USER_ID = "test_complete_profile_user";
const EMAIL = "complete-profile@test.invalid";
const TOKEN = "tok1";
const ORG_NAME = "Complete Profile Test Org";

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
  const { invitations, organisations, profiles } = await import("@/lib/db/schema");
  const { checkInvitedEmail, checkSignInEmail, completeProfile } = await import(
    "@/app/[locale]/(auth)/actions"
  );

  const FIELDS = {
    fullName: "Chukwuemeka Obi",
    phone: "801 234 5678",
    countryIso: "ng",
    locale: "en",
  };

  /** The traveller door: the fields plus the token that opens it. */
  const INVITED = { ...FIELDS, intent: "invited", token: TOKEN } as const;

  let orgId: string;

  beforeEach(async () => {
    const [org] = await db
      .insert(organisations)
      .values({ name: ORG_NAME })
      .returning({ id: organisations.id });
    orgId = org.id;

    await db.insert(invitations).values({ orgId, email: EMAIL, token: TOKEN });
  });

  afterEach(async () => {
    userId = USER_ID;
    await db.delete(profiles).where(eq(profiles.id, USER_ID));
    // Invitations cascade from the organisation.
    await db.delete(organisations).where(eq(organisations.id, orgId));
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
    expect(await completeProfile(INVITED)).toEqual({});

    const profile = await row();
    expect(profile.fullName).toBe("Chukwuemeka Obi");
    expect(profile.email).toBe(EMAIL);
    expect(profile.phone).toBe("+2348012345678");
    expect(profile.countryIso).toBe("ng");
  });

  it("is safe to run twice — the sign-up form retries it", async () => {
    await completeProfile(INVITED);
    expect(await completeProfile(INVITED)).toEqual({});

    expect((await row()).fullName).toBe("Chukwuemeka Obi");
  });

  it("repairs a row lazy provisioning had to create with no name", async () => {
    // Exactly what `getProfile` inserts when it is the first thing to
    // see a Clerk account: an email, and an empty name because Clerk's
    // email-code sign-up never asked for one.
    await db.insert(profiles).values({ id: USER_ID, email: EMAIL, fullName: "" });

    expect(await completeProfile(INVITED)).toEqual({});
    expect((await row()).fullName).toBe("Chukwuemeka Obi");
  });

  it("refuses a call with no session rather than inventing a row", async () => {
    userId = null;

    expect(await completeProfile(INVITED)).toEqual({
      error: "Your session did not carry through. Sign in again.",
    });
    expect(await row()).toBeUndefined();
  });

  it("makes an invited account a traveller", async () => {
    await completeProfile(INVITED);

    expect((await row()).role).toBe("traveler");
  });

  it("refuses to mint a traveller for a token matching nothing", async () => {
    expect(await completeProfile({ ...INVITED, token: "nope" })).toEqual({
      error: "That invitation is no longer valid. Ask for a new one.",
    });
    expect(await row()).toBeUndefined();
  });

  it("refuses a token whose invitation names a different address", async () => {
    await db
      .update(invitations)
      .set({ email: "someone.else@test.invalid" })
      .where(eq(invitations.token, TOKEN));

    expect(await completeProfile(INVITED)).toEqual({
      error: "That invitation was sent to a different email address.",
    });
    expect(await row()).toBeUndefined();
  });

  it("refuses a revoked invitation", async () => {
    await db
      .update(invitations)
      .set({ status: "revoked" })
      .where(eq(invitations.token, TOKEN));

    expect(await completeProfile(INVITED)).toEqual({
      error: "That invitation is no longer valid. Ask for a new one.",
    });
    expect(await row()).toBeUndefined();
  });

  it("refuses an expired invitation even though it still reads as pending", async () => {
    await db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitations.token, TOKEN));

    expect(await completeProfile(INVITED)).toEqual({
      error: "That invitation is no longer valid. Ask for a new one.",
    });
    expect(await row()).toBeUndefined();
  });

  it("makes an employer sign-up an org_member, never a traveller", async () => {
    // The hole this closes: an employer who signs up and never names an
    // organisation used to be left as an org-less traveller with the
    // whole of /app open to them — a self-serve traveller door under a
    // different URL.
    expect(await completeProfile({ ...FIELDS, intent: "employer" })).toEqual({});

    expect((await row()).role).toBe("org_member");
  });

  /**
   * The same question `roleFor` asks, moved to before anything has been
   * spent.
   *
   * Every refusal above is correct and arrives far too late: Clerk has
   * made an account, the emailed code has been used, and `auth-form`
   * pushes the visitor off the form to the destination the token names.
   * A mistyped address is therefore not a corrected field but a person
   * who cannot get in — which under invite-only is the whole of their
   * access.
   */
  describe("checkInvitedEmail", () => {
    it("names the mismatch without writing anything", async () => {
      expect(await checkInvitedEmail(TOKEN, "someone.else@test.invalid")).toEqual({
        error: "That invitation was sent to a different email address.",
      });
      expect(await row()).toBeUndefined();
    });

    it("answers before a session exists, because that is when it is asked", async () => {
      // The form calls this ahead of `signUp.create()`. There is no Clerk
      // session at that point, and a `requireActor`-shaped guard here
      // would make the check impossible to perform at the only moment it
      // is worth performing.
      userId = null;

      expect(await checkInvitedEmail(TOKEN, EMAIL)).toEqual({});
    });

    it("passes the address the invitation names", async () => {
      expect(await checkInvitedEmail(TOKEN, EMAIL)).toEqual({});
    });

    it("treats a dead token as dead rather than as a mismatch", async () => {
      expect(await checkInvitedEmail("not-a-real-token", EMAIL)).toEqual({
        error: "That invitation is no longer valid. Ask for a new one.",
      });
    });
  });

  /**
   * The sign-in half of the same idea.
   *
   * `getProfile` no longer provisions, so `profiles` — not Clerk — is
   * what makes an address an account. Left unasked, a stranger's address
   * signed in cleanly and every console then turned them away at `/go`,
   * an emailed code after the fact. These prove the question is answered
   * where it can still be acted on, and that it reads `profiles`.
   */
  describe("checkSignInEmail", () => {
    it("refuses an address Clerk might know and `profiles` does not", async () => {
      expect(await checkSignInEmail("nobody@test.invalid")).toEqual({
        error:
          "There is no Toplance account for that address. Check it for a typo — travellers are invited by the organisation sponsoring them, and organisations create their own account.",
      });
    });

    it("passes an address that has a profile row, whatever its case", async () => {
      // Written the way Clerk returned it at sign-up; typed the way the
      // form lowercases it. Both sides are the same account.
      await db
        .insert(profiles)
        .values({ id: USER_ID, email: "Complete-Profile@Test.invalid" });

      expect(await checkSignInEmail(EMAIL)).toEqual({});
    });

    // There is one sign-in door, so there is one refusal, and it has to
    // be true for whoever typed the address. It used to be three, chosen
    // by the door — which meant a director who wandered onto the
    // traveller door was told to go and find an invitation that was
    // never going to be sent to them.
    it("names both routes to an account, because it cannot know which applies", async () => {
      const { error } = await checkSignInEmail("nobody@test.invalid");
      expect(error).toContain("invited by the organisation");
      expect(error).toContain("organisations create their own account");
    });

    it("answers before a session exists, because that is when it is asked", async () => {
      // Same reason as `checkInvitedEmail` above: the form calls this
      // ahead of `signIn.create()`, and a session guard here would move
      // the answer back to after the code was spent.
      userId = null;

      expect(await checkSignInEmail("nobody@test.invalid")).not.toEqual({});
    });
  });
});
