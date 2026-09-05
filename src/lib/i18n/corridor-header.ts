import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The corridor laminate's two static labels — "Your current route" and
 * the "CASE" tag in front of the reference. Everything else on the card
 * (the countries, the visa name, the purpose, the case reference itself)
 * is data, not copy, and stays exactly as the record holds it.
 *
 * English values are the copy the card already had; every other locale
 * was translated in-house from that English, the same way `HERO` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const CORRIDOR_HEADER: {
  route: L;
  casePrefix: L;
} = {
  route: {
    en: "Your current route",
    ha: "Hanyarku ta yanzu",
    yo: "Ipa ọ̀nà rẹ lọ́wọ́lọ́wọ́",
    ig: "Ụzọ gị ugbu a",
    fr: "Votre parcours actuel",
    pt: "A sua rota atual",
    sw: "Njia yako ya sasa",
    ar: "مسارك الحالي",
    tw: "Wo kwan a woretu seesei",
    zu: "Indlela yakho yamanje",
  },
  casePrefix: {
    en: "CASE",
    ha: "SHARI'A",
    yo: "ẸJỌ́",
    ig: "IKPE",
    fr: "DOSSIER",
    pt: "PROCESSO",
    sw: "KESI",
    ar: "القضية",
    tw: "ASƐM",
    zu: "ICALA",
  },
};
