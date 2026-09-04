"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { checkInvitedAddress } from "@/lib/data/invitations";
import { toE164 } from "@/lib/domain/countries";
import { isWorkEmail, workEmailRefusal } from "@/lib/domain/work-email";
import { isLocale } from "@/lib/i18n/locales";

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
  const { userId } = await auth();
  if (!userId) {
    return { error: "Your session did not carry through. Sign in again." };
  }

  const fullName = input.fullName.trim();
  if (!fullName) {
    return { error: "Enter your full name as it appears in your passport." };
  }

  const email = (await currentUser())?.emailAddresses[0]?.emailAddress;
  if (!email) {
    return { error: "Clerk returned no email address for that account." };
  }

  const role = await roleFor(input, email);
  if ("error" in role) return role;

  const digits = input.phone.replace(/\D/g, "");
  const fields = {
    fullName,
    phone: digits ? toE164(input.countryIso, digits) : null,
    countryIso: input.countryIso,
    locale: isLocale(input.locale) ? input.locale : "en",
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

  revalidatePath("/", "layout");
  return {};
}

/**
 * The two sentences a dead or mis-addressed invitation gets, in one
 * place because two callers now say them: `roleFor`, after the account
 * exists, and `checkInvitedEmail`, before it does. They must match — the
 * second is a promise about what the first will decide, and a promise
 * worded differently from the outcome is worse than no promise.
 */
const INVITATION_ERROR = {
  dead: "That invitation is no longer valid. Ask for a new one.",
  mismatch: "That invitation was sent to a different email address.",
} as const;

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
 */
export async function checkInvitedEmail(
  token: string,
  email: string
): Promise<{ error?: string }> {
  const check = await checkInvitedAddress(token, email);
  return check === "ok" ? {} : { error: INVITATION_ERROR[check] };
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
 * `/employer`, and until then an `org_member` with no row in
 * `org_members` sees no roster and — the point — cannot reach `/app`.
 * Writing `traveler` here and flipping it there left a window in which
 * an employer who never finished was an org-less traveller with the
 * whole traveller product open to them.
 */
async function roleFor(
  input: SignUpIntent,
  email: string
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
    if (!isWorkEmail(email)) return { error: workEmailRefusal(email) };
    return { role: "org_member" };
  }

  // The same comparison the form already made before sign-up started.
  // Repeated here rather than trusted, because that one ran in a browser
  // and this is the write.
  const check = await checkInvitedAddress(input.token, email);
  if (check !== "ok") return { error: INVITATION_ERROR[check] };

  return { role: "traveler" };
}
