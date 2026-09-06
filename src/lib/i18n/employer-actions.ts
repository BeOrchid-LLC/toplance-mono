import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The error strings `@/app/employer/actions.ts` returns as `{ error }`.
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
export const EMPLOYER_ACTIONS: {
  onlyOwnerInvitesStaff: L;
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
};
