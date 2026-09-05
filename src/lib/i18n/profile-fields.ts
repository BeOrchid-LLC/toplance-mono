import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The inline-editable rows on the traveller's own profile — name, phone,
 * language and the post-arrival digest cadence. The values a traveller
 * has actually entered (their name, their phone digits) are never
 * touched; this is the surrounding form chrome.
 *
 * English values are the copy the editors already had; every other
 * locale was translated in-house from that English, the same way `HERO`
 * was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const PROFILE_FIELDS: {
  saved: L;
  notProvidedAria: L;
  cancel: L;
  saving: L;
  save: L;
  fullNameLabel: L;
  editFullNameAria: L;
  fullNameFieldLabel: L;
  phoneLabel: L;
  editPhoneAria: L;
  mobileNumberLabel: L;
  phoneHint: L;
  languageLabel: L;
  editLanguageAria: L;
  preferredLanguageLabel: L;
  digestLabel: L;
  editDigestAria: L;
  digestFieldLabel: L;
  digestNote: L;
} = {
  saved: {
    en: "Saved",
    ha: "An ajiye",
    yo: "A ti fi pamọ́",
    ig: "Echekwala",
    fr: "Enregistré",
    pt: "Guardado",
    sw: "Imehifadhiwa",
    ar: "تم الحفظ",
    tw: "Wɔakora",
    zu: "Kulondoloziwe",
  },
  notProvidedAria: {
    en: "Not provided yet",
    ha: "Ba a bayar ba tukuna",
    yo: "Kò tí ì pèsè",
    ig: "Enyebeghị ka ọ dị ugbu a",
    fr: "Pas encore renseigné",
    pt: "Ainda não fornecido",
    sw: "Bado hazijatolewa",
    ar: "لم يُقدَّم بعد",
    tw: "Wɔmmfaa mmma ɛnnora",
    zu: "Akukanikezwa okwamanje",
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
  saving: {
    en: "Saving…",
    ha: "Ana ajiyewa…",
    yo: "Ń fi pamọ́…",
    ig: "Na-echekwa…",
    fr: "Enregistrement…",
    pt: "A guardar…",
    sw: "Inahifadhi…",
    ar: "جارٍ الحفظ…",
    tw: "Ɛrekora…",
    zu: "Iyalondoloza…",
  },
  save: {
    en: "Save",
    ha: "Ajiye",
    yo: "Fi pamọ́",
    ig: "Chekwaa",
    fr: "Enregistrer",
    pt: "Guardar",
    sw: "Hifadhi",
    ar: "حفظ",
    tw: "Kora",
    zu: "Londoloza",
  },
  fullNameLabel: {
    en: "Full name",
    ha: "Cikakken suna",
    yo: "Orúkọ kíkún",
    ig: "Aha zuru ezu",
    fr: "Nom complet",
    pt: "Nome completo",
    sw: "Jina kamili",
    ar: "الاسم الكامل",
    tw: "Din a edi mu",
    zu: "Igama eligcwele",
  },
  editFullNameAria: {
    en: "Edit full name",
    ha: "Gyara cikakken suna",
    yo: "Ṣàtúnṣe orúkọ kíkún",
    ig: "Dezie aha zuru ezu",
    fr: "Modifier le nom complet",
    pt: "Editar nome completo",
    sw: "Hariri jina kamili",
    ar: "تعديل الاسم الكامل",
    tw: "Sesa din a edi mu",
    zu: "Hlela igama eligcwele",
  },
  fullNameFieldLabel: {
    en: "Full name, exactly as in your passport",
    ha: "Cikakken suna, daidai kamar yadda yake a fasfo ɗinka",
    yo: "Orúkọ kíkún, gẹ́gẹ́ bí ó ṣe wà nínú fáàsípọ́tù rẹ",
    ig: "Aha zuru ezu, kpọmkwem otu ọ dị na paspọtụ gị",
    fr: "Nom complet, exactement comme sur votre passeport",
    pt: "Nome completo, exatamente como no seu passaporte",
    sw: "Jina kamili, sawasawa kama lilivyo kwenye pasipoti yako",
    ar: "الاسم الكامل، تماماً كما يظهر في جواز سفرك",
    tw: "Din a edi mu, sɛnea ɛte pɛpɛɛpɛ wɔ wo pasport mu",
    zu: "Igama eligcwele, njengoba nje linjalo epasipotini yakho",
  },
  phoneLabel: {
    en: "Phone",
    ha: "Waya",
    yo: "Fóònù",
    ig: "Ekwentị",
    fr: "Téléphone",
    pt: "Telefone",
    sw: "Simu",
    ar: "الهاتف",
    tw: "Foon",
    zu: "Ucingo",
  },
  editPhoneAria: {
    en: "Edit phone",
    ha: "Gyara waya",
    yo: "Ṣàtúnṣe fóònù",
    ig: "Dezie ekwentị",
    fr: "Modifier le téléphone",
    pt: "Editar telefone",
    sw: "Hariri simu",
    ar: "تعديل الهاتف",
    tw: "Sesa foon",
    zu: "Hlela ucingo",
  },
  mobileNumberLabel: {
    en: "Mobile number",
    ha: "Lambar waya",
    yo: "Nọ́mbà fóònù alágbèéká",
    ig: "Nọmba ekwentị mkpanaka",
    fr: "Numéro de mobile",
    pt: "Número de telemóvel",
    sw: "Nambari ya simu",
    ar: "رقم الهاتف المحمول",
    tw: "Foon nɔma",
    zu: "Inombolo yeselula",
  },
  phoneHint: {
    en: "Used by your case handler, not for marketing.",
    ha: "Mai kula da shari'arka ne ke amfani da ita, ba don talla ba.",
    yo: "Ẹni tí ó ń bójútó ẹjọ́ rẹ ni yóò lò ó, kì í ṣe fún ìpolówó ọjà.",
    ig: "Onye na-elekọta ikpe gị ka a ga-eji ya, ọ bụghị maka mgbasa ozi.",
    fr: "Utilisé par votre gestionnaire de dossier, pas à des fins de marketing.",
    pt: "Utilizado pelo seu gestor de processo, não para fins de marketing.",
    sw: "Inatumiwa na msimamizi wa kesi yako, si kwa masoko.",
    ar: "يستخدمه مسؤول ملفك فقط، وليس لأغراض التسويق.",
    tw: "Wo asɛm sohwɛfoɔ na ɔde di dwuma, ɛnyɛ dwadie ho.",
    zu: "Isetshenziswa umphathi wecala lakho, hhayi ukumaketha.",
  },
  languageLabel: {
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
  editLanguageAria: {
    en: "Edit language",
    ha: "Gyara harshe",
    yo: "Ṣàtúnṣe èdè",
    ig: "Dezie asụsụ",
    fr: "Modifier la langue",
    pt: "Editar idioma",
    sw: "Hariri lugha",
    ar: "تعديل اللغة",
    tw: "Sesa kasa",
    zu: "Hlela ulimi",
  },
  preferredLanguageLabel: {
    en: "Preferred language",
    ha: "Harshen da aka fi so",
    yo: "Èdè tí a fẹ́ràn jùlọ",
    ig: "Asụsụ a họrọ",
    fr: "Langue préférée",
    pt: "Idioma preferido",
    sw: "Lugha unayopendelea",
    ar: "اللغة المفضّلة",
    tw: "Kasa a wopɛ",
    zu: "Ulimi olukhethwayo",
  },
  digestLabel: {
    en: "Post-arrival digest",
    ha: "Taƙaitawa bayan isowa",
    yo: "Àkópọ̀ ìwádìí lẹ́yìn dídé",
    ig: "Nchịkọta mgbe ị rutere",
    fr: "Résumé après l'arrivée",
    pt: "Resumo após a chegada",
    sw: "Muhtasari baada ya kuwasili",
    ar: "ملخص ما بعد الوصول",
    tw: "Nsɛm tiawa a wɔde ma wo wɔ berɛ a woadu akyi",
    zu: "Isifinyezo ngemva kokufika",
  },
  editDigestAria: {
    en: "Edit post-arrival digest",
    ha: "Gyara taƙaitawa bayan isowa",
    yo: "Ṣàtúnṣe àkópọ̀ ìwádìí lẹ́yìn dídé",
    ig: "Dezie nchịkọta mgbe ị rutere",
    fr: "Modifier le résumé après l'arrivée",
    pt: "Editar o resumo após a chegada",
    sw: "Hariri muhtasari baada ya kuwasili",
    ar: "تعديل ملخص ما بعد الوصول",
    tw: "Sesa nsɛm tiawa a wɔde ma wo wɔ berɛ a woadu akyi",
    zu: "Hlela isifinyezo ngemva kokufika",
  },
  digestFieldLabel: {
    en: "How often, after you land",
    ha: "Sau nawa, bayan ka sauka",
    yo: "Iye ìgbà, lẹ́yìn tí o bá dé",
    ig: "Ugboro ole, mgbe ị rutere",
    fr: "À quelle fréquence, après votre arrivée",
    pt: "Com que frequência, após a chegada",
    sw: "Mara ngapi, baada ya kuwasili",
    ar: "كم مرة، بعد وصولك",
    tw: "Mpɛn dodow, wɔ berɛ a woadu akyi",
    zu: "Kangaki, ngemva kokufika kwakho",
  },
  digestNote: {
    en: "Covers your orientation updates and travel-advice alerts. Reminders about your visa expiring are sent whatever you choose here.",
    ha: "Ya ƙunshi sabuntawar shiryawarka da faɗakarwar shawarwarin tafiya. Ana aika tunatarwa game da ƙarewar bizarka ko da me ka zaɓa a nan.",
    yo: "Ó bo àwọn ìsọdọ̀tun ìdarí àti ìkìlọ̀ ìmọ̀ràn ìrìnnà rẹ. A máa ń fi àmì ìránnilétí ránṣẹ́ nípa ìparí fisa rẹ láìkàsí ohun tí o bá yàn níbí.",
    ig: "Ọ na-ekpuchi mmelite mmalite gị na ọkwa ndụmọdụ njem. A na-eziga ncheta gbasara mgbe visa gị ga-agwụ n'agbanyeghị ihe ị họọrọ ebe a.",
    fr: "Couvre vos mises à jour d'orientation et les alertes de conseils aux voyageurs. Les rappels d'expiration de votre visa sont envoyés quel que soit votre choix ici.",
    pt: "Abrange as suas atualizações de orientação e os alertas de conselhos de viagem. Os lembretes de expiração do seu visto são enviados independentemente do que escolher aqui.",
    sw: "Inahusu masasisho yako ya mwelekeo na tahadhari za ushauri wa usafiri. Vikumbusho kuhusu kuisha kwa viza yako hutumwa haijalishi unachochagua hapa.",
    ar: "يشمل هذا تحديثات التوجيه وتنبيهات نصائح السفر. تُرسَل تذكيرات انتهاء صلاحية تأشيرتك بغض النظر عمّا تختاره هنا.",
    tw: "Ɛka wo nkyerɛkyerɛmu foforɔ ne akwantuo ho afutusɛm ho kɔkɔbɔ ho. Wɔde wo visa berɛ a ɛbɛtwam ho nkaebɔ bɛma wo, ɛmfa ho deɛ woayi wɔ ha.",
    zu: "Kuhlanganisa izibuyekezo zakho zoqeqesho nezexwayiso zeseluleko sokuhamba. Izikhumbuzo mayelana nokuphelelwa yisikhathi kwe-visa yakho ziyathunyelwa noma ngabe ukhethani lapha.",
  },
};
