import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The "3m ago" / "2d ago" style relative-time labels shared by the
 * notifications bell (`notifications-menu.tsx`) and the message thread
 * (`message-thread.tsx`). Both compute the same four shapes off a
 * `Date` with their own small `relativeTime` helper — deliberately
 * duplicated, the established idiom in this codebase for two small call
 * sites — so only the strings live in one place.
 *
 * `{n}` is replaced by the caller with the actual count. Kept as a plain
 * `Record<Locale, string>`, like every other dictionary here, rather than
 * a function, so a translated value is exactly a string like every
 * other one.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const RELATIVE_TIME: {
  justNow: L;
  minutesAgo: L;
  hoursAgo: L;
  daysAgo: L;
} = {
  justNow: {
    en: "just now",
    ha: "yanzu",
    yo: "ní ìsinsìnyí",
    ig: "ugbu a",
    fr: "à l'instant",
    pt: "agora mesmo",
    sw: "sasa hivi",
    ar: "الآن",
    tw: "seesei ara",
    zu: "khona manje",
  },
  minutesAgo: {
    en: "{n}m ago",
    ha: "minti {n} da suka wuce",
    yo: "ìṣẹ́jú {n} sẹ́yìn",
    ig: "nkeji {n} gara aga",
    fr: "il y a {n} min",
    pt: "há {n} min",
    sw: "dakika {n} zilizopita",
    ar: "قبل {n} د",
    tw: "simma {n} a atwam",
    zu: "{n}m edlule",
  },
  hoursAgo: {
    en: "{n}h ago",
    ha: "sa'a {n} da suka wuce",
    yo: "wákàtí {n} sẹ́yìn",
    ig: "awa {n} gara aga",
    fr: "il y a {n} h",
    pt: "há {n} h",
    sw: "saa {n} zilizopita",
    ar: "قبل {n} س",
    tw: "dɔnhwere {n} a atwam",
    zu: "{n}h edlule",
  },
  daysAgo: {
    en: "{n}d ago",
    ha: "kwana {n} da suka wuce",
    yo: "ọjọ́ {n} sẹ́yìn",
    ig: "ụbọchị {n} gara aga",
    fr: "il y a {n} j",
    pt: "há {n} d",
    sw: "siku {n} zilizopita",
    ar: "قبل {n} يوم",
    tw: "nna {n} a atwam",
    zu: "{n}d edlule",
  },
};
