import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * What a route group says when its boundary catches.
 *
 * Separate from every console's dictionary because an error boundary is
 * the one screen that renders when the thing it belongs to has already
 * failed: it must not import a page's copy, a page's data helpers or
 * anything that could be the reason it is on screen at all.
 *
 * `/ops` does not read from here. That console is English-only,
 * consistent with the rest of it, so its boundary carries its strings
 * inline.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `admin-console.ts` and `hero.ts` were.
 */
export const ERROR_PAGE: {
  heading: L;
  body: L;
  tryAgain: L;
  backToApplication: L;
  backToConsole: L;
  backToStart: L;
  reference: L;
  loading: L;
} = {
  heading: {
    en: "That screen did not load",
    ha: "Wannan shafin bai buɗe ba",
    yo: "Ojú-ìwé yìí kò ṣí",
    ig: "Ihuenyo ahụ emepeghị",
    fr: "Cet écran ne s'est pas chargé",
    pt: "Este ecrã não carregou",
    sw: "Skrini hii haikupakia",
    ar: "لم يتم تحميل هذه الشاشة",
    tw: "Krataa yi ammue",
    zu: "Lesi sikrini asilayishekanga",
  },
  body: {
    en: "Something went wrong on our side. Nothing you were working on has been lost.",
    ha: "Wani abu ya faskara a gefenmu. Ba a rasa kome daga abin da kake yi ba.",
    yo: "Nǹkan kan ṣàṣìṣe ní ẹ̀gbẹ́ wa. Kò sí ohun tí o ń ṣe tí ó sọnù.",
    ig: "Ihe mere n'akụkụ anyị. Ọ dịghị ihe ị nọ na-arụ furu efu.",
    fr: "Un problème est survenu de notre côté. Rien de votre travail n'a été perdu.",
    pt: "Algo correu mal do nosso lado. Nada do seu trabalho foi perdido.",
    sw: "Hitilafu imetokea kwetu. Hakuna ulichokuwa ukifanya kilichopotea.",
    ar: "حدث خطأ لدينا. لم يُفقد أي شيء كنت تعمل عليه.",
    tw: "Biribi ankɔ yiye wɔ yɛn fa. Wo adwuma no mu biribiara anyera.",
    zu: "Kukhona okungahambanga kahle ngakithi. Akukho okwakwenza okulahlekile.",
  },
  tryAgain: {
    en: "Try again",
    ha: "Sake gwadawa",
    yo: "Gbìyànjú lẹ́ẹ̀kansí",
    ig: "Nwaa ọzọ",
    fr: "Réessayer",
    pt: "Tentar novamente",
    sw: "Jaribu tena",
    ar: "أعد المحاولة",
    tw: "Sɔ hwɛ bio",
    zu: "Zama futhi",
  },
  backToApplication: {
    en: "Back to my application",
    ha: "Koma ga takardata",
    yo: "Padà sí ìbéèrè mi",
    ig: "Laghachi na ngwa m",
    fr: "Retour à ma demande",
    pt: "Voltar ao meu pedido",
    sw: "Rudi kwenye maombi yangu",
    ar: "العودة إلى طلبي",
    tw: "San kɔ me abisadeɛ so",
    zu: "Buyela esicelweni sami",
  },
  backToConsole: {
    en: "Back to the console",
    ha: "Koma ga na'ura",
    yo: "Padà sí ibi-iṣẹ́",
    ig: "Laghachi na njikwa",
    fr: "Retour à la console",
    pt: "Voltar à consola",
    sw: "Rudi kwenye kidhibiti",
    ar: "العودة إلى لوحة التحكم",
    tw: "San kɔ adwumayɛbea",
    zu: "Buyela kukhonsoli",
  },
  backToStart: {
    en: "Back to the start",
    ha: "Koma farko",
    yo: "Padà sí ìbẹ̀rẹ̀",
    ig: "Laghachi na mmalite",
    fr: "Retour au début",
    pt: "Voltar ao início",
    sw: "Rudi mwanzo",
    ar: "العودة إلى البداية",
    tw: "San kɔ ahyɛaseɛ",
    zu: "Buyela ekuqaleni",
  },
  reference: {
    en: "Reference",
    ha: "Lamba",
    yo: "Ìtọ́kasí",
    ig: "Ntụaka",
    fr: "Référence",
    pt: "Referência",
    sw: "Kumbukumbu",
    ar: "المرجع",
    tw: "Nsɛnkyerɛnne",
    zu: "Inkomba",
  },
  loading: {
    en: "Loading",
    ha: "Ana ɗaukewa",
    yo: "Ń ṣí",
    ig: "Na-ebu",
    fr: "Chargement",
    pt: "A carregar",
    sw: "Inapakia",
    ar: "جارٍ التحميل",
    tw: "Ɛreba",
    zu: "Iyalayisha",
  },
};
