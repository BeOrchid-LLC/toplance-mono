import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/agency/rule-sets` and `/agency/rule-sets/[id]` — the requirement
 * lists an agency's own checklists were built from.
 *
 * Only the strings this screen does not share with the platform console
 * live here. The route, purpose, version and document headings come
 * from `OPS_CORRIDORS.tableHead`, the fee and decision-time labels from
 * `OPS_CORRIDOR_REVIEW.fields`, and the purpose names from
 * `OPS_COMMON.purpose` — a director and a reviewer looking at the same
 * corridor should be reading the same words for it, and a second copy
 * of a word is a word that will disagree with itself.
 *
 * The requirement names themselves are NOT here and are not localised.
 * They are written onto each corridor version at seed time, stored in
 * English, and a row's own copy must not change when a constant is
 * edited — the same rule `OPS_KYB` states for the six KYB documents.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, like every non-English string in this codebase.
 */
export const AGENCY_RULE_SETS: {
  nav: L;
  heading: L;
  intro: L;
  panel: L;
  routesWord: L;
  empty: L;
  searchPlaceholder: L;
  tableHead: { cases: L; fee: L };
  backLink: L;
  readOnlyNotice: L;
  supersededNotice: L;
  detailIntro: L;
  casesOnThisVersion: L;
  effectiveFrom: L;
  appliesWhenPrefix: L;
  everyoneAsked: L;
} = {
  nav: {
    en: "Rule sets",
    ha: "Ƙa'idoji",
    yo: "Àwọn òfin",
    ig: "Usoro iwu",
    fr: "Jeux de règles",
    pt: "Conjuntos de regras",
    sw: "Seti za kanuni",
    ar: "مجموعات القواعد",
    tw: "Mmara ahorow",
    zu: "Amasethi emithetho",
  },
  heading: {
    en: "Rule sets",
    ha: "Ƙa'idoji",
    yo: "Àwọn òfin",
    ig: "Usoro iwu",
    fr: "Jeux de règles",
    pt: "Conjuntos de regras",
    sw: "Seti za kanuni",
    ar: "مجموعات القواعد",
    tw: "Mmara ahorow",
    zu: "Amasethi emithetho",
  },
  intro: {
    en: "The requirement lists your clients' checklists were built from — what each route asks for, what it costs, and when a person last read it against the mission's own page.",
    ha: "Jerin buƙatun da aka gina jerin abubuwan abokan cinikinku daga gare su — abin da kowace hanya ke buƙata, kuɗinta, da lokacin da mutum ya karanta ta ƙarshe a shafin ofishin jakadanci.",
    yo: "Àwọn àkọsílẹ̀ ìbéèrè tí a fi kọ́ àtòjọ àyẹ̀wò àwọn oníbàárà rẹ — ohun tí ipa ọ̀nà kọ̀ọ̀kan béèrè, iye owó rẹ̀, àti ìgbà tí ẹnìkan kà á kẹ́yìn lórí ojú-ìwé iṣẹ́ aṣojú.",
    ig: "Ndepụta ihe achọrọ nke e ji wuo ndepụta nlele ndị ahịa gị — ihe ụzọ ọ bụla na-arịọ, ọnụahịa ya, na mgbe mmadụ gụrụ ya ikpeazụ na peeji nke ọrụ nnọchiteanya.",
    fr: "Les listes d'exigences à partir desquelles les checklists de vos clients ont été construites — ce que chaque itinéraire demande, ce qu'il coûte, et quand une personne l'a lu pour la dernière fois sur la page de la mission.",
    pt: "As listas de requisitos a partir das quais as checklists dos seus clientes foram criadas — o que cada rota exige, quanto custa, e quando alguém a leu pela última vez na página da missão.",
    sw: "Orodha za mahitaji ambazo orodha za ukaguzi za wateja wako zilijengwa kutoka kwazo — kila njia inaomba nini, inagharimu kiasi gani, na lini mtu aliisoma mara ya mwisho kwenye ukurasa wa ubalozi.",
    ar: "قوائم المتطلبات التي بُنيت منها قوائم تحقّق عملائك — ما يطلبه كل مسار، وكم يكلّف، ومتى قرأه شخص آخر مرة على صفحة البعثة نفسها.",
    tw: "Ahiade nkyerɛwee a wɔde sii wo adetɔfo nhwehwɛmu nkyerɛwee no so — nea ɛkwan biara bisa, ne bo, ne bere a obi kenkanee no wɔ ɔsomfo krataafa so.",
    zu: "Uhlu lwezidingo okwakhiwe kulo uhlu lokuhlola lwamakhasimende akho — okudingwa yindlela ngayinye, izindleko zayo, nokuthi ngumuphi umuntu owagcina ukuyifunda ekhasini lomkhandlu.",
  },
  panel: {
    en: "Routes you file on",
    ha: "Hanyoyin da kuke aiki a kansu",
    yo: "Àwọn ipa ọ̀nà tí ẹ ń ṣiṣẹ́ lé lórí",
    ig: "Ụzọ ị na-arụ ọrụ na ya",
    fr: "Itinéraires sur lesquels vous déposez",
    pt: "Rotas em que apresenta processos",
    sw: "Njia unazowasilisha kwazo",
    ar: "المسارات التي تقدّم عليها",
    tw: "Akwan a wode nkrataa hyɛ so",
    zu: "Izindlela ofaka kuzo izicelo",
  },
  routesWord: {
    en: "routes",
    ha: "hanyoyi",
    yo: "ipa ọ̀nà",
    ig: "ụzọ",
    fr: "itinéraires",
    pt: "rotas",
    sw: "njia",
    ar: "مسارات",
    tw: "akwan",
    zu: "izindlela",
  },
  empty: {
    en: "No rule sets yet. One appears here as soon as a client's case resolves a route.",
    ha: "Babu ƙa'idoji tukuna. Za a nuna ɗaya nan da zarar shari'ar abokin ciniki ta samu hanya.",
    yo: "Kò sí òfin kankan síbẹ̀. Ọ̀kan yóò farahàn níbí kété tí ẹjọ́ oníbàárà bá rí ipa ọ̀nà.",
    ig: "Enweghị usoro iwu ugbu a. Otu ga-apụta ebe a ozugbo okwu onye ahịa chọtara ụzọ.",
    fr: "Aucun jeu de règles pour l'instant. Un apparaît dès qu'un dossier client détermine un itinéraire.",
    pt: "Ainda não há conjuntos de regras. Um aparece assim que o processo de um cliente definir uma rota.",
    sw: "Bado hakuna seti za kanuni. Moja huonekana mara tu kesi ya mteja inapopata njia.",
    ar: "لا توجد مجموعات قواعد بعد. تظهر واحدة فور أن يحدّد ملف عميل مساره.",
    tw: "Mmara biara nni hɔ. Baako bɛpue bere a adetɔfo asɛm bi nya kwan.",
    zu: "Awekho amasethi emithetho okwamanje. Elilodwa livela lapho icala leklayenti lithola indlela.",
  },
  searchPlaceholder: {
    en: "Search by country or visa",
    ha: "Nemo ta ƙasa ko biza",
    yo: "Wá nípa orílẹ̀-èdè tàbí fisa",
    ig: "Chọọ site na obodo ma ọ bụ visa",
    fr: "Rechercher par pays ou visa",
    pt: "Pesquisar por país ou visto",
    sw: "Tafuta kwa nchi au visa",
    ar: "ابحث حسب الدولة أو التأشيرة",
    tw: "Hwehwɛ ɔman anaa visa so",
    zu: "Sesha ngezwe noma ngevisa",
  },
  tableHead: {
    cases: {
      en: "Your cases",
      ha: "Shari'unku",
      yo: "Àwọn ẹjọ́ yín",
      ig: "Okwu unu",
      fr: "Vos dossiers",
      pt: "Os seus processos",
      sw: "Kesi zenu",
      ar: "ملفاتكم",
      tw: "Mo nsɛm",
      zu: "Amacala enu",
    },
    fee: {
      en: "Government fee",
      ha: "Kuɗin gwamnati",
      yo: "Owó ìjọba",
      ig: "Ụgwọ gọọmentị",
      fr: "Frais gouvernementaux",
      pt: "Taxa governamental",
      sw: "Ada ya serikali",
      ar: "الرسوم الحكومية",
      tw: "Aban ka",
      zu: "Imali kahulumeni",
    },
  },
  backLink: {
    en: "Rule sets",
    ha: "Ƙa'idoji",
    yo: "Àwọn òfin",
    ig: "Usoro iwu",
    fr: "Jeux de règles",
    pt: "Conjuntos de regras",
    sw: "Seti za kanuni",
    ar: "مجموعات القواعد",
    tw: "Mmara ahorow",
    zu: "Amasethi emithetho",
  },
  /**
   * Said on the page rather than left to be discovered by looking for a
   * button that is not there. It also names the way to get a change
   * made, because "read-only" without a next step is a dead end.
   */
  readOnlyNotice: {
    en: "Read-only. These rules are shared by every agency on the route, so BeOrchid maintains them centrally — if a fee or a document has changed, send us the mission's page through Contact support and we will publish a new version.",
    ha: "Karatu kawai. Kowace hukuma a kan hanyar tana amfani da waɗannan ƙa'idojin, don haka BeOrchid ce ke kula da su — idan kuɗi ko takarda ta canza, ku aiko mana da shafin ofishin jakadanci ta Tuntuɓi tallafi, za mu buga sabon sigar.",
    yo: "Kíkà nìkan. Gbogbo ilé-iṣẹ́ tó wà lórí ipa ọ̀nà náà ló ń lo àwọn òfin wọ̀nyí, nítorí náà BeOrchid ló ń tọ́jú wọn — bí owó tàbí ìwé bá yípadà, ẹ fi ojú-ìwé iṣẹ́ aṣojú ránṣẹ́ sí wa nípasẹ̀ Kàn sí ìrànlọ́wọ́, a ó tẹ ẹ̀dà tuntun jáde.",
    ig: "Ọgụgụ naanị. Ụlọ ọrụ niile nọ n'ụzọ ahụ na-eji iwu ndị a, ya mere BeOrchid na-elekọta ha — ọ bụrụ na ụgwọ ma ọ bụ akwụkwọ agbanwee, zitere anyị peeji nke ọrụ nnọchiteanya site na Kpọtụrụ nkwado, anyị ga-ebipụta ụdị ọhụrụ.",
    fr: "Lecture seule. Ces règles sont partagées par toutes les agences sur l'itinéraire, BeOrchid les maintient donc de façon centralisée — si des frais ou un document ont changé, envoyez-nous la page de la mission via Contacter le support et nous publierons une nouvelle version.",
    pt: "Apenas leitura. Estas regras são partilhadas por todas as agências na rota, por isso a BeOrchid mantém-nas centralmente — se uma taxa ou um documento mudou, envie-nos a página da missão através de Contactar o suporte e publicaremos uma nova versão.",
    sw: "Kusoma tu. Kanuni hizi zinatumiwa na kila wakala kwenye njia hiyo, hivyo BeOrchid huzisimamia kwa pamoja — ikiwa ada au hati imebadilika, tutumie ukurasa wa ubalozi kupitia Wasiliana na msaada nasi tutachapisha toleo jipya.",
    ar: "للقراءة فقط. تشترك كل الوكالات على هذا المسار في هذه القواعد، لذا تتولّى BeOrchid صيانتها مركزيًا — إذا تغيّرت رسوم أو وثيقة، أرسل لنا صفحة البعثة عبر التواصل مع الدعم وسننشر إصدارًا جديدًا.",
    tw: "Akenkan nko ara. Adwumakuo a ɛwɔ ɛkwan no so nyinaa na wɔde saa mmara yi di dwuma, enti BeOrchid na ɛhwɛ so — sɛ ka anaa krataa bi asesa a, fa ɔsomfo krataafa no mena yɛn wɔ Frɛ mmoa so na yɛbɛtintim nsakrae foforo.",
    zu: "Ukufunda kuphela. Le mithetho isetshenziswa yiwo wonke ama-ejensi kule ndlela, ngakho i-BeOrchid iyayigcina — uma imali noma idokhumenti ishintshile, sithumele ikhasi lomkhandlu ngeXhumana nosizo futhi sizoshicilela inguqulo entsha.",
  },
  supersededNotice: {
    en: "A newer version of this route is now live. Cases opened before it keep the version they were built from, so this list is still what those travellers were asked for.",
    ha: "Sabon sigar wannan hanyar yanzu tana aiki. Shari'un da aka buɗe kafin ta suna riƙe da sigar da aka gina su da ita, don haka wannan jerin shi ne abin da aka nemi waɗannan matafiya.",
    yo: "Ẹ̀dà tuntun ipa ọ̀nà yìí ti ń ṣiṣẹ́ báyìí. Àwọn ẹjọ́ tí a ṣí ṣáájú rẹ̀ ń pa ẹ̀dà tí a fi kọ́ wọn mọ́, nítorí náà àtòjọ yìí ni ohun tí a béèrè lọ́wọ́ àwọn arìnrìn-àjò wọ̀nyẹn.",
    ig: "Ụdị ọhụrụ nke ụzọ a adịla ndụ ugbu a. Okwu emeghere tupu ya na-ejigide ụdị e ji wuo ha, ya mere ndepụta a ka bụ ihe a rịọrọ ndị njem ahụ.",
    fr: "Une version plus récente de cet itinéraire est désormais en service. Les dossiers ouverts avant elle conservent la version qui les a construits, cette liste reste donc ce qui a été demandé à ces voyageurs.",
    pt: "Já está ativa uma versão mais recente desta rota. Os processos abertos antes dela mantêm a versão com que foram criados, por isso esta lista continua a ser o que foi pedido a esses viajantes.",
    sw: "Toleo jipya la njia hii sasa linatumika. Kesi zilizofunguliwa kabla yake huhifadhi toleo zilizojengwa kwalo, hivyo orodha hii bado ndiyo waliyoombwa wasafiri hao.",
    ar: "أصبح إصدار أحدث من هذا المسار قيد التشغيل. تحتفظ الملفات المفتوحة قبله بالإصدار الذي بُنيت منه، لذا تبقى هذه القائمة هي ما طُلب من أولئك المسافرين.",
    tw: "Saa ɛkwan yi nsakrae foforo reyɛ adwuma seesei. Nsɛm a wobuee ansa na ɛreba no kura nea wɔde sii wɔn so, enti saa nkyerɛwee yi ara na wobisaa saa akwantufoɔ no.",
    zu: "Inguqulo entsha yale ndlela isisebenza manje. Amacala avulwe ngaphambi kwayo agcina inguqulo akhiwe ngayo, ngakho lolu hlu lusengukho okwakuceliwe kulabo bahambi.",
  },
  detailIntro: {
    en: "Everything this route asks a traveller for, in the order the checklist builds it.",
    ha: "Duk abin da wannan hanya ke nema daga matafiyi, bisa tsarin da jerin abubuwan ke ginawa.",
    yo: "Gbogbo ohun tí ipa ọ̀nà yìí béèrè lọ́wọ́ arìnrìn-àjò, ní ọ̀nà tí àtòjọ àyẹ̀wò ṣe ń kọ́ ọ.",
    ig: "Ihe niile ụzọ a na-arịọ onye njem, n'usoro ndepụta nlele si ewu ya.",
    fr: "Tout ce que cet itinéraire demande à un voyageur, dans l'ordre où la checklist le construit.",
    pt: "Tudo o que esta rota pede a um viajante, pela ordem em que a checklist a constrói.",
    sw: "Kila kitu njia hii inachomwomba msafiri, kwa mpangilio ambao orodha ya ukaguzi huijenga.",
    ar: "كل ما يطلبه هذا المسار من المسافر، بالترتيب الذي تبنيه به قائمة التحقّق.",
    tw: "Biribiara a saa ɛkwan yi bisa ɔkwantuni, sɛnea nhwehwɛmu nkyerɛwee no si sie no.",
    zu: "Konke le ndlela ekucela kumhambi, ngokulandelana okwakhiwa ngakho uhlu lokuhlola.",
  },
  casesOnThisVersion: {
    en: "Your cases on this version",
    ha: "Shari'unku a wannan sigar",
    yo: "Àwọn ẹjọ́ yín lórí ẹ̀dà yìí",
    ig: "Okwu unu na ụdị a",
    fr: "Vos dossiers sur cette version",
    pt: "Os seus processos nesta versão",
    sw: "Kesi zenu kwenye toleo hili",
    ar: "ملفاتكم على هذا الإصدار",
    tw: "Mo nsɛm a ɛwɔ saa nsakrae yi so",
    zu: "Amacala enu kule nguqulo",
  },
  effectiveFrom: {
    en: "In force from",
    ha: "Yana aiki daga",
    yo: "Ó bẹ̀rẹ̀ sí í ṣiṣẹ́ láti",
    ig: "Malite ịrụ ọrụ site na",
    fr: "En vigueur depuis",
    pt: "Em vigor desde",
    sw: "Inatumika kuanzia",
    ar: "سارية اعتبارًا من",
    tw: "Efi ase yɛ adwuma fi",
    zu: "Isebenza kusukela",
  },
  appliesWhenPrefix: {
    en: "Asked for when",
    ha: "Ana nema idan",
    yo: "A béèrè rẹ̀ nígbà tí",
    ig: "A na-arịọ ya mgbe",
    fr: "Demandé lorsque",
    pt: "Pedido quando",
    sw: "Huombwa wakati",
    ar: "يُطلب عندما",
    tw: "Wɔbisa bere a",
    zu: "Kuceliwe uma",
  },
  everyoneAsked: {
    en: "Asked of everybody on this route.",
    ha: "Ana nema daga kowa a kan wannan hanyar.",
    yo: "A béèrè rẹ̀ lọ́wọ́ gbogbo ènìyàn lórí ipa ọ̀nà yìí.",
    ig: "A na-arịọ ya n'aka onye ọ bụla nọ n'ụzọ a.",
    fr: "Demandé à toute personne sur cet itinéraire.",
    pt: "Pedido a toda a gente nesta rota.",
    sw: "Huombwa kwa kila mtu kwenye njia hii.",
    ar: "يُطلب من كل شخص على هذا المسار.",
    tw: "Wobisa obiara a ɔwɔ saa ɛkwan yi so.",
    zu: "Kuceliwe kuwo wonke umuntu okule ndlela.",
  },
};
