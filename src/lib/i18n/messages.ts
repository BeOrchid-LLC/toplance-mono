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
   * Shown *above* the composer while nobody at the agency has claimed
   * the case — never in place of it.
   *
   * It has been all three things this sentence can be. It began as "an
   * unassigned thread goes to the agency as a whole", became "you will
   * be able to write as soon as someone picks this up" when
   * `canWriteMessages` grew a handler gate, and is now the first again,
   * because the gate is gone: a traveller who has just finished
   * onboarding is exactly the person with a question, and a Messages
   * screen whose only content is a sentence about why they cannot send
   * one is the worst screen in the product.
   *
   * So this sets an expectation rather than refusing an action. It says
   * nobody is on the case yet — which is honest, and which the
   * traveller would otherwise infer from silence — and then says the
   * message still lands.
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
    en: "Nobody at your agency has picked up your case yet — write anyway. Whoever takes it will see your message.",
    ha: "Har yanzu babu wanda ya karɓi shari'arka a hukumarka — ka rubuta duk da haka. Duk wanda ya karɓe ta zai ga saƙonka.",
    yo: "Kò tíì sí ẹnìkan ní ilé-iṣẹ́ rẹ tí ó gba ọ̀rọ̀ rẹ — kọ̀wé lọ́nàkọnà. Ẹnikẹ́ni tí ó bá gbà á yóò rí ìránṣẹ́ rẹ.",
    ig: "Ọ dịbeghị onye ọ bụla n'ụlọ ọrụ gị weere okwu gị — deere ya n'agbanyeghị. Onye ọ bụla weere ya ga-ahụ ozi gị.",
    fr: "Personne dans votre agence n'a encore pris votre dossier en charge — écrivez quand même. La personne qui le prendra verra votre message.",
    pt: "Ainda ninguém na sua agência assumiu o seu processo — escreva à mesma. Quem o assumir verá a sua mensagem.",
    sw: "Bado hakuna mtu katika wakala wako aliyechukua kesi yako — andika hata hivyo. Yeyote atakayeichukua ataona ujumbe wako.",
    ar: "لم يتسلّم أحد في وكالتك ملفك بعد — اكتب على أي حال. سيرى رسالتك من يتسلّمه.",
    tw: "Obiara nni w'adwumakuw no mu a wagye w'asɛm no nnya — twerɛ ara. Obiara a ɔbɛgye no bɛhu wo nkrasɛm.",
    zu: "Akekho enkampanini yakho osethathe icala lakho — bhala noma kunjalo. Noma ngubani osithathayo uzowubona umlayezo wakho.",
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
