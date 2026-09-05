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
  employerSignIn: { title: L; body: L };
  opsSignIn: { title: L; body: L };
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
  employerSignIn: {
    title: {
      en: "Organisation sign-in",
      ha: "Shigar ƙungiya",
      yo: "Ìwọlé àjọ",
      ig: "Nbanye ụlọ ọrụ",
      fr: "Connexion organisation",
      pt: "Início de sessão da organização",
      sw: "Kuingia kwa shirika",
      ar: "تسجيل دخول المؤسسة",
      tw: "Kuo mu hyɛn",
      zu: "Ukungena kwenhlangano",
    },
    body: {
      en: "For the person managing seats and invitations at your organisation",
      ha: "Domin mutumin da ke gudanar da wurare da gayyatar mutane a ƙungiyarku",
      yo: "Fún ẹni tí ń ṣàkóso àwọn àyè àti ìpè ní àjọ yín",
      ig: "Maka onye na-elekọta oche na òkù n'ụlọ ọrụ gị",
      fr: "Pour la personne qui gère les sièges et les invitations au sein de votre organisation",
      pt: "Para a pessoa que gere os lugares e os convites na sua organização",
      sw: "Kwa mtu anayesimamia viti na mialiko katika shirika lako",
      ar: "لخصّ الشخص الذي يدير المقاعد والدعوات في مؤسستك",
      tw: "Ma obi a ɔhwɛ nkongua ne nsakraeɛ so wɔ mo kuo mu",
      zu: "Yomuntu ophethe izihlalo nezimemo enhlanganweni yakho",
    },
  },
  opsSignIn: {
    title: {
      en: "Toplance operations sign-in",
      ha: "Shigar ma'aikatan Toplance",
      yo: "Ìwọlé iṣẹ́ Toplance",
      ig: "Nbanye ọrụ Toplance",
      fr: "Connexion opérations Toplance",
      pt: "Início de sessão das operações Toplance",
      sw: "Kuingia kwa uendeshaji wa Toplance",
      ar: "تسجيل دخول عمليات Toplance",
      tw: "Toplance nnwuma mu hyɛn",
      zu: "Ukungena komsebenzi we-Toplance",
    },
    body: {
      en: "Staff only — review cases, verify documents and set decisions",
      ha: "Ma'aikata kaɗai — bincika lamura, tabbatar da takardu kuma ka yanke shawara",
      yo: "Àwọn òṣìṣẹ́ nìkan — ṣàyẹ̀wò àwọn ẹjọ́, ṣe ìdánimọ̀ àwọn ìwé kí o sì ṣe ìpinnu",
      ig: "Naanị ndị ọrụ — nyochaa okwu, kwenye akwụkwọ ma kpebie mkpebi",
      fr: "Réservé au personnel — examinez les dossiers, vérifiez les documents et fixez les décisions",
      pt: "Apenas para a equipa — analise processos, verifique documentos e defina decisões",
      sw: "Wafanyakazi pekee — kagua kesi, thibitisha nyaraka na weka maamuzi",
      ar: "للموظفين فقط — راجع الحالات، وتحقق من المستندات، وحدد القرارات",
      tw: "Adwumayɛfoɔ nkutoo — hwɛ nsɛm mu, hwɛ nkrataa mu na si gyinaesi",
      zu: "Abasebenzi kuphela — buyekeza amacala, qinisekisa amadokhumenti bese usetha izinqumo",
    },
  },
};
