import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The traveller's documents checklist screen. `VERIFIED_MEANS` and
 * `UPLOAD_GUIDANCE` (`@/lib/domain/status`, `@/lib/domain/uploads`) and
 * the `STATUS` labels/blurbs rendered here are shared domain constants
 * outside this pass's file ownership and stay in English — see the
 * handover notes. A document's own name, description and reason come
 * from the database and stay in English too.
 *
 * English values here are exactly the copy the page already had; every
 * other locale was translated in-house from that English, the same way
 * `HERO` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const DOCUMENTS: {
  title: L;
  heading: L;
  intro: L;
  needsAttention: L;
  stillToUpload: L;
  done: L;
  documentSingular: L;
  documentPlural: L;
  everythingVerifiedHeading: L;
  everythingVerifiedBody: L;
  noChecklistYet: L;
} = {
  title: {
    en: "Documents",
    ha: "Takardu",
    yo: "Àwọn ìwé",
    ig: "Akwụkwọ",
    fr: "Documents",
    pt: "Documentos",
    sw: "Hati",
    ar: "المستندات",
    tw: "Nkrataa",
    zu: "Amadokhumenti",
  },
  heading: {
    en: "Your documents",
    ha: "Takardunka",
    yo: "Àwọn ìwé rẹ",
    ig: "Akwụkwọ gị",
    fr: "Vos documents",
    pt: "Os seus documentos",
    sw: "Hati zako",
    ar: "مستنداتك",
    tw: "Wo nkrataa",
    zu: "Amadokhumenti akho",
  },
  intro: {
    en: "Each file is checked automatically within a few seconds of arriving, then confirmed by a person before submission.",
    ha: "Ana duba kowace fayil ta atomatik cikin ƴan daƙiƙu bayan isowa, sannan mutum ya tabbatar da ita kafin a mika ta.",
    yo: "A máa ń fi ẹ̀rọ ṣàyẹ̀wò fáìlì kọ̀ọ̀kan láàrin ìṣẹ́jú àáyá díẹ̀ tí ó bá dé, kí ènìyàn tó fọwọ́sí i kí a tó fi ránṣẹ́.",
    ig: "A na-eji igwe nyocha faịlụ ọ bụla n'ime sekọnd ole na ole ka o rutere, mmadụ akwadokwa ya tupu ezipu ya.",
    fr: "Chaque fichier est vérifié automatiquement en quelques secondes après réception, puis confirmé par une personne avant la soumission.",
    pt: "Cada ficheiro é verificado automaticamente segundos após a receção, e depois confirmado por uma pessoa antes da submissão.",
    sw: "Kila faili hukaguliwa kiotomatiki ndani ya sekunde chache tangu kuwasili, kisha kuthibitishwa na mtu kabla ya kuwasilishwa.",
    ar: "يُفحص كل ملف تلقائياً خلال ثوانٍ من وصوله، ثم يؤكده شخص قبل الإرسال.",
    tw: "Wɔde adwinnade hwɛ faele biara mu wɔ sikanpɔ kakraa bi mu berɛ a ɛba, na onipa akyerɛ sɛ ɛyɛ ansa na wɔde akɔ.",
    zu: "Ifayela ngalinye lihlolwa ngokuzenzakalelayo emasekhondini ambalwa lifika, bese liqinisekiswa umuntu ngaphambi kokuthunyelwa.",
  },
  needsAttention: {
    en: "Needs attention",
    ha: "Yana buƙatar kulawa",
    yo: "Ó nílò àfiyèsí",
    ig: "Chọrọ nlebara anya",
    fr: "Nécessite votre attention",
    pt: "Precisa de atenção",
    sw: "Inahitaji uangalizi",
    ar: "يحتاج إلى انتباه",
    tw: "Ehia nsotie",
    zu: "Kudinga ukunakwa",
  },
  stillToUpload: {
    en: "Still to upload",
    ha: "Ana jira a loda",
    yo: "Ó ku láti gbé sórí ayélujára",
    ig: "Ka a ga-ebugo",
    fr: "Encore à téléverser",
    pt: "Ainda por carregar",
    sw: "Bado kupakiwa",
    ar: "لم يُرفع بعد",
    tw: "Ɛda so ɛsɛ sɛ wɔde to soro",
    zu: "Kusalayishwa",
  },
  done: {
    en: "Done",
    ha: "An gama",
    yo: "Ó ti parí",
    ig: "Emechaala",
    fr: "Terminé",
    pt: "Concluído",
    sw: "Imekamilika",
    ar: "منتهٍ",
    tw: "Awie",
    zu: "Kwenziwe",
  },
  documentSingular: {
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
  documentPlural: {
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
  everythingVerifiedHeading: {
    en: "Everything is verified",
    ha: "An tabbatar da komai",
    yo: "A ti fọwọ́sí ohun gbogbo",
    ig: "Akwadoro ihe niile",
    fr: "Tout est vérifié",
    pt: "Está tudo verificado",
    sw: "Kila kitu kimethibitishwa",
    ar: "تم التحقق من كل شيء",
    tw: "Wɔahwɛ biribiara mu",
    zu: "Konke kuqinisekisiwe",
  },
  everythingVerifiedBody: {
    en: "Submitting sends your file to the review team and notifies them immediately.",
    ha: "Mikawa yana aika fayil ɗinka ga ƙungiyar dubawa kuma yana sanar da su nan take.",
    yo: "Fífi ránṣẹ́ á fi fáìlì rẹ ránṣẹ́ sí ẹgbẹ́ àyẹ̀wò kí ó sì kìlọ̀ fún wọn lẹ́sẹ̀kẹsẹ̀.",
    ig: "Izipu na-ezipu faịlụ gị nye ndị otu nyocha ma na-akpọtu ha ozugbo.",
    fr: "La soumission envoie votre dossier à l'équipe d'examen et l'en informe immédiatement.",
    pt: "Submeter envia o seu processo para a equipa de revisão e notifica-a de imediato.",
    sw: "Kuwasilisha hupeleka faili lako kwa timu ya ukaguzi na kuwajulisha mara moja.",
    ar: "يؤدي الإرسال إلى نقل ملفك إلى فريق المراجعة وإخطاره فوراً.",
    tw: "Sɛ wode kɔ a, ɛde wo faele no kɔma nhwehwɛmufoɔ kuo no na ɛbɔ wɔn kɔkɔ ntɛm ara.",
    zu: "Ukuthumela kuthumela ifayela lakho kwithimba lokubuyekeza futhi likwazise ngokushesha.",
  },
  noChecklistYet: {
    en: "No checklist yet. Finish the intake conversation and it appears here.",
    ha: "Babu jerin abubuwa tukuna. Ka gama tattaunawar shiga sai ya bayyana a nan.",
    yo: "Kò tí ì sí àkọsílẹ̀ kankan. Parí ìjíròrò gbígbà-alábàáṣepọ̀ kí ó lè farahàn níbí.",
    ig: "Enweghị ndepụta ugbu a. Mechaa mkparịta ụka ntinye ka ọ pụta ebe a.",
    fr: "Pas encore de liste. Terminez la conversation d'accueil et elle apparaîtra ici.",
    pt: "Ainda sem lista. Termine a conversa de admissão e ela aparecerá aqui.",
    sw: "Hakuna orodha bado. Maliza mazungumzo ya kujiunga nayo itaonekana hapa.",
    ar: "لا توجد قائمة بعد. أنهِ محادثة الاستقبال وستظهر هنا.",
    tw: "Krataa nhyehyɛeɛ biara nnyi hɔ ɛnnora. Wie nkyerɛkyerɛmu nkɔmmɔdie no na ɛbɛpue wɔ ha.",
    zu: "Alukho uhlu okwamanje. Qedela ingxoxo yokuqalisa bese luvela lapha.",
  },
};
