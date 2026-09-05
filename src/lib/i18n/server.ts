import { headers } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

/**
 * Kept in one place because two files have to agree on it: `proxy.ts`
 * sets it after stripping a request's `/xx` locale prefix, and this is
 * the only reader. Server Components never see the prefix themselves —
 * by the time a request reaches one, `proxy.ts` has already rewritten
 * it away — so this header is the entire handoff.
 */
const LOCALE_HEADER = "x-toplance-locale";

/**
 * The locale `proxy.ts` resolved for this request, for use in Server
 * Components and layouts. `headers()` is async in this Next.js version
 * (the header-object return value moved behind a promise in 15, and
 * Next 16 dropped the synchronous escape hatch), so this is too.
 *
 * Falls back to `DEFAULT_LOCALE` whenever the header is missing or
 * holds something `isLocale` does not recognise — an unprefixed
 * request (English) never gets the header set at all, and that is the
 * common case, not an error.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
