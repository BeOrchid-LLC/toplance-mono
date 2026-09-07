import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The error strings `@/app/agency/actions.ts` returns as `{ error }`.
 *
 * Same shape and the same reasoning as `ops-actions.ts`: resolved
 * server-side with `getLocale()`, because a Server Action runs as a POST
 * to the page that rendered its button, so `proxy.ts` has already set
 * `x-toplance-locale` by the time the action body runs. The dialog that
 * calls these just toasts whatever comes back.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const AGENCY_ACTIONS: {
  onlyOwnerInvitesStaff: L;
  chooseVerdict: L;
  chooseStatus: L;
  chooseFlagReason: L;
} = {
  onlyOwnerInvitesStaff: {
    en: "Only an owner can invite a colleague.",
    ha: "Mai kamfani ne kawai zai iya gayyatar abokin aiki.",
    yo: "Onílé-iṣẹ́ nìkan ló lè pe alábàáṣiṣẹ́.",
    ig: "Ọ bụ naanị onyenwe nwere ike ịkpọ onye ọrụ ibe ya oku.",
    fr: "Seul un propriétaire peut inviter un collègue.",
    pt: "Só um proprietário pode convidar um colega.",
    sw: "Mmiliki pekee ndiye anayeweza kualika mfanyakazi mwenzake.",
    ar: "المالك وحده يمكنه دعوة زميل.",
    tw: "Ɔwura nko ara na ɔbɛtumi afrɛ ne yɔnko adwumayɛfoɔ.",
    zu: "Umnikazi kuphela ongamema ozakwabo.",
  },
  chooseVerdict: {
    en: "Choose a verdict.",
    ha: "Zaɓi hukunci.",
    yo: "Yan ìdájọ́ kan.",
    ig: "Họrọ mkpebi.",
    fr: "Choisissez un verdict.",
    pt: "Escolha um veredito.",
    sw: "Chagua uamuzi.",
    ar: "اختر حكمًا.",
    tw: "Yi gyinaeɛ bi.",
    zu: "Khetha isinqumo.",
  },
  chooseStatus: {
    en: "Choose a status.",
    ha: "Zaɓi matsayi.",
    yo: "Yan ipò kan.",
    ig: "Họrọ ọnọdụ.",
    fr: "Choisissez un statut.",
    pt: "Escolha um estado.",
    sw: "Chagua hali.",
    ar: "اختر حالة.",
    tw: "Yi tebea bi.",
    zu: "Khetha isimo.",
  },
  chooseFlagReason: {
    en: "Say what kind of problem it is.",
    ha: "Faɗi wace irin matsala ce.",
    yo: "Sọ irú ìṣòro tí ó jẹ́.",
    ig: "Kwuo ụdị nsogbu ọ bụ.",
    fr: "Indiquez de quel type de problème il s'agit.",
    pt: "Diga que tipo de problema é.",
    sw: "Sema ni tatizo la aina gani.",
    ar: "حدد نوع المشكلة.",
    tw: "Ka ɔhaw ko a ɛyɛ.",
    zu: "Sho ukuthi yiluphi uhlobo lwenkinga.",
  },
};
