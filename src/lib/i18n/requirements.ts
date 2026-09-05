import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The visa-requirements screen — the rule-set summary sheet and the two
 * checklists under it. The rule set's own content (`visaName`, a
 * requirement's `name`/`description`, `sourceName`, `attribution`, an
 * `EntryCheck`'s prose) is data from the mission or a provider and stays
 * in English untouched, per the brief's rule against translating
 * requirement text; everything here is the sheet's fixed furniture
 * around it.
 *
 * `corridorGap()` (`@/lib/domain/corridor-gap`) supplies the heading,
 * lead and action for a corridor this product does not cover yet — that
 * is a shared, tested pure function outside this pass's file ownership,
 * so its English copy is left as-is; see the handover notes.
 *
 * English values here are exactly the copy the page already had; every
 * other locale was translated in-house from that English, the same way
 * `HERO` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const REQUIREMENTS: {
  title: L;
  awaitingFigureAria: L;
  source: L;
  allowedStayLabel: L;
  passportValidityLabel: L;
  entryRulesFrom: L;
  cannotBuildChecklist: L;
  nothingCharged: L;
  ruleSetIntro: L;
  documentsRequiredLabel: L;
  typicalDecisionLabel: L;
  governmentFeeLabel: L;
  conditionalSub: L;
  allApplySub: L;
  fromDateReceivedSub: L;
  paidToMissionSub: L;
  perEntrySub: L;
  refusalReasonSub: L;
  approxAtRatesDate: L;
  officialEvisaPortal: L;
  registrationSuffix: L;
  embassyContact: L;
  inEffectSince: L;
  contributionsAnd: L;
  contributionsComeSingular: L;
  contributionsComePlural: L;
  whatYouMustProvide: L;
  documentsBadge: L;
  onlyIfItApplies: L;
  conditionalBadge: L;
  startUploading: L;
} = {
  title: {
    en: "Visa requirements",
    ha: "Bukatun biza",
    yo: "Àwọn ohun tí a béèrè fún fisa",
    ig: "Ihe achọrọ maka visa",
    fr: "Conditions de visa",
    pt: "Requisitos do visto",
    sw: "Mahitaji ya viza",
    ar: "متطلبات التأشيرة",
    tw: "Visa ho ahwehwɛde",
    zu: "Izidingo ze-visa",
  },
  awaitingFigureAria: {
    en: "{label}: awaiting a real figure",
    ha: "{label}: ana jiran ainihin adadi",
    yo: "{label}: ń dúró de nọ́mbà gidi",
    ig: "{label}: na-eche ọnụọgụ eziokwu",
    fr: "{label} : en attente d'un chiffre réel",
    pt: "{label}: aguardando um valor real",
    sw: "{label}: inasubiri kiwango halisi",
    ar: "{label}: بانتظار رقم حقيقي",
    tw: "{label}: ɛretwɛn nɔma nokware",
    zu: "{label}: ilinde inombolo yangempela",
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
    tw: "Nsɛm no fibea",
    zu: "Umthombo",
  },
  allowedStayLabel: {
    en: "Allowed stay",
    ha: "Tsawon zama da aka yarda",
    yo: "Àkókò tí a fàyè gbà láti dúró",
    ig: "Oge a kwadoro ka ị nọrọ",
    fr: "Durée de séjour autorisée",
    pt: "Estadia permitida",
    sw: "Muda unaoruhusiwa kukaa",
    ar: "مدة الإقامة المسموح بها",
    tw: "Berɛ a wɔama woatena",
    zu: "Isikhathi esivunyelwe sokuhlala",
  },
  passportValidityLabel: {
    en: "Passport validity",
    ha: "Ingancin fasfo",
    yo: "Àkókò tí fáàsípọ́tù bá ṣì wúlò",
    ig: "Ogologo oge paspọtụ ka bara uru",
    fr: "Validité du passeport",
    pt: "Validade do passaporte",
    sw: "Uhalali wa pasipoti",
    ar: "صلاحية جواز السفر",
    tw: "Pasport berɛ a ɛda hɔ",
    zu: "Ukusebenza kwepasipoti",
  },
  entryRulesFrom: {
    en: "Entry rules from",
    ha: "Ƙa'idojin shiga daga",
    yo: "Àwọn òfin ìwọlé láti ọ̀dọ̀",
    ig: "Iwu ntinye site na",
    fr: "Règles d'entrée fournies par",
    pt: "Regras de entrada de",
    sw: "Kanuni za kuingia kutoka",
    ar: "قواعد الدخول من",
    tw: "Ɔhyɛn ho mmara a efi",
    zu: "Imithetho yokungena evela ku-",
  },
  cannotBuildChecklist: {
    en: "We cannot build your document checklist for {destination} yet — that needs guidance we have checked against the mission.",
    ha: "Ba mu iya gina jerin takardunka na {destination} tukuna ba — hakan yana buƙatar jagora da muka tabbatar da ita tare da ofishin jakadanci.",
    yo: "A kò tíì lè kọ àkọsílẹ̀ ìwé rẹ fún {destination} nítorí pé ó nílò ìtọ́ni tí a ti fọwọ́sí lọ́dọ̀ ọ́fíìsì aṣojú.",
    ig: "Anyị enwebeghị ike iwu ndepụta akwụkwọ gị maka {destination} — nke ahụ chọrọ nduzi anyị lelegoro n'ozi nnọchite obodo.",
    fr: "Nous ne pouvons pas encore établir votre liste de documents pour {destination} — cela nécessite des indications que nous avons vérifiées auprès de la mission.",
    pt: "Ainda não podemos elaborar a sua lista de documentos para {destination} — isso requer orientação que verificámos junto da missão.",
    sw: "Hatuwezi kujenga orodha yako ya hati kwa {destination} bado — hilo linahitaji mwongozo ambao tumeuthibitisha na ubalozi.",
    ar: "لا يمكننا حتى الآن إعداد قائمة مستنداتك الخاصة بـ {destination} — يتطلب ذلك إرشادات تحققنا منها لدى البعثة.",
    tw: "Yɛntumi nnyɛ wo krataa nhyehyɛeɛ mma {destination} deɛ ɛnnora — ɛho hia akwankyerɛ a yɛahwɛ akyerɛ amansini afikyi.",
    zu: "Asikakwazi ukwakha uhlu lwakho lwamadokhumenti lwe-{destination} okwamanje — lokho kudinga isiqondiso esesikuhlolile ehhovisi elimele izwe.",
  },
  nothingCharged: {
    en: "Nothing has been charged. We cannot alert you when it opens yet, so it is worth checking back.",
    ha: "Ba a caje kome ba. Ba mu iya sanar da kai lokacin da ya buɗe ba tukuna, don haka ya kamata ka dawo ka duba.",
    yo: "Kò sí owó tí a gbà rí. A kò tíì lè kìlọ̀ fún ọ nígbà tí ó bá ṣí, nítorí náà ó yẹ kí o máa padà wá ṣàyẹ̀wò.",
    ig: "Anaghị anara ego ọ bụla. Anyị enwebeghị ike ịkọwara gị mgbe ọ ga-emeghe, ya mere ọ kwesịrị ka ị na-alọghachi ịlele.",
    fr: "Rien n'a été facturé. Nous ne pouvons pas encore vous prévenir à l'ouverture, il vaut donc la peine de revenir vérifier.",
    pt: "Nada foi cobrado. Ainda não conseguimos avisá-lo quando abrir, por isso vale a pena voltar a verificar.",
    sw: "Hakuna kilicholipishwa. Bado hatuwezi kukujulisha itakapofunguliwa, kwa hivyo inafaa kurudi kuangalia.",
    ar: "لم يتم تحصيل أي رسوم. لا يمكننا تنبيهك عند فتحه بعد، لذا يستحق الأمر العودة للتحقق.",
    tw: "Wɔnnyaa sika biara. Yɛntumi mmɔ wo kɔkɔ berɛ a ɛbɛbue deɛ ɛnnora, enti ɛfata sɛ wosane ba behwɛ.",
    zu: "Akukho okukhokhiwe. Asikakwazi ukukwazisa lapho kuvulwa okwamanje, ngakho kufanele ubuye uzohlola.",
  },
  ruleSetIntro: {
    en: "The rule set that built your checklist, as the mission publishes it. Nothing here is our interpretation.",
    ha: "Ka'idojin da suka gina jerin takardunka, kamar yadda ofishin jakadanci ya buga su. Babu wani abu a nan da fassararmu ce.",
    yo: "Ìlànà tí ó kọ́ àkọsílẹ̀ rẹ, gẹ́gẹ́ bí ọ́fíìsì aṣojú ṣe tẹ̀ ẹ́ jáde. Kò sí ohun tí ó jẹ́ ìtumọ̀ tiwa níbí.",
    ig: "Usoro iwu meworo ndepụta gị, dịka ozi nnọchite obodo si bipụta ya. Ọ dịghị ihe dị ebe a bụ nkọwa anyị.",
    fr: "L'ensemble de règles qui a construit votre liste, tel que publié par la mission. Rien ici n'est notre interprétation.",
    pt: "O conjunto de regras que criou a sua lista, tal como a missão o publica. Nada aqui é a nossa interpretação.",
    sw: "Seti ya kanuni iliyounda orodha yako, kama ubalozi unavyoichapisha. Hakuna kitu hapa kilicho tafsiri yetu.",
    ar: "مجموعة القواعد التي بنت قائمتك، كما تنشرها البعثة. لا شيء هنا هو تفسيرنا الخاص.",
    tw: "Mmara nhyehyɛeɛ a ɛkyerɛɛ wo krataa nhyehyɛeɛ kwan, sɛnea amansini afikyi no ada no adi no. Biribiara wɔ ha nyɛ yɛn nkyerɛaseɛ.",
    zu: "Isethi yemithetho eyakhe uhlu lwakho, njengoba ihhovisi elimele izwe liyishicilela. Akukho lapha okuwukuchazwa kwethu.",
  },
  documentsRequiredLabel: {
    en: "Documents required",
    ha: "Takardun da ake bukata",
    yo: "Àwọn ìwé tí a béèrè",
    ig: "Akwụkwọ a chọrọ",
    fr: "Documents requis",
    pt: "Documentos exigidos",
    sw: "Hati zinazohitajika",
    ar: "المستندات المطلوبة",
    tw: "Nkrataa a ɛho hia",
    zu: "Amadokhumenti adingekayo",
  },
  typicalDecisionLabel: {
    en: "Typical decision time",
    ha: "Matsakaicin lokacin yanke shawara",
    yo: "Àkókò tí ó máa ń gbà láti pinnu",
    ig: "Oge a na-ewetakarị mkpebi",
    fr: "Délai de décision habituel",
    pt: "Prazo habitual de decisão",
    sw: "Muda wa kawaida wa uamuzi",
    ar: "المدة المعتادة لاتخاذ القرار",
    tw: "Berɛ a wɔtaa de si gyinaeɛ",
    zu: "Isikhathi esejwayelekile sesinqumo",
  },
  governmentFeeLabel: {
    en: "Government fee",
    ha: "Kuɗin gwamnati",
    yo: "Owó ìjọba",
    ig: "Ụgwọ gọọmentị",
    fr: "Frais gouvernementaux",
    pt: "Taxa governamental",
    sw: "Ada ya serikali",
    ar: "الرسوم الحكومية",
    tw: "Aban ka a wɔtua",
    zu: "Imali yohulumeni",
  },
  conditionalSub: {
    en: "{n} more only if they apply to you",
    ha: "Wasu {n} kawai idan sun shafe ka",
    yo: "{n} sí i tí ó bá kàn ọ́ nìkan",
    ig: "{n} ọzọ ma ọ bụrụ na o metụtara gị",
    fr: "{n} de plus, seulement si cela vous concerne",
    pt: "Mais {n}, apenas se se aplicarem a si",
    sw: "{n} zaidi ikiwa tu zinakuhusu",
    ar: "{n} أخرى فقط إن كانت تنطبق عليك",
    tw: "{n} bio sɛ ɛfa wo ho a",
    zu: "Ezingu-{n} eziphindwe uma zisebenza kuwe",
  },
  allApplySub: {
    en: "every one of them applies to you",
    ha: "kowanne ɗayansu ya shafe ka",
    yo: "gbogbo wọn ni ó kàn ọ́",
    ig: "nke ọ bụla n'ime ha metụtara gị",
    fr: "chacun d'eux vous concerne",
    pt: "todos eles se aplicam a si",
    sw: "kila moja linakuhusu",
    ar: "ينطبق كل واحد منها عليك",
    tw: "wɔn nyinaa fa wo ho",
    zu: "yileyo naleyo yasebenza kuwe",
  },
  fromDateReceivedSub: {
    en: "from the date the mission receives your file",
    ha: "daga ranar da ofishin jakadanci ya karɓi fayil ɗinka",
    yo: "láti ọjọ́ tí ọ́fíìsì aṣojú bá gba fáìlì rẹ",
    ig: "site n'ụbọchị ozi nnọchite obodo natara faịlụ gị",
    fr: "à partir de la date à laquelle la mission reçoit votre dossier",
    pt: "a partir da data em que a missão recebe o seu processo",
    sw: "kuanzia tarehe ubalozi unapopokea faili lako",
    ar: "من تاريخ استلام البعثة لملفك",
    tw: "efi da a amansini afikyi no nya wo faele no",
    zu: "kusukela ngosuku ihhovisi elimele izwe lithola ifayela lakho",
  },
  paidToMissionSub: {
    en: "paid to the mission, not to Toplance",
    ha: "ana biya wa ofishin jakadanci, ba Toplance ba",
    yo: "a máa san án fún ọ́fíìsì aṣojú, kì í ṣe fún Toplance",
    ig: "a na-akwụ ozi nnọchite obodo, ọ bụghị Toplance",
    fr: "payés à la mission, pas à Toplance",
    pt: "pagos à missão, não à Toplance",
    sw: "hulipwa kwa ubalozi, si kwa Toplance",
    ar: "تُدفَع للبعثة، وليس لـ Toplance",
    tw: "wɔtua ma amansini afikyi no, ɛnyɛ Toplance",
    zu: "ikhokhelwa ihhovisi elimele izwe, hhayi iToplance",
  },
  perEntrySub: {
    en: "on this visa, per entry",
    ha: "a wannan bizar, a kowace shigowa",
    yo: "lórí fisa yìí, fún ìgbà kọ̀ọ̀kan tí o bá wọlé",
    ig: "na visa a, kwa mbata ọ bụla",
    fr: "sur ce visa, par entrée",
    pt: "neste visto, por entrada",
    sw: "kwa viza hii, kwa kila kuingia",
    ar: "على هذه التأشيرة، لكل دخول",
    tw: "wɔ saa visa yi so, ɔhyɛn biara",
    zu: "kule visa, ngokungena ngakunye",
  },
  refusalReasonSub: {
    en: "a common reason a file is refused",
    ha: "wani dalili ne da yakan sa a ƙi fayil",
    yo: "ìdí kan tí ó wọ́pọ̀ tí a fi ń kọ fáìlì",
    ig: "otu ihe a na-ejikarị ajụ faịlụ",
    fr: "une raison fréquente de refus d'un dossier",
    pt: "um motivo comum para a recusa de um processo",
    sw: "sababu ya kawaida ya kukataliwa kwa faili",
    ar: "سبب شائع لرفض الملف",
    tw: "ade a ɛtaa ma wɔpo faele bi",
    zu: "isizathu esivamile sokwenqatshwa kwefayela",
  },
  approxAtRatesDate: {
    en: "at {date} rates",
    ha: "a farashin {date}",
    yo: "ní ìwọ̀n owó ọjọ́ {date}",
    ig: "na ọnụ ahịa {date}",
    fr: "aux taux du {date}",
    pt: "às taxas de {date}",
    sw: "kwa viwango vya {date}",
    ar: "بأسعار {date}",
    tw: "sɛnea sika bo teɛ {date}",
    zu: "ngamanani ka-{date}",
  },
  officialEvisaPortal: {
    en: "Official eVisa portal",
    ha: "Shafin bizar-lantarki na hukuma",
    yo: "Ojú-òpó fisa-oníná-mọ̀nàmọ́ná ìjọba",
    ig: "Weebụsaịtị eVisa gọọmentị",
    fr: "Portail officiel du visa électronique",
    pt: "Portal oficial do visto eletrónico",
    sw: "Tovuti rasmi ya eVisa",
    ar: "البوابة الرسمية للتأشيرة الإلكترونية",
    tw: "Aban eVisa website pa",
    zu: "Iwebhusayithi esemthethweni ye-eVisa",
  },
  registrationSuffix: {
    en: "{name} registration",
    ha: "Rijistar {name}",
    yo: "Ìforúkọsílẹ̀ {name}",
    ig: "Ndebanye aha {name}",
    fr: "Enregistrement {name}",
    pt: "Registo {name}",
    sw: "Usajili wa {name}",
    ar: "تسجيل {name}",
    tw: "{name} ho krataa mu kyerɛw",
    zu: "Ukubhalisa kwe-{name}",
  },
  embassyContact: {
    en: "Embassy contact",
    ha: "Lambar tuntuɓar ofishin jakadanci",
    yo: "Ìbánisọ̀rọ̀ ilé iṣẹ́ aṣojú",
    ig: "Kọntaktị ụlọ ọrụ nnọchite obodo",
    fr: "Contact de l'ambassade",
    pt: "Contacto da embaixada",
    sw: "Mawasiliano ya ubalozi",
    ar: "التواصل مع السفارة",
    tw: "Amansini afikyi ho kwan a wɔfa so kasa",
    zu: "Oxhumana naye enxuseni",
  },
  inEffectSince: {
    en: "In effect since {date}",
    ha: "Yana aiki tun {date}",
    yo: "Ó ti wà ní ipa láti {date}",
    ig: "Ọ bidoro n'ụzọ na {date}",
    fr: "En vigueur depuis le {date}",
    pt: "Em vigor desde {date}",
    sw: "Inatumika tangu {date}",
    ar: "ساري المفعول منذ {date}",
    tw: "Ɛreyɛ adwuma efi {date}",
    zu: "Isebenza kusukela ngo-{date}",
  },
  contributionsAnd: {
    en: "and",
    ha: "da",
    yo: "àti",
    ig: "na",
    fr: "et",
    pt: "e",
    sw: "na",
    ar: "و",
    tw: "ne",
    zu: "kanye",
  },
  contributionsComeSingular: {
    en: "comes from",
    ha: "ta fito daga",
    yo: "wá láti ọ̀dọ̀",
    ig: "sitere na",
    fr: "provient de",
    pt: "vem de",
    sw: "inatoka kwa",
    ar: "يأتي من",
    tw: "efiri",
    zu: "kuvela ku-",
  },
  contributionsComePlural: {
    en: "come from",
    ha: "sun fito daga",
    yo: "wá láti ọ̀dọ̀",
    ig: "sitere na",
    fr: "proviennent de",
    pt: "vêm de",
    sw: "zinatoka kwa",
    ar: "تأتي من",
    tw: "efiri",
    zu: "kuvela ku-",
  },
  whatYouMustProvide: {
    en: "What you must provide",
    ha: "Abin da dole ka bayar",
    yo: "Ohun tí o gbọ́dọ̀ pèsè",
    ig: "Ihe ị ghaghị inye",
    fr: "Ce que vous devez fournir",
    pt: "O que deve fornecer",
    sw: "Unachopaswa kutoa",
    ar: "ما يجب عليك تقديمه",
    tw: "Deɛ ɛsɛ sɛ wode ma",
    zu: "Okumele ukunikeze",
  },
  documentsBadge: {
    en: "documents",
    ha: "takardu",
    yo: "ìwé",
    ig: "akwụkwọ",
    fr: "documents",
    pt: "documentos",
    sw: "hati",
    ar: "مستندات",
    tw: "nkrataa",
    zu: "amadokhumenti",
  },
  onlyIfItApplies: {
    en: "Only if it applies",
    ha: "Kawai idan ya shafe ka",
    yo: "Bí ó bá ṣe pé ó kàn ọ́ nìkan",
    ig: "Ma ọ bụrụ naanị na ọ metụtara gị",
    fr: "Seulement si cela s'applique",
    pt: "Apenas se se aplicar",
    sw: "Ikiwa tu inahusika",
    ar: "فقط إن كان ذلك ينطبق",
    tw: "Sɛ ɛfa wo ho nko ara a",
    zu: "Kuphela uma kusebenza",
  },
  conditionalBadge: {
    en: "conditional",
    ha: "sharaɗi",
    yo: "onípinnu",
    ig: "mgbanwe",
    fr: "conditionnel",
    pt: "condicional",
    sw: "yenye masharti",
    ar: "مشروط",
    tw: "sɛ ɛba mu a",
    zu: "okunemibandela",
  },
  startUploading: {
    en: "Start uploading ({n} on your checklist)",
    ha: "Fara loda ({n} a jerin takardunka)",
    yo: "Bẹ̀rẹ̀ gbígbé sórí ayélujára ({n} lórí àkọsílẹ̀ rẹ)",
    ig: "Bido ibugo ({n} dị na ndepụta gị)",
    fr: "Commencer à téléverser ({n} sur votre liste)",
    pt: "Começar a carregar ({n} na sua lista)",
    sw: "Anza kupakia ({n} kwenye orodha yako)",
    ar: "ابدأ الرفع ({n} في قائمتك)",
    tw: "Fi ase to soro ({n} wɔ wo krataa nhyehyɛeɛ so)",
    zu: "Qala ukulayisha (ezingu-{n} ohlwini lwakho)",
  },
};
