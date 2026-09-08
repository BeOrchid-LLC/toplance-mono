import type { Locale } from "@/lib/i18n/locales";
import type {
  ApplicationStatus,
  DocumentState,
  InvitationStatus,
} from "@/lib/domain/status";

type L = Record<Locale, string>;

/**
 * The words on every status pill in the product, in all ten languages.
 *
 * These used to be plain `string`s on `STATUS`, `DOC_STATE` and
 * `INVITATION_STATUS` in `@/lib/domain/status`, while every other string
 * the interface renders is a `Record<Locale, string>` under this
 * directory. That is a worse bug than it looks: a status pill is on the
 * traveller's own dashboard, their documents screen and their case
 * history, so a Hausa or Yoruba reader who had chosen their language
 * still read "Under review" in English on the one screen that tells them
 * where their application actually is.
 *
 * `VERIFIED_MEANS` came across with them — it is prose rather than a
 * pill, but it exists to explain the `verified` label and belongs beside
 * it. `UPLOADS` (`@/lib/i18n/uploads`) took the upload guidance the same
 * way.
 *
 * Split by what changes and why, not by what renders together. Colour
 * (`variant`) stays in the domain module: it was locked with the client
 * on 2026-08-21, it is identical for every reader, and keeping it there
 * lets that module stay free of any locale argument. The words live
 * here, keyed the same way, so `STATUS_VARIANT[s]` and `STATUS_COPY[s]`
 * are read side by side at one call site.
 *
 * Exhaustiveness is the point of the `Record<ApplicationStatus, …>`
 * annotations: adding a status to the `application_status` enum breaks
 * the build here until its ten translations exist, exactly as it breaks
 * `STATUS_VARIANT` until it has a colour.
 *
 * English values are exactly the copy these pills already had. Every
 * other locale was translated in-house from that English, the same way
 * `HERO` and `OPS_COMMON` were.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const STATUS_COPY: Record<
  ApplicationStatus,
  { label: L; short: L; blurb: L }
> = {
  draft: {
    label: {
      en: "Not started",
      ha: "Ba a fara ba",
      yo: "Kò tí ì bẹ̀rẹ̀",
      ig: "Amalitebeghị",
      fr: "Pas commencé",
      pt: "Não iniciado",
      sw: "Haijaanza",
      ar: "لم يبدأ",
      tw: "Amfiri aseɛ",
      zu: "Akuqalwanga",
    },
    short: {
      en: "Not started",
      ha: "Ba a fara ba",
      yo: "Kò tí ì bẹ̀rẹ̀",
      ig: "Amalitebeghị",
      fr: "Pas commencé",
      pt: "Não iniciado",
      sw: "Haijaanza",
      ar: "لم يبدأ",
      tw: "Amfiri aseɛ",
      zu: "Akuqalwanga",
    },
    blurb: {
      en: "Not started yet. Nothing has been sent anywhere.",
      ha: "Ba a fara ba tukuna. Ba a aika komai ko'ina ba.",
      yo: "Kò tí ì bẹ̀rẹ̀. A kò tí ì fi ohunkóhun ránṣẹ́ sí ibikíbi.",
      ig: "Amalitebeghị ya. E zigabeghị ihe ọ bụla ebe ọ bụla.",
      fr: "Pas encore commencé. Rien n'a été envoyé nulle part.",
      pt: "Ainda não começou. Nada foi enviado para lado nenhum.",
      sw: "Bado haijaanza. Hakuna kilichotumwa popote.",
      ar: "لم يبدأ بعد. لم يُرسَل أي شيء إلى أي جهة.",
      tw: "Ɛmfirii aseɛ. Wɔmfaa hwee nkɔɔ baabiara.",
      zu: "Akukaqali. Akukho okuthunyelwe ndawo.",
    },
  },
  collecting_documents: {
    label: {
      en: "In progress",
      ha: "Ana ci gaba",
      yo: "Ń lọ lọ́wọ́",
      ig: "Na-aga n'ihu",
      fr: "En cours",
      pt: "Em curso",
      sw: "Inaendelea",
      ar: "قيد التنفيذ",
      tw: "Ɛrekɔ so",
      zu: "Kuyaqhubeka",
    },
    short: {
      en: "In progress",
      ha: "Ana ci gaba",
      yo: "Ń lọ lọ́wọ́",
      ig: "Na-aga n'ihu",
      fr: "En cours",
      pt: "Em curso",
      sw: "Inaendelea",
      ar: "قيد التنفيذ",
      tw: "Ɛrekɔ so",
      zu: "Kuyaqhubeka",
    },
    blurb: {
      en: "Your checklist is ready. Upload each file and we check it as it arrives.",
      ha: "Jerin takardunka ya shirya. Ɗora kowace takarda, mu kuma duba ta yayin da ta iso.",
      yo: "Àkọsílẹ̀ ìwé rẹ ti ṣetán. Gbé ìwé kọ̀ọ̀kan sókè, a ó sì ṣàyẹ̀wò rẹ̀ bí ó ṣe ń dé.",
      ig: "Ndepụta gị adịla njikere. Bugoo akwụkwọ ọ bụla, anyị na-enyocha ya ka ọ na-abịa.",
      fr: "Votre liste est prête. Déposez chaque fichier et nous le vérifions dès son arrivée.",
      pt: "A sua lista está pronta. Carregue cada ficheiro e verificamo-lo à medida que chega.",
      sw: "Orodha yako iko tayari. Pakia kila faili, nasi tunaikagua inapowasili.",
      ar: "قائمتك جاهزة. ارفع كل ملف وسنفحصه فور وصوله.",
      tw: "Wo nkrataa nhyehyɛeɛ no asiesie. Fa krataa biara to so na yɛhwɛ mu berɛ a ɛduru.",
      zu: "Uhlu lwakho selulungile. Layisha ifayela ngalinye, silihlole njengoba lifika.",
    },
  },
  submitted: {
    label: {
      en: "Submitted",
      ha: "An aika",
      yo: "A ti fi ránṣẹ́",
      ig: "Ezigala",
      fr: "Envoyé",
      pt: "Enviado",
      sw: "Imewasilishwa",
      ar: "أُرسل",
      tw: "Wɔde akɔma",
      zu: "Kuthunyelwe",
    },
    short: {
      en: "Submitted",
      ha: "An aika",
      yo: "A ti fi ránṣẹ́",
      ig: "Ezigala",
      fr: "Envoyé",
      pt: "Enviado",
      sw: "Imewasilishwa",
      ar: "أُرسل",
      tw: "Wɔde akɔma",
      zu: "Kuthunyelwe",
    },
    blurb: {
      en: "Everything is in and the file has gone to our review team.",
      ha: "Komai ya cika, kuma an tura fayil ɗin zuwa ƙungiyar bita tamu.",
      yo: "Gbogbo rẹ̀ ti wọlé, ìwé náà sì ti lọ sí ọ̀dọ̀ ẹgbẹ́ àyẹ̀wò wa.",
      ig: "Ihe niile abanyela, akwụkwọ ahụ agakwaala n'aka ndị nyocha anyị.",
      fr: "Tout est arrivé et le dossier est parti chez notre équipe d'examen.",
      pt: "Está tudo entregue e o processo seguiu para a nossa equipa de revisão.",
      sw: "Kila kitu kimewasili na jalada limeenda kwa timu yetu ya ukaguzi.",
      ar: "اكتمل كل شيء وانتقل الملف إلى فريق المراجعة لدينا.",
      tw: "Biribiara aba mu na krataa no akɔ yɛn nhwehwɛmu kuo no hɔ.",
      zu: "Konke sekungenile futhi ifayela seliye ethimbeni lethu lokubuyekeza.",
    },
  },
  under_review: {
    label: {
      en: "Under review",
      ha: "Ana bita",
      yo: "Ń bẹ lábẹ́ àyẹ̀wò",
      ig: "A na-enyocha",
      fr: "En cours d'examen",
      pt: "Em revisão",
      sw: "Inakaguliwa",
      ar: "قيد المراجعة",
      tw: "Wɔrehwɛ mu",
      zu: "Kuyabuyekezwa",
    },
    short: {
      en: "Reviewing",
      ha: "Ana bita",
      yo: "Ń ṣàyẹ̀wò",
      ig: "Na-enyocha",
      fr: "Examen",
      pt: "A rever",
      sw: "Inakaguliwa",
      ar: "مراجعة",
      tw: "Nhwehwɛmu",
      zu: "Kubuyekezwa",
    },
    blurb: {
      en: "A named case handler has your file open.",
      ha: "Wani ma'aikacin shari'a da aka sanya wa suna yana kan fayil ɗinka.",
      yo: "Olùdarí ẹjọ́ kan tí a dárúkọ ti ṣí ìwé rẹ.",
      ig: "Onye na-ahụ maka ikpe a kpọrọ aha emeghela akwụkwọ gị.",
      fr: "Un gestionnaire de dossier nommément désigné a votre dossier sous les yeux.",
      pt: "Um gestor de processo com nome próprio tem o seu processo aberto.",
      sw: "Mshughulikiaji wa kesi aliyetajwa kwa jina amefungua jalada lako.",
      ar: "مسؤول حالة محدَّد بالاسم يطّلع على ملفك الآن.",
      tw: "Asɛm ho ɔhwɛfoɔ a wɔabɔ ne din abue wo krataa no.",
      zu: "Umphathi wecala oqanjwe ngegama ulivulile ifayela lakho.",
    },
  },
  /**
   * "With the embassy", not "Processing" — chosen with the client on 7
   * September over their own first word for it. The pill's whole job on
   * this screen is to answer "who is holding this now", and the product
   * already spends "In progress" on `collecting_documents` and "Under
   * review" on `under_review`. A third near-synonym would have told a
   * traveller that something, somewhere, was happening.
   *
   * The blurb says there is nothing for them to do, because the most
   * common thing a traveller does at this point is upload another
   * document nobody asked for.
   */
  processing: {
    label: {
      en: "With the embassy",
      ha: "Yana hannun ofishin jakadanci",
      yo: "Ó wà lọ́wọ́ ilé-iṣẹ́ aṣojú orílẹ̀-èdè",
      ig: "Ọ nọ n'aka ụlọ ọrụ nnọchiteanya",
      fr: "À l'ambassade",
      pt: "Na embaixada",
      sw: "Iko ubalozini",
      ar: "لدى السفارة",
      tw: "Ɛwɔ ɔmanpanin asoeɛ hɔ",
      zu: "Kusenxusweni",
    },
    short: {
      en: "At embassy",
      ha: "A ofishin jakadanci",
      yo: "Ní ilé aṣojú",
      ig: "N'ụlọ nnọchiteanya",
      fr: "Ambassade",
      pt: "Na embaixada",
      sw: "Ubalozini",
      ar: "في السفارة",
      tw: "Asoeɛ hɔ",
      zu: "Enxusweni",
    },
    blurb: {
      en: "Your agency has sent your application to the embassy. There is nothing for you to do while they decide.",
      ha: "Hukumarka ta aika da takardar neman ka zuwa ofishin jakadanci. Ba abin da za ka yi yayin da suke yanke shawara.",
      yo: "Ilé-iṣẹ́ rẹ ti fi ìbéèrè rẹ ránṣẹ́ sí ilé-iṣẹ́ aṣojú orílẹ̀-èdè. Kò sí ohun tí o ní láti ṣe nígbà tí wọ́n ń pinnu.",
      ig: "Ụlọ ọrụ gị ezigala arịrịọ gị n'ụlọ ọrụ nnọchiteanya. Ọ dịghị ihe ị ga-eme mgbe ha na-ekpebi.",
      fr: "Votre agence a transmis votre demande à l'ambassade. Vous n'avez rien à faire pendant qu'ils décident.",
      pt: "A sua agência enviou o seu pedido para a embaixada. Não tem nada a fazer enquanto eles decidem.",
      sw: "Wakala wako ametuma ombi lako ubalozini. Hakuna cha kufanya wakati wanaamua.",
      ar: "أرسلت وكالتك طلبك إلى السفارة. لا شيء عليك فعله ريثما يبتّون فيه.",
      tw: "W'adwumakuo no de wo abisadeɛ no akɔ ɔmanpanin asoeɛ hɔ. Biribiara nni hɔ a ɛsɛ sɛ woyɛ ɛberɛ a wɔresi gyinaeɛ.",
      zu: "I-ejensi yakho ithumele isicelo sakho enxusweni. Akukho okumele ukwenze ngenkathi benquma.",
    },
  },
  additional_documents: {
    label: {
      en: "Additional documents needed",
      ha: "Ana buƙatar ƙarin takardu",
      yo: "A nílò àwọn ìwé kún un",
      ig: "Achọrọ akwụkwọ ọzọ",
      fr: "Documents supplémentaires requis",
      pt: "São necessários documentos adicionais",
      sw: "Nyaraka za ziada zinahitajika",
      ar: "مطلوب مستندات إضافية",
      tw: "Wɔhia nkrataa foforɔ",
      zu: "Kudingeka amanye amadokhumenti",
    },
    short: {
      en: "More docs needed",
      ha: "Ƙarin takardu",
      yo: "Ìwé kún un",
      ig: "Akwụkwọ ọzọ",
      fr: "Docs en plus",
      pt: "Mais documentos",
      sw: "Nyaraka zaidi",
      ar: "مستندات إضافية",
      tw: "Nkrataa foforɔ",
      zu: "Amanye amadokhumenti",
    },
    blurb: {
      en: "Something needs replacing before this can go further. We have told you which.",
      ha: "Akwai abin da ya kamata a maye gurbinsa kafin wannan ya ci gaba. Mun sanar da kai wanne ne.",
      yo: "Ohun kan wà tí ó gbọ́dọ̀ rọ́pò kí èyí tó lè tẹ̀síwájú. A ti sọ èyí tí ó jẹ́ fún ọ.",
      ig: "Enwere ihe a ga-edochi tupu nke a agaa n'ihu. Anyị agwala gị nke ọ bụ.",
      fr: "Un document doit être remplacé avant que le dossier puisse avancer. Nous vous avons dit lequel.",
      pt: "Há algo que precisa de ser substituído antes de isto poder avançar. Já lhe dissemos o quê.",
      sw: "Kuna kitu kinachohitaji kubadilishwa kabla hii haijaendelea. Tumekwambia ni kipi.",
      ar: "هناك مستند يجب استبداله قبل أن يمضي هذا قدماً. وقد أخبرناك أيّه.",
      tw: "Biribi wɔ hɔ a ɛsɛ sɛ wɔsesa ansa na yei atumi akɔ so. Yɛaka deɛ ɛyɛ akyerɛ wo.",
      zu: "Kukhona okudinga ukushintshwa ngaphambi kokuba lokhu kuqhubeke. Sesikutshelile ukuthi yikuphi.",
    },
  },
  approved: {
    label: {
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
    short: {
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
    blurb: {
      en: "Congratulations. Your arrival plan is now in the app.",
      ha: "Barka da warhaka. Shirin isowarka yanzu yana cikin manhajar.",
      yo: "Ẹ kú oríire. Ètò ìdé rẹ ti wà nínú ohun-èlò náà báyìí.",
      ig: "Ekele. Atụmatụ ọbịbịa gị dị ugbu a n'ime ngwa a.",
      fr: "Félicitations. Votre plan d'arrivée est désormais dans l'application.",
      pt: "Parabéns. O seu plano de chegada já está na aplicação.",
      sw: "Hongera. Mpango wako wa kuwasili sasa uko ndani ya programu.",
      ar: "تهانينا. أصبحت خطة وصولك الآن داخل التطبيق.",
      tw: "Ayɛkoo. Wo adurueɛ nhyehyɛeɛ no wɔ app no mu seesei.",
      zu: "Halala. Uhlelo lwakho lokufika manje selusohlelweni lokusebenza.",
    },
  },
  rejected: {
    label: {
      en: "Rejected",
      ha: "An ƙi",
      yo: "A ti kọ̀ ọ́",
      ig: "Ajụrụ ya",
      fr: "Refusé",
      pt: "Recusado",
      sw: "Imekataliwa",
      ar: "مرفوض",
      tw: "Wɔapo",
      zu: "Kwenqatshiwe",
    },
    short: {
      en: "Rejected",
      ha: "An ƙi",
      yo: "A ti kọ̀ ọ́",
      ig: "Ajụrụ ya",
      fr: "Refusé",
      pt: "Recusado",
      sw: "Imekataliwa",
      ar: "مرفوض",
      tw: "Wɔapo",
      zu: "Kwenqatshiwe",
    },
    blurb: {
      en: "The mission declined this application. Your handler will talk you through why.",
      ha: "Ofishin jakadancin ya ƙi wannan buƙatar. Ma'aikacin shari'arka zai bayyana maka dalilin.",
      yo: "Ilé-iṣẹ́ aṣojú ìjọba kọ ìbéèrè yìí. Olùdarí ẹjọ́ rẹ yóò ṣàlàyé ìdí rẹ̀ fún ọ.",
      ig: "Ụlọ ọrụ nnọchiteanya jụrụ arịrịọ a. Onye na-ahụ maka ikpe gị ga-akọwara gị ihe kpatara ya.",
      fr: "La mission diplomatique a refusé cette demande. Votre gestionnaire vous en expliquera les raisons.",
      pt: "A missão diplomática recusou este pedido. O seu gestor vai explicar-lhe porquê.",
      sw: "Ubalozi umekataa ombi hili. Mshughulikiaji wako atakueleza sababu.",
      ar: "رفضت البعثة الدبلوماسية هذا الطلب. وسيشرح لك مسؤول حالتك السبب.",
      tw: "Amanaman ntam asoɛe no apo saa abisadeɛ yi. Wo asɛm ho ɔhwɛfoɔ bɛkyerɛkyerɛ deɛ enti mu akyerɛ wo.",
      zu: "Inxusa lenqabile lesi sicelo. Umphathi wakho uzokuchazela ukuthi kungani.",
    },
  },
};

/**
 * The checklist's own pill — the state of one uploaded document rather
 * than of the whole case.
 *
 * No `short` here for the same reason `DOC_STATE_VARIANT` never had one:
 * these sit in a table cell beside the document's name, and the name is
 * what the column is read for. "Needs re-upload" is deliberately an
 * instruction rather than a verdict ("Rejected"), because it is the one
 * document state the traveller can still do something about.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const DOC_STATE_COPY: Record<DocumentState, { label: L }> = {
  not_started: {
    label: {
      en: "Not started",
      ha: "Ba a fara ba",
      yo: "Kò tí ì bẹ̀rẹ̀",
      ig: "Amalitebeghị",
      fr: "Pas commencé",
      pt: "Não iniciado",
      sw: "Haijaanza",
      ar: "لم يبدأ",
      tw: "Amfiri aseɛ",
      zu: "Akuqalwanga",
    },
  },
  uploaded: {
    label: {
      en: "Uploaded",
      ha: "An ɗora",
      yo: "A ti gbé e sókè",
      ig: "Ebugoro ya",
      fr: "Déposé",
      pt: "Carregado",
      sw: "Imepakiwa",
      ar: "تم الرفع",
      tw: "Wɔde ato so",
      zu: "Kulayishiwe",
    },
  },
  checking: {
    label: {
      en: "Checking",
      ha: "Ana dubawa",
      yo: "Ń ṣàyẹ̀wò",
      ig: "Na-enyocha",
      fr: "Vérification",
      pt: "A verificar",
      sw: "Inakaguliwa",
      ar: "جارٍ الفحص",
      tw: "Wɔrehwɛ mu",
      zu: "Kuyahlolwa",
    },
  },
  verified: {
    label: {
      en: "Verified",
      ha: "An tabbatar",
      yo: "A ti fìdí rẹ̀ múlẹ̀",
      ig: "Enyochala ya",
      fr: "Vérifié",
      pt: "Verificado",
      sw: "Imethibitishwa",
      ar: "تم التحقق",
      tw: "Wɔahwɛ mu",
      zu: "Kuqinisekisiwe",
    },
  },
  flagged: {
    label: {
      en: "Needs re-upload",
      ha: "Ana buƙatar sake ɗorawa",
      yo: "Ó nílò kí a tún gbé e sókè",
      ig: "Achọrọ ibugoghachi ya",
      fr: "À redéposer",
      pt: "É preciso carregar de novo",
      sw: "Inahitaji kupakiwa upya",
      ar: "يلزم رفعه من جديد",
      tw: "Ɛsɛ sɛ wɔsan de to so",
      zu: "Kudingeka ilayishwe kabusha",
    },
  },
  failed: {
    label: {
      en: "Upload failed",
      ha: "Ɗorawa ta gaza",
      yo: "Gbígbé sókè kùnà",
      ig: "Nbugo dara",
      fr: "Échec du dépôt",
      pt: "Falha ao carregar",
      sw: "Kupakia kumeshindikana",
      ar: "فشل الرفع",
      tw: "Wɔantumi amfa anto so",
      zu: "Ukulayisha kuhlulekile",
    },
  },
};

/**
 * The roster's other pill. `expired` is a status `listInvitations`
 * computes on read (a `pending` row past `expiresAt`) and
 * `acceptInvitationTx` later writes for real — both paths land on this
 * same key, so the pill reads correctly either way.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const INVITATION_STATUS_COPY: Record<InvitationStatus, { label: L }> = {
  pending: {
    label: {
      en: "Pending",
      ha: "Ana jira",
      yo: "Ń dúró de ìdáhùn",
      ig: "Na-echere",
      fr: "En attente",
      pt: "Pendente",
      sw: "Inasubiri",
      ar: "قيد الانتظار",
      tw: "Ɛretwɛn",
      zu: "Kusalindile",
    },
  },
  accepted: {
    label: {
      en: "Accepted",
      ha: "An karɓa",
      yo: "A ti gbà á",
      ig: "Anabatara ya",
      fr: "Acceptée",
      pt: "Aceite",
      sw: "Imekubaliwa",
      ar: "مقبولة",
      tw: "Wɔagye atom",
      zu: "Kwamukelwe",
    },
  },
  expired: {
    label: {
      en: "Expired",
      ha: "Ya ƙare",
      yo: "Ó ti pé",
      ig: "Oge agwụla",
      fr: "Expirée",
      pt: "Expirada",
      sw: "Muda umeisha",
      ar: "منتهية الصلاحية",
      tw: "Ne berɛ atwam",
      zu: "Iphelelwe yisikhathi",
    },
  },
  revoked: {
    label: {
      en: "Revoked",
      ha: "An janye",
      yo: "A ti fagi lé e",
      ig: "Ewepụrụ ya",
      fr: "Révoquée",
      pt: "Revogada",
      sw: "Imetenguliwa",
      ar: "مُلغاة",
      tw: "Wɔatwe asan",
      zu: "Ihoxisiwe",
    },
  },
};

/**
 * Deliberate wording, agreed with the client: verified means a document
 * has been accepted for review. It is never a promise of approval, and
 * no copy anywhere in the product should imply otherwise. AI resolves the
 * checklist and triages uploads — the accept/reject call is always a
 * human handler's.
 *
 * That promise only holds if every reader gets it, which is why this
 * moved out of `@/lib/domain/status`: it was one English sentence under
 * a pill that now reads in ten languages, on the two screens where a
 * traveller is most likely to mistake a green badge for a decision.
 *
 * Each translation opens by quoting its own `DOC_STATE_COPY.verified`
 * label — the sentence exists to explain that word, so the two have to
 * be the same word.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const VERIFIED_MEANS: L = {
  en: "Verified means accepted for review — not that your visa has been approved.",
  ha: "\"An tabbatar\" yana nufin an karɓi takardar don a yi bita — ba yana nufin an amince da bizarka ba.",
  yo: "\"A ti fìdí rẹ̀ múlẹ̀\" túmọ̀ sí pé a ti gba ìwé náà fún àyẹ̀wò — kì í ṣe pé a ti fọwọ́ sí fisa rẹ.",
  ig: "\"Enyochala ya\" pụtara na anabatara akwụkwọ ahụ maka nyocha — ọ pụtaghị na akwadoro visa gị.",
  fr: "« Vérifié » signifie accepté pour examen — pas que votre visa a été approuvé.",
  pt: "«Verificado» significa aceite para revisão — não que o seu visto foi aprovado.",
  sw: "\"Imethibitishwa\" maana yake hati imekubaliwa kwa ukaguzi — si kwamba viza yako imeidhinishwa.",
  ar: "«تم التحقق» تعني أن المستند قُبل للمراجعة — لا أن تأشيرتك اعتُمدت.",
  tw: "\"Wɔahwɛ mu\" kyerɛ sɛ wɔagye krataa no atom ama nhwehwɛmu — ɛnkyerɛ sɛ wɔapene wo visa so.",
  zu: "\"Kuqinisekisiwe\" kusho ukuthi idokhumenti yamukelwe ukuze ibuyekezwe — hhayi ukuthi ivisa yakho igunyaziwe.",
};
