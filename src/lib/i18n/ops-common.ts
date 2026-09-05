import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The bits repeated across every ops screen and component: the bar's own
 * subtitle, the fallbacks a row falls back to when a name or a route is
 * missing, the review-state words a corridor and a document share, the
 * nav labels, and the six `travel_purpose` values (`@/lib/db/schema.ts`)
 * shown as plain words rather than raw enum text.
 *
 * Kept separate from any one page's dictionary because every ops screen
 * — the queue, a case, the corridor list, a corridor's own page — reads
 * from it, and a second copy in each would be the drift `ops-nav.ts`
 * itself was written to prevent.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_COMMON: {
  subtitlePrefix: L;
  staffRole: { reviewer: L; owner: L };
  unnamed: L;
  formerStaff: L;
  routeNotSet: L;
  unassigned: L;
  cancel: L;
  source: L;
  noSourceRecorded: L;
  awaitingReview: L;
  approved: L;
  sentBack: L;
  live: L;
  documentsWord: L;
  caseWord: { one: L; other: L };
  documentWord: { one: L; other: L };
  tripWord: { one: L; other: L };
  nav: { caseQueue: L; routes: L };
  purpose: {
    tourism: L;
    work: L;
    study: L;
    medical: L;
    relocation: L;
    business: L;
  };
} = {
  /** Followed by " · {role}" — see `staffRole` below. */
  subtitlePrefix: {
    en: "Toplance operations",
    ha: "Ayyukan Toplance",
    yo: "Iṣẹ́ Toplance",
    ig: "Ọrụ Toplance",
    fr: "Opérations Toplance",
    pt: "Operações Toplance",
    sw: "Uendeshaji wa Toplance",
    ar: "عمليات Toplance",
    tw: "Toplance nnwuma",
    zu: "Ukusebenza kwe-Toplance",
  },
  staffRole: {
    reviewer: {
      en: "reviewer",
      ha: "mai bita",
      yo: "olùyẹ̀wò",
      ig: "onye nyocha",
      fr: "réviseur",
      pt: "revisor",
      sw: "mkaguzi",
      ar: "مراجع",
      tw: "ɔhwɛfoɔ",
      zu: "umhloli",
    },
    owner: {
      en: "owner",
      ha: "mai gida",
      yo: "onílé",
      ig: "onye nwe ya",
      fr: "propriétaire",
      pt: "proprietário",
      sw: "mmiliki",
      ar: "المالك",
      tw: "ɔwura",
      zu: "umnikazi",
    },
  },
  unnamed: {
    en: "Unnamed",
    ha: "Ba a bayar da suna ba",
    yo: "Aláìjẹ́-orúkọ",
    ig: "Enweghị aha",
    fr: "Sans nom",
    pt: "Sem nome",
    sw: "Bila jina",
    ar: "بلا اسم",
    tw: "Din nni ho",
    zu: "Akunagama",
  },
  formerStaff: {
    en: "Former staff",
    ha: "Tsohon ma'aikaci",
    yo: "Òṣìṣẹ́ tẹ́lẹ̀",
    ig: "Onye ọrụ mbụ",
    fr: "Ancien membre du personnel",
    pt: "Antigo funcionário",
    sw: "Aliyekuwa mfanyakazi",
    ar: "موظف سابق",
    tw: "Adwumayɛfoɔ dedaw",
    zu: "Owayeyisisebenzi",
  },
  routeNotSet: {
    en: "Route not set",
    ha: "Ba a saita hanya ba",
    yo: "A kò tí ì ṣètò ipa ọ̀nà",
    ig: "Edobeghị ụzọ",
    fr: "Itinéraire non défini",
    pt: "Rota não definida",
    sw: "Njia haijawekwa",
    ar: "المسار غير محدد",
    tw: "Wɔnhyehyɛɛ kwan",
    zu: "Indlela ayihlelwe",
  },
  unassigned: {
    en: "Unassigned",
    ha: "Ba a ba wa kowa ba",
    yo: "Aláìní olùdarí",
    ig: "Enyeghị onye ọrụ",
    fr: "Non attribué",
    pt: "Não atribuído",
    sw: "Haijapangiwa",
    ar: "غير مُسند",
    tw: "Wɔnhyɛɛ obiara",
    zu: "Akwabelwe muntu",
  },
  cancel: {
    en: "Cancel",
    ha: "Soke",
    yo: "Fagilé",
    ig: "Kagbuo",
    fr: "Annuler",
    pt: "Cancelar",
    sw: "Ghairi",
    ar: "إلغاء",
    tw: "Twa mu",
    zu: "Khansela",
  },
  source: {
    en: "Source",
    ha: "Tushe",
    yo: "Orísun",
    ig: "Isi mmalite",
    fr: "Source",
    pt: "Fonte",
    sw: "Chanzo",
    ar: "المصدر",
    tw: "Nsutɔ",
    zu: "Umthombo",
  },
  noSourceRecorded: {
    en: "No source recorded",
    ha: "Babu tushen da aka rubuta",
    yo: "Kò sí orísun tí a kọ sílẹ̀",
    ig: "Edebeghị isi mmalite",
    fr: "Aucune source enregistrée",
    pt: "Nenhuma fonte registada",
    sw: "Hakuna chanzo kilichorekodiwa",
    ar: "لا يوجد مصدر مسجَّل",
    tw: "Wɔnkyerɛw nsutɔ biara",
    zu: "Awukho umthombo obhaliwe",
  },
  awaitingReview: {
    en: "Awaiting review",
    ha: "Ana jiran bita",
    yo: "Ń dúró de àyẹ̀wò",
    ig: "Na-eche nyocha",
    fr: "En attente d'examen",
    pt: "A aguardar revisão",
    sw: "Inasubiri ukaguzi",
    ar: "بانتظار المراجعة",
    tw: "Ɛretwɛn nhwehwɛmu",
    zu: "Ilinde ukubuyekezwa",
  },
  approved: {
    en: "Approved",
    ha: "An amince",
    yo: "A ti fọwọ́ sí i",
    ig: "Ekwenyere",
    fr: "Approuvé",
    pt: "Aprovado",
    sw: "Imeidhinishwa",
    ar: "معتمد",
    tw: "Wɔapene so",
    zu: "Kugunyaziwe",
  },
  sentBack: {
    en: "Sent back",
    ha: "An mayar da shi",
    yo: "A ti dá a padà",
    ig: "Ezighachi ya",
    fr: "Renvoyé",
    pt: "Devolvido",
    sw: "Imerudishwa",
    ar: "أُعيد",
    tw: "Wɔasan de akɔ",
    zu: "Kubuyisiwe",
  },
  live: {
    en: "Live",
    ha: "Yana aiki",
    yo: "Ń ṣiṣẹ́",
    ig: "Na-arụ ọrụ",
    fr: "En ligne",
    pt: "Ativo",
    sw: "Inatumika",
    ar: "مُفعَّل",
    tw: "Ɛreyɛ adwuma",
    zu: "Iyasebenza",
  },
  documentsWord: {
    en: "documents",
    ha: "takardu",
    yo: "àwọn ìwé",
    ig: "akwụkwọ",
    fr: "documents",
    pt: "documentos",
    sw: "nyaraka",
    ar: "المستندات",
    tw: "nkrataa",
    zu: "amadokhumenti",
  },
  caseWord: {
    one: {
      en: "case",
      ha: "shari'a",
      yo: "ẹjọ́",
      ig: "ikpe",
      fr: "dossier",
      pt: "processo",
      sw: "kesi",
      ar: "حالة",
      tw: "asɛm",
      zu: "icala",
    },
    other: {
      en: "cases",
      ha: "shari'o'i",
      yo: "àwọn ẹjọ́",
      ig: "ikpe",
      fr: "dossiers",
      pt: "processos",
      sw: "kesi",
      ar: "حالات",
      tw: "nsɛm",
      zu: "amacala",
    },
  },
  documentWord: {
    one: {
      en: "document",
      ha: "takarda",
      yo: "ìwé",
      ig: "akwụkwọ",
      fr: "document",
      pt: "documento",
      sw: "hati",
      ar: "مستند",
      tw: "krataa",
      zu: "idokhumenti",
    },
    other: {
      en: "documents",
      ha: "takardu",
      yo: "àwọn ìwé",
      ig: "akwụkwọ",
      fr: "documents",
      pt: "documentos",
      sw: "hati",
      ar: "مستندات",
      tw: "nkrataa",
      zu: "amadokhumenti",
    },
  },
  tripWord: {
    one: {
      en: "trip",
      ha: "tafiya",
      yo: "ìrìn àjò",
      ig: "njem",
      fr: "voyage",
      pt: "viagem",
      sw: "safari",
      ar: "رحلة",
      tw: "akwantuo",
      zu: "uhambo",
    },
    other: {
      en: "trips",
      ha: "tafiye-tafiye",
      yo: "àwọn ìrìn àjò",
      ig: "njem",
      fr: "voyages",
      pt: "viagens",
      sw: "safari",
      ar: "رحلات",
      tw: "akwantuo",
      zu: "izinhambo",
    },
  },
  nav: {
    caseQueue: {
      en: "Case queue",
      ha: "Layin shari'o'i",
      yo: "Ẹsẹ̀ ìdúró ẹjọ́",
      ig: "Ndozi ikpe",
      fr: "File des dossiers",
      pt: "Fila de processos",
      sw: "Foleni ya kesi",
      ar: "قائمة انتظار الحالات",
      tw: "Nsɛm hyehyɛɛ",
      zu: "Umugqa wamacala",
    },
    routes: {
      en: "Routes",
      ha: "Hanyoyi",
      yo: "Àwọn ipa ọ̀nà",
      ig: "Ụzọ",
      fr: "Itinéraires",
      pt: "Rotas",
      sw: "Njia",
      ar: "المسارات",
      tw: "Akwan",
      zu: "Izindlela",
    },
  },
  purpose: {
    tourism: {
      en: "Tourism",
      ha: "Yawon buɗe ido",
      yo: "Arìnrìn-àjò afẹ́",
      ig: "Njem nlegharị anya",
      fr: "Tourisme",
      pt: "Turismo",
      sw: "Utalii",
      ar: "سياحة",
      tw: "Akwantuo/anigyeɛ",
      zu: "Ezokuvakasha",
    },
    work: {
      en: "Work",
      ha: "Aiki",
      yo: "Iṣẹ́",
      ig: "Ọrụ",
      fr: "Travail",
      pt: "Trabalho",
      sw: "Kazi",
      ar: "عمل",
      tw: "Adwuma",
      zu: "Umsebenzi",
    },
    study: {
      en: "Study",
      ha: "Karatu",
      yo: "Ìkẹ́kọ̀ọ́",
      ig: "Ọmụmụ ihe",
      fr: "Études",
      pt: "Estudos",
      sw: "Masomo",
      ar: "دراسة",
      tw: "Adesua",
      zu: "Ukufunda",
    },
    medical: {
      en: "Medical",
      ha: "Lafiya",
      yo: "Ìtọ́jú ìlera",
      ig: "Ahụike",
      fr: "Médical",
      pt: "Médico",
      sw: "Matibabu",
      ar: "علاج طبي",
      tw: "Ayaresa",
      zu: "Ezempilo",
    },
    relocation: {
      en: "Relocation",
      ha: "Ƙaura",
      yo: "Ìṣílọ",
      ig: "Mbugharị",
      fr: "Installation",
      pt: "Mudança",
      sw: "Uhamiaji",
      ar: "الانتقال",
      tw: "Atutena",
      zu: "Ukufuduka",
    },
    business: {
      en: "Business",
      ha: "Kasuwanci",
      yo: "Òwò",
      ig: "Azụmahịa",
      fr: "Affaires",
      pt: "Negócios",
      sw: "Biashara",
      ar: "أعمال",
      tw: "Adwadie",
      zu: "Ibhizinisi",
    },
  },
};
