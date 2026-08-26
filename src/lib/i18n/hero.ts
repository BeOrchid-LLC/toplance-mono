import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The hero, both calls to action and the trust line run in all four
 * languages — these are the strings that decide whether someone starts.
 * Long-form marketing body copy further down the page stays English for
 * now; translating it is a content job, not a design one.
 */
export const HERO: {
  kicker: L;
  title: L;
  body: L;
  ctaPrimary: L;
  ctaShort: L;
  ctaSecondary: L;
  signIn: L;
  trust: L[];
  slots: { origin: L; destination: L; purpose: L };
} = {
  kicker: {
    en: "Visas and relocation, done properly",
    ha: "Biza da ƙaura, an yi shi yadda ya kamata",
    yo: "Fisa àti ìṣílọ, tí a ṣe dáadáa",
    ig: "Visa na mbugharị, e mere ya nke ọma",
  },
  title: {
    en: "Know exactly what your visa needs — before you spend a naira on it",
    ha: "San ainihin abin da bizarka ke buƙata — kafin ka kashe ko sisi",
    yo: "Mọ̀ ohun gangan tí fisa rẹ nílò — kí o tó ná owó kankan",
    ig: "Mara kpọmkwem ihe visa gị chọrọ — tupu i mefuo otu naira",
  },
  body: {
    en: "Toplance asks a few short questions in your own language, turns your answers into the exact document checklist for your destination, checks every file as you upload it, and stays with you through the decision and your first week after landing.",
    ha: "Toplance yana yin ƴan gajerun tambayoyi da harshenka, ya juya amsoshinka zuwa cikakken jerin takardun da wurin da za ka je ke buƙata, yana duba kowace takarda yayin da kake ɗorawa, kuma yana tare da kai har zuwa yanke shawara da makon farko bayan ka sauka.",
    yo: "Toplance a bi ọ́ ní àwọn ìbéèrè kúkúrú díẹ̀ ní èdè tìrẹ, á sì sọ àwọn ìdáhùn rẹ di àkọsílẹ̀ ìwé pàtó tí ibi tí ò ń lọ nílò, á ṣàyẹ̀wò ìwé kọ̀ọ̀kan bí o ṣe ń gbé e sókè, á sì wà pẹ̀lú rẹ títí di ìpinnu àti ọ̀sẹ̀ àkọ́kọ́ rẹ lẹ́yìn tí o bá dé.",
    ig: "Toplance na-ajụ ajụjụ ole na ole dị mkpirikpi n'asụsụ gị, tụgharịa azịza gị ka ọ bụrụ ndepụta akwụkwọ kpọmkwem ebe ị na-aga chọrọ, nyochaa akwụkwọ ọ bụla ka ị na-ebugo ya, ma nọnyere gị ruo mgbe mkpebi ga-abịa na izu mbụ gị mgbe ị rutere.",
  },
  ctaPrimary: {
    en: "See your checklist — free",
    ha: "Ga jerin takardunka — kyauta",
    yo: "Wo àkọsílẹ̀ rẹ — ọ̀fẹ́",
    ig: "Hụ ndepụta gị — n'efu",
  },
  ctaShort: { en: "Get started", ha: "Fara", yo: "Bẹ̀rẹ̀", ig: "Malite" },
  ctaSecondary: {
    en: "For organisations",
    ha: "Ga kamfanoni",
    yo: "Fún àwọn àjọ",
    ig: "Maka ụlọ ọrụ",
  },
  signIn: { en: "Sign in", ha: "Shiga", yo: "Wọlé", ig: "Banye" },
  trust: [
    {
      en: "No card needed to see your checklist",
      ha: "Ba a buƙatar kati don ganin jerin takardunka",
      yo: "Kò sí káàdì tó nílò láti wo àkọsílẹ̀ rẹ",
      ig: "Ọ dịghị kaadị achọrọ iji hụ ndepụta gị",
    },
    {
      en: "Documents encrypted at rest and in transit",
      ha: "An ɓoye takardu a ajiye da kuma yayin aikawa",
      yo: "A fi ààbò bo àwọn ìwé nígbà ìpamọ́ àti ìfiránṣẹ́",
      ig: "E zochiri akwụkwọ mgbe echekwara ma na-ezigara",
    },
    {
      en: "English, Hausa, Yoruba and Igbo",
      ha: "Turanci, Hausa, Yoruba da Igbo",
      yo: "Gẹ̀ẹ́sì, Hausa, Yorùbá àti Ìgbò",
      ig: "Bekee, Hausa, Yoruba na Igbo",
    },
  ],

  /**
   * The three slots of the hero corridor bar. Single words on purpose:
   * the resolved corridor itself is shown as `NGA → GBR · WORK`, which
   * needs no grammar and reads the same in every language, so nothing
   * here has to survive being interpolated into a sentence.
   *
   * NEEDS NATIVE REVIEW before launch — these are the only strings on
   * the page not taken from copy the client supplied.
   */
  slots: {
    origin: { en: "Passport", ha: "Fasfo", yo: "Ìwé ìrìnnà", ig: "Paspọtụ" },
    destination: {
      en: "Destination",
      ha: "Wurin zuwa",
      yo: "Ibi tí ò ń lọ",
      ig: "Ebe ị na-aga",
    },
    purpose: { en: "Purpose", ha: "Dalili", yo: "Ìdí", ig: "Nzube" },
  },
};
