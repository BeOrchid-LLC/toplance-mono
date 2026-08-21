"use client";

import * as React from "react";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

const STORAGE_KEY = "toplance.locale";

/**
 * The stored locale is state that lives outside React, so it is read
 * through useSyncExternalStore rather than copied into state inside an
 * effect. The server snapshot is the default locale, which is what the
 * static HTML is rendered with.
 */
const localeStore = {
  listeners: new Set<() => void>(),

  subscribe(listener: () => void) {
    localeStore.listeners.add(listener);
    // Another tab changing language should update this one too.
    window.addEventListener("storage", listener);
    return () => {
      localeStore.listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },

  getSnapshot(): Locale {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return isLocale(stored) ? stored : DEFAULT_LOCALE;
    } catch {
      // Private mode or blocked storage — the default is fine.
      return DEFAULT_LOCALE;
    }
  },

  getServerSnapshot(): Locale {
    return DEFAULT_LOCALE;
  },

  set(next: Locale) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice just will not survive a reload.
    }
    document.documentElement.lang = next;
    localeStore.listeners.forEach((l) => l());
  },
};

type LocaleContextValue = { locale: Locale; setLocale: (next: Locale) => void };

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = React.useSyncExternalStore(
    localeStore.subscribe,
    localeStore.getSnapshot,
    localeStore.getServerSnapshot
  );

  const value = React.useMemo(
    () => ({ locale, setLocale: localeStore.set }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return React.useContext(LocaleContext);
}

/** Pick the active string out of a `{ en, ha, yo, ig }` record. */
export function useT() {
  const { locale } = useLocale();
  return React.useCallback(
    (record: Record<Locale, string>) => record[locale] ?? record.en,
    [locale]
  );
}
