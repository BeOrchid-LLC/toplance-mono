import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/corridors/page.tsx` — the route coverage table. Review-state
 * words ("Awaiting review", "Approved", "Sent back") and the
 * `travel_purpose` labels live in `OPS_COMMON`, since the corridor's own
 * page (`OPS_CORRIDOR_REVIEW`) needs the same words for the same states.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_CORRIDORS: {
  heading: L;
  intro: L;
  counters: {
    liveRoutes: { label: L; sub: L };
    awaitingReviewSub: L;
    destinations: { label: L; sub: L };
    notCheckedYet: { label: L; sub: L };
  };
  allVersionsPanel: L;
  rowsWord: L;
  emptyPrefix: L;
  emptyMiddle: L;
  tableHead: {
    route: L;
    purpose: L;
    version: L;
    state: L;
    documents: L;
    lastChecked: L;
  };
  stale: L;
  notCheckedYetShort: L;
} = {
  heading: {
    en: "Route coverage",
    ha: "Rufin hanyoyi",
    yo: "Àdéhùn ipa ọ̀nà",
    ig: "Mkpuchi ụzọ",
    fr: "Couverture des itinéraires",
    pt: "Cobertura de rotas",
    sw: "Ufuniko wa njia",
    ar: "تغطية المسارات",
    tw: "Akwan a wɔakata so",
    zu: "Ukumbozwa kwezindlela",
  },
  intro: {
    en: "Every rule set the engine can serve, and how long it has been since a person read it against its source.",
    ha: "Kowane tsarin ƙa'idodi da injin zai iya bayarwa, da kuma tsawon lokacin da wani ya karanta shi da tushen.",
    yo: "Gbogbo àkójọ òfin tí ẹ́ńjìnnì náà lè pèsè, àti bí ó ti pẹ́ tí ẹnìkan ti kà á lòdì sí orísun rẹ̀.",
    ig: "Nchịkọta iwu ọ bụla injin nwere ike inye, na ogologo oge onye ọ bụla si gụọ ya megide isi mmalite ya.",
    fr: "Chaque ensemble de règles que le moteur peut servir, et depuis combien de temps une personne l'a comparé à sa source.",
    pt: "Cada conjunto de regras que o motor pode servir, e há quanto tempo uma pessoa o confrontou com a sua fonte.",
    sw: "Kila seti ya kanuni ambayo mfumo unaweza kutoa, na muda gani tangu mtu aisome dhidi ya chanzo chake.",
    ar: "كل مجموعة قواعد يمكن للمحرك تقديمها، ومنذ متى قام شخص بمراجعتها مقابل مصدرها.",
    tw: "Mmara nhyehyɛeɛ biara a afiri no bɛtumi ama, ne berɛ a atwam firi ɛberɛ a obi kenkan tiaa ne nsutɔ.",
    zu: "Yonke isethi yemithetho ekwazi ukunikezwa injini, nokuthi sekukudala kangakanani umuntu eyifundile eqhathaniswa nomthombo wayo.",
  },
  counters: {
    liveRoutes: {
      label: {
        en: "Live routes",
        ha: "Hanyoyin aiki",
        yo: "Àwọn ipa ọ̀nà tí ń ṣiṣẹ́",
        ig: "Ụzọ na-arụ ọrụ",
        fr: "Itinéraires en ligne",
        pt: "Rotas ativas",
        sw: "Njia zinazotumika",
        ar: "المسارات المُفعَّلة",
        tw: "Akwan a ɛreyɛ adwuma",
        zu: "Izindlela ezisebenzayo",
      },
      sub: {
        en: "resolvable by a traveler",
        ha: "matafiyi zai iya samu",
        yo: "arìnrìn-àjò lè rí",
        ig: "onye njem nwere ike ịmata ya",
        fr: "accessibles à un voyageur",
        pt: "resolvíveis por um viajante",
        sw: "zinazoweza kutumiwa na msafiri",
        ar: "يمكن أن يصل إليها المسافر",
        tw: "akwantufoɔ betumi anya",
        zu: "ezitholakalayo esihambini",
      },
    },
    awaitingReviewSub: {
      en: "drafted, not yet published",
      ha: "an tsara, ba a wallafa tukuna ba",
      yo: "a ti kọ ọ́, a kò tí ì tẹ̀ ẹ́ jáde",
      ig: "edepụtala, ebipụtabeghị ya",
      fr: "rédigés, pas encore publiés",
      pt: "redigidas, ainda não publicadas",
      sw: "zimeandaliwa, bado hazijachapishwa",
      ar: "مُسوَّدة، لم تُنشر بعد",
      tw: "wɔatwerɛ, wɔmfaa mmaa gua so",
      zu: "kulotshiwe, akukashicilelwa",
    },
    destinations: {
      label: {
        en: "Destinations",
        ha: "Wuraren zuwa",
        yo: "Àwọn ibi tí ó lọ",
        ig: "Ebe a na-aga",
        fr: "Destinations",
        pt: "Destinos",
        sw: "Maeneo",
        ar: "الوجهات",
        tw: "Mmaa a wɔreko",
        zu: "Izindawo eziyiwa",
      },
      sub: {
        en: "of 50 required at launch",
        ha: "daga cikin 50 da ake buƙata a farawa",
        yo: "nínú 50 tí a nílò ní ìbẹ̀rẹ̀",
        ig: "n'ime 50 achọrọ na mmalite",
        fr: "sur les 50 requises au lancement",
        pt: "de 50 exigidos no lançamento",
        sw: "kati ya 50 zinazohitajika uzinduzi",
        ar: "من أصل 50 مطلوبة عند الإطلاق",
        tw: "wɔ 50 a wɔhwehwɛ wɔ mfitiaseɛ mu",
        zu: "kwezingu-50 ezidingekayo ekuqaleni",
      },
    },
    notCheckedYet: {
      label: {
        en: "Not checked yet",
        ha: "Ba a bincika tukuna ba",
        yo: "Kò tí ì ṣàyẹ̀wò rẹ̀",
        ig: "Elelebeghị ya anya",
        fr: "Pas encore vérifiées",
        pt: "Ainda não verificadas",
        sw: "Bado hazijakaguliwa",
        ar: "لم تُفحص بعد",
        tw: "Wɔnhwɛɛ mu ɛnnye",
        zu: "Akukahlolwa",
      },
      sub: {
        en: "live with no verification on record",
        ha: "yana aiki amma babu tabbaci a rikodi",
        yo: "ń ṣiṣẹ́ láìsí àyẹ̀wò tí a kọ sílẹ̀",
        ig: "na-arụ ọrụ na-enweghị nyocha e dekọrọ",
        fr: "en ligne mais sans vérification enregistrée",
        pt: "ativas sem verificação registada",
        sw: "zinatumika bila uthibitisho wowote uliorekodiwa",
        ar: "مُفعَّلة دون أي فحص مسجَّل",
        tw: "ɛreyɛ adwuma nanso nhwehwɛmu biara nni ho a wɔakyerɛw",
        zu: "ziyasebenza kodwa akukho ukuhlolwa okurekhodiwe",
      },
    },
  },
  allVersionsPanel: {
    en: "All versions",
    ha: "Dukkan bugu",
    yo: "Gbogbo ẹ̀yà",
    ig: "Ụdị niile",
    fr: "Toutes les versions",
    pt: "Todas as versões",
    sw: "Matoleo yote",
    ar: "جميع الإصدارات",
    tw: "Nsakraeɛ nyinaa",
    zu: "Zonke izinguqulo",
  },
  rowsWord: {
    en: "rows",
    ha: "layuka",
    yo: "àwọn ìlà",
    ig: "ahịrị",
    fr: "lignes",
    pt: "linhas",
    sw: "safu mlalo",
    ar: "صفوف",
    tw: "nkyekyɛmu",
    zu: "imigqa",
  },
  /** Followed by the literal `npm run db:seed` and `scripts/draft-corridor.mts`. */
  emptyPrefix: {
    en: "No routes yet. Run",
    ha: "Babu hanyoyi tukuna. Gudanar da",
    yo: "Kò tí ì sí ipa ọ̀nà. Ṣiṣẹ́",
    ig: "Enweghị ụzọ ka a ga-eme. Gbaa",
    fr: "Aucun itinéraire pour l'instant. Exécutez",
    pt: "Ainda sem rotas. Execute",
    sw: "Bado hakuna njia. Endesha",
    ar: "لا توجد مسارات بعد. شغّل",
    tw: "Akwan biara nni hɔ ɛnnye. Bɔ",
    zu: "Azikho izindlela okwamanje. Sebenzisa",
  },
  emptyMiddle: {
    en: ", or draft one with",
    ha: ", ko tsara ɗaya da",
    yo: ", tàbí kọ ọ̀kan pẹ̀lú",
    ig: ", ma ọ bụ dee otu site na",
    fr: ", ou rédigez-en un avec",
    pt: ", ou redija uma com",
    sw: ", au andaa moja kwa",
    ar: "، أو أنشئ واحدًا باستخدام",
    tw: ", anaasɛ twerɛ baako fa",
    zu: ", noma dweba enye nge-",
  },
  tableHead: {
    route: {
      en: "Route",
      ha: "Hanya",
      yo: "Ipa ọ̀nà",
      ig: "Ụzọ",
      fr: "Itinéraire",
      pt: "Rota",
      sw: "Njia",
      ar: "المسار",
      tw: "Ɛkwan",
      zu: "Indlela",
    },
    purpose: {
      en: "Purpose",
      ha: "Dalili",
      yo: "Ìdí",
      ig: "Nzube",
      fr: "Motif",
      pt: "Motivo",
      sw: "Sababu",
      ar: "الغرض",
      tw: "Botaeɛ",
      zu: "Injongo",
    },
    version: {
      en: "Version",
      ha: "Bugu",
      yo: "Ẹ̀yà",
      ig: "Ụdị",
      fr: "Version",
      pt: "Versão",
      sw: "Toleo",
      ar: "الإصدار",
      tw: "Nsakraeɛ",
      zu: "Inguqulo",
    },
    state: {
      en: "State",
      ha: "Matsayi",
      yo: "Ipò",
      ig: "Ọnọdụ",
      fr: "État",
      pt: "Estado",
      sw: "Hali",
      ar: "الحالة",
      tw: "Tebea",
      zu: "Isimo",
    },
    documents: {
      en: "Documents",
      ha: "Takardu",
      yo: "Àwọn ìwé",
      ig: "Akwụkwọ",
      fr: "Documents",
      pt: "Documentos",
      sw: "Nyaraka",
      ar: "المستندات",
      tw: "Nkrataa",
      zu: "Amadokhumenti",
    },
    lastChecked: {
      en: "Last checked",
      ha: "Bincike na ƙarshe",
      yo: "Àyẹ̀wò tí ó kẹ́yìn",
      ig: "Nlele ikpeazụ",
      fr: "Dernière vérification",
      pt: "Última verificação",
      sw: "Ukaguzi wa mwisho",
      ar: "آخر فحص",
      tw: "Nhwehwɛmu a etwa toɔ",
      zu: "Ukuhlolwa kokugcina",
    },
  },
  stale: {
    en: "Stale",
    ha: "Ya tsufa",
    yo: "Ti gbọ̀",
    ig: "Ochiela",
    fr: "Obsolète",
    pt: "Desatualizado",
    sw: "Imepitwa na wakati",
    ar: "قديم",
    tw: "Atwam berɛ",
    zu: "Sekuphelelwe yisikhathi",
  },
  notCheckedYetShort: {
    en: "Not checked yet",
    ha: "Ba a bincika tukuna ba",
    yo: "Kò tí ì ṣàyẹ̀wò rẹ̀",
    ig: "Elelebeghị ya anya",
    fr: "Pas encore vérifié",
    pt: "Ainda não verificado",
    sw: "Bado hakijakaguliwa",
    ar: "لم يُفحص بعد",
    tw: "Wɔnhwɛɛ mu ɛnnye",
    zu: "Akukahlolwa",
  },
};
