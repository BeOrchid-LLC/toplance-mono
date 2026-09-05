import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The marketing chrome shared by `SiteNav`, `SiteFooter` and the section
 * rails of both landing pages — "How it works" is the same word on the
 * nav bar, the footer and the section label above it, and three
 * near-identical dictionaries would be three places for the same phrase
 * to drift out of step with itself.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house, the same way
 * as the rest of `src/lib/i18n/*`.
 */
export const SITE_CHROME: {
  howItWorks: L;
  /** The agency-facing short form of the "where" section, used by the nav and the footer. */
  whereYouCanGo: L;
  /** The traveller-facing short form of the "where" section, used by the nav and its section label. */
  whereWeWork: L;
  pricing: L;
  yourDashboard: L;
  agencySignIn: L;
  runYourFirstCase: L;
  forAgencies: L;
  forTravelers: L;
  openMenu: L;
  menuTitle: L;
  appearance: L;
  language: L;
  /** Case states shown on the roster preview card on both landing pages. */
  rosterSubmitted: L;
  rosterUnderReview: L;
  rosterCollecting: L;
  rosterDraft: L;
  wordAnd: L;
  wordAt: L;
  /** Section-rail labels shared by both landing pages' identical sections. */
  sectionTheProblem: L;
  sectionWhatYouGet: L;
  sectionQuestions: L;
  sectionProof: L;
  /** The ledger's column headers — "Doing it yourself" on the agency page, "Doing it alone" on the traveller one, the same "With Toplance" on both. */
  doingItYourself: L;
  doingItAlone: L;
  withToplance: L;
  /** The word prefixing a step's ordinal in the "How it works" rail on both pages. */
  stepWord: L;
  freeWord: L;
  paidWord: L;
  employerSignIn: L;
  logoWord: L;
} = {
  howItWorks: {
    en: "How it works",
    ha: "Yadda yake aiki",
    yo: "Bí ó ṣe ń ṣiṣẹ́",
    ig: "Otu ọ si arụ ọrụ",
    fr: "Comment ça marche",
    pt: "Como funciona",
    sw: "Jinsi inavyofanya kazi",
    ar: "كيف يعمل",
    tw: "Sɛnea ɛyɛ adwuma",
    zu: "Isebenza kanjani",
  },
  whereYouCanGo: {
    en: "Where you can go",
    ha: "Inda za ka iya zuwa",
    yo: "Ibi tí o lè lọ",
    ig: "Ebe ị nwere ike ịga",
    fr: "Où vous pouvez aller",
    pt: "Para onde pode ir",
    sw: "Unakoweza kwenda",
    ar: "إلى أين يمكنك الذهاب",
    tw: "Baabi a wobɛtumi akɔ",
    zu: "Lapho ongaya khona",
  },
  whereWeWork: {
    en: "Where we work",
    ha: "Inda muke aiki",
    yo: "Ibi tí a ń ṣiṣẹ́ sí",
    ig: "Ebe anyị na-arụ ọrụ",
    fr: "Où nous intervenons",
    pt: "Onde atuamos",
    sw: "Tunakofanya kazi",
    ar: "أين نعمل",
    tw: "Baabi a yɛyɛ adwuma",
    zu: "Lapho sisebenza khona",
  },
  pricing: {
    en: "Pricing",
    ha: "Farashi",
    yo: "Owó iṣẹ́",
    ig: "Ọnụ ahịa",
    fr: "Tarifs",
    pt: "Preços",
    sw: "Bei",
    ar: "التسعير",
    tw: "Bo a wobɔ",
    zu: "Amanani",
  },
  yourDashboard: {
    en: "Your dashboard",
    ha: "Dashboard ɗinka",
    yo: "Pátákó ìdarí rẹ",
    ig: "Bọọdụ gị",
    fr: "Votre tableau de bord",
    pt: "O seu painel",
    sw: "Dashibodi yako",
    ar: "لوحة التحكم الخاصة بك",
    tw: "Wo dashboard",
    zu: "Ideshibhodi lakho",
  },
  agencySignIn: {
    en: "Agency sign-in",
    ha: "Shiga na hukuma",
    yo: "Wíwọlé àjọ",
    ig: "Nbanye ụlọ ọrụ",
    fr: "Connexion agence",
    pt: "Entrada da agência",
    sw: "Kuingia kwa wakala",
    ar: "تسجيل دخول الوكالة",
    tw: "Adwumakuo hyɛnmu",
    zu: "Ukungena kwenhlangano",
  },
  runYourFirstCase: {
    en: "Run your first case",
    ha: "Fara al'amarinka na farko",
    yo: "Bẹ̀rẹ̀ ọ̀rọ̀ àkọ́kọ́ rẹ",
    ig: "Malite okwu mbụ gị",
    fr: "Lancez votre premier dossier",
    pt: "Inicie o seu primeiro processo",
    sw: "Anzisha kesi yako ya kwanza",
    ar: "ابدأ حالتك الأولى",
    tw: "Fi wo asɛm a ɛdi kan ase",
    zu: "Qala icala lakho lokuqala",
  },
  forAgencies: {
    en: "For agencies",
    ha: "Ga hukumomi",
    yo: "Fún àwọn àjọ",
    ig: "Maka ụlọ ọrụ",
    fr: "Pour les agences",
    pt: "Para agências",
    sw: "Kwa wakala",
    ar: "للوكالات",
    tw: "Ma adwumakuo",
    zu: "Ezinhlanganweni",
  },
  forTravelers: {
    en: "For travelers",
    ha: "Ga matafiya",
    yo: "Fún àwọn arìnrìn-àjò",
    ig: "Maka ndị njem",
    fr: "Pour les voyageurs",
    pt: "Para viajantes",
    sw: "Kwa wasafiri",
    ar: "للمسافرين",
    tw: "Ma akwantufoɔ",
    zu: "Kubahambi",
  },
  openMenu: {
    en: "Open menu",
    ha: "Buɗe menu",
    yo: "Ṣí àtòjọ",
    ig: "Mepee menu",
    fr: "Ouvrir le menu",
    pt: "Abrir menu",
    sw: "Fungua menyu",
    ar: "فتح القائمة",
    tw: "Bue menu",
    zu: "Vula imenyu",
  },
  menuTitle: {
    en: "Menu",
    ha: "Menu",
    yo: "Àtòjọ",
    ig: "Menu",
    fr: "Menu",
    pt: "Menu",
    sw: "Menyu",
    ar: "القائمة",
    tw: "Menu",
    zu: "Imenyu",
  },
  appearance: {
    en: "Appearance",
    ha: "Kamanni",
    yo: "Ìrísí",
    ig: "Ọdịdị",
    fr: "Apparence",
    pt: "Aparência",
    sw: "Muonekano",
    ar: "المظهر",
    tw: "Sɛnea ɛteɛ",
    zu: "Ukubukeka",
  },
  language: {
    en: "Language",
    ha: "Harshe",
    yo: "Èdè",
    ig: "Asụsụ",
    fr: "Langue",
    pt: "Idioma",
    sw: "Lugha",
    ar: "اللغة",
    tw: "Kasa",
    zu: "Ulimi",
  },
  rosterSubmitted: {
    en: "Submitted",
    ha: "An Aika",
    yo: "A Ti Fi Ránṣẹ́",
    ig: "E Zigara",
    fr: "Soumis",
    pt: "Submetido",
    sw: "Imewasilishwa",
    ar: "تم التقديم",
    tw: "Wɔde akɔma",
    zu: "Kuthunyelwe",
  },
  rosterUnderReview: {
    en: "Under review",
    ha: "Ana Bitar Ta",
    yo: "Ń Ṣàyẹ̀wò",
    ig: "Na-enyocha",
    fr: "En cours d'examen",
    pt: "Em análise",
    sw: "Inakaguliwa",
    ar: "قيد المراجعة",
    tw: "Wɔrehwɛ mu",
    zu: "Kuyahlolwa",
  },
  rosterCollecting: {
    en: "Collecting",
    ha: "Ana Tattarawa",
    yo: "Ń Kójọ",
    ig: "Na-achịkọta",
    fr: "En collecte",
    pt: "A recolher",
    sw: "Inakusanya",
    ar: "قيد التجميع",
    tw: "Wɔreboaboa ano",
    zu: "Kuqoqwa",
  },
  rosterDraft: {
    en: "Draft",
    ha: "Zane",
    yo: "Àkọpamọ́",
    ig: "Ihe eburu ebu",
    fr: "Brouillon",
    pt: "Rascunho",
    sw: "Rasimu",
    ar: "مسودة",
    tw: "Nsɛsoɔ",
    zu: "Uhlaka",
  },
  wordAnd: {
    en: "and",
    ha: "da",
    yo: "àti",
    ig: "na",
    fr: "et",
    pt: "e",
    sw: "na",
    ar: "و",
    tw: "ne",
    zu: "futhi",
  },
  wordAt: {
    en: "at",
    ha: "a farashin",
    yo: "ní",
    ig: "na ọnụahịa",
    fr: "à",
    pt: "a",
    sw: "kwa",
    ar: "بسعر",
    tw: "wɔ bo",
    zu: "ngentengo",
  },
  sectionTheProblem: {
    en: "The problem",
    ha: "Matsalar",
    yo: "Ìṣòro náà",
    ig: "Nsogbu ahụ",
    fr: "Le problème",
    pt: "O problema",
    sw: "Tatizo",
    ar: "المشكلة",
    tw: "Ɔhaw no",
    zu: "Inkinga",
  },
  sectionWhatYouGet: {
    en: "What you get",
    ha: "Abin da za ka samu",
    yo: "Ohun tí o máa rí gbà",
    ig: "Ihe ị ga-enweta",
    fr: "Ce que vous obtenez",
    pt: "O que recebe",
    sw: "Unachopata",
    ar: "ما الذي ستحصل عليه",
    tw: "Deɛ wobɛnya",
    zu: "Lokho okutholayo",
  },
  sectionQuestions: {
    en: "Questions",
    ha: "Tambayoyi",
    yo: "Àwọn Ìbéèrè",
    ig: "Ajụjụ",
    fr: "Questions",
    pt: "Perguntas",
    sw: "Maswali",
    ar: "الأسئلة",
    tw: "Nsɛmmisa",
    zu: "Imibuzo",
  },
  sectionProof: {
    en: "Proof",
    ha: "Hujja",
    yo: "Ẹ̀rí",
    ig: "Ihe akaebe",
    fr: "Preuves",
    pt: "Provas",
    sw: "Uthibitisho",
    ar: "الإثبات",
    tw: "Adanseɛ",
    zu: "Ubufakazi",
  },
  doingItYourself: {
    en: "Doing it yourself",
    ha: "Yin shi da kanka",
    yo: "Ṣíṣe é fúnra rẹ",
    ig: "Ime ya n'onwe gị",
    fr: "Le faire vous-même",
    pt: "Fazer isso sozinho",
    sw: "Kufanya mwenyewe",
    ar: "القيام بذلك بنفسك",
    tw: "Wo ara na wobɛyɛ",
    zu: "Ukukwenza wena",
  },
  doingItAlone: {
    en: "Doing it alone",
    ha: "Yin shi shi kaɗai",
    yo: "Ṣíṣe é nìkan",
    ig: "Ime ya naanị gị",
    fr: "Le faire seul",
    pt: "Fazê-lo sozinho",
    sw: "Kufanya peke yako",
    ar: "القيام بذلك بمفردك",
    tw: "Wo nko ara na wobɛyɛ",
    zu: "Ukukwenza wedwa",
  },
  withToplance: {
    en: "With Toplance",
    ha: "Tare da Toplance",
    yo: "Pẹ̀lú Toplance",
    ig: "Na Toplance",
    fr: "Avec Toplance",
    pt: "Com a Toplance",
    sw: "Ukiwa na Toplance",
    ar: "مع Toplance",
    tw: "Wɔ Toplance ho",
    zu: "Nge-Toplance",
  },
  stepWord: {
    en: "Step",
    ha: "Mataki",
    yo: "Ìgbésẹ̀",
    ig: "Nzọụkwụ",
    fr: "Étape",
    pt: "Etapa",
    sw: "Hatua",
    ar: "الخطوة",
    tw: "Anammɔntuo",
    zu: "Isinyathelo",
  },
  freeWord: {
    en: "Free",
    ha: "Kyauta",
    yo: "Ọ̀fẹ́",
    ig: "N'efu",
    fr: "Gratuit",
    pt: "Grátis",
    sw: "Bure",
    ar: "مجاني",
    tw: "Kwa",
    zu: "Mahhala",
  },
  paidWord: {
    en: "Paid",
    ha: "Biya",
    yo: "Owó",
    ig: "Akwụ ụgwọ",
    fr: "Payant",
    pt: "Pago",
    sw: "Inalipiwa",
    ar: "مدفوع",
    tw: "Wɔtua ho ka",
    zu: "Kukhokhelwa",
  },
  employerSignIn: {
    en: "Employer sign-in",
    ha: "Shiga na ma'aikaci",
    yo: "Wíwọlé agbanisíṣẹ́",
    ig: "Nbanye onye ọrụ",
    fr: "Connexion employeur",
    pt: "Entrada do empregador",
    sw: "Kuingia kwa mwajiri",
    ar: "تسجيل دخول صاحب العمل",
    tw: "Adwumamafoɔ hyɛnmu",
    zu: "Ukungena komqashi",
  },
  logoWord: {
    en: "Logo",
    ha: "Logo",
    yo: "Àmì",
    ig: "Logo",
    fr: "Logo",
    pt: "Logótipo",
    sw: "Nembo",
    ar: "الشعار",
    tw: "Logo",
    zu: "Ilogo",
  },
};
