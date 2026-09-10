import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The traveller's documents checklist screen. Three strings this page
 * renders live outside it because other screens share them:
 * `STATUS_COPY` and `VERIFIED_MEANS` (`@/lib/i18n/status`) and `UPLOADS`
 * (`@/lib/i18n/uploads`). All three are localised. A document's own
 * name, description and reason come from the database and stay in
 * English.
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
  /**
   * Mandatory copy, not a nicety. Decision 2 of 6 September made the AI
   * pre-check unconditional — no per-agency switch — so every traveller
   * on the platform has their document read by a machine, and there is
   * no configuration under which that is not true. Telling them is the
   * only thing that makes it honest, and it has to be said where they
   * upload rather than buried in terms.
   */
  precheckDisclosure: L;
  /**
   * The label on the disclosure that folds `intro`, `UPLOADS.guidance`
   * and `precheckDisclosure` away. It names what is inside rather than
   * the act of opening it — "Show more" would be a label for the
   * chevron, not for the three paragraphs behind it.
   */
  guidanceToggle: L;
  /**
   * "{pct}% collected" — the figure `CompletionRing` drew, kept at the
   * client's request when the ring itself came off this screen.
   *
   * The word travels with the number for the reason the ring's own
   * caption existed: a bare percentage on a documents screen reads as
   * "how far through the application am I", which it is not — it counts
   * files uploaded, not files verified and not a decision. It is also
   * translated here, which the ring's hardcoded English "collected"
   * never was.
   */
  collectedCount: L;
  /**
   * The single word inside the ring, under the figure. Separate from
   * `collectedCount` because the ring stacks the number and the word on
   * two lines, and the accessible name needs them as one sentence.
   */
  collectedCaption: L;
  needsAttention: L;
  stillToUpload: L;
  done: L;
  documentSingular: L;
  documentPlural: L;
  everythingVerifiedHeading: L;
  everythingVerifiedBody: L;
  /**
   * Everything uploaded, nothing reviewed yet — which is where a
   * traveller lands the moment they finish, and stays for as long as a
   * human queue takes. It had no copy at all: the ring counts
   * `collected` and read 100%, the panel beneath it was gated on
   * `verified` and rendered nothing, so finishing the checklist looked
   * exactly like doing nothing. `{count}` is the required total.
   */
  everythingCollectedHeading: L;
  everythingCollectedBody: L;
  /**
   * Sent, and confirmed on the screen rather than in a toast.
   *
   * `submissionNotice` picks this out of the statuses that can no longer
   * submit, because it is the only one the traveller reached by their
   * own click. Written in the present tense about what has actually
   * landed — the same discipline as `everythingCollectedBody` above, and
   * for the same reason: this is the screen's last word to somebody who
   * has just finished, and a sentence that overstates where their file
   * has got to is the one they will remember.
   */
  submittedHeading: L;
  submittedBody: L;
  /** `SubmitButton`, which is a client component and reads these through `useT`. */
  submitCta: L;
  submitPending: L;
  submitToast: L;
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
  precheckDisclosure: {
    en: "Every file you upload is checked by software first — it looks for photos that are too dark, cropped or out of date, so you hear about those in minutes rather than days. No one at Toplance reads your documents; only your agency does.",
    ha: "Ana duba kowace fayil da ka aika da software da farko — tana neman hotuna masu duhu, waɗanda aka yanke, ko waɗanda suka ƙare, don ka ji labari cikin mintuna maimakon kwanaki. Babu wanda ke Toplance da ke karanta takardunka; hukumarka kaɗai.",
    yo: "Sọ́fítíwéà ni ó kọ́kọ́ ń yẹ gbogbo fáìlì tí o bá gbé wọlé wò — ó ń wá àwọn fọ́tò tí ó ṣú, tí a gé, tàbí tí ó ti pé, kí o lè gbọ́ nípa wọn ní ìṣẹ́jú dípò ọjọ́. Kò sí ẹnìkan ní Toplance tí ó ń ka àwọn ìwé rẹ; ilé-iṣẹ́ rẹ nìkan ni.",
    ig: "A na-eburu ụzọ jiri sọftwia nyochaa faịlụ ọ bụla ị bugoro — ọ na-achọ foto gbara ọchịchịrị, nke a bipụrụ, ma ọ bụ nke gafeworo oge, ka ị nụ maka ha n'ime nkeji kama ụbọchị. Ọ dịghị onye nọ na Toplance na-agụ akwụkwọ gị; naanị ụlọ ọrụ gị.",
    fr: "Chaque fichier que vous envoyez est d'abord vérifié par un logiciel — il repère les photos trop sombres, mal cadrées ou périmées, pour que vous le sachiez en quelques minutes plutôt qu'en plusieurs jours. Personne chez Toplance ne lit vos documents ; seule votre agence le fait.",
    pt: "Cada ficheiro que envia é primeiro verificado por software — procura fotografias demasiado escuras, cortadas ou fora de validade, para que saiba em minutos em vez de dias. Ninguém na Toplance lê os seus documentos; apenas a sua agência.",
    sw: "Kila faili unalopakia hukaguliwa kwanza na programu — hutafuta picha zenye giza, zilizokatwa, au zilizopitwa na wakati, ili ujue ndani ya dakika badala ya siku. Hakuna mtu Toplance anayesoma nyaraka zako; wakala wako pekee.",
    ar: "يُفحَص كل ملف ترفعه بواسطة برنامج أولاً — يبحث عن الصور المظلمة أو المقصوصة أو منتهية الصلاحية، لتعرف ذلك خلال دقائق بدل أيام. لا أحد في Toplance يقرأ مستنداتك؛ وكالتك وحدها.",
    tw: "Software na edi kan hwɛ fael biara a wode ba — ɛhwehwɛ mfonini a esum, wɔatwa mu, anaa ne berɛ atwam, sɛdeɛ wobɛte wɔ simma mu na ɛnyɛ nna. Obiara nni Toplance a ɔkenkan wo nkrataa; wo ahyehyɛdeɛ nko ara.",
    zu: "Yonke ifayela olilayishayo lihlolwa kuqala isofthiwe — ifuna izithombe ezimnyama kakhulu, ezinqunyiwe, noma ezidlulelwe yisikhathi, ukuze uzwe ngazo ngemizuzu esikhundleni sezinsuku. Akekho e-Toplance ofunda amadokhumenti akho; inkampani yakho kuphela.",
  },
  guidanceToggle: {
    en: "How your files are checked",
    ha: "Yadda ake duba fayilolinku",
    yo: "Bí a ṣe ń yẹ àwọn fáìlì yín wò",
    ig: "Otú e si enyocha faịlụ gị",
    fr: "Comment vos fichiers sont vérifiés",
    pt: "Como os seus ficheiros são verificados",
    sw: "Jinsi faili zako zinavyokaguliwa",
    ar: "كيف تُفحَص ملفاتك",
    tw: "Sɛdeɛ wɔhwɛ wo fael ahoroɔ",
    zu: "Indlela amafayela akho ahlolwa ngayo",
  },
  collectedCount: {
    en: "{pct}% collected",
    ha: "An tattara {pct}%",
    yo: "{pct}% tí a ti kójọ",
    ig: "{pct}% anakọtara",
    fr: "{pct}% collectés",
    pt: "{pct}% recolhidos",
    sw: "{pct}% zimekusanywa",
    ar: "تم جمع {pct}%",
    tw: "Wɔaboaboa {pct}% ano",
    zu: "{pct}% okuqoqiwe",
  },
  collectedCaption: {
    en: "collected",
    ha: "an tattara",
    yo: "tí a kójọ",
    ig: "anakọtara",
    fr: "collectés",
    pt: "recolhidos",
    sw: "zimekusanywa",
    ar: "مجموعة",
    tw: "aboaboa ano",
    zu: "okuqoqiwe",
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
  everythingCollectedHeading: {
    en: "Everything is in",
    ha: "An samu komai",
    yo: "Ohun gbogbo ti dé",
    ig: "Ihe niile abatala",
    fr: "Tout est arrivé",
    pt: "Está tudo entregue",
    sw: "Kila kitu kimefika",
    ar: "وصل كل شيء",
    tw: "Biribiara aba",
    zu: "Konke sekufikile",
  },
  everythingCollectedBody: {
    en: "All {count} documents are with your reviewers. We will tell you here and by email as each one is checked — there is nothing for you to do right now.",
    ha: "Duk takardun {count} suna hannun masu dubawa. Za mu sanar da kai a nan da kuma ta imel yayin da aka duba kowanne — babu abin da ya rage a gare ka a yanzu.",
    yo: "Gbogbo ìwé {count} wà lọ́wọ́ àwọn olùyẹ̀wò rẹ. A ó sọ fún ọ níbí àti nípasẹ̀ ìmẹ́lì bí a ṣe ń yẹ ọ̀kọ̀ọ̀kan wò — kò sí ohun tí o ní láti ṣe ní báyìí.",
    ig: "Akwụkwọ {count} niile nọ n'aka ndị na-enyocha gị. Anyị ga-agwa gị ebe a na site na ozi-e ka a na-enyocha nke ọ bụla — o nweghị ihe ị ga-eme ugbu a.",
    fr: "Vos {count} documents sont entre les mains de vos examinateurs. Nous vous le dirons ici et par e-mail à mesure que chacun est vérifié — vous n'avez rien à faire pour l'instant.",
    pt: "Os seus {count} documentos estão com os revisores. Iremos avisá-lo aqui e por e-mail à medida que cada um for verificado — não há nada a fazer de momento.",
    sw: "Hati zako zote {count} ziko kwa wakaguzi wako. Tutakujulisha hapa na kwa barua pepe kila moja inapokaguliwa — hakuna cha kufanya kwa sasa.",
    ar: "جميع مستنداتك الـ {count} لدى المراجعين. سنخبرك هنا وبالبريد الإلكتروني عند التحقق من كل واحد — لا شيء عليك فعله الآن.",
    tw: "Wo nkrataa {count} nyinaa wɔ wo nhwehwɛmufoɔ nsam. Yɛbɛka akyerɛ wo wɔ ha ne email so bere a wɔhwɛ biara mu — biribiara nni hɔ a ɛsɛ sɛ woyɛ seesei.",
    zu: "Onke amadokhumenti akho angu-{count} asebahloli. Sizokwazisa lapha nangeposi-e njengoba ngalinye lihlolwa — akukho okumele ukwenze njengamanje.",
  },
  submittedHeading: {
    en: "Your application is with the review team",
    ha: "Aikace-aikacenka yana hannun ƙungiyar bitar",
    yo: "Ìbéèrè rẹ wà lọ́wọ́ ẹgbẹ́ àyẹ̀wò",
    ig: "Ngwa gị nọ n'aka ndị otu nyocha",
    fr: "Votre demande est entre les mains de l'équipe d'examen",
    pt: "O seu pedido está com a equipa de análise",
    sw: "Ombi lako liko na timu ya ukaguzi",
    ar: "طلبك الآن لدى فريق المراجعة",
    tw: "Wo abisadeɛ no wɔ nhwehwɛmufoɔ kuo no nsam",
    zu: "Isicelo sakho sikuthimba lokubuyekeza",
  },
  submittedBody: {
    en: "Your reviewers have been notified and are checking your documents now. We will tell you here and by email as soon as there is news — there is nothing for you to do right now.",
    ha: "An sanar da masu bitarka kuma suna duba takardunka yanzu. Za mu gaya maka a nan da kuma ta imel da zarar an sami labari — babu abin da za ka yi a yanzu.",
    yo: "A ti sọ fún àwọn olùyẹ̀wò rẹ, wọ́n sì ń yẹ àwọn ìwé rẹ wò báyìí. A ó sọ fún ọ níbí àti nípasẹ̀ ìméèlì bí ìròyìn bá dé — kò sí ohun tí o ní láti ṣe nísinsìnyí.",
    ig: "A gwaala ndị na-enyocha gị, ha na-elele akwụkwọ gị ugbu a. Anyị ga-agwa gị ebe a na site na email ozugbo akụkọ dị — o nweghị ihe ị ga-eme ugbu a.",
    fr: "Vos examinateurs ont été prévenus et vérifient vos documents. Nous vous informerons ici et par e-mail dès qu'il y aura du nouveau — vous n'avez rien à faire pour le moment.",
    pt: "Os seus analistas foram notificados e estão a verificar os seus documentos. Iremos informá-lo aqui e por e-mail assim que houver novidades — não há nada a fazer neste momento.",
    sw: "Wakaguzi wako wamearifiwa na wanakagua nyaraka zako sasa. Tutakuambia hapa na kwa barua pepe mara tu kutakapokuwa na habari — hakuna unachohitaji kufanya sasa.",
    ar: "تم إخطار المراجعين وهم يفحصون مستنداتك الآن. سنخبرك هنا وبالبريد الإلكتروني فور توفر أي جديد — لا يوجد ما عليك فعله الآن.",
    tw: "Yɛabɔ wo nhwehwɛmufoɔ amanneɛ na wɔrehwɛ wo nkrataa no seesei. Yɛbɛka akyerɛ wo wɔ ha ne email so bere a asɛm bi ba — biribiara nni hɔ a ɛsɛ sɛ woyɛ seesei.",
    zu: "Ababuyekezi bakho baziswe futhi bahlola amadokhumenti akho manje. Sizokutshela lapha nange-imeyili lapho kunezindaba — akukho okudingeka ukwenze manje.",
  },
  submitCta: {
    en: "Submit my application",
    ha: "Aika aikace-aikacena",
    yo: "Fi ìbéèrè mi ránṣẹ́",
    ig: "Zipu ngwa m",
    fr: "Envoyer ma demande",
    pt: "Enviar o meu pedido",
    sw: "Wasilisha ombi langu",
    ar: "إرسال طلبي",
    tw: "Fa me abisadeɛ kɔ",
    zu: "Thumela isicelo sami",
  },
  submitPending: {
    en: "Submitting…",
    ha: "Ana aikawa…",
    yo: "Ń fi ránṣẹ́…",
    ig: "Na-ezipu…",
    fr: "Envoi en cours…",
    pt: "A enviar…",
    sw: "Inawasilisha…",
    ar: "جارٍ الإرسال…",
    tw: "Ɛrekɔ…",
    zu: "Iyathumela…",
  },
  submitToast: {
    en: "Submitted — the review team has been notified",
    ha: "An aika — an sanar da ƙungiyar bitar",
    yo: "A ti fi ránṣẹ́ — a ti sọ fún ẹgbẹ́ àyẹ̀wò",
    ig: "Ezigala — a gwaala ndị otu nyocha",
    fr: "Envoyé — l'équipe d'examen a été prévenue",
    pt: "Enviado — a equipa de análise foi notificada",
    sw: "Imewasilishwa — timu ya ukaguzi imearifiwa",
    ar: "أُرسل — تم إخطار فريق المراجعة",
    tw: "Wɔde akɔ — yɛabɔ nhwehwɛmufoɔ kuo no amanneɛ",
    zu: "Kuthunyelwe — ithimba lokubuyekeza lisaziwe",
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
