import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The download that hands somebody every file on a checklist at once.
 *
 * Two labels rather than one, because the two sides of the desk are not
 * downloading the same thing in the same sense. The traveller is taking
 * a copy of what they sent — "my documents", possessive, because they
 * are theirs. The agency is taking a client's pack to an embassy, and
 * calling those "my documents" in a console would be wrong in a way that
 * matters.
 *
 * One string each, and no count or size hint: the link sits beside a
 * checklist that already says how many documents there are, and a second
 * number that could disagree with the first is worse than no number.
 *
 * English is the copy; every other locale was translated in-house from
 * it, the same way `DOCUMENTS` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const ARCHIVE: {
  /** On the traveller's own documents page. */
  travelerLabel: L;
  /** On the agency's case screen, about somebody else's documents. */
  agencyLabel: L;
} = {
  travelerLabel: {
    en: "Download my documents",
    ha: "Sauke takarduna",
    yo: "Ṣe ìgbàsílẹ̀ àwọn ìwé mi",
    ig: "Budata akwụkwọ m",
    fr: "Télécharger mes documents",
    pt: "Baixar meus documentos",
    sw: "Pakua nyaraka zangu",
    ar: "تنزيل مستنداتي",
    tw: "Twe me nkrataa",
    zu: "Landa amadokhumenti ami",
  },
  agencyLabel: {
    en: "Download documents",
    ha: "Sauke takardu",
    yo: "Ṣe ìgbàsílẹ̀ àwọn ìwé",
    ig: "Budata akwụkwọ",
    fr: "Télécharger les documents",
    pt: "Baixar documentos",
    sw: "Pakua nyaraka",
    ar: "تنزيل المستندات",
    tw: "Twe nkrataa",
    zu: "Landa amadokhumenti",
  },
};
