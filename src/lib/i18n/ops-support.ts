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
  anyState: {
    en: "Any state", ha: "Kowane hali", yo: "Ipò yòówù", ig: "Ọnọdụ ọ bụla",
    fr: "Tout état", pt: "Qualquer estado", sw: "Hali yoyote", ar: "أي حالة",
    tw: "Tebea biara", zu: "Noma isiphi isimo",
  },
  stateOpen: {
    en: "Open", ha: "A buɗe", yo: "Ṣí sílẹ̀", ig: "Emeghere", fr: "Ouverte",
    pt: "Aberto", sw: "Wazi", ar: "مفتوح", tw: "Abue", zu: "Kuvuliwe",
  },
  stateClaimed: {
    en: "Claimed", ha: "An ɗauka", yo: "A gbà", ig: "Ewerela", fr: "Prise en charge",
    pt: "Atribuído", sw: "Imechukuliwa", ar: "قيد المعالجة", tw: "Wɔafa", zu: "Kuthathiwe",
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
    assignee: {
      en: "With", ha: "Tare da", yo: "Pẹ̀lú", ig: "Nʼaka", fr: "Chez",
      pt: "Com", sw: "Kwa", ar: "لدى", tw: "Wɔ", zu: "Ku-",
    },
    actions: {
      en: "Actions", ha: "Ayyuka", yo: "Ìṣe", ig: "Omume", fr: "Actions",
      pt: "Ações", sw: "Vitendo", ar: "إجراءات", tw: "Nneyɛe", zu: "Izenzo",
    },
  },
  claim: {
    en: "Claim", ha: "Ɗauka", yo: "Gbà", ig: "Were", fr: "Prendre en charge",
    pt: "Atribuir a mim", sw: "Chukua", ar: "استلام", tw: "Fa", zu: "Thatha",
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
};
