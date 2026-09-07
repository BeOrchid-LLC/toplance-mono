"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { checkInvitedAddress } from "@/lib/data/invitations";
import { toE164 } from "@/lib/domain/countries";
import {
  isWorkEmail,
  workEmailRefusal,
  workEmailRuleEnforced,
} from "@/lib/domain/work-email";
import { AUTH_ACTIONS } from "@/lib/i18n/auth-actions";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/** The fields the sign-up form collects that Clerk has no opinion about. */
type ProfileFields = {
  fullName: string;
  phone: string;
  countryIso: string;
  locale: string;
};

/**
 * Which door this account came through, and — for a traveller — the
 * proof it was opened from the inside.
 *
 * A discriminated union rather than a `role` argument on purpose: the
 * caller says why it is signing someone up, and this action decides
 * what that entitles them to. A caller that could name its own role
 * would be the hole this exists to close.
 */
export type SignUpIntent =
  | { intent: "invited"; token: string }
  | { intent: "employer" };

/**
 * Clerk holds the email address and the credential; everything a visa
 * application needs about a person lives in `profiles`. This runs once,
 * straight after sign-up completes, to write the fields the form
 * collected that Clerk has no opinion about.
 *
 * It is also where "travellers exist only by invitation" is actually
 * enforced (client decision, 2026-08-31). The token gate on the
 * `/sign-up` page is a courtesy to the visitor — it explains a closed
 * door rather than 404ing at one. This is the check that holds against
 * a scripted sign-up, because it is the only thing that writes the row.
 *
 * Sign-in remains an email one-time code, not a password. The client
 * locked that for the operations console: an authenticator app is a
 * barrier for staff who change devices, and a six-digit email code is
 * the same security story without the support burden.
 */
export async function completeProfile(
  input: ProfileFields & SignUpIntent
): Promise<{ error?: string }> {
  // Read off the form's own submission rather than `getLocale()`: this
  // runs as a Server Action, and `next/headers` only has a request store
  // to read when the framework itself invoked it — calling it here would
  // make `completeProfile` unable to run outside a live request at all,
  // including from a test that calls it directly. The client already
  // knows its own locale (`useLocale()`) and was already sending it
  // through for the profile row itself.
  const locale: Locale = isLocale(input.locale) ? input.locale : DEFAULT_LOCALE;

  const { userId } = await auth();
  if (!userId) {
    return { error: AUTH_ACTIONS.sessionLost[locale] };
  }

  const fullName = input.fullName.trim();
  if (!fullName) {
    return { error: AUTH_ACTIONS.fullNameRequired[locale] };
  }

  const email = (await currentUser())?.emailAddresses[0]?.emailAddress;
  if (!email) {
    return { error: AUTH_ACTIONS.noClerkEmail[locale] };
  }

  const role = await roleFor(input, email, locale);
  if ("error" in role) return role;

  const digits = input.phone.replace(/\D/g, "");
  const fields = {
    fullName,
    phone: digits ? toE164(input.countryIso, digits) : null,
    countryIso: input.countryIso,
    locale,
    role: role.role,
  };

  // Upsert rather than update: this is the first write of a brand new
  // account, and the profile row does not exist yet. Doing it here as
  // well as in `getProfile` means a sign-up never lands on a screen
  // that has to invent a name for someone.
  await db
    .insert(profiles)
    .values({ id: userId, email, ...fields })
    .onConflictDoUpdate({ target: profiles.id, set: fields });

  revalidatePath("/[locale]", "layout");
  return {};
}

/**
 * The two sentences a dead or mis-addressed invitation gets, in one
 * place because two callers now say them: `roleFor`, after the account
 * exists, and `checkInvitedEmail`, before it does. They must match — the
 * second is a promise about what the first will decide, and a promise
 * worded differently from the outcome is worse than no promise.
 */
function invitationError(locale: Locale) {
  return {
    dead: AUTH_ACTIONS.invitationDead[locale],
    mismatch: AUTH_ACTIONS.invitationMismatch[locale],
  } as const;
}

/**
 * The invitation check, asked before Clerk has been told anything.
 *
 * `completeProfile` is the enforcement and stays that way; this is the
 * same question asked early enough that the answer is still useful. By
 * the time `roleFor` runs, an account exists, the emailed code is spent
 * and the form is gone, so a traveller who mistyped their address — the
 * one address the invitation will accept — has no way to correct it and
 * no other route in. Asked here, a typo is just a wrong field.
 *
 * Deliberately without a session guard: this runs *before* sign-up, so
 * there is no session to require, and requiring one would move the check
 * back to the moment it was useless.
 *
 * It confirms or denies an address the caller already typed and never
 * returns the invited one, so it tells a stranger holding a forwarded
 * link nothing they could not already learn by attempting the sign-up
 * itself — the same oracle `completeProfile` has always been, minus the
 * burnt code.
 *
 * `locale` is a plain, unvalidated `string` from the caller's own
 * `useLocale()` rather than a request header this action reads for
 * itself — see `completeProfile` for why.
 */
