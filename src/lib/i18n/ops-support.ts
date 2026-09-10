import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The support queue, on both sides of it.
 *
 * One dictionary rather than two, because the agency's form and the
 * operator's queue name the same three states and would otherwise drift
 * into describing one thing with two vocabularies — the drift
 * `ops-nav.ts` was written to prevent.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, as `ops-common.ts` and `hero.ts` were.
 */
export const OPS_SUPPORT: {
  heading: L;
  intro: L;
  panel: L;
  empty: L;
  requestsWord: L;
  searchPlaceholder: L;
  anyState: L;
  stateOpen: L;
  stateClaimed: L;
  stateResolved: L;
  tableHead: { agency: L; subject: L; raised: L; state: L; assignee: L; actions: L };
  claim: L;
  release: L;
  resolve: L;
  unassigned: L;
  notFound: L;
  agencyHeading: L;
  agencyLead: L;
  subjectLabel: L;
  bodyLabel: L;
  bodyPlaceholder: L;
  send: L;
  sent: L;
  yourRequests: L;
  noneYet: L;
  needsSubject: L;
  needsBody: L;
  threadClosed: L;
  threadLabel: L;
  replyLabel: L;
  replyPlaceholder: L;
  replySend: L;
  replySent: L;
  fromUs: L;
  fromAgency: L;
  chatAction: L;
  backToQueue: L;
  backToSupport: L;
  resolvedNote: L;
  aboutCase: L;
  askAboutCase: L;
  askAboutCaseLead: L;
  markResolved: L;
  resolvedToast: L;
} = {
  heading: {
    en: "Support",
    ha: "Tallafi",
    yo: "Ìrànlọ́wọ́",
    ig: "Nkwado",
    fr: "Assistance",
    pt: "Apoio",
    sw: "Msaada",
    ar: "الدعم",
    tw: "Mmoa",
    zu: "Usekelo",
  },
  intro: {
    en: "Agencies that have asked for help, and who is answering them.",
    ha: "Hukumomin da suka nemi taimako, da wanda ke amsa musu.",
    yo: "Àwọn ilé-iṣẹ́ tí wọ́n béèrè ìrànlọ́wọ́, àti ẹni tí ó ń dáhùn.",
    ig: "Ụlọ ọrụ rịọrọ enyemaka, na onye na-aza ha.",
    fr: "Les agences qui ont demandé de l'aide, et qui leur répond.",
    pt: "Agências que pediram ajuda, e quem lhes responde.",
    sw: "Mawakala walioomba msaada, na nani anayewajibu.",
    ar: "الوكالات التي طلبت المساعدة، ومن يرد عليها.",
    tw: "Adwumakuo a wɔabisa mmoa, ne obi a ɔrebua wɔn.",
    zu: "Ama-ejensi acele usizo, nokuthi ubani obaphendulayo.",
  },
  panel: {
    en: "Support requests",
    ha: "Buƙatun tallafi",
    yo: "Àwọn ìbéèrè ìrànlọ́wọ́",
    ig: "Arịrịọ nkwado",
    fr: "Demandes d'assistance",
    pt: "Pedidos de apoio",
    sw: "Maombi ya msaada",
    ar: "طلبات الدعم",
    tw: "Mmoa abisadeɛ",
    zu: "Izicelo zosekelo",
  },
  empty: {
    en: "No agency has asked for help yet.",
    ha: "Babu hukumar da ta nemi taimako tukuna.",
    yo: "Kò sí ilé-iṣẹ́ tí ó béèrè ìrànlọ́wọ́ síbẹ̀.",
    ig: "Ọ dịghị ụlọ ọrụ rịọrọ enyemaka ka ugbu a.",
    fr: "Aucune agence n'a encore demandé d'aide.",
    pt: "Nenhuma agência pediu ajuda ainda.",
    sw: "Hakuna wakala aliyeomba msaada bado.",
    ar: "لم تطلب أي وكالة المساعدة بعد.",
    tw: "Adwumakuo biara nnbisaa mmoa ɛ.",
    zu: "Ayikho i-ejensi ecele usizo okwamanje.",
  },
  requestsWord: {
    en: "requests", ha: "buƙatu", yo: "ìbéèrè", ig: "arịrịọ", fr: "demandes",
    pt: "pedidos", sw: "maombi", ar: "طلبات", tw: "abisadeɛ", zu: "izicelo",
  },
  searchPlaceholder: {
    en: "Search by agency or subject",
    ha: "Nemo ta hukuma ko batu",
    yo: "Wá nípa ilé-iṣẹ́ tàbí àkòrí",
    ig: "Chọọ site na ụlọ ọrụ ma ọ bụ isiokwu",
    fr: "Rechercher par agence ou sujet",
    pt: "Pesquisar por agência ou assunto",
    sw: "Tafuta kwa wakala au mada",
    ar: "ابحث حسب الوكالة أو الموضوع",
    tw: "Hwehwɛ adwumakuo anaa asɛmti so",
    zu: "Sesha nge-ejensi noma isihloko",
  },
  /**
   * "All requests", not "Any state" — renamed 2026-09-10 at the
   * client's request. Same nouns as `requestsWord`, so the closed
   * dropdown and the count badge beside it speak of the same thing.
   */
  anyState: {
    en: "All requests", ha: "Duk buƙatu", yo: "Gbogbo ìbéèrè", ig: "Arịrịọ niile",
    fr: "Toutes les demandes", pt: "Todos os pedidos", sw: "Maombi yote",
    ar: "كل الطلبات", tw: "Abisadeɛ nyinaa", zu: "Zonke izicelo",
  },
  stateOpen: {
    en: "Open", ha: "A buɗe", yo: "Ṣí sílẹ̀", ig: "Emeghere", fr: "Ouverte",
    pt: "Aberto", sw: "Wazi", ar: "مفتوح", tw: "Abue", zu: "Kuvuliwe",
  },
  /**
   * "In progress", not "Claimed" — renamed 2026-09-10 with `claim` and
   * `tableHead.assignee`, which are the same vocabulary and had to move
   * together. The client's objection was to the metaphor: claiming
   * reads like a dispute someone has called a mediator to, when all
   * that has happened is a colleague picking the ticket up.
   *
   * The state says what is happening to the ticket, and the assignee
   * column beside it says who. The two used to overlap — "Claimed" and
   * a name — which is the drift the note at the top of this file warns
   * about.
   *
   * The key stays `stateClaimed`: `claimed` is the value in the
   * database and in `STATE_LABEL`, and renaming the word on the pill is
   * not a migration.
   */
  stateClaimed: {
    en: "In progress", ha: "Ana kan aiki", yo: "Ó ń lọ lọ́wọ́", ig: "Na-aga n'ihu", fr: "En cours",
    pt: "Em curso", sw: "Inaendelea", ar: "قيد التنفيذ", tw: "Ɛrekɔ so", zu: "Kuyaqhubeka",
  },
  stateResolved: {
    en: "Resolved", ha: "An warware", yo: "A yanjú", ig: "Edoziela", fr: "Résolue",
    pt: "Resolvido", sw: "Imetatuliwa", ar: "تم الحل", tw: "Wɔasiesie", zu: "Kuxazululiwe",
  },
  tableHead: {
    agency: {
      en: "Agency", ha: "Hukuma", yo: "Ilé-iṣẹ́", ig: "Ụlọ ọrụ", fr: "Agence",
      pt: "Agência", sw: "Wakala", ar: "الوكالة", tw: "Adwumakuo", zu: "I-ejensi",
    },
    subject: {
      en: "Subject", ha: "Batu", yo: "Àkòrí", ig: "Isiokwu", fr: "Sujet",
      pt: "Assunto", sw: "Mada", ar: "الموضوع", tw: "Asɛmti", zu: "Isihloko",
    },
    raised: {
      en: "Raised", ha: "An ɗaga", yo: "A gbé dìde", ig: "Ewelitere", fr: "Soumise",
      pt: "Enviado", sw: "Iliwasilishwa", ar: "أُرسل", tw: "Wɔde bae", zu: "Kufakwe",
    },
    state: {
      en: "Status", ha: "Matsayi", yo: "Ipò", ig: "Ọnọdụ", fr: "Statut",
      pt: "Estado", sw: "Hali", ar: "الحالة", tw: "Tebea", zu: "Isimo",
    },
    /**
     * "Assignee", not "With" — the key was already `assignee` and only
     * the word disagreed. A one-word preposition as a column head reads
     * as a fragment of the sentence in the cell rather than a label for
     * the column, which is why several locales had to translate it as
     * one ("Ku-", "Wɔ").
     */
    assignee: {
      en: "Assignee", ha: "Wanda aka ba", yo: "Ẹni tí a yàn", ig: "Onye e kenyere", fr: "Responsable",
      pt: "Responsável", sw: "Aliyekabidhiwa", ar: "المسؤول", tw: "Deɛ wɔde ama", zu: "Obelwe",
    },
    actions: {
      en: "Actions", ha: "Ayyuka", yo: "Ìṣe", ig: "Omume", fr: "Actions",
      pt: "Ações", sw: "Vitendo", ar: "إجراءات", tw: "Nneyɛe", zu: "Izenzo",
    },
  },
  /**
   * "Assign to me" — the act named from the presser's side, so the
   * button and the `Assignee` column it fills use one word. Portuguese
   * already read "Atribuir a mim" and is unchanged; it had arrived at
   * the same phrasing on its own.
   *
   * It sits beside `release` ("Hand back"), which is its undo and
   * commits on the click — nothing is taken away by picking a ticket
   * up, so neither of these confirms.
   */
  claim: {
    en: "Assign to me", ha: "Ba ni wannan", yo: "Yàn án fún mi", ig: "Kenye m ya", fr: "M'attribuer",
    pt: "Atribuir a mim", sw: "Nikabidhi mimi", ar: "إسناد إليّ", tw: "Fa ma me", zu: "Ngabele mina",
  },
  release: {
    en: "Hand back", ha: "Mayar", yo: "Dá padà", ig: "Nyeghachi", fr: "Rendre",
    pt: "Devolver", sw: "Rudisha", ar: "إعادة", tw: "Fa san ma", zu: "Buyisela",
  },
  resolve: {
    en: "Mark resolved", ha: "Yiwa alama an warware", yo: "Sàmì pé a yanjú",
    ig: "Kaa ya edoziela", fr: "Marquer comme résolue", pt: "Marcar como resolvido",
    sw: "Weka kuwa imetatuliwa", ar: "وضع علامة تم الحل", tw: "Hyɛ no sɛ wɔasiesie",
    zu: "Maka njengexazululiwe",
  },
  unassigned: {
    en: "Nobody yet", ha: "Babu kowa tukuna", yo: "Kò sí ẹnìkan síbẹ̀",
    ig: "Ọ dịghị onye ka ugbu a", fr: "Personne encore", pt: "Ninguém ainda",
    sw: "Hakuna bado", ar: "لا أحد بعد", tw: "Obiara nni hɔ ɛ", zu: "Akekho okwamanje",
  },
  notFound: {
    en: "We could not find that support request.",
    ha: "Ba mu sami wannan buƙatar tallafi ba.",
    yo: "A kò rí ìbéèrè ìrànlọ́wọ́ yẹn.",
    ig: "Anyị ahụghị arịrịọ nkwado ahụ.",
    fr: "Nous n'avons pas trouvé cette demande d'assistance.",
    pt: "Não encontrámos esse pedido de apoio.",
    sw: "Hatukupata ombi hilo la msaada.",
    ar: "لم نتمكن من العثور على طلب الدعم هذا.",
    tw: "Yɛanhu saa mmoa abisadeɛ no.",
    zu: "Asisitholanga leso sicelo sosekelo.",
  },
  agencyHeading: {
    en: "Contact support", ha: "Tuntuɓi tallafi", yo: "Kàn sí ìrànlọ́wọ́",
    ig: "Kpọtụrụ nkwado", fr: "Contacter l'assistance", pt: "Contactar o apoio",
    sw: "Wasiliana na msaada", ar: "الاتصال بالدعم", tw: "Frɛ mmoa",
    zu: "Xhumana nosekelo",
  },
  agencyLead: {
    en: "Tell BeOrchid what has gone wrong. Somebody on the platform team picks it up and you can see here when they do.",
    ha: "Ka gaya wa BeOrchid abin da ya faru. Wani a ƙungiyar dandalin zai ɗauka kuma za ka gani a nan lokacin da suka yi.",
    yo: "Sọ fún BeOrchid ohun tí ó ṣàṣìṣe. Ẹnìkan nínú ẹgbẹ́ pátákò yóò gbà á, wàá sì rí i níbí nígbà tí wọ́n bá ṣe.",
    ig: "Gwa BeOrchid ihe mere. Otu onye nʼotu ikpo okwu ga-ewere ya, ị ga-ahụkwa ya ebe a mgbe ha mere.",
    fr: "Dites à BeOrchid ce qui ne va pas. Quelqu'un de l'équipe s'en charge et vous le voyez ici.",
    pt: "Diga à BeOrchid o que correu mal. Alguém da equipa trata disso e verá aqui quando o fizer.",
    sw: "Mwambie BeOrchid nini kimeenda vibaya. Mtu wa timu atalishughulikia na utaona hapa atakapofanya hivyo.",
    ar: "أخبر BeOrchid بما حدث. سيتولى الأمر أحد أفراد الفريق وسترى ذلك هنا.",
    tw: "Ka kyerɛ BeOrchid deɛ ɛkɔɔ bɔne. Obi a ɔwɔ kuo no mu bɛfa na wobɛhu wɔ ha.",
    zu: "Tshela i-BeOrchid ukuthi kwenzekeni. Othile eqenjini uzokuthatha futhi uzobona lapha.",
  },
  subjectLabel: {
    en: "What is this about", ha: "Wannan game da me ne", yo: "Nípa kín ni èyí",
    ig: "Gbasara gịnị", fr: "De quoi s'agit-il", pt: "Do que se trata",
    sw: "Hii inahusu nini", ar: "ما موضوع هذا", tw: "Ɛfa deɛn ho",
    zu: "Lokhu kumayelana nani",
  },
  bodyLabel: {
    en: "What happened", ha: "Me ya faru", yo: "Kín ló ṣẹlẹ̀", ig: "Gịnị mere",
    fr: "Que s'est-il passé", pt: "O que aconteceu", sw: "Nini kilitokea",
    ar: "ماذا حدث", tw: "Ɛdeɛn na ɛsiiɛ", zu: "Kwenzekeni",
  },
  bodyPlaceholder: {
    en: "The more you can tell us, the fewer questions come back.",
    ha: "Duk yawan abin da ka gaya mana, ƙarancin tambayoyi za su dawo.",
    yo: "Bí o bá ṣe sọ púpọ̀ sí i, bẹ́ẹ̀ ni ìbéèrè yóò dín kù.",
    ig: "Ka i na-agwa anyị karịa, ka ajụjụ na-alọghachi belata.",
    fr: "Plus vous nous en dites, moins il y aura de questions en retour.",
    pt: "Quanto mais nos disser, menos perguntas voltarão.",
    sw: "Kadiri unavyotueleza zaidi, ndivyo maswali yatakavyopungua.",
    ar: "كلما أخبرتنا أكثر، قلّت الأسئلة العائدة إليك.",
    tw: "Sɛ woka kyerɛ yɛn pii a, nsɛmmisa a ɛbɛsan aba dɔɔso.",
    zu: "Uma usitshela okwengeziwe, yimibuzo embalwa ebuyayo.",
  },
  send: {
    en: "Send", ha: "Aika", yo: "Fi ránṣẹ́", ig: "Ziga", fr: "Envoyer",
    pt: "Enviar", sw: "Tuma", ar: "إرسال", tw: "Fa kɔ", zu: "Thumela",
  },
  sent: {
    en: "Sent", ha: "An aika", yo: "A fi ránṣẹ́", ig: "Ezigara ya",
    fr: "Envoyé", pt: "Enviado", sw: "Imetumwa", ar: "أُرسل",
    tw: "Wɔde kɔeɛ", zu: "Kuthunyelwe",
  },
  yourRequests: {
    en: "What you have asked us", ha: "Abin da ka tambaye mu",
    yo: "Ohun tí o ti béèrè lọ́wọ́ wa", ig: "Ihe ị jụrụ anyị",
    fr: "Ce que vous nous avez demandé", pt: "O que já nos pediu",
    sw: "Uliyotuuliza", ar: "ما سألتنا عنه", tw: "Deɛ woabisa yɛn",
    zu: "Okusibuzile",
  },
  noneYet: {
    en: "You have not asked us anything yet.",
    ha: "Ba ka tambaye mu kome ba tukuna.",
    yo: "O kò tíì béèrè ohunkóhun lọ́wọ́ wa.",
    ig: "Ị jụbeghị anyị ihe ọ bụla.",
    fr: "Vous ne nous avez encore rien demandé.",
    pt: "Ainda não nos pediu nada.",
    sw: "Bado hujatuuliza chochote.",
    ar: "لم تسألنا شيئًا بعد.",
    tw: "Wummisaa yɛn hwee ɛ.",
    zu: "Awukasibuzi lutho okwamanje.",
  },
  needsSubject: {
    en: "Say in a few words what this is about.",
    ha: "Ka faɗi a taƙaice abin da wannan ya shafa.",
    yo: "Sọ ní ọ̀rọ̀ díẹ̀ ohun tí èyí jẹ́ nípa rẹ̀.",
    ig: "Kwuo n'okwu ole na ole ihe nke a gbasara.",
    fr: "Dites en quelques mots de quoi il s'agit.",
    pt: "Diga em poucas palavras do que se trata.",
    sw: "Sema kwa maneno machache hii inahusu nini.",
    ar: "قل بكلمات قليلة ما موضوع هذا.",
    tw: "Fa nsɛmfua kakra ka deɛ ɛfa ho.",
    zu: "Sho ngamagama ambalwa ukuthi lokhu kumayelana nani.",
  },
  needsBody: {
    en: "Tell us what happened, so somebody can act on it.",
    ha: "Ka gaya mana abin da ya faru, don wani ya iya yin aiki a kai.",
    yo: "Sọ fún wa ohun tí ó ṣẹlẹ̀, kí ẹnìkan lè ṣiṣẹ́ lórí rẹ̀.",
    ig: "Gwa anyị ihe mere, ka mmadụ wee mee ihe gbasara ya.",
    fr: "Dites-nous ce qui s'est passé, pour que quelqu'un puisse agir.",
    pt: "Diga-nos o que aconteceu, para alguém poder agir.",
    sw: "Tueleze kilichotokea, ili mtu aweze kuchukua hatua.",
    ar: "أخبرنا بما حدث كي يتمكن أحدهم من التصرف.",
    tw: "Ka deɛ ɛsiiɛ kyerɛ yɛn, na obi atumi ayɛ ho biribi.",
    zu: "Sitshele ukuthi kwenzekeni, ukuze othile athathe isinyathelo.",
  },
  threadClosed: {
    en: "This conversation is closed.",
    ha: "An rufe wannan tattaunawar.",
    yo: "Ìjíròrò yìí ti wà ní pipade.",
    ig: "Emechiela mkparịta ụka a.",
    fr: "Cette conversation est close.",
    pt: "Esta conversa está encerrada.",
    sw: "Mazungumzo haya yamefungwa.",
    ar: "هذه المحادثة مغلقة.",
    tw: "Wɔato saa nkɔmmɔ yi mu.",
    zu: "Le ngxoxo ivaliwe.",
  },
  threadLabel: {
    en: "Conversation", ha: "Tattaunawa", yo: "Ìjíròrò", ig: "Mkparịta ụka",
    fr: "Conversation", pt: "Conversa", sw: "Mazungumzo", ar: "المحادثة",
    tw: "Nkɔmmɔ", zu: "Ingxoxo",
  },
  replyLabel: {
    en: "Your reply", ha: "Amsarka", yo: "Ìdáhùn rẹ", ig: "Azịza gị",
    fr: "Votre réponse", pt: "A sua resposta", sw: "Jibu lako", ar: "ردك",
    tw: "Wo mmuaeɛ", zu: "Impendulo yakho",
  },
  replyPlaceholder: {
    en: "Write back. They are told as soon as you send.",
    ha: "Ka mayar da amsa. Za a sanar da su da zarar ka aika.",
    yo: "Dáhùn. A ó sọ fún wọn ní kété tí o bá fi ránṣẹ́.",
    ig: "Zaghachi. A ga-agwa ha ozugbo i zipụrụ ya.",
    fr: "Répondez. Ils sont prévenus dès l'envoi.",
    pt: "Responda. São avisados assim que enviar.",
    sw: "Jibu. Wataarifiwa mara tu utakapotuma.",
    ar: "اكتب ردك. سيُبلَّغون فور الإرسال.",
    tw: "Bua. Wɔbɛbɔ wɔn amaneɛ ntɛm ara sɛ wode kɔ.",
    zu: "Phendula. Baziswa ngokushesha uma uthumela.",
  },
  replySend: {
    en: "Send reply", ha: "Aika amsa", yo: "Fi ìdáhùn ránṣẹ́", ig: "Ziga azịza",
    fr: "Envoyer la réponse", pt: "Enviar resposta", sw: "Tuma jibu",
    ar: "إرسال الرد", tw: "Fa mmuaeɛ kɔ", zu: "Thumela impendulo",
  },
  replySent: {
    en: "Reply sent", ha: "An aika amsa", yo: "A fi ìdáhùn ránṣẹ́",
    ig: "Ezigara azịza", fr: "Réponse envoyée", pt: "Resposta enviada",
    sw: "Jibu limetumwa", ar: "أُرسل الرد", tw: "Wɔde mmuaeɛ kɔeɛ",
    zu: "Impendulo ithunyelwe",
  },
  fromUs: {
    en: "BeOrchid", ha: "BeOrchid", yo: "BeOrchid", ig: "BeOrchid",
    fr: "BeOrchid", pt: "BeOrchid", sw: "BeOrchid", ar: "BeOrchid",
    tw: "BeOrchid", zu: "BeOrchid",
  },
  fromAgency: {
    en: "The agency", ha: "Hukumar", yo: "Ilé-iṣẹ́ náà", ig: "Ụlọ ọrụ ahụ",
    fr: "L'agence", pt: "A agência", sw: "Wakala", ar: "الوكالة",
    tw: "Adwumakuo no", zu: "I-ejensi",
  },
  /**
   * The button that opens a request's conversation.
   *
   * "Chat", not "Open" — the client's word on 9 September. "Open" also
   * collides with the `open` state in the same row, which is a poor
   * thing for a control and a status to share.
   */
  chatAction: {
    en: "Chat",
    ha: "Hira",
    yo: "Ìjíròrò",
    ig: "Nkata",
    fr: "Discussion",
    pt: "Conversa",
    sw: "Gumzo",
    ar: "محادثة",
    tw: "Nkɔmmɔ",
    zu: "Ingxoxo",
  },
  backToQueue: {
    en: "All support requests", ha: "Duk buƙatun tallafi",
    yo: "Gbogbo àwọn ìbéèrè ìrànlọ́wọ́", ig: "Arịrịọ nkwado niile",
    fr: "Toutes les demandes", pt: "Todos os pedidos", sw: "Maombi yote",
    ar: "كل طلبات الدعم", tw: "Mmoa abisadeɛ nyinaa", zu: "Zonke izicelo",
  },
  backToSupport: {
    en: "Back to support", ha: "Koma tallafi", yo: "Padà sí ìrànlọ́wọ́",
    ig: "Laghachi na nkwado", fr: "Retour à l'assistance", pt: "Voltar ao apoio",
    sw: "Rudi kwa msaada", ar: "العودة إلى الدعم", tw: "San kɔ mmoa",
    zu: "Buyela osekelweni",
  },
  resolvedNote: {
    en: "This request is resolved, so nobody can add to it. Raise a new one if something is still wrong.",
    ha: "An warware wannan buƙatar, don haka ba wanda zai ƙara. Ka ɗaga sabuwa idan har yanzu akwai matsala.",
    yo: "A ti yanjú ìbéèrè yìí, nítorí náà kò sí ẹni tí ó lè fi kún un. Gbé tuntun dìde bí nǹkan kan ṣì burú.",
    ig: "Edoziela arịrịọ a, ya mere ọ dịghị onye nwere ike itinye na ya. Welite nke ọhụrụ ma ọ bụrụ na ihe ka na-adị njọ.",
    fr: "Cette demande est résolue, personne ne peut donc y ajouter. Ouvrez-en une nouvelle si quelque chose ne va toujours pas.",
    pt: "Este pedido está resolvido, por isso ninguém lhe pode acrescentar nada. Abra um novo se algo continuar mal.",
    sw: "Ombi hili limetatuliwa, hivyo hakuna anayeweza kuongeza. Anzisha jipya kama bado kuna tatizo.",
    ar: "تم حل هذا الطلب، فلا يمكن لأحد الإضافة إليه. افتح طلبًا جديدًا إن بقيت مشكلة.",
    tw: "Wɔasiesie saa abisadeɛ yi, enti obiara ntumi mfa nka ho. Fa foforɔ bra sɛ biribi da so yɛ bɔne a.",
    zu: "Lesi sicelo sixazululiwe, ngakho akekho ongangeza kuso. Vula esisha uma kusekhona okungahambi kahle.",
  },
  aboutCase: {
    en: "About case", ha: "Game da shari'ar", yo: "Nípa ẹjọ́", ig: "Gbasara ikpe",
    fr: "Au sujet du dossier", pt: "Sobre o processo", sw: "Kuhusu kesi",
    ar: "بخصوص الحالة", tw: "Ɛfa asɛm", zu: "Mayelana necala",
  },
  askAboutCase: {
    en: "Ask BeOrchid about this case",
    ha: "Tambayi BeOrchid game da wannan shari'ar",
    yo: "Bi BeOrchid nípa ẹjọ́ yìí",
    ig: "Jụọ BeOrchid gbasara ikpe a",
    fr: "Interroger BeOrchid sur ce dossier",
    pt: "Perguntar à BeOrchid sobre este processo",
    sw: "Uliza BeOrchid kuhusu kesi hii",
    ar: "اسأل BeOrchid عن هذه الحالة",
    tw: "Bisa BeOrchid saa asɛm yi ho",
    zu: "Buza i-BeOrchid ngaleli cala",
  },
  askAboutCaseLead: {
    en: "This opens a support conversation with the case reference attached, so nobody has to describe which traveller you mean.",
    ha: "Wannan yana buɗe tattaunawar tallafi tare da lambar shari'ar, don kada kowa ya bayyana wane matafiyi kake nufi.",
    yo: "Èyí ń ṣí ìjíròrò ìrànlọ́wọ́ pẹ̀lú ìtọ́kasí ẹjọ́, kí ẹnikẹ́ni má bàa ṣàlàyé arìnrìn-àjò tí o ń tọ́ka sí.",
    ig: "Nke a na-emepe mkparịta ụka nkwado nwere nrụtụaka ikpe, ka onye ọ bụla ghara ịkọwa onye njem ị na-ekwu.",
    fr: "Ceci ouvre une conversation d'assistance avec la référence du dossier jointe, pour que personne n'ait à décrire de quel voyageur il s'agit.",
    pt: "Isto abre uma conversa de apoio com a referência do processo anexada, para ninguém ter de descrever de que viajante se trata.",
    sw: "Hii inafungua mazungumzo ya msaada na kumbukumbu ya kesi, ili hakuna anayehitaji kueleza unamaanisha msafiri gani.",
    ar: "يفتح هذا محادثة دعم مع مرجع الحالة، فلا يحتاج أحد إلى وصف المسافر المقصود.",
    tw: "Yei bue mmoa nkɔmmɔ a asɛm no nsɛnkyerɛnne ka ho, na obiara nnkyerɛ ɔkwantufoɔ a wopɛ.",
    zu: "Lokhu kuvula ingxoxo yosekelo nenkomba yecala, ukuze kungabikho odinga ukuchaza ukuthi umuphi umhambi.",
  },
  markResolved: {
    en: "Mark resolved", ha: "Yiwa alama an warware", yo: "Sàmì pé a yanjú",
    ig: "Kaa ya edoziela", fr: "Marquer comme résolue", pt: "Marcar como resolvido",
    sw: "Weka kuwa imetatuliwa", ar: "وضع علامة تم الحل",
    tw: "Hyɛ no sɛ wɔasiesie", zu: "Maka njengexazululiwe",
  },
  resolvedToast: {
    en: "Marked resolved", ha: "An yiwa alama an warware", yo: "A sàmì pé a yanjú",
    ig: "Akara ya edoziela", fr: "Marquée comme résolue", pt: "Marcado como resolvido",
    sw: "Imewekwa kuwa imetatuliwa", ar: "وُضعت علامة تم الحل",
    tw: "Wɔahyɛ no sɛ wɔasiesie", zu: "Kumakwe njengexazululiwe",
  },
};
