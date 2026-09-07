import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The strings behind `OtherDoors` — the headings the two generic auth
 * pages use, and the title/body of each door it lists. Kept apart from
 * `AUTH_FORM` because `OtherDoors` and its callers are Server Components
 * (no `useT()`), resolved with `getLocale()` instead.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the
 * English, like `HERO` before it.
 */
export const AUTH_DOORS_HEADINGS: { hereForSomethingElse: L; notATraveler: L } = {
  hereForSomethingElse: {
    en: "Here for something else?",
    ha: "Kana nan don wani abu dabam?",
    yo: "Ṣé o wà níbí fún ohun mìíràn?",
    ig: "Ị nọ ebe a maka ihe ọzọ?",
    fr: "Vous êtes ici pour autre chose ?",
    pt: "Está aqui por outro motivo?",
    sw: "Uko hapa kwa jambo lingine?",
    ar: "هل أنت هنا لسبب آخر؟",
    tw: "Woaba ha wɔ biribi foforo ho?",
    zu: "Ulapha ngenxa yokunye?",
  },
  notATraveler: {
    en: "Not a traveler?",
    ha: "Ba matafiyi ba ne?",
    yo: "Kì í ṣe arìnrìn-àjò?",
    ig: "Ị bụghị onye njem?",
    fr: "Vous n'êtes pas un voyageur ?",
    pt: "Não é um viajante?",
    sw: "Si msafiri?",
    ar: "لست مسافراً؟",
    tw: "Wonyɛ ɔkwantuni?",
    zu: "Awuyena umhambi?",
  },
};

export const AUTH_DOORS: {
  employerSignUp: { title: L; body: L };
} = {
  employerSignUp: {
    title: {
      en: "Employer sign-up",
      ha: "Rijistar ma'aikaci",
      yo: "Ìforúkọsílẹ̀ agbanisíṣẹ́",
      ig: "Ndebanye aha onye ọrụ",
      fr: "Inscription employeur",
      pt: "Registo de empregador",
      sw: "Usajili wa mwajiri",
      ar: "تسجيل صاحب العمل",
      tw: "Adwumawura akwankyerɛ",
      zu: "Ukubhalisa umqashi",
    },
    body: {
      en: "Create your organisation, sponsor seats and invite your people",
      ha: "Ƙirƙiri ƙungiyarka, ɗauki nauyin wurare kuma ka gayyaci mutanenka",
      yo: "Dá àjọ rẹ sílẹ̀, ṣàrànṣe àyè, kí o sì pe àwọn ènìyàn rẹ",
      ig: "Mepụta ụlọ ọrụ gị, kwadoro oche ma kpọọ ndị gị",
      fr: "Créez votre organisation, parrainez des places et invitez vos collaborateurs",
      pt: "Crie a sua organização, patrocine lugares e convide a sua equipa",
      sw: "Unda shirika lako, dhamini viti na ualike watu wako",
      ar: "أنشئ مؤسستك، وموّل المقاعد، وادعُ أفرادك",
      tw: "Yɛ mo kuo, gye nkongua ho boa na frɛ mo nkurɔfoɔ",
      zu: "Dala inhlangano yakho, xhasa izihlalo futhi umeme abantu bakho",
    },
  },
};
