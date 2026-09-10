import { headers } from "next/headers";
import { locale as localeRootParam } from "next/root-params";

import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

/**
 * Set by `proxy.ts` on every request it serves, and read only by
 * `getActionLocale` below.
 *
 * It used to be the entire locale handoff, for Server Components too.
 * That is what broke the marketing pages: `/` and `/travelers` are
 * `force-static`, and `force-static` makes `headers()` return an empty
 * set rather than opting the route into dynamic rendering, so the header
 * was invisible exactly where it was needed and every locale rendered in
 * English. Server Components read the URL segment now (see `getLocale`);
 * the header survives for the one context a route parameter cannot
 * reach.
 */
const LOCALE_HEADER = "x-toplance-locale";

/**
 * The locale for the route being rendered, for Server Components,
 * layouts, pages and `generateMetadata`.
 *
 * Reads the `[locale]` segment through `next/root-params`, which works
 * during prerendering — that is the whole reason the locale is a route
 * parameter. `proxy.ts` guarantees the segment is present and is a code
 * this app actually speaks: an unprefixed request is rewritten under
 * `/en`, and an unrecognised prefix never resolves to a route at all.
 * The `isLocale` guard is belt and braces for that, not the common path.
 */
export async function getLocale(): Promise<Locale> {
  const value = await localeRootParam();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * The same locale, for Server Actions.
 *
 * Root parameters are unavailable here by design — an action is not tied
 * to a route, since the same action can be submitted from pages under
 * different roots, so Next refuses to guess which one — and
 * `next/root-params` throws rather than returning something plausible.
 * An action always runs on a real request, though, so the header the
 * proxy set is both available and correct.
 *
 * `(auth)/actions.ts` is the exception that does not use this: it reads
 * the locale off its own form submission, because the visitor may have
 * changed the language after the page was rendered and the account it is
 * about to create should record the language they actually chose.
 */
export async function getActionLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * The same locale again, for code that is reachable from both.
 *
 * A route guard is not a component or an action — it is whichever one
 * called it. `resolveAgencyConsole` opens every page under `/agency`
 * *and* is the first line of the support actions, so `getLocale()`
 * there is a throw waiting for the one caller that is an action, and
 * `getActionLocale()` is an empty header waiting for the first guard on
 * a `force-static` route. This asks the route parameter and falls back
 * to the header, which is the only answer correct in both places.
 *
 * **It cannot throw, and that is the point.** The only thing a guard
 * does with this is build the URL it is about to redirect to, so a
 * lookup that raises turns a clean redirect into an unhandled error on
 * the way to the screen that would have explained itself — which is
 * precisely what a director with a lapsed plan hit when this was
 * `getLocale()`: submitting the support form threw instead of sending
 * them to billing. Both reads are guarded, and `DEFAULT_LOCALE` is the
 * last resort rather than the first answer.
 */
export async function getGuardLocale(): Promise<Locale> {
  try {
    const param = await localeRootParam();
    if (isLocale(param)) return param;
  } catch {
    // A Server Action: root parameters do not exist here by design.
  }

  try {
    return await getActionLocale();
  } catch {
    // No request scope at all — a unit test, or a context Next has not
    // bound headers to. English, as an unprefixed path already is.
    return DEFAULT_LOCALE;
  }
}
