import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/kyb` and `/ops/kyb/[id]` — the businesses BeOrchid has vetted,
 * and the ones still waiting.
 *
 * The six requirement names and their guidance are NOT here. They are
 * `KYB_REQUIREMENTS` in `@/lib/domain/kyb`, written onto each row at
 * seed time and stored in English: they are the names of legal
 * documents, every reader of them is BeOrchid staff, and a row's own
 * copy must not change when the constant is edited. Only the screen's
 * chrome localises, which is what this file is.
 *
 * The nav label stays in `OPS_COMMON.nav` and the `{ error }` strings
 * the actions return stay in `OPS_ACTIONS`, for the reason
 * `OPS_TENANTS` gives: a second copy of a word is a word that will
 * disagree with itself.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, like every non-English string in this codebase.
 */
export const OPS_KYB: {
  heading: L;
  intro: L;
  queuePanel: L;
  agenciesWord: L;
  emptyQueue: L;
  searchPlaceholder: L;
  anyStanding: L;
  noMatchHint: L;
  tableHead: { agency: L; progress: L; standing: L; added: L };
  standing: { notStarted: L; inReview: L; ready: L; activated: L };
  state: { notStarted: L; inReview: L; verified: L; rejected: L };
  verifiedOf: L;
  backToQueue: L;
  checklistPanel: L;
  openDocument: L;
  noDocument: L;
  fileLabel: L;
  replace: L;
  replaceTitle: L;
  replaceBody: L;
  replaceConfirm: L;
  removeTitle: L;
  removeBody: L;
  removeConfirm: L;
  remove: L;
  noteLabel: L;
  notePlaceholder: L;
  saveVerdict: L;
  reviewedBy: L;
  activate: L;
  activating: L;
  activateBlocked: L;
  activatedOn: L;
  suspendedNotice: L;
  toastFiled: L;
  toastRemoved: L;
  toastVerdict: L;
  toastActivated: L;
  toastActivatedNoEmail: L;
  toastAlreadyActivated: L;
} = {
  heading: {
    en: "KYB",
    ha: "KYB",
    yo: "KYB",
    ig: "KYB",
    fr: "KYB",
    pt: "KYB",
    sw: "KYB",
    ar: "KYB",
    tw: "KYB",
    zu: "KYB",
  },
  intro: {
    en: "Every agency's verification file. An agency's console opens only once all six requirements are verified here.",
    ha: "Fayil ɗin tabbatarwa na kowace hukuma. Na'urar sarrafa hukuma tana buɗewa ne kawai bayan an tabbatar da duk buƙatu shida a nan.",
    yo: "Fáìlì ìjẹ́rìísí ilé-iṣẹ́ kọ̀ọ̀kan. Kọ̀nsólù ilé-iṣẹ́ kan yóò ṣí nìkan lẹ́yìn tí a bá ti jẹ́rìísí gbogbo ìbéèrè mẹ́fà níbí.",
    ig: "Faịlụ nkwenye nke ụlọ ọrụ ọ bụla. Consul ụlọ ọrụ na-emeghe naanị mgbe a kwadoro ihe achọrọ isii niile ebe a.",
    fr: "Le dossier de vérification de chaque agence. La console d'une agence ne s'ouvre qu'une fois les six exigences vérifiées ici.",
    pt: "O processo de verificação de cada agência. A consola de uma agência só abre depois de os seis requisitos serem verificados aqui.",
    sw: "Faili ya uthibitisho ya kila wakala. Kiweko cha wakala hufunguka tu baada ya mahitaji yote sita kuthibitishwa hapa.",
    ar: "ملف التحقق لكل وكالة. لا تُفتح لوحة الوكالة إلا بعد التحقق من المتطلبات الستة جميعها هنا.",
    tw: "Adwumakuo biara ne nhwehwɛmu krataa. Adwumakuo bi console bue bere a wɔasɔ ahwehwɛdeɛ nsia no nyinaa ano wɔ ha.",
    zu: "Ifayela lokuqinisekisa lawo wonke ama-ejensi. Ikhonsoli ye-ejensi ivuleka kuphela lapho zonke izidingo eziyisithupha seziqinisekisiwe lapha.",
  },
  queuePanel: {
    en: "Verification queue",
    ha: "Layin tabbatarwa",
    yo: "Ìlà ìjẹ́rìísí",
    ig: "Ahịrị nkwenye",
    fr: "File de vérification",
    pt: "Fila de verificação",
    sw: "Foleni ya uthibitisho",
    ar: "قائمة انتظار التحقق",
    tw: "Nhwehwɛmu santen",
    zu: "Ulayini wokuqinisekisa",
  },
  agenciesWord: {
    en: "agencies",
    ha: "hukumomi",
    yo: "àwọn ilé-iṣẹ́",
    ig: "ụlọ ọrụ",
    fr: "agences",
    pt: "agências",
    sw: "mawakala",
    ar: "وكالات",
    tw: "adwumakuo",
    zu: "ama-ejensi",
  },
  emptyQueue: {
    en: "No agencies yet. One appears here the moment it is provisioned.",
    ha: "Babu hukumomi tukuna. Za a nuna ɗaya nan da zarar an ƙirƙira ta.",
    yo: "Kò sí ilé-iṣẹ́ kankan síbẹ̀. Ọ̀kan yóò farahàn níbí kété tí a bá dá a sílẹ̀.",
    ig: "Enweghị ụlọ ọrụ ọ bụla ugbu a. Otu ga-apụta ebe a ozugbo e kere ya.",
    fr: "Aucune agence pour l'instant. Une agence apparaît ici dès sa création.",
    pt: "Ainda não há agências. Uma aparece aqui assim que for criada.",
    sw: "Bado hakuna mawakala. Mmoja huonekana hapa mara tu anapoundwa.",
    ar: "لا توجد وكالات بعد. تظهر الوكالة هنا فور إنشائها.",
    tw: "Adwumakuo biara nni hɔ. Baako bɛpue wɔ ha bere a wɔbɔ no.",
    zu: "Awekho ama-ejensi okwamanje. Elilodwa livela lapha ngokushesha lapho lidalwa.",
  },
  /**
   * The name and nothing else — see `kybMatches`. Saying so in the
   * placeholder is what stops an empty result reading as a broken box
   * when somebody types a registration number into it.
   */
  searchPlaceholder: {
    en: "Search by agency name",
    ha: "Nemo ta sunan hukuma",
    yo: "Wá nípa orúkọ ilé-iṣẹ́",
    ig: "Chọọ site na aha ụlọ ọrụ",
    fr: "Rechercher par nom d'agence",
    pt: "Pesquisar por nome da agência",
    sw: "Tafuta kwa jina la wakala",
    ar: "ابحث حسب اسم الوكالة",
    tw: "Hwehwɛ adwumakuo din so",
    zu: "Sesha ngegama le-ejensi",
  },
  anyStanding: {
    en: "Any status",
    ha: "Kowane matsayi",
    yo: "Ipò yòówù",
    ig: "Ọnọdụ ọ bụla",
    fr: "Tout statut",
    pt: "Qualquer estado",
    sw: "Hali yoyote",
    ar: "أي حالة",
    tw: "Tebea biara",
    zu: "Noma isiphi isimo",
  },
  noMatchHint: {
    en: "Nothing matches that. Clear the filters to see the whole queue.",
    ha: "Babu abin da ya dace. Share tacewa don ganin dukan layin.",
    yo: "Kò sí ohun tí ó bá a mu. Pa àwọn ìwẹ̀ rẹ́ láti rí gbogbo ìlà náà.",
    ig: "Ọ dịghị ihe dabara. Hichapụ ihe nzacha iji hụ ahịrị niile.",
    fr: "Aucun résultat. Effacez les filtres pour voir toute la file.",
    pt: "Nada corresponde. Limpe os filtros para ver toda a fila.",
    sw: "Hakuna kinacholingana. Futa vichujio ili kuona foleni nzima.",
    ar: "لا شيء يطابق ذلك. امسح عوامل التصفية لعرض قائمة الانتظار كاملة.",
    tw: "Biribiara nhyia. Popa nhwehwɛmu no na woahu santen no nyinaa.",
    zu: "Akukho okufanayo. Sula izihlungi ukuze ubone ulayini wonke.",
  },
  tableHead: {
    agency: {
      en: "Agency",
      ha: "Hukuma",
      yo: "Ilé-iṣẹ́",
      ig: "Ụlọ ọrụ",
      fr: "Agence",
      pt: "Agência",
      sw: "Wakala",
      ar: "الوكالة",
      tw: "Adwumakuo",
      zu: "I-ejensi",
    },
    progress: {
      en: "Progress",
      ha: "Ci gaba",
      yo: "Ìlọsíwájú",
      ig: "Ọganihu",
      fr: "Progression",
      pt: "Progresso",
      sw: "Maendeleo",
      ar: "التقدّم",
      tw: "Nkɔsoɔ",
      zu: "Inqubekela phambili",
    },
    /*
     * "Status", not "State" — the client's words on 8 September, given
     * about `/ops/tenants` and applying here for the reason that file
     * states: the same fact must not wear two different headings on two
     * screens a reviewer moves between. `OPS_TENANTS.tableHead.state`
     * carries the identical strings.
     */
    standing: {
      en: "Status",
      ha: "Matsayi",
      yo: "Ipò",
      ig: "Ọnọdụ",
      fr: "Statut",
      pt: "Estado",
      sw: "Hali",
      ar: "الحالة",
      tw: "Tebea",
      zu: "Isimo",
    },
    added: {
      en: "Added",
      ha: "An ƙara",
      yo: "A fikún",
      ig: "Agbakwunyere",
      fr: "Ajoutée",
      pt: "Adicionada",
      sw: "Imeongezwa",
      ar: "أُضيفت",
      tw: "Wɔde kaa ho",
      zu: "Kwengezwe",
    },
  },
  standing: {
    notStarted: {
      en: "Not started",
      ha: "Ba a fara ba",
      yo: "Kò tíì bẹ̀rẹ̀",
      ig: "Amalitebeghị",
      fr: "Non commencée",
      pt: "Não iniciada",
      sw: "Haijaanza",
      ar: "لم تبدأ",
      tw: "Ɛnfirii ase",
      zu: "Akuqalwanga",
    },
    inReview: {
      en: "In review",
      ha: "Ana bita",
      yo: "Ń bẹ nínú àyẹ̀wò",
      ig: "Na-enyocha",
      fr: "En cours d'examen",
      pt: "Em análise",
      sw: "Inakaguliwa",
      ar: "قيد المراجعة",
      tw: "Wɔrehwɛ mu",
      zu: "Kuyabuyekezwa",
    },
    ready: {
      en: "Ready to activate",
      ha: "A shirye don kunnawa",
      yo: "Ó ti ṣetán láti mú ṣiṣẹ́",
      ig: "Adịla njikere ịkwalite",
      fr: "Prête à activer",
      pt: "Pronta para ativar",
      sw: "Tayari kuwashwa",
      ar: "جاهزة للتفعيل",
      tw: "Ɛsiesie sɛ wobebue",
      zu: "Ilungele ukuvulwa",
    },
    activated: {
      en: "Activated",
      ha: "An kunna",
      yo: "A ti mú ṣiṣẹ́",
      ig: "Akwalitere",
      fr: "Activée",
      pt: "Ativada",
      sw: "Imewashwa",
      ar: "مُفعَّلة",
      tw: "Wɔabue",
      zu: "Ivuliwe",
    },
  },
  state: {
    notStarted: {
      en: "Not started",
      ha: "Ba a fara ba",
      yo: "Kò tíì bẹ̀rẹ̀",
      ig: "Amalitebeghị",
      fr: "Non commencé",
      pt: "Não iniciado",
      sw: "Haijaanza",
      ar: "لم يبدأ",
      tw: "Ɛnfirii ase",
      zu: "Akuqalwanga",
    },
    inReview: {
      en: "In review",
      ha: "Ana bita",
      yo: "Ń bẹ nínú àyẹ̀wò",
      ig: "Na-enyocha",
      fr: "En cours d'examen",
      pt: "Em análise",
      sw: "Inakaguliwa",
      ar: "قيد المراجعة",
      tw: "Wɔrehwɛ mu",
      zu: "Kuyabuyekezwa",
    },
    verified: {
      en: "Verified",
      ha: "An tabbatar",
      yo: "A ti jẹ́rìísí",
      ig: "Akwadoro",
      fr: "Vérifié",
      pt: "Verificado",
      sw: "Imethibitishwa",
      ar: "تم التحقق",
      tw: "Wɔasɔ ano",
      zu: "Kuqinisekisiwe",
    },
    rejected: {
      en: "Rejected",
      ha: "An ƙi",
      yo: "A kọ̀",
      ig: "Ajụrụ",
      fr: "Refusé",
      pt: "Recusado",
      sw: "Imekataliwa",
      ar: "مرفوض",
      tw: "Wɔapo",
      zu: "Kwenqatshiwe",
    },
  },
  /** "{verified} of {total} verified". */
  verifiedOf: {
    en: "{verified} of {total} verified",
    ha: "An tabbatar da {verified} daga {total}",
    yo: "{verified} nínú {total} ni a jẹ́rìísí",
    ig: "Akwadoro {verified} n'ime {total}",
    fr: "{verified} sur {total} vérifiés",
    pt: "{verified} de {total} verificados",
    sw: "{verified} kati ya {total} zimethibitishwa",
    ar: "تم التحقق من {verified} من أصل {total}",
    tw: "Wɔasɔ {verified} wɔ {total} mu ano",
    zu: "Kuqinisekisiwe okungu-{verified} kokungu-{total}",
  },
  backToQueue: {
    en: "Back to the queue",
    ha: "Koma zuwa layi",
    yo: "Padà sí ìlà",
    ig: "Laghachi n'ahịrị",
    fr: "Retour à la file",
    pt: "Voltar à fila",
    sw: "Rudi kwenye foleni",
    ar: "العودة إلى قائمة الانتظار",
    tw: "San kɔ santen no mu",
    zu: "Buyela kulayini",
  },
  checklistPanel: {
    en: "Required documents",
    ha: "Takardun da ake buƙata",
    yo: "Àwọn ìwé tí a nílò",
    ig: "Akwụkwọ achọrọ",
    fr: "Documents requis",
    pt: "Documentos exigidos",
    sw: "Nyaraka zinazohitajika",
    ar: "المستندات المطلوبة",
    tw: "Nkrataa a ɛho hia",
    zu: "Amadokhumenti adingekayo",
  },
  openDocument: {
    en: "Open document",
    ha: "Buɗe takarda",
    yo: "Ṣí ìwé",
    ig: "Mepee akwụkwọ",
    fr: "Ouvrir le document",
    pt: "Abrir documento",
    sw: "Fungua hati",
    ar: "فتح المستند",
    tw: "Bue krataa no",
    zu: "Vula idokhumenti",
  },
  noDocument: {
    en: "Nothing filed yet",
    ha: "Ba a shigar da komai ba tukuna",
    yo: "Kò sí ohunkóhun tí a fi sílẹ̀ síbẹ̀",
    ig: "Edepụtabeghị ihe ọ bụla",
    fr: "Rien de déposé pour l'instant",
    pt: "Ainda nada arquivado",
    sw: "Bado hakuna kilichowasilishwa",
    ar: "لم يُودَع شيء بعد",
    tw: "Wɔmfaa hwee nsii hɔ",
    zu: "Akukho okufakiwe okwamanje",
  },
  fileLabel: {
    en: "File a document",
    ha: "Shigar da takarda",
    yo: "Fi ìwé sílẹ̀",
    ig: "Depụta akwụkwọ",
    fr: "Déposer un document",
    pt: "Arquivar um documento",
    sw: "Wasilisha hati",
    ar: "إيداع مستند",
    tw: "Fa krataa si hɔ",
    zu: "Faka idokhumenti",
  },
  replace: {
    en: "Replace",
    ha: "Maye gurbi",
    yo: "Rọ́pò",
    ig: "Dochie",
    fr: "Remplacer",
    pt: "Substituir",
    sw: "Badilisha",
    ar: "استبدال",
    tw: "Sesa",
    zu: "Shintsha",
  },
  replaceTitle: {
    en: "Replace this document?",
    ha: "A maye gurbin wannan takarda?",
    yo: "Ṣé kí a rọ́pò ìwé yìí?",
    ig: "Dochie akwụkwọ a?",
    fr: "Remplacer ce document ?",
    pt: "Substituir este documento?",
    sw: "Ubadilishe hati hii?",
    ar: "هل تريد استبدال هذا المستند؟",
    tw: "Sesa saa krataa yi?",
    zu: "Ushintsha leli dokhumenti?",
  },
  replaceBody: {
    en: "The file already filed against this requirement is deleted the moment the new one uploads. Toplance keeps no other copy of it.",
    ha: "Za a share fayil ɗin da aka riga aka shigar don wannan buƙata nan da nan sabon ya ɗora. Toplance ba ta ajiye wata kwafi.",
    yo: "A ó pa fáìlì tí a ti fi sílẹ̀ fún ìbéèrè yìí rẹ́ kété tí tuntun bá gòkè. Toplance kò pa ẹ̀dà mìíràn mọ́.",
    ig: "A ga-ehichapụ faịlụ e depụtaralarị maka ihe achọrọ a ozugbo nke ọhụrụ bulitere. Toplance anaghị edobe ndetu ọzọ.",
    fr: "Le fichier déjà déposé pour cette exigence est supprimé dès que le nouveau est téléversé. Toplance n'en garde aucune autre copie.",
    pt: "O ficheiro já arquivado para este requisito é apagado assim que o novo for carregado. A Toplance não guarda outra cópia.",
    sw: "Faili iliyowasilishwa awali kwa hitaji hili inafutwa mara mpya inapopakiwa. Toplance haihifadhi nakala nyingine.",
    ar: "يُحذف الملف المودَع سابقًا لهذا المتطلب فور رفع الملف الجديد. ولا تحتفظ Toplance بأي نسخة أخرى منه.",
    tw: "Sɛ wɔde foforɔ ba a, wɔbɛpepa krataa a ɛwɔ hɔ dada no. Toplance nkora bi foforɔ.",
    zu: "Ifayela elifakwe ngaphambilini kulesi sidingo liyasuswa lapho elisha lilayishwa. I-Toplance ayigcini enye ikhophi yalo.",
  },
  replaceConfirm: {
    en: "Replace it",
    ha: "Maye gurbinsa",
    yo: "Rọ́pò rẹ̀",
    ig: "Dochie ya",
    fr: "Le remplacer",
    pt: "Substituir",
    sw: "Ibadilishe",
    ar: "استبدله",
    tw: "Sesa",
    zu: "Lishintshe",
  },
  remove: {
    en: "Remove",
    ha: "Cire",
    yo: "Yọ kúrò",
    ig: "Wepụ",
    fr: "Supprimer",
    pt: "Remover",
    sw: "Ondoa",
    ar: "إزالة",
    tw: "Yi firi hɔ",
    zu: "Susa",
  },
  removeTitle: {
    en: "Remove this document?",
    ha: "A cire wannan takarda?",
    yo: "Ṣé kí a yọ ìwé yìí kúrò?",
    ig: "Wepụ akwụkwọ a?",
    fr: "Supprimer ce document ?",
    pt: "Remover este documento?",
    sw: "Uondoe hati hii?",
    ar: "هل تريد إزالة هذا المستند؟",
    tw: "Yi saa krataa yi firi hɔ?",
    zu: "Ususa leli dokhumenti?",
  },
  removeBody: {
    en: "The file is deleted and Toplance keeps no other copy. The requirement drops back to not started, and any verdict on it is cleared.",
    ha: "Za a share fayil ɗin kuma Toplance ba ta ajiye wata kwafi. Buƙatar za ta koma ba a fara ba, kuma za a share duk hukuncin da aka yanke.",
    yo: "A ó pa fáìlì náà rẹ́, Toplance kò sì ní ẹ̀dà mìíràn. Ìbéèrè náà yóò padà sí kò tíì bẹ̀rẹ̀, a ó sì pa ìpinnu èyíkéyìí lórí rẹ̀ rẹ́.",
    ig: "A ga-ehichapụ faịlụ ahụ, Toplance enweghịkwa ndetu ọzọ. Ihe achọrọ ahụ ga-alaghachi na amalitebeghị, e hichapụkwa mkpebi ọ bụla e mere na ya.",
    fr: "Le fichier est supprimé et Toplance n'en garde aucune autre copie. L'exigence revient à « non commencé » et toute décision prise à son sujet est effacée.",
    pt: "O ficheiro é apagado e a Toplance não guarda outra cópia. O requisito volta a «não iniciado» e qualquer decisão sobre ele é apagada.",
    sw: "Faili inafutwa na Toplance haihifadhi nakala nyingine. Hitaji linarudi kwenye hali ya haijaanza, na uamuzi wowote juu yake unafutwa.",
    ar: "يُحذف الملف ولا تحتفظ Toplance بأي نسخة أخرى منه. ويعود المتطلب إلى حالة «لم يبدأ»، ويُمحى أي قرار سابق بشأنه.",
    tw: "Wɔbɛpepa krataa no na Toplance nkora bi foforɔ. Ahwehwɛdeɛ no bɛsan akɔ ɛnfirii ase, na gyinaesi biara a wɔsii wɔ ho no bɛyera.",
    zu: "Ifayela liyasuswa futhi i-Toplance ayigcini enye ikhophi. Isidingo sibuyela esimweni sokuthi asiqalwanga, futhi noma yisiphi isinqumo ngaso siyasulwa.",
  },
  removeConfirm: {
    en: "Remove it",
    ha: "Cire shi",
    yo: "Yọ ọ́ kúrò",
    ig: "Wepụ ya",
    fr: "Le supprimer",
    pt: "Remover",
    sw: "Iondoe",
    ar: "أزِله",
    tw: "Yi firi hɔ",
    zu: "Lisuse",
  },
  noteLabel: {
    en: "Note",
    ha: "Bayanin kula",
    yo: "Àkọsílẹ̀",
    ig: "Ndetu",
    fr: "Note",
    pt: "Nota",
    sw: "Kumbukumbu",
    ar: "ملاحظة",
    tw: "Nkyerɛwtohɔ",
    zu: "Inothi",
  },
  notePlaceholder: {
    en: "Why it was rejected, or anything the next person should read first",
    ha: "Dalilin ƙin sa, ko duk abin da wanda zai biyo baya ya kamata ya karanta da farko",
    yo: "Ìdí tí a fi kọ̀ ọ́, tàbí ohunkóhun tí ẹni tó ń bọ̀ gbọ́dọ̀ kà kọ́kọ́",
    ig: "Ihe kpatara ajụrụ ya, ma ọ bụ ihe ọ bụla onye na-esote kwesịrị ịgụ mbụ",
    fr: "Pourquoi il a été refusé, ou ce que la personne suivante doit lire d'abord",
    pt: "Porque foi recusado, ou o que a próxima pessoa deve ler primeiro",
    sw: "Kwa nini ilikataliwa, au chochote mtu anayefuata anapaswa kusoma kwanza",
    ar: "سبب الرفض، أو أي شيء ينبغي أن يقرأه الشخص التالي أولًا",
    tw: "Deɛ enti a wɔpoeɛ, anaa biribiara a ɛsɛ sɛ onipa a ɔdi hɔ kenkan kane",
    zu: "Ukuthi kungani kwenqatshiwe, noma noma yini umuntu olandelayo okufanele ayifunde kuqala",
  },
  saveVerdict: {
    en: "Save",
    ha: "Ajiye",
    yo: "Fi pamọ́",
    ig: "Chekwaa",
    fr: "Enregistrer",
    pt: "Guardar",
    sw: "Hifadhi",
    ar: "حفظ",
    tw: "Kora so",
    zu: "Londoloza",
  },
  /** "Verified by {name}" — follows a settled row. */
  reviewedBy: {
    en: "Decided by {name}",
    ha: "{name} ne ya yanke shawara",
    yo: "{name} ni ó pinnu",
    ig: "{name} kpebiri",
    fr: "Décidé par {name}",
    pt: "Decidido por {name}",
    sw: "Imeamuliwa na {name}",
    ar: "قرّره {name}",
    tw: "{name} na ɔsii gyinae",
    zu: "Kunqunywe ngu-{name}",
  },
  activate: {
    en: "Activate agency",
    ha: "Kunna hukuma",
    yo: "Mú ilé-iṣẹ́ ṣiṣẹ́",
    ig: "Kwalite ụlọ ọrụ",
    fr: "Activer l'agence",
    pt: "Ativar agência",
    sw: "Washa wakala",
    ar: "تفعيل الوكالة",
    tw: "Bue adwumakuo no",
    zu: "Vula i-ejensi",
  },
  activating: {
    en: "Activating…",
    ha: "Ana kunnawa…",
    yo: "À ń mú ṣiṣẹ́…",
    ig: "Na-akwalite…",
    fr: "Activation en cours…",
    pt: "A ativar…",
    sw: "Inawasha…",
    ar: "جارٍ التفعيل…",
    tw: "Yɛrebue…",
    zu: "Iyavula…",
  },
  /** "{n} requirements are not verified yet." — under a disabled button. */
  activateBlocked: {
    en: "{n} of the six requirements are not verified yet.",
    ha: "{n} daga cikin buƙatu shida ba a tabbatar da su ba tukuna.",
    yo: "{n} nínú àwọn ìbéèrè mẹ́fà náà ni a kò tíì jẹ́rìísí.",
    ig: "{n} n'ime ihe achọrọ isii ahụ ka akwadobeghị.",
    fr: "{n} des six exigences ne sont pas encore vérifiées.",
    pt: "{n} dos seis requisitos ainda não estão verificados.",
    sw: "{n} kati ya mahitaji sita bado hayajathibitishwa.",
    ar: "{n} من المتطلبات الستة لم يتم التحقق منها بعد.",
    tw: "Ahwehwɛdeɛ nsia no mu {n} deɛ wɔnsɔɔ ano.",
    zu: "Okungu-{n} kwezidingo eziyisithupha akukaqinisekiswa.",
  },
  /** "Activated on {date}." */
  activatedOn: {
    en: "BeOrchid activated this agency on {date}.",
    ha: "BeOrchid ta kunna wannan hukuma a {date}.",
    yo: "BeOrchid mú ilé-iṣẹ́ yìí ṣiṣẹ́ ní {date}.",
    ig: "BeOrchid kwalitere ụlọ ọrụ a na {date}.",
    fr: "BeOrchid a activé cette agence le {date}.",
    pt: "A BeOrchid ativou esta agência em {date}.",
    sw: "BeOrchid iliwasha wakala huyu tarehe {date}.",
    ar: "فعّلت BeOrchid هذه الوكالة في {date}.",
    tw: "BeOrchid buee adwumakuo yi wɔ {date}.",
    zu: "I-BeOrchid ivule le-ejensi ngo-{date}.",
  },
  suspendedNotice: {
    en: "This agency is suspended. Activating it here does not restore access — that is done from its page under Agencies.",
    ha: "An dakatar da wannan hukuma. Kunna ta a nan ba ya mayar da damar shiga — hakan ana yin sa daga shafinta a ƙarƙashin Hukumomi.",
    yo: "A ti dá ilé-iṣẹ́ yìí dúró. Mímú un ṣiṣẹ́ níbí kò dá ìwọlé padà — a ń ṣe ìyẹn láti ojú-ìwé rẹ̀ lábẹ́ Àwọn ilé-iṣẹ́.",
    ig: "Akwụsịtụrụ ụlọ ọrụ a. Ịkwalite ya ebe a anaghị eweghachi ohere — a na-eme nke ahụ site na ibe ya n'okpuru Ụlọ ọrụ.",
    fr: "Cette agence est suspendue. L'activer ici ne rétablit pas l'accès — cela se fait depuis sa page sous Agences.",
    pt: "Esta agência está suspensa. Ativá-la aqui não repõe o acesso — isso faz-se a partir da sua página em Agências.",
    sw: "Wakala huyu amesimamishwa. Kumwasha hapa hakurudishi ufikiaji — hilo hufanywa kutoka ukurasa wake chini ya Mawakala.",
    ar: "هذه الوكالة موقوفة. تفعيلها هنا لا يعيد الوصول — يتم ذلك من صفحتها ضمن الوكالات.",
    tw: "Wɔagyae adwumakuo yi. Sɛ wobue no wɔ ha a, ɛnsan mma kwan no — wɔyɛ saa firi ne krataafa a ɛwɔ Adwumakuo ase.",
    zu: "Le-ejensi imisiwe. Ukuyivula lapha akubuyisi ukufinyelela — lokho kwenziwa ekhasini layo ngaphansi kwama-Ejensi.",
  },
  toastFiled: {
    en: "Document filed",
    ha: "An shigar da takarda",
    yo: "A fi ìwé sílẹ̀",
    ig: "Edepụtala akwụkwọ",
    fr: "Document déposé",
    pt: "Documento arquivado",
    sw: "Hati imewasilishwa",
    ar: "تم إيداع المستند",
    tw: "Wɔde krataa no asi hɔ",
    zu: "Idokhumenti lifakiwe",
  },
  toastRemoved: {
    en: "Document removed",
    ha: "An cire takarda",
    yo: "A yọ ìwé kúrò",
    ig: "Ewepụla akwụkwọ",
    fr: "Document supprimé",
    pt: "Documento removido",
    sw: "Hati imeondolewa",
    ar: "تمت إزالة المستند",
    tw: "Wɔayi krataa no afiri hɔ",
    zu: "Idokhumenti lisusiwe",
  },
  toastVerdict: {
    en: "Saved",
    ha: "An ajiye",
    yo: "A fi pamọ́",
    ig: "Echekwala",
    fr: "Enregistré",
    pt: "Guardado",
    sw: "Imehifadhiwa",
    ar: "تم الحفظ",
    tw: "Wɔakora so",
    zu: "Kulondoloziwe",
  },
  toastActivated: {
    en: "Agency activated — the director has been emailed",
    ha: "An kunna hukuma — an aika wa daraktan imel",
    yo: "A ti mú ilé-iṣẹ́ ṣiṣẹ́ — a ti fi ímeèlì ránṣẹ́ sí olùdarí",
    ig: "Akwalitela ụlọ ọrụ — ezigara onye ntụzịaka ozi",
    fr: "Agence activée — le directeur a reçu un e-mail",
    pt: "Agência ativada — o diretor foi notificado por e-mail",
    sw: "Wakala amewashwa — mkurugenzi ametumiwa barua pepe",
    ar: "تم تفعيل الوكالة — وأُرسل بريد إلى المدير",
    tw: "Wɔabue adwumakuo no — wɔasoma email akɔma ɔhwɛfoɔ no",
    zu: "I-ejensi ivuliwe — umqondisi uthunyelwe i-imeyili",
  },
  toastActivatedNoEmail: {
    en: "Agency activated, but the email did not send. Tell the director yourself.",
    ha: "An kunna hukuma, amma imel ɗin bai tafi ba. Ku sanar da daraktan da kanku.",
    yo: "A ti mú ilé-iṣẹ́ ṣiṣẹ́, ṣùgbọ́n ímeèlì náà kò lọ. Ẹ sọ fún olùdarí fúnra yín.",
    ig: "Akwalitela ụlọ ọrụ, mana ozi ahụ ezighị. Gwa onye ntụzịaka n'onwe gị.",
    fr: "Agence activée, mais l'e-mail n'est pas parti. Prévenez le directeur vous-même.",
    pt: "Agência ativada, mas o e-mail não foi enviado. Avise o diretor pessoalmente.",
    sw: "Wakala amewashwa, lakini barua pepe haikutumwa. Mjulishe mkurugenzi mwenyewe.",
    ar: "تم تفعيل الوكالة، لكن البريد لم يُرسل. أبلغ المدير بنفسك.",
    tw: "Wɔabue adwumakuo no, nanso email no ankɔ. Wo ara ka kyerɛ ɔhwɛfoɔ no.",
    zu: "I-ejensi ivuliwe, kodwa i-imeyili ayithunyelwanga. Tshela umqondisi ngokwakho.",
  },
  /**
   * Two admins pressed the button; the second one's call found the
   * console already open and sent nothing. Saying "we have emailed the
   * director" here would be the one sentence `emailSent` exists to stop
   * the product telling somebody.
   */
  toastAlreadyActivated: {
    en: "This agency was already activated",
    ha: "An riga an kunna wannan hukuma",
    yo: "A ti mú ilé-iṣẹ́ yìí ṣiṣẹ́ tẹ́lẹ̀",
    ig: "Akwalitelarị ụlọ ọrụ a",
    fr: "Cette agence était déjà activée",
    pt: "Esta agência já estava ativada",
    sw: "Wakala huyu alikuwa amewashwa tayari",
    ar: "سبق تفعيل هذه الوكالة",
    tw: "Na wɔabue adwumakuo yi dada",
    zu: "Le-ejensi isivele ivuliwe",
  },
};
