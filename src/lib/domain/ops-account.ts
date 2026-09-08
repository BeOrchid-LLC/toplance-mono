import type { StaffRole } from "@/lib/auth/policy";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Who is signed in, as `AdminShell` wants to be told it.
 *
 * Six `/ops` screens built this block inline and identically, and every
 * one of them left out the two fields that make it a control rather than
 * a caption: `profileHref` and `avatarUrl`. So platform staff — alone
 * among the three personas — had a name and an address at the foot of
 * the rail with nothing behind them, and no "Profile" item in the
 * account menu, because `AccountMenu` renders that item only when a
 * caller names a page. There now is one.
 *
 * Pure, and kept out of `src/app` for it: signing the avatar needs
 * storage and a session, which is `opsAccount`'s job in
 * `app/[locale]/ops/account.ts`. What is decided here — the rank a null
 * falls back to, the subtitle's shape, the profile's address — is
 * decided the same way whether or not anything has a photo.
 */
export const OPS_PROFILE_HREF = "/ops/profile";

export type OpsAccountBlock = {
  name: string;
  email: string;
  subtitle: string;
  avatarUrl: string | null;
  profileHref: string;
};

/**
 * "Toplance operations · reviewer" — the rail's subtitle and the account
 * menu's second line, which are deliberately the same string.
 *
 * `staffRole` is nullable on `Actor`, and an absent rank is a reviewer:
 * the lesser of the two, so a row that lost its rank can never read as
 * an owner in the chrome.
 */
export function opsSubtitle(
  staffRole: StaffRole | null | undefined,
  locale: Locale
): string {
  return `${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[staffRole ?? "reviewer"][locale]}`;
}

export function opsAccountBlock({
  fullName,
  email,
  staffRole,
  locale,
  avatarUrl = null,
}: {
  fullName: string;
  email: string;
  staffRole: StaffRole | null | undefined;
  locale: Locale;
  /** Signed by the caller, ten minutes at a time. `null` until they upload one. */
  avatarUrl?: string | null;
}): OpsAccountBlock {
  return {
    name: fullName,
    email,
    subtitle: opsSubtitle(staffRole, locale),
    avatarUrl,
    profileHref: OPS_PROFILE_HREF,
  };
}
