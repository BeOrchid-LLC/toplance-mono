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
  /**
   * Shown in place of the composer while nobody at the agency has
   * claimed the case.
   *
   * It used to say the opposite — that an unassigned thread goes to the
   * agency as a whole — because it did. `canWriteMessages` now waits for
   * a handler, so this says what is true and, as importantly, that the
   * wait ends without the traveller having to do anything: silence they
   * are expected to break themselves is worse than silence explained.
   */
  unclaimedNotice: L;
  senderAgency: L;
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
  unclaimedNotice: {
    en: "Nobody at your agency has picked up your case yet. You will be able to write here as soon as someone does.",
    ha: "Har yanzu babu wanda ya karɓi shari'arka a hukumarka. Za ka iya rubutu a nan da zarar wani ya karɓe ta.",
    yo: "Kò tíì sí ẹnìkan ní ilé-iṣẹ́ rẹ tí ó gba ọ̀rọ̀ rẹ. Ìwọ yóò lè kọ̀wé níhìn-ín ní kété tí ẹnìkan bá gbà á.",
    ig: "Ọ dịbeghị onye ọ bụla n'ụlọ ọrụ gị weere okwu gị. Ị ga-enwe ike ide ebe a ozugbo mmadụ weere ya.",
    fr: "Personne dans votre agence n'a encore pris votre dossier en charge. Vous pourrez écrire ici dès que quelqu'un le fera.",
    pt: "Ainda ninguém na sua agência assumiu o seu processo. Poderá escrever aqui assim que alguém o fizer.",
    sw: "Bado hakuna mtu katika wakala wako aliyechukua kesi yako. Utaweza kuandika hapa mara tu mtu atakapoichukua.",
    ar: "لم يتسلّم أحد في وكالتك ملفك بعد. سيمكنك الكتابة هنا فور أن يتسلّمه أحدهم.",
    tw: "Obiara nni w'adwumakuw no mu a wagye w'asɛm no nnya. Wobɛtumi akyerɛw wɔ ha bere a obi gye no.",
    zu: "Akekho enkampanini yakho osethathe icala lakho. Uzokwazi ukubhala lapha ngokushesha nje uma ekhona osithathayo.",
  },
  /**
   * Only ever a fallback, for an agency colleague whose profile carries
   * no name. It used to read "Toplance team", which since #58 is a
   * statement the product spends the rest of its copy denying: nobody at
   * Toplance reads these threads. The wording matches `unclaimedNotice`
   * above, which already says "your agency" in each locale.
   */
  senderAgency: {
    en: "Your agency",
    ha: "Hukumarka",
    yo: "Ilé-iṣẹ́ rẹ",
    ig: "Ụlọ ọrụ gị",
    fr: "Votre agence",
    pt: "A sua agência",
    sw: "Wakala wako",
    ar: "وكالتك",
    tw: "W'ahyehyɛdeɛ",
    zu: "Inkampani yakho",
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
