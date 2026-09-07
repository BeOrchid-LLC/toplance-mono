import { permanentRedirect } from "next/navigation";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/locales";
import { withLocalePrefix } from "@/lib/i18n/paths";

/**
 * The roster's old address. It was `/agency/people` for a week — long
 * enough for a bookmark, and for the link in an agency's own notes.
 *
 * Prefixed rather than bare. This tree lives under `[locale]`, and the
 * proxy rewrites an unprefixed path under `/en`, so redirecting to the
 * bare path would answer a Hausa reviewer's own bookmark in English.
 */
export default async function AgencyPeopleRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(
    withLocalePrefix("/agency/clients", isLocale(locale) ? locale : DEFAULT_LOCALE)
  );
}
