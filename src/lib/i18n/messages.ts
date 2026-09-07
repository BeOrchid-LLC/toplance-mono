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
   * Shown while nobody at the agency has claimed the case. 4.10: an
   * unassigned thread goes to the agency as a whole, and the traveller
   * is told as much — a shared inbox is the honest model for a small
   * agency, and silence from one reads as being ignored by a person.
   */
  unclaimedNotice: L;
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
  unclaimedNotice: {
    en: "Nobody has picked up your case yet, so your message goes to your agency's whole team. Someone will reply.",
    ha: "Har yanzu babu wanda ya karɓi shari'arka, don haka saƙonka zai je ga dukan ƙungiyar hukumarka. Wani zai amsa.",
    yo: "Kò tíì sí ẹnìkan tí ó gba ọ̀rọ̀ rẹ, nítorí náà ìránṣẹ́ rẹ yóò lọ sí gbogbo ẹgbẹ́ ilé-iṣẹ́ rẹ. Ẹnìkan yóò dáhùn.",
    ig: "Ọ dịbeghị onye weere okwu gị, ya mere ozi gị na-aga na ndị otu ụlọ ọrụ gị niile. Otu onye ga-aza.",
    fr: "Personne n'a encore pris votre dossier en charge, votre message va donc à toute l'équipe de votre agence. Quelqu'un vous répondra.",
    pt: "Ainda ninguém assumiu o seu processo, por isso a sua mensagem vai para toda a equipa da sua agência. Alguém irá responder.",
    sw: "Bado hakuna aliyechukua kesi yako, kwa hivyo ujumbe wako unaenda kwa timu nzima ya wakala wako. Mtu atajibu.",
    ar: "لم يتسلّم أحد ملفك بعد، لذا تصل رسالتك إلى فريق وكالتك بالكامل. سيرد عليك أحدهم.",
    tw: "Obiara nnyaa w'asɛm no nnya, enti wo nkrasɛm no kɔ w'ahyehyɛdeɛ no kuo no nyinaa hɔ. Obi bɛbua.",
    zu: "Akekho osethathe icala lakho, ngakho umyalezo wakho uya kulo lonke iqembu lenkampani yakho. Kukhona ozophendula.",
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
