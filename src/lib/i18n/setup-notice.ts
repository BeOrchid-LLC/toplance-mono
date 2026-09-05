import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `SetupNotice`'s copy — shown on any route that needs a database before
 * one is configured. Read by whichever page renders it, via
 * `getLocale()`, since `SetupNotice` itself has no `"use client"` and no
 * props to carry a resolved locale in from a caller that might forget to.
 *
 * The shell commands and their filenames (`npm run db:up`, `.env.local`,
 * `README.md`) are not translated — they are things a developer types or
 * opens verbatim, not prose.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the
 * English, like `HERO` before it.
 */
export const SETUP_NOTICE: {
  title: L;
  intro: L;
  steps: [L, L, L, L, L];
  fullDetail: L;
  backHome: L;
  worksWithoutThis: L;
} = {
  title: {
    en: "The database is not connected yet",
    ha: "Ba a haɗa bayanan bayanai ba tukuna",
    yo: "A kò tíì so àpótí ìsọfúnni mọ́",
    ig: "Ejikọtabeghị nchekwa data",
    fr: "La base de données n'est pas encore connectée",
    pt: "A base de dados ainda não está ligada",
    sw: "Hifadhidata bado haijaunganishwa",
    ar: "قاعدة البيانات غير متصلة بعد",
    tw: "Wɔmfa database no nhyɛ mu ɛnnɛ",
    zu: "Isizindalwazi asikaxhunywa",
  },
  intro: {
    en: "The public site runs without a database, but this screen needs one. Five commands and you are through:",
    ha: "Shafin jama'a yana aiki ba tare da bayanan bayanai ba, amma wannan shafin yana buƙatarsa. Umarni biyar kawai za ka gama:",
    yo: "Ojúewé gbogbo ènìyàn ń ṣiṣẹ́ láìní àpótí ìsọfúnni, ṣùgbọ́n ojú-ìwé yìí nílò rẹ̀. Àṣẹ márùn-ún, o sì ti parí:",
    ig: "Weebụsaịtị mmadụ niile na-arụ ọrụ na-enweghị nchekwa data, mana ihuenyo a chọrọ otu. Iwu ise ka ị ga-emecha:",
    fr: "Le site public fonctionne sans base de données, mais cet écran en a besoin. Cinq commandes et c'est fait :",
    pt: "O site público funciona sem base de dados, mas este ecrã precisa de uma. Cinco comandos e está pronto:",
    sw: "Tovuti ya umma inafanya kazi bila hifadhidata, lakini skrini hii inahitaji moja. Amri tano na umemaliza:",
    ar: "يعمل الموقع العام دون قاعدة بيانات، لكن هذه الشاشة تحتاج إلى واحدة. خمسة أوامر وتصبح جاهزاً:",
    tw: "Public site no yɛ adwuma a wɔmfa database mfra mu, nanso saa screen yi hia biako. Ahyɛde enum na woawie:",
    zu: "Isayithi esiphambene lisebenza ngaphandle kwesizindalwazi, kodwa lesi sikrini sidinga esisodwa. Imiyalo emihlanu bese usuqedile:",
  },
  steps: [
    {
      en: "Boots Postgres and the object store in Docker.",
      ha: "Yana kunna Postgres da wurin ajiye abubuwa a Docker.",
      yo: "Ó ń bẹ̀rẹ̀ Postgres àti ibi ìpamọ́ nǹkan ní Docker.",
      ig: "Na-amalite Postgres na ebe nchekwa ihe na Docker.",
      fr: "Démarre Postgres et le stockage d'objets dans Docker.",
      pt: "Inicia o Postgres e o armazenamento de objetos no Docker.",
      sw: "Inaanzisha Postgres na hifadhi ya vitu kwenye Docker.",
      ar: "يشغّل Postgres ومخزن الكائنات داخل Docker.",
      tw: "Ɛma Postgres ne object store no fi ase wɔ Docker mu.",
      zu: "Iqalisa i-Postgres nesitoreji sezinto ku-Docker.",
    },
    {
      en: "Then paste in your two Clerk keys — sign-in needs them.",
      ha: "Sannan ka manna maɓallan Clerk ɗinka guda biyu — shiga yana buƙatarsu.",
      yo: "Lẹ́yìn náà, fi àwọn kọ́kọ́rọ́ Clerk rẹ méjì sí i — ìwọlé nílò wọn.",
      ig: "Mgbe ahụ, tinye igodo Clerk gị abụọ ahụ — nbanye chọrọ ha.",
      fr: "Puis collez vos deux clés Clerk — la connexion en a besoin.",
      pt: "Depois cole as suas duas chaves Clerk — o início de sessão precisa delas.",
      sw: "Kisha bandika funguo zako mbili za Clerk — kuingia kunazihitaji.",
      ar: "ثم الصق مفتاحي Clerk الخاصين بك — تسجيل الدخول يحتاج إليهما.",
      tw: "Afei fa wo Clerk safe abien no gu mu — sign-in hia wɔn.",
      zu: "Bese unamathisela izikhiye zakho ezimbili ze-Clerk — ukungena kuyazidinga.",
    },
    {
      en: "Applies the schema, the completion function and the triggers.",
      ha: "Yana amfani da tsarin, aikin cikawa da abubuwan tayarwa.",
      yo: "Ó ń fi ètò, iṣẹ́ ìparí àti àwọn okùnfà sílò.",
      ig: "Na-etinye usoro, ọrụ mmecha na ihe mkpalite.",
      fr: "Applique le schéma, la fonction d'achèvement et les déclencheurs.",
      pt: "Aplica o esquema, a função de conclusão e os triggers.",
      sw: "Inatumia muundo, kazi ya ukamilifu na vichocheo.",
      ar: "يطبّق المخطط ودالة الإكمال والمُشغِّلات.",
      tw: "Ɛde schema, completion function ne triggers no hyɛ mu.",
      zu: "Isebenzisa i-schema, umsebenzi wokuphothulwa nama-trigger.",
    },
    {
      en: "Loads the four route rule sets and their requirements.",
      ha: "Yana ɗora tsare-tsaren hanya guda huɗu da abubuwan da suke buƙata.",
      yo: "Ó ń kó àwọn ìtòsí ọ̀nà mẹ́rin àti àwọn ohun tí wọ́n nílò.",
      ig: "Na-ebubata ụzọ iwu ụzọ anọ na ihe achọrọ ha.",
      fr: "Charge les quatre jeux de règles de parcours et leurs exigences.",
      pt: "Carrega os quatro conjuntos de regras de percurso e os seus requisitos.",
      sw: "Inapakia seti nne za sheria za njia na mahitaji yake.",
      ar: "يحمّل مجموعات القواعد الأربع للمسارات ومتطلباتها.",
      tw: "Ɛde route nhyehyɛeɛ ɛnan ne ɛho ahiade no gu mu.",
      zu: "Ilayisha amasethi omgudu amane emithetho nezidingo zawo.",
    },
    {
      en: "Creates the private bucket documents are uploaded to.",
      ha: "Yana ƙirƙiro wurin ajiye takardu na sirri da ake loda takardu zuwa gare shi.",
      yo: "Ó ń dá àpò ìpamọ́ ìkọ̀kọ̀ sílẹ̀ tí a ti ń kó àwọn ìwé wọlé sí i.",
      ig: "Na-emepụta akpa nzuzo a na-ebugo akwụkwọ.",
      fr: "Crée le compartiment privé où les documents sont téléversés.",
      pt: "Cria o contentor privado para onde os documentos são carregados.",
      sw: "Inaunda ghala la faragha ambako hati zinapakiwa.",
      ar: "ينشئ الحاوية الخاصة التي تُرفع إليها المستندات.",
      tw: "Ɛyɛ private bucket a wɔde nkrataa to soro kɔ hɔ.",
      zu: "Idala ibhakede eliyimfihlo lapho amadokhumenti alayishwa khona.",
    },
  ],
  fullDetail: {
    en: "Full detail is in",
    ha: "Cikakkun bayanai suna cikin",
    yo: "Kíkún ìsọfúnni wà nínú",
    ig: "Nkọwa zuru ezu dị na",
    fr: "Les détails complets se trouvent dans",
    pt: "Os detalhes completos estão em",
    sw: "Maelezo kamili yako katika",
    ar: "التفاصيل الكاملة موجودة في",
    tw: "Nsɛm nyinaa wɔ",
    zu: "Imininingwane ephelele ikhona ku-",
  },
  backHome: {
    en: "Back to the home page",
    ha: "Koma zuwa babban shafi",
    yo: "Padà sí ojú-ìwé ilé",
    ig: "Laghachi na ibe ụlọ",
    fr: "Retour à la page d'accueil",
    pt: "Voltar à página inicial",
    sw: "Rudi kwenye ukurasa wa nyumbani",
    ar: "العودة إلى الصفحة الرئيسية",
    tw: "San kɔ home page no",
    zu: "Buyela ekhasini lasekhaya",
  },
  worksWithoutThis: {
    en: "which works without any of this.",
    ha: "wanda ke aiki ba tare da wani daga cikin waɗannan ba.",
    yo: "tí ń ṣiṣẹ́ láìsí èyíkéyìí lára wọ̀nyí.",
    ig: "nke na-arụ ọrụ na-enweghị ihe ndị a niile.",
    fr: "qui fonctionne sans rien de tout cela.",
    pt: "que funciona sem nada disto.",
    sw: "ambayo inafanya kazi bila yoyote kati ya haya.",
    ar: "التي تعمل دون أي من هذا.",
    tw: "a ɛyɛ adwuma a saa nneɛma yi biara nka ho.",
    zu: "esebenza ngaphandle kwakho konke lokhu.",
  },
};
