import { redirect } from "next/navigation";

import { isInternalPath, SIGN_IN_DOOR } from "@/lib/auth/routes";
import { withLocalePrefix } from "@/lib/i18n/paths";
import { getLocale } from "@/lib/i18n/server";

/**
 * The organisation door used to be its own, with its own copy beside
 * the form.
 * There is one sign-in now: every account is a row in the same
 * `profiles` table, and which console a person opens is decided from
 * that row by `/go`, not from the URL they arrived at. A door per
 * audience only ever asked people to classify themselves, and got it
 * wrong for anyone who guessed.
 *
 * It answers rather than 404s because the path is in the wild: the
 * landing page, the traveller page and the footer all pointed at it, and
 * `/employer/sign-in` still redirects here from invitation emails
 * already sent. A redirect costs nothing next to a dead link.
 *
 * `next` is carried across so a lapsed session still lands where it was
 * interrupted; `isInternalPath` is what keeps that from becoming an open
 * redirect, and the proxy sets the parameter in the first place.
 *
 * Prefixed on the way out. `SIGN_IN_DOOR` is one constant for the whole
 * product and carries no locale, so redirecting to it bare answers a
 * Hausa reader's own bookmark with the English door — and `next` is
 * encoded into the query, where the prefix on the path cannot reach it.
 */
export default async function AgencySignInRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  redirect(
    withLocalePrefix(
      isInternalPath(next)
        ? `${SIGN_IN_DOOR}?next=${encodeURIComponent(next)}`
        : SIGN_IN_DOOR,
      await getLocale()
    )
  );
}
