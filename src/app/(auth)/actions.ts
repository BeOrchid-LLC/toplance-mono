"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { toE164 } from "@/lib/domain/countries";
import { isLocale } from "@/lib/i18n/locales";

export type AuthState = { error?: string; sent?: boolean; email?: string };

/**
 * Email one-time code, not a password. The client locked this for the
 * operations console — an authenticator app is a barrier for staff who
 * change devices, and a six-digit email code is the same security story
 * without the support burden. We use it everywhere for consistency.
 */
export async function requestCode(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const countryIso = String(formData.get("country_iso") ?? "ng");
  const phoneDigits = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const localeRaw = String(formData.get("locale") ?? "en");
  const mode = String(formData.get("mode") ?? "sign-in");

  if (!email || !email.includes("@")) {
    return { error: "Enter the email address you want the code sent to." };
  }
  if (mode === "sign-up" && !fullName) {
    return { error: "Enter your full name as it appears in your passport." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Sign-in must not quietly create an account for a typo'd address.
      shouldCreateUser: mode === "sign-up",
      data:
        mode === "sign-up"
          ? {
              full_name: fullName,
              phone: phoneDigits ? toE164(countryIso, phoneDigits) : null,
              country_iso: countryIso,
              locale: isLocale(localeRaw) ? localeRaw : "en",
            }
          : undefined,
    },
  });

  if (error) {
    return {
      error:
        error.message === "Signups not allowed for otp"
          ? "We could not find an account for that address. Create one instead."
          : error.message,
    };
  }

  return { sent: true, email };
}

export async function verifyCode(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const next = String(formData.get("next") ?? "/app");

  if (token.length !== 6) {
    return { error: "The code is six digits.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return {
      error:
        "That code did not work. It expires after ten minutes and can only be used once.",
      email,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
