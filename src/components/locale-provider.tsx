"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { DEFAULT_LOCALE, dirOf, LOCALES, type Locale } from "@/lib/i18n/locales";

const STORAGE_KEY = "toplance.locale";

/** Every locale code except English, which is never URL-prefixed. */
const PREFIXED_LOCALES = LOCALES.map((l) => l.code).filter(
  (code) => code !== DEFAULT_LOCALE
);

/** Strips an existing `/{code}` locale prefix off `pathname`, if there is one. */
function stripLocalePrefix(pathname: string): string {
  for (const code of PREFIXED_LOCALES) {
    if (pathname === `/${code}`) return "/";
    if (pathname.startsWith(`/${code}/`)) return pathname.slice(code.length + 1);
  }
  return pathname;
}

/**
 * The URL for `pathname` under `locale` — English unprefixed at today's
 * exact paths, every other locale at `/{code}/...`, replacing any
 * prefix already there. This is `proxy.ts`'s rewrite, run in reverse,
 * so a switch here lands on the same route the server would resolve
 * the new locale to.
 */
function pathWithLocale(pathname: string, locale: Locale): string {
  const bare = stripLocalePrefix(pathname);
  if (locale === DEFAULT_LOCALE) return bare;
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}

/**
 * `lang` and `dir` live on `<html>`, which React does not own here.
 * Both have to move together: Arabic set as the language while the
 * document still runs left to right gives a page that announces
 * itself correctly to a screen reader and then lays itself out
 * backwards.
 */
function applyToDocument(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = dirOf(locale);
}

type LocaleContextValue = { locale: Locale; setLocale: (next: Locale) => void };

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * `initialLocale` is what the server already decided — `getLocale()`
 * reading the header `proxy.ts` set after stripping the URL's `/xx`
 * prefix. Seeding state with it, rather than always starting at
 * `DEFAULT_LOCALE`, is what keeps this component's first render in
 * agreement with the HTML the server already sent for `/fr/travelers`.
 *
 * The URL, not `localStorage`, is the source of truth for which locale
 * is active on a given page — that is the whole point of "as-needed"
 * prefixing, where a fallback-to-English render is exactly what this
 * design exists to prevent. `localStorage` is still written on every
 * change, but only as a convenience for future use; nothing reads it
 * back to decide what to render.
 */
export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  /**
   * Keeps `<html>` in sync whenever the active locale changes,
   * including the very first client render after a locale-prefixed
   * page load — the server already set these attributes correctly in
   * the HTML it sent, so this is idempotent there, not a correction.
   */
  React.useEffect(() => {
    applyToDocument(locale);
  }, [locale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private mode or blocked storage — the choice just will not
        // survive a reload, but the navigation below still works.
      }
      setLocaleState(next);
      applyToDocument(next);
      router.push(pathWithLocale(pathname, next));
    },
    [pathname, router]
  );

  const value = React.useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return React.useContext(LocaleContext);
}

/** Pick the active string out of a `Record<Locale, string>`. */
export function useT() {
  const { locale } = useLocale();
  return React.useCallback(
    (record: Record<Locale, string>) => record[locale] ?? record.en,
    [locale]
  );
}
