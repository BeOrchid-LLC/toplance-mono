import { redirect } from "next/navigation";

import { isInternalPath, SIGN_IN_DOOR } from "@/lib/auth/routes";

/**
 * The operations door used to be its own, with its own copy beside the
 * form.
 * There is one sign-in now: every account is a row in the same
 * `profiles` table, and which console a person opens is decided from
 * that row by `/go`, not from the URL they arrived at. A door per
 * audience only ever asked people to classify themselves, and got it
 * wrong for anyone who guessed.
 *
 * It answers rather than 404s because the path is in the wild: it was a
 * footer entry, and staff have had it bookmarked since before the
 * consoles were split. A redirect costs nothing next to a dead link.
 *
 * `next` is carried across so a lapsed session still lands where it was
 * interrupted; `isInternalPath` is what keeps that from becoming an open
 * redirect, and the proxy sets the parameter in the first place.
 */
export default async function OpsSignInRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  redirect(
    isInternalPath(next)
      ? `${SIGN_IN_DOOR}?next=${encodeURIComponent(next)}`
      : SIGN_IN_DOOR
  );
}
