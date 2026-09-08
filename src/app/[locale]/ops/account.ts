import "server-only";

import type { Actor } from "@/lib/auth/policy";
import type { Profile } from "@/lib/db/schema";
import { opsAccountBlock, type OpsAccountBlock } from "@/lib/domain/ops-account";
import type { Locale } from "@/lib/i18n/locales";
import { signedDocumentUrl } from "@/lib/storage/documents";

/**
 * The `account` prop every `/ops` screen hands `AdminShell`.
 *
 * One call rather than the six hand-built copies this replaces, for the
 * reason `resolveAgencyConsole` gives about its own preamble: a block
 * pasted six times is a block that is eventually only correct in five.
 * It already was — all six omitted the profile link and the photo, so
 * the rail's account footer named a person and offered nothing to do
 * about it.
 *
 * The signed URL is the only reason this is async, and the only reason
 * it is here rather than beside the pure part in
 * `@/lib/domain/ops-account`: avatars live in the same private bucket as
 * the passport scans, so a photo of a member of staff is signed for ten
 * minutes at a time like everything else in there — never served from a
 * public path because it is small.
 */
export async function opsAccount(
  profile: Profile,
  actor: Actor,
  locale: Locale
): Promise<OpsAccountBlock> {
  return opsAccountBlock({
    fullName: profile.fullName,
    email: profile.email,
    staffRole: actor.staffRole,
    locale,
    avatarUrl: profile.avatarPath
      ? await signedDocumentUrl(profile.avatarPath)
      : null,
  });
}
