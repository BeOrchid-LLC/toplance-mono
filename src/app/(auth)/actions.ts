"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { toE164 } from "@/lib/domain/countries";
import { isLocale } from "@/lib/i18n/locales";

/**
 * Clerk holds the email address and the credential; everything a visa
 * application needs about a person lives in `profiles`. This runs once,
 * straight after sign-up completes, to write the fields the form
 * collected that Clerk has no opinion about.
 *
 * Sign-in remains an email one-time code, not a password. The client
 * locked that for the operations console: an authenticator app is a
 * barrier for staff who change devices, and a six-digit email code is
 * the same security story without the support burden.
 */
export async function completeProfile(input: {
  fullName: string;
  phone: string;
  countryIso: string;
  locale: string;
}): Promise<{ error?: string }> {
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

  const digits = input.phone.replace(/\D/g, "");
  const fields = {
    fullName,
    phone: digits ? toE164(input.countryIso, digits) : null,
    countryIso: input.countryIso,
    locale: isLocale(input.locale) ? input.locale : "en",
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