export async function checkInvitedEmail(
  token: string,
  email: string,
  locale?: string
): Promise<{ error?: string }> {
  const check = await checkInvitedAddress(token, email);
  if (check === "ok") return {};
  return {
    error: invitationError(isLocale(locale) ? locale : DEFAULT_LOCALE)[check],
  };
}

/**
 * Which sign-up door is asking. A sign-up genuinely differs by audience
 * — a director is asked for an organisation and a work address, a
 * traveller for a passport name and an invitation — so this is the one
 * place the distinction still earns its keep.
 *
 * There is no `"operations"` member, and its absence is the point: staff
 * accounts are made by promoting an existing one, never by a form, so a
 * door that offered to create one would be a promise this product does
 * not keep. Sign-in has no audience at all — one door, and `/go` decides
 * the console from `profiles` once the session exists.
 */
export type AuthAudience = "traveller" | "employer";

/**
 * Does this address have a Toplance account? Asked on the sign-in door
 * before Clerk is told anything.
 *
 * The same move `checkInvitedEmail` makes for sign-up, for the same
 * reason. Clerk holds the credential, but `profiles` holds the account:
 * `getProfile` stopped provisioning on first sight (client decision,
 * 2026-08-31), so a Clerk session with no row is a real, reachable state
 * — anyone can obtain a Clerk account, and `completeProfile` then
 * refuses to make it a traveller without a live invitation. Signing such
 * a person in worked exactly as designed and left them at `/go` reading
 * that they had no account, one emailed code later, with the form gone
 * and nothing on the screen to correct.
 *
 * Asked here, a mistyped address is a wrong field. `profiles` rather
 * than Clerk on purpose: an account Clerk knows and `profiles` does not
 * is precisely the case that dead-ends, so asking Clerk would let the
 * one person this exists for straight through.
 *
 * Compared case-insensitively because the two sides are written by
 * different hands — the form lowercases what was typed, while the stored
 * address is whatever Clerk returned at sign-up.
 *
 * It is an oracle for whether an address holds an account, and that is
 * not new: `signIn.create` has always answered the same question with
 * `form_identifier_not_found`, and this only moves the answer to before
 * the send. Nothing about the account is returned, and no code is spent
 * either way.
 *
 * `locale` is a plain, unvalidated `string` from the caller's own
 * `useLocale()` rather than a request header this action reads for
 * itself — see `completeProfile` for why.
 */
export async function checkSignInEmail(
  email: string,
  locale?: string
): Promise<{ error?: string }> {
  const address = email.trim().toLowerCase();

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${address}`)
    .limit(1);

  if (existing) return {};

  return { error: AUTH_ACTIONS.noAccount[isLocale(locale) ? locale : DEFAULT_LOCALE] };
}

/**
 * The whole of the invariant, in one place: `traveler` is reachable
 * only by presenting a live invitation addressed to the email Clerk
 * just verified.
 *
 * The employer branch writes `org_member` before any organisation
 * exists, which reads as a contradiction and is not one. It is the
 * difference between a role and a membership: `createOrganisationTx`
 * writes the membership when they name their organisation on
 * `/agency`, and until then an `org_member` with no row in
 * `org_members` sees no roster and — the point — cannot reach `/app`.
 * Writing `traveler` here and flipping it there left a window in which
 * an employer who never finished was an org-less traveller with the
 * whole traveller product open to them.
 */
async function roleFor(
  input: SignUpIntent,
  email: string,
  locale: Locale
): Promise<{ role: "traveler" | "org_member" } | { error: string }> {
  if (input.intent !== "invited") {
    // The same rule the director's form applies, repeated here for the
    // same reason the invitation check below is: that one ran in a
    // browser and this is the write. Without it the rule was decoration
    // — anything reaching Clerk another way got an organisation account
    // on a personal mailbox, and this function returned `org_member`
    // without ever looking at the address.
    //
    // It stays a signal rather than a guarantee: a bought domain proves
    // nothing, and the licence check after sign-up is what actually
    // decides whether an agency is real. What this closes is the gap
    // between what the form promised and what the server enforced.
    if (workEmailRuleEnforced() && !isWorkEmail(email)) {
      return { error: workEmailRefusal(email) };
    }
    return { role: "org_member" };
  }

  // The same comparison the form already made before sign-up started.
  // Repeated here rather than trusted, because that one ran in a browser
  // and this is the write.
  const check = await checkInvitedAddress(input.token, email);
  if (check !== "ok") return { error: invitationError(locale)[check] };

  return { role: "traveler" };
}
