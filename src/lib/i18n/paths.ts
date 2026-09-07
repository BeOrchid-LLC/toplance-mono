import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";

/**
 * The one implementation of the URL prefix rules, shared by everything
 * that has to agree on them.
 *
 * There used to be two: `proxy.ts` on the server and `locale-provider.tsx`
 * on the client, written as mirror images of each other. Two copies of a
 * rule that must never disagree is one copy too many — a locale switch
 * that computes a different URL from the one the proxy would resolve
 * lands the visitor on the wrong language, which is the failure the
 * prefixing exists to prevent.
 *
 * The rule itself: English lives unprefixed at the app's plain paths;
 * every other locale is reachable at `/{code}/...`. That asymmetry is
 * deliberate and predates this file — English URLs are the ones already
 * linked to, indexed and bookmarked.
 */

/** Every locale code except English, which is never URL-prefixed. */
const PREFIXED_LOCALES = LOCALES.map((l) => l.code).filter(
  (code): code is Exclude<Locale, "en"> => code !== DEFAULT_LOCALE
);

/**
 * Splits a raw request pathname into the locale it names and the path
 * underneath it.
 *
 * `/fr/travelers` -> `{ locale: "fr", rest: "/travelers" }`; `/fr` alone
 * -> `{ locale: "fr", rest: "/" }`; anything with no recognised prefix
 * is plain English, returned unchanged. An unknown prefix (`/zz/...`) is
 * deliberately *not* an error here — it is simply not a locale, so it
 * stays part of `rest` and 404s further down like any other bad path.
 */
export function splitLocalePath(pathname: string): {
  locale: Locale;
  rest: string;
} {
  for (const code of PREFIXED_LOCALES) {
    if (pathname === `/${code}`) return { locale: code, rest: "/" };
    if (pathname.startsWith(`/${code}/`)) {
      return { locale: code, rest: pathname.slice(code.length + 1) };
    }
  }
  return { locale: DEFAULT_LOCALE, rest: pathname };
}

/**
 * The inverse: re-applies `/{code}` to an unprefixed path. English stays
 * unprefixed, matching the app's plain paths exactly.
 *
 * `path` is assumed to already be unprefixed. Every caller keeps its path
 * values stripped until the moment they reach this function, specifically
 * so a value can never pick up two prefixes.
 */
export function withLocalePrefix(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Paths that are not pages and therefore never carry a locale segment.
 *
 * The proxy's matcher covers these, and the route tree does not: there is
 * no `/en/api/...`, because route handlers live outside the localised
 * tree (they render no layout, so they need no root layout above them,
 * and nothing they return is translated at the routing layer). Prefixing
 * one would 404 it — which for `/api/cron/*` means silently breaking
 * every scheduled job, so this guard is load-bearing rather than tidy.
 */
export function isNonPagePath(path: string): boolean {
  return path.startsWith("/api/") || path.startsWith("/__clerk");
}
