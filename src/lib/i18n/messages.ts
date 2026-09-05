import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * Chrome for the traveller's message thread — `/app/messages/page.tsx`
 * and `message-thread.tsx`, which the ops case screen also renders. The
 * message bodies themselves are never translated: they are human-authored
 * (traveller or staff), not UI copy.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const MESSAGES: {
  title: L;
  panelLabel: L;
  empty: L;
  senderStaff: L;
  senderTraveler: L;
} = {
  title: {
    en: "Messages",
    ha: "Saƙonni",
    yo: "Àwọn Ìránṣẹ́",
    ig: "Ozi",
    fr: "Messages",
    pt: "Mensagens",
    sw: "Ujumbe",
    ar: "الرسائل",
    tw: "Nkrasɛm",
    zu: "Imilayezo",
  },
  panelLabel: {
    en: "Messages",
    ha: "Saƙonni",
    yo: "Àwọn Ìránṣẹ́",
    ig: "Ozi",
    fr: "Messages",
    pt: "Mensagens",
    sw: "Ujumbe",
    ar: "الرسائل",
    tw: "Nkrasɛm",
    zu: "Imilayezo",
  },
  empty: {
    en: "Nothing yet. Write the first message below.",
    ha: "Babu kome tukuna. Rubuta saƙon farko a ƙasa.",
    yo: "Kò sí ohunkóhun síbẹ̀. Kọ ìránṣẹ́ àkọ́kọ́ nísàlẹ̀.",
    ig: "Ọ dịbeghị ihe ọ bụla. Dee ozi mbụ n'okpuru.",
    fr: "Rien pour l'instant. Écrivez le premier message ci-dessous.",
    pt: "Nada por aqui ainda. Escreva a primeira mensagem abaixo.",
    sw: "Bado hakuna kitu. Andika ujumbe wa kwanza hapa chini.",
    ar: "لا شيء بعد. اكتب الرسالة الأولى أدناه.",
    tw: "Hwee nnya nsi. Twerɛ nkrasɛm a edi kan wɔ ase.",
    zu: "Akukho lutho okwamanje. Bhala umlayezo wokuqala ngezansi.",
  },
  senderStaff: {
    en: "Toplance team",
    ha: "Ƙungiyar Toplance",
    yo: "Ẹgbẹ́ Toplance",
    ig: "Ndị otu Toplance",
    fr: "L'équipe Toplance",
    pt: "Equipa Toplance",
    sw: "Timu ya Toplance",
    ar: "فريق Toplance",
    tw: "Toplance kuw",
    zu: "Ithimba le-Toplance",
  },
  senderTraveler: {
    en: "Traveler",
    ha: "Matafiyi",
    yo: "Arìnrìn-àjò",
    ig: "Onye njem",
    fr: "Voyageur",
    pt: "Viajante",
    sw: "Msafiri",
    ar: "المسافر",
    tw: "Ɔkwantuni",
    zu: "Umhambi",
  },
};
