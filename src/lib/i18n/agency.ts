import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The employer console's static chrome — the page title, the role
 * explanation, the roster and invitations panels, and the privacy
 * laminate. None of this is client-supplied copy; it is the product's
 * own English, extracted here and translated in-house the way `hero.ts`
 * was.
 *
 * Deliberately excluded: organisation names, traveller names, case
 * references, destinations and visa route names all come from the
 * database and stay exactly as stored — translating a proper noun would
 * misrepresent it, not localise it.
 *
 * A handful of strings carry `{placeholder}` tokens rather than being
 * interpolated with template literals, because the value has to survive
 * being chosen by locale first — see `fill` in
 * `src/app/agency/page.tsx`.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const AGENCY: {
  pageTitle: L;
  navDashboard: L;
  navClients: L;
  navTeam: L;
  profileTitle: L;
  profileBody: L;
  profileDetailsLabel: L;
  logoPanelLabel: L;
  logoPanelBody: L;
  roleLabel: { owner: L; reviewer: L };
  roleReason: { owner: L; reviewer: L };
  nameOrgLabel: L;
  nameOrgBody: L;
  yourOrganisationFallback: L;
  teamSizeOne: L;
  teamSizeOther: L;
  privacyTag: L;
  privacyHeading: L;
  privacyBody: L;
  yourClientsLabel: L;
  clientWord: L;
  clientsWord: L;
  rosterEmpty: L;
  routeNotSet: L;
  documentsVerified: L;
  invitationsLabel: L;
  teamInvitationsLabel: L;
  overviewIsAgencyWide: L;
  invitationsPageBody: L;
  pendingWord: L;
  invitationsEmpty: L;
  destinationNotSet: L;
  timelineInvitedExpires: L;
  timelineAccepted: L;
  timelineExpired: L;
  timelineInvited: L;
  clientsCardBody: L;
  assignedToYou: L;
  assignedEmpty: L;
  noAssignedClients: L;
  unclaimedLabel: L;
  unclaimedEmpty: L;
  teamCardBody: L;
  yourTeamLabel: L;
  memberWord: L;
  membersWord: L;
  teamEmpty: L;
  teamInvitationsEmpty: L;
  jobTitleNotSet: L;
  joinedOn: L;
  /**
   * The clients table: its search box, its two filters and its column
   * headers. The client asked on 7 September for a roster somebody can
   * work at scale — "a table that works excellently for numerous
   * applications" — which is a search, a status filter and a date
   * filter, not a longer list.
   */
  searchClients: L;
  anyStatus: L;
  anyDate: L;
  dateLast7: L;
  dateLast30: L;
  dateLast90: L;
  /**
   * The fourth date option, and the one worth having. It is the set
   * somebody is actually chasing — a client who has uploaded nothing —
   * and no range of dates reaches it, because these rows have no date.
   */
  dateNotSubmitted: L;
  /**
   * The director's dashboard cards. The client asked for these by name
   * on 7 September, and for them to be doors: "so that they can be
   * clickable as short quick links… once they click on those they get
   * navigated to those pages automatically."
   */
  kpi: {
    clients: { label: L; sub: L };
    clientsPaid: { label: L; sub: L; mixed: L };
    awaitingReview: { label: L; sub: L };
    withHandler: { label: L; sub: L };
    invitations: { label: L; sub: L };
  };
  tableHead: {
    client: L;
    route: L;
    documents: L;
    status: L;
    submitted: L;
    colleague: L;
    joined: L;
    rank: L;
    invitation: L;
    /**
     * The invitation table's middle column, which means a different
     * thing per kind — where a client is going, what a colleague will be
     * called, what rank a BeOrchid colleague is given. The caller knows
     * which, and passes it: a column headed "Details" is the unlabelled
     * fragment a table exists to avoid.
     */
    destination: L;
    jobTitle: L;
  };
  pipelineTitle: L;
  pipelineEmpty: L;
  pipelineOfPrevious: L;
  pipelineStalled: L;
  funnel: {
    started: L;
    intake: L;
    collected: L;
    submitted: L;
    decided: L;
  };
  billTitle: L;
  billEmpty: L;
  billCharged: L;
  billBaseFee: L;
  billPerCase: L;
  billCases: L;
  billThisCycle: L;
  clientFeesTitle: L;
  clientFeesWindow: L;
  clientFeesNote: L;
  clientFeesEmpty: L;
  clientFeesPaid: L;
  clientFeesCases: L;
  clientFeesMixed: L;
  billStatus: {
    paid: L;
    draft: L;
    open: L;
    failed: L;
  };
} = {
  pageTitle: {
    en: "Organisation console",
    ha: "Dashboard na kamfani",
    yo: "Pátákó iṣàkóso àjọ",
    ig: "Igwe nchịkwa ụlọ ọrụ",
    fr: "Console de l'organisation",
    pt: "Painel da organização",
    sw: "Dashibodi ya shirika",
    ar: "لوحة تحكم المؤسسة",
    tw: "Akuo Dashboard",
    zu: "Idashbhodi yenhlangano",
  },
  navDashboard: {
    en: "Dashboard",
    ha: "Bayyani",
    yo: "Àkópọ̀",
    ig: "Nchịkọta",
    fr: "Tableau de bord",
    pt: "Painel",
    sw: "Dashibodi",
    ar: "لوحة التحكم",
    tw: "Nhwɛso",
    zu: "Ideshibhodi",
  },
  navClients: {
    en: "Clients",
    ha: "Abokan ciniki",
    yo: "Àwọn oníbàárà",
    ig: "Ndị ahịa",
    fr: "Clients",
    pt: "Clientes",
    sw: "Wateja",
    ar: "العملاء",
    tw: "Adetɔfoɔ",
    zu: "Amakhasimende",
  },
  navTeam: {
    en: "Team",
    ha: "Ƙungiya",
    yo: "Ẹgbẹ́",
    ig: "Ndị otu",
    fr: "Équipe",
    pt: "Equipa",
    sw: "Timu",
    ar: "الفريق",
    tw: "Kuo",
    zu: "Ithimba",
  },
  profileTitle: {
    en: "Your profile",
    ha: "Bayananka",
    yo: "Àkọọ́lẹ̀ rẹ",
    ig: "Profaịlụ gị",
    fr: "Votre profil",
    pt: "O seu perfil",
    sw: "Wasifu wako",
    ar: "ملفك الشخصي",
    tw: "Wo ho nsɛm",
    zu: "Iphrofayela yakho",
  },
  profileBody: {
    en: "How your clients and colleagues see you, and where we reach you about a case.",
    ha: "Yadda abokan cinikinka da abokan aikinka suke ganin ka, da inda za mu tuntuɓe ka game da shari'a.",
    yo: "Bí àwọn oníbàárà àti alábàáṣiṣẹ́ rẹ ṣe rí ọ, àti ibi tí a ti lè kàn sí ọ nípa ẹjọ́ kan.",
    ig: "Otú ndị ahịa na ndị ọrụ ibe gị si hụ gị, na ebe anyị ga-akpọtụrụ gị maka ikpe.",
    fr: "Ce que vos clients et vos collègues voient de vous, et où nous vous joignons au sujet d'un dossier.",
    pt: "Como os seus clientes e colegas o veem, e onde falamos consigo sobre um processo.",
    sw: "Jinsi wateja na wenzako wanavyokuona, na mahali tunapokufikia kuhusu kesi.",
    ar: "كيف يراك عملاؤك وزملاؤك، وأين نصل إليك بشأن حالة ما.",
    tw: "Sɛdeɛ w'adetɔfoɔ ne w'adwumayɛfoɔ hunu wo, ne baabi a yɛbɛfa so aka asɛm bi ho asɛm akyerɛ wo.",
    zu: "Indlela amakhasimende nozakwenu abakubona ngayo, nalapho sikuthola khona ngecala.",
  },
  profileDetailsLabel: {
    en: "Your details",
    ha: "Bayananka",
    yo: "Àwọn àlàyé rẹ",
    ig: "Nkọwa gị",
    fr: "Vos coordonnées",
    pt: "Os seus dados",
    sw: "Maelezo yako",
    ar: "بياناتك",
    tw: "Wo ho nsɛm",
    zu: "Imininingwane yakho",
  },
  /**
   * The agency's own logo, on the director's profile screen.
   *
   * It is on this page rather than a settings screen of its own because
   * this is where the console already keeps "what people see of us" —
   * the photo directly above it answers the same question about one
   * person. The body says where it lands, since the effect is two
   * hundred pixels away in the rail and not on the panel it is picked
   * from.
   */
  logoPanelLabel: {
    en: "Your agency's logo",
    ha: "Tambarin hukumarka",
    yo: "Àmì ilé-iṣẹ́ rẹ",
    ig: "Akara ụlọ ọrụ gị",
    fr: "Le logo de votre agence",
    pt: "O logótipo da sua agência",
    sw: "Nembo ya wakala wako",
    ar: "شعار وكالتك",
    tw: "W'adwumakuo agyiraeɛ",
    zu: "Ilogo ye-ejensi yakho",
  },
  logoPanelBody: {
    en: "Shown along the top of the side panel on every screen of this console. Your agency's name is used until you add one.",
    ha: "Ana nuna shi a saman gefen kowane shafi na wannan na'ura. Ana amfani da sunan hukumarka har sai ka ƙara ɗaya.",
    yo: "Ó máa hàn ní òkè pánẹ́ẹ̀lì ẹ̀gbẹ́ ní gbogbo ojú-ìwé kọ́ńsólù yìí. Orúkọ ilé-iṣẹ́ rẹ ni a ó lò títí ìwọ ó fi fi ọ̀kan kún un.",
    ig: "A na-egosi ya n'elu mpanaka akụkụ na ihuenyo ọ bụla nke console a. A na-eji aha ụlọ ọrụ gị ruo mgbe ị tinyere otu.",
    fr: "Affiché en haut du panneau latéral sur chaque écran de cette console. Le nom de votre agence est utilisé tant que vous n'en ajoutez pas.",
    pt: "Mostrado no topo do painel lateral em todos os ecrãs desta consola. O nome da sua agência é usado até adicionar um.",
    sw: "Huonyeshwa juu ya paneli ya kando katika kila skrini ya konsoli hii. Jina la wakala wako hutumika hadi utakapoongeza moja.",
    ar: "يظهر أعلى اللوحة الجانبية في كل شاشة من شاشات وحدة التحكم هذه. يُستخدم اسم وكالتك إلى أن تضيف شعارًا.",
    tw: "Ɛda adi wɔ nkyɛn panel no atifi wɔ console yi kratafa biara so. Wɔde w'adwumakuo din di dwuma kɔsi sɛ wode bi bɛka ho.",
    zu: "Ikhonjiswa phezulu kwephaneli eseceleni kuso sonke isikrini salekhonsoli. Igama le-ejensi yakho lisetshenziswa uze ungeze elilodwa.",
  },
  roleLabel: {
    // "Director", not "Owner" — renamed with the client on 7 September.
    // The enum member stays `owner`; see the note above `orgRoleEnum`.
    // The words are the ones `roleReason.reviewer` already used for the
    // same rank in each locale, so the label and the prose agree.
    owner: {
      en: "Director",
      ha: "Darakta",
      yo: "Olùdarí",
      ig: "Onye nduzi",
      fr: "Directeur",
      pt: "Diretor",
      sw: "Mkurugenzi",
      ar: "المدير",
      tw: "Ɔpanyin",
      zu: "Umqondisi",
    },
    reviewer: {
      en: "Travel agent",
      ha: "Wakilin balaguro",
      yo: "Aṣojú ìrìn-àjò",
      ig: "Onye ọrụ njem",
      fr: "Agent de voyage",
      pt: "Agente de viagens",
      sw: "Wakala wa safari",
      ar: "وكيل سفر",
      tw: "Akwantuo ho dwumayɛni",
      zu: "I-ejenti yohambo",
    },
  },
  roleReason: {
    owner: {
      en: "You are the director because you created this organisation. Directors can invite people, manage the account, hand cases to colleagues and see everyone's progress.",
      ha: "Kai ne daraktan wannan kamfani domin kai ne ka kafa shi. Daraktoci suna iya gayyatar mutane, su sarrafa asusun, su mika shari'o'i ga abokan aiki, kuma su ga ci gaban kowa da kowa.",
      yo: "Ìwọ ni olùdarí nítorí ìwọ ni o dá àjọ yìí sílẹ̀. Àwọn olùdarí lè pe àwọn ènìyàn, ṣàkóso àkọọ́lẹ̀ náà, fi àwọn ìbéèrè lé àwọn ẹlẹgbẹ́ lọ́wọ́, kí wọ́n sì rí ìtẹ̀síwájú gbogbo ènìyàn.",
      ig: "Ị bụ onye nduzi n'ihi na ị bụ onye guzobere ụlọ ọrụ a. Ndị nduzi nwere ike ịkpọ ndị mmadụ oku, jikwaa akaụntụ ahụ, nyefee ndị ọrụ ibe ha arịrịọ, ma hụ ọganihu onye ọ bụla.",
      fr: "Vous êtes le directeur parce que vous avez créé cette organisation. Les directeurs peuvent inviter des personnes, gérer le compte, confier des dossiers à leurs collègues et voir la progression de chacun.",
      pt: "É o diretor porque criou esta organização. Os diretores podem convidar pessoas, gerir a conta, atribuir processos aos colegas e ver o progresso de todos.",
      sw: "Wewe ndiye mkurugenzi kwa sababu ndiwe uliyeunda shirika hili. Wakurugenzi wanaweza kualika watu, kusimamia akaunti, kukabidhi maombi kwa wenzao na kuona maendeleo ya kila mtu.",
      ar: "أنت المدير لأنك أنشأت هذه المؤسسة. يمكن للمديرين دعوة الأشخاص وإدارة الحساب وإسناد الطلبات إلى الزملاء ورؤية تقدم الجميع.",
      tw: "Wone ɔpanyin no ɛfiri sɛ wo na wobɔɔ akuo yi. Mpanyimfoɔ bɛtumi afrɛ nnipa, ahwɛ akaunti no so, de abisadeɛ ama wɔn nnwumayɛfoɔ, na wɔahu obiara nkɔso.",
      zu: "Ungumqondisi ngoba nguwe owadala le nhlangano. Abaqondisi bangamema abantu, baphathe i-akhawunti, banikeze ozakwabo izicelo futhi babone inqubekelaphambili yawo wonke umuntu.",
    },
    reviewer: {
      en: "You are a travel agent because a director invited you into this organisation. Travel agents check the documents of the clients they are given, decide their applications and message them directly.",
      ha: "Kai wakilin balaguro ne domin wani darakta ya gayyace ka cikin wannan kamfanin. Wakilan balaguro suna duba takardun abokan cinikin da aka ba su, suna yanke shawara kan nemansu, kuma suna aika musu saƙo kai tsaye.",
      yo: "Ìwọ jẹ́ aṣojú ìrìn-àjò nítorí olùdarí kan pè ọ́ sínú àjọ yìí. Àwọn aṣojú ìrìn-àjò ń ṣàyẹ̀wò àwọn ìwé àwọn oníbàárà tí a fi lé wọn lọ́wọ́, wọ́n ń pinnu ìbéèrè wọn, wọ́n sì ń bá wọn sọ̀rọ̀ tààrà.",
      ig: "Ị bụ onye ọrụ njem n'ihi na otu onye nduzi kpọrọ gị n'ime ụlọ ọrụ a. Ndị ọrụ njem na-enyocha akwụkwọ ndị ahịa e nyere ha, na-ekpebi arịrịọ ha ma na-ezigara ha ozi ozugbo.",
      fr: "Vous êtes agent de voyage parce qu'un directeur vous a invité dans cette organisation. Les agents de voyage vérifient les documents des clients qui leur sont confiés, tranchent leurs dossiers et leur écrivent directement.",
      pt: "É agente de viagens porque um diretor o convidou para esta organização. Os agentes de viagens verificam os documentos dos clientes que lhes são atribuídos, decidem os seus processos e falam com eles diretamente.",
      sw: "Wewe ni wakala wa safari kwa sababu mkurugenzi alikualika katika shirika hili. Mawakala wa safari hukagua nyaraka za wateja waliopewa, huamua maombi yao na kuwasiliana nao moja kwa moja.",
      ar: "أنت وكيل سفر لأن أحد المديرين دعاك إلى هذه المؤسسة. يفحص وكلاء السفر مستندات العملاء المسندين إليهم، ويبتّون في طلباتهم، ويراسلونهم مباشرة.",
      tw: "Woyɛ akwantuo ho dwumayɛni ɛfiri sɛ ɔpanyin bi frɛɛ wo baa akuo yi mu. Akwantuo ho adwumayɛfoɔ hwɛ adetɔfoɔ a wɔde ama wɔn no nkrataa so, si wɔn abisadeɛ ho gyinae, na wɔne wɔn di nkitaho tee.",
      zu: "Uyi-ejenti yohambo ngoba umqondisi wakumema kule nhlangano. Ama-ejenti ohambo ahlola amadokhumenti amakhasimende awanikwayo, anqume izicelo zawo futhi athumele imilayezo ngqo.",
    },
  },
  nameOrgLabel: {
    en: "Name of organisation",
    ha: "Sunan kamfani",
    yo: "Orúkọ àjọ",
    ig: "Aha ụlọ ọrụ",
    fr: "Nom de l'organisation",
    pt: "Nome da organização",
    sw: "Jina la shirika",
    ar: "اسم المؤسسة",
    tw: "Akuo din",
    zu: "Igama lenhlangano",
  },
  nameOrgBody: {
    en: "Give the registered name, as it appears on your trading licence. Once it exists you can invite your clients by email — they complete their own intake, and you see their progress here without their documents.",
    ha: "Bayar da sunan da aka yi rijista, kamar yadda yake bayyana a lasisin kasuwancinka. Da zarar ya wanzu, za ka iya gayyatar abokan cinikinka ta imel — za su cika bayanansu da kansu, kuma za ka ga ci gabansu a nan ba tare da ganin takardunsu ba.",
    yo: "Fún wa ní orúkọ tí a forúkọ sílẹ̀, gẹ́gẹ́ bí ó ṣe farahàn lórí ìwé àṣẹ òwò rẹ. Nígbà tí ó bá ti wà, o lè pe àwọn oníbàárà rẹ nípasẹ̀ ímeèlì — àwọn fúnra wọn ni yóò parí ìforúkọsílẹ̀ wọn, o sì lè rí ìtẹ̀síwájú wọn níhìn-ín láìsí àwọn ìwé wọn.",
    ig: "Nye aha e debanyere aha, dịka o si pụta n'ikikere ọrụ azụmahịa gị. Ozugbo o dịla adị, ị nwere ike ịkpọ ndị ahịa gị oku site na email — ha ga-emecha nzuputa aka ha, ị ga-ahụkwa ọganihu ha ebe a n'enweghị akwụkwọ ha.",
    fr: "Indiquez le nom enregistré, tel qu'il figure sur votre licence commerciale. Une fois créée, vous pouvez inviter vos clients par e-mail — ils remplissent leur propre admission, et vous voyez leur progression ici sans leurs documents.",
    pt: "Indique o nome registado, tal como aparece na sua licença comercial. Assim que existir, pode convidar os seus clientes por e-mail — eles concluem a sua própria admissão, e você vê o progresso deles aqui sem os documentos deles.",
    sw: "Toa jina lililosajiliwa, kama linavyoonekana kwenye leseni yako ya biashara. Mara likishakuwepo, unaweza kualika wateja wako kwa barua pepe — watakamilisha uandikishaji wao wenyewe, na utaona maendeleo yao hapa bila nyaraka zao.",
    ar: "أدخل الاسم المسجَّل كما يظهر في رخصة نشاطك التجاري. بمجرد إنشائه، يمكنك دعوة عملائك عبر البريد الإلكتروني — يكملون عملية التسجيل الخاصة بهم، وترى تقدمهم هنا دون الاطلاع على مستنداتهم.",
    tw: "Fa din a wɔakyerɛw wɔ nyinasoɔ mu, sɛnea ɛda w'adwuma tiketi so no. Sɛ ɛwɔ hɔ a, wobɛtumi afrɛ w'adwumafoɔ afiri email so — wɔn ankasa bɛwie wɔn nkyerɛmu, na wobɛhu wɔn nkɔso wɔ ha a wonhu wɔn nkrataa.",
    zu: "Nikeza igama elibhalisiwe, njengoba livela elayisensini yakho yebhizinisi. Uma seliyinhlangano, ungamema amakhasimende akho nge-imeyili — bazoqedela ukubhaliswa kwabo, futhi ubone inqubekelaphambili yabo lapha ngaphandle kokubona amadokhumenti abo.",
  },
  yourOrganisationFallback: {
    en: "Your organisation",
    ha: "Kamfaninka",
    yo: "Àjọ rẹ",
    ig: "Ụlọ ọrụ gị",
    fr: "Votre organisation",
    pt: "A sua organização",
    sw: "Shirika lako",
    ar: "مؤسستك",
    tw: "Wo akuo",
    zu: "Inhlangano yakho",
  },
  /**
   * How many people work at this agency — the one fact on the dashboard
   * that appears nowhere else.
   *
   * It replaced "{n} people · seat count not set yet · {n} invitation
   * pending" on 9 September, a line whose three clauses were each
   * wrong or redundant. "People" counted `countOrgClients`, which
   * counts applications — so it said two people and meant two
   * travellers, next to a Clients card saying 2. The seat clause named
   * a cap nothing enforces. The invitation clause repeated the
   * Outstanding invitations card directly below it.
   *
   * The rail's Team badge is pending team invitations, not size, so
   * without this the number of colleagues is on no screen but the
   * roster itself.
   */
  teamSizeOne: {
    en: "1 person on your team",
    ha: "Mutum 1 a ƙungiyarku",
    yo: "Ènìyàn 1 nínú ẹgbẹ́ yín",
    ig: "Mmadụ 1 nʼotu gị",
    fr: "1 personne dans votre équipe",
    pt: "1 pessoa na sua equipa",
    sw: "Mtu 1 katika timu yako",
    ar: "شخص واحد في فريقك",
    tw: "Onipa 1 wɔ wo kuo no mu",
    zu: "Umuntu 1 ethimbeni lakho",
  },
  teamSizeOther: {
    en: "{n} people on your team",
    ha: "Mutane {n} a ƙungiyarku",
    yo: "Ènìyàn {n} nínú ẹgbẹ́ yín",
    ig: "Mmadụ {n} nʼotu gị",
    fr: "{n} personnes dans votre équipe",
    pt: "{n} pessoas na sua equipa",
    sw: "Watu {n} katika timu yako",
    ar: "{n} أشخاص في فريقك",
    tw: "Nnipa {n} wɔ wo kuo no mu",
    zu: "Abantu abangu-{n} ethimbeni lakho",
  },
  privacyTag: {
    en: "The privacy boundary",
    ha: "Iyakar sirri",
    yo: "Àlà ìpamọ́ ìkọ̀kọ̀",
    ig: "Oke nzuzo",
    fr: "La limite de confidentialité",
    pt: "O limite de privacidade",
    sw: "Mpaka wa faragha",
    ar: "حدود الخصوصية",
    tw: "Kokoamsɛm ahye",
    zu: "Umngcele wobumfihlo",
  },
  /**
   * Rewritten 2026-09-07, because it had become false.
   *
   * It was written when BeOrchid reviewed the documents and the
   * organisation was a sponsor watching a bar fill up. v1.3 moved the
   * review boundary to the agency — see `canReadDocuments` in
   * `@/lib/auth/policy` — so the agency now opens the passport, and a
   * card promising it would never see one was telling every director
   * the opposite of what their own console does.
   *
   * A privacy laminate that contradicts the screen behind it is worse
   * than none: it teaches the reader that the product's promises are
   * decoration. So this states the boundary that does exist, in both
   * directions — the platform is shut out, and inside the agency a
   * claimed case narrows to its handler.
   */
  privacyHeading: {
    en: "The documents stop at your agency",
    ha: "Takardun sun tsaya a ƙungiyarku",
    yo: "Àwọn ìwé dúró sí ilé-iṣẹ́ yín",
    ig: "Akwụkwọ ndị ahụ na-akwụsị n'ụlọ ọrụ gị",
    fr: "Les documents s'arrêtent à votre agence",
    pt: "Os documentos ficam na sua agência",
    sw: "Nyaraka zinaishia kwenye wakala wako",
    ar: "المستندات تتوقف عند وكالتك",
    tw: "Nkrataa no gyina w'adwumakuw so",
    zu: "Amadokhumenti agcina enhlanganweni yakho",
  },
  privacyBody: {
    en: "Passports, bank statements and police certificates are yours to review, and nobody at Toplance can open them. Inside your agency, a client's file is open to the colleague handling them and to the director — nobody else, and not before the case is theirs.",
    ha: "Fasfo, bayanan banki da takardar shaidar ɗan sanda naka ne ka duba, kuma babu wanda ke Toplance da zai iya buɗe su. A cikin kamfaninka, fayil ɗin abokin ciniki a buɗe yake ga wanda ke kula da shi da kuma darakta — ba wani ba, kuma ba kafin shari'ar ta zama tasa ba.",
    yo: "Ìwé ìrìnà, ìsọfúnni báǹkì àti ìwé ẹ̀rí ọlọ́pàá jẹ́ tìrẹ láti ṣàyẹ̀wò, kò sì sí ẹnìkan ní Toplance tí ó lè ṣí wọn. Nínú àjọ rẹ, fáìlì oníbàárà ṣí sílẹ̀ fún alábàáṣiṣẹ́ tí ń bójú tó wọn àti fún olùdarí — kò sí ẹlòmíràn, kò sì ṣí kí ẹjọ́ náà tó di tiwọn.",
    ig: "Paspọtụ, nkọwa akụ na akwụkwọ ndị uwe ojii bụ nke gị ịnyocha, ọ dịghịkwa onye nọ na Toplance nwere ike imepe ha. N'ime ụlọ ọrụ gị, faịlụ onye ahịa ghere oghe naanị nye onye na-ahụ maka ya na onye nduzi — ọ dịghị onye ọzọ, ọ bụghịkwa tupu ikpe ahụ abụrụ nke ya.",
    fr: "Les passeports, relevés bancaires et casiers judiciaires sont à vous de vérifier, et personne chez Toplance ne peut les ouvrir. Au sein de votre agence, le dossier d'un client est ouvert au collègue qui le suit et au directeur — à personne d'autre, et pas avant que le dossier soit le sien.",
    pt: "Os passaportes, extratos bancários e registos criminais são seus para verificar, e ninguém na Toplance os pode abrir. Dentro da sua agência, o processo de um cliente está aberto ao colega que o acompanha e ao diretor — a mais ninguém, e não antes de o caso ser dele.",
    sw: "Pasipoti, taarifa za benki na vyeti vya polisi ni vyako kukagua, na hakuna mtu Toplance anayeweza kuvifungua. Ndani ya shirika lako, faili la mteja liko wazi kwa mwenzako anayemshughulikia na kwa mkurugenzi — si mtu mwingine, wala si kabla kesi haijawa yake.",
    ar: "جوازات السفر وكشوف الحسابات وشهادات الشرطة لك أنت لمراجعتها، ولا أحد في Toplance يستطيع فتحها. وداخل مؤسستك، ملف العميل مفتوح للزميل الذي يتولاه وللمدير — لا لغيرهما، ولا قبل أن تصبح الحالة له.",
    tw: "Akwantufa nkrataa, sikakorabea nkrataa ne polisi adanseɛ krataa yɛ wo dea sɛ wohwɛ, na obiara nni Toplance a ɔbɛtumi abue mu. Wɔ wo kuo mu no, adetɔni krataa bue ma nea ɔhwɛ ne so ne ɔpanyin no — obiara foforɔ bio, na ɛnyɛ ansa na asɛm no abɛyɛ ne dea.",
    zu: "Amaphasipoti, izitatimende zasebhange nezitifiketi zamaphoyisa kungokwakho ukukubuyekeza, futhi akekho e-Toplance ongakuvula. Ngaphakathi enhlanganweni yakho, ifayela lekhasimende livulekele ozakwenu oliphethe kanye nomqondisi — akekho omunye, futhi hhayi ngaphambi kokuba icala libe elakhe.",
  },
  yourClientsLabel: {
    en: "Your clients",
    ha: "Abokan cinikinka",
    yo: "Àwọn oníbàárà rẹ",
    ig: "Ndị ahịa gị",
    fr: "Vos clients",
    pt: "Os seus clientes",
    sw: "Wateja wako",
    ar: "عملاؤك",
    tw: "Wo adetɔfoɔ",
    zu: "Amakhasimende akho",
  },
  clientWord: {
    en: "client",
    ha: "abokin ciniki",
    yo: "oníbàárà",
    ig: "onye ahịa",
    fr: "client",
    pt: "cliente",
    sw: "mteja",
    ar: "عميل",
    tw: "adetɔni",
    zu: "ikhasimende",
  },
  clientsWord: {
    en: "clients",
    ha: "abokan ciniki",
    yo: "àwọn oníbàárà",
    ig: "ndị ahịa",
    fr: "clients",
    pt: "clientes",
    sw: "wateja",
    ar: "عملاء",
    tw: "adetɔfoɔ",
    zu: "amakhasimende",
  },
  rosterEmpty: {
    en: "Nobody yet. Once you invite someone and they finish intake, they appear here with a live completion score.",
    ha: "Babu kowa tukuna. Da zarar ka gayyaci wani kuma ya kammala shigarwa, zai bayyana a nan tare da madogarar cikawa mai rai.",
    yo: "Kò sí ẹnikẹ́ni síbẹ̀. Bí o bá ti pe ẹnìkan tí ó sì parí ìforúkọsílẹ̀ rẹ̀, yóò farahàn níhìn-ín pẹ̀lú ìwọ̀n ìparí tí ń ṣiṣẹ́ lọ́wọ́lọ́wọ́.",
    ig: "Ọ dịbeghị onye. Ozugbo ị kpọrọ mmadụ oku ma ọ gwụchaa nzuputa ya, ọ ga-apụta ebe a ya na akara mmecha dị ndụ.",
    fr: "Personne pour l'instant. Dès que vous invitez quelqu'un et qu'il termine son admission, il apparaît ici avec un score d'achèvement en direct.",
    pt: "Ainda ninguém. Assim que convidar alguém e essa pessoa concluir a sua admissão, ela aparece aqui com uma pontuação de conclusão em tempo real.",
    sw: "Bado hakuna mtu. Mara utakapomwalika mtu na akamilishe uandikishaji wake, ataonekana hapa akiwa na alama ya ukamilifu inayosasishwa.",
    ar: "لا يوجد أحد بعد. بمجرد أن تدعو شخصاً ويكمل تسجيله، سيظهر هنا بدرجة إنجاز مباشرة.",
    tw: "Obiara nnim. Sɛ wofrɛ obi na ɔwie ne nkyerɛmu a, ɔbɛpue wɔ ha a ɔwɔ ewiei akontaahyɛde a ɛda hɔ.",
    zu: "Akekho namuntu okwamanje. Uma usumema umuntu futhi eseqedile ukubhaliswa kwakhe, uzovela lapha enamaphuzu okuqedwa asebenzayo.",
  },
  routeNotSet: {
    en: "Route not set",
    ha: "Ba a saita hanya ba",
    yo: "A kò tíì ṣètò ipa ọ̀nà",
    ig: "Edobebeghị ụzọ",
    fr: "Itinéraire non défini",
    pt: "Rota não definida",
    sw: "Njia haijawekwa",
    ar: "لم يتم تحديد المسار",
    tw: "Wɔnhyehyɛɛ kwan",
    zu: "Indlela ayikasethwa",
  },
  documentsVerified: {
    en: "{verified} of {total} verified",
    ha: "{verified} daga cikin {total} an tabbatar",
    yo: "{verified} nínú {total} tí a ti fọwọ́sí",
    ig: "{verified} n'ime {total} akwadoro",
    fr: "{verified} sur {total} vérifiés",
    pt: "{verified} de {total} verificados",
    sw: "{verified} kati ya {total} zimethibitishwa",
    ar: "{verified} من أصل {total} تم التحقق منها",
    tw: "{total} mu {verified} na wɔahwɛ mu ahu sɛ ɛyɛ nokware",
    zu: "{verified} kwezingu-{total} eziqinisekisiwe",
  },
  /**
   * That these figures are the whole agency's, not the reader's own.
   *
   * Needed because the dashboard is agency-wide for everybody who opens
   * it: a handler with four cases sees the agency's forty and has no
   * way to tell from the numbers alone. Role-based overviews were
   * deferred to the next iteration on 8 September, and this sentence is
   * what makes the deferral safe rather than misleading in the
   * meantime. It comes out when the split lands.
   */
  overviewIsAgencyWide: {
    en: "These figures cover the whole agency, not only your own cases.",
    ha: "Waɗannan lambobin sun shafi dukan hukumar, ba naka kaɗai ba.",
    yo: "Àwọn nọ́mbà wọ̀nyí kan gbogbo ilé-iṣẹ́ náà, kì í ṣe tìrẹ nìkan.",
    ig: "Ọnụọgụ ndị a metụtara ụlọ ọrụ dum, ọ bụghị naanị nke gị.",
    fr: "Ces chiffres couvrent toute l'agence, pas seulement vos dossiers.",
    pt: "Estes números abrangem toda a agência, não apenas os seus casos.",
    sw: "Takwimu hizi zinahusu wakala mzima, si kesi zako pekee.",
    ar: "تشمل هذه الأرقام الوكالة بأكملها، وليس حالاتك وحدها.",
    tw: "Saa akontabuo yi fa adwumakuo no nyinaa ho, ɛnyɛ wo deɛ nkoaa.",
    zu: "Lezi zibalo zifaka yonke i-ejensi, hhayi amacala akho kuphela.",
  },
  /**
   * The colleagues an agency has asked to join, on `/agency/team`.
   *
   * Its own string rather than the one below: an agency invites two
   * kinds of person, and the panel over a list of colleagues must not
   * say clients — which is exactly what it did between renaming that
   * string and this.
   */
  teamInvitationsLabel: {
    en: "Team invitations",
    ha: "Gayyatar ƙungiya",
    yo: "Àwọn ìpè ẹgbẹ́",
    ig: "Ọkpụkpọ ndị otu",
    fr: "Invitations de l'équipe",
    pt: "Convites de equipa",
    sw: "Mialiko ya timu",
    ar: "دعوات الفريق",
    tw: "Kuo no nfrɛ",
    zu: "Izimemo zethimba",
  },
  /**
   * "Client invitations", not "Invitations".
   *
   * An agency invites two different kinds of person — a colleague onto
   * the team, and a client onto a case — and the bare word named
   * neither. The client asked for the distinction on 8 September, in
   * the nav and on the page the button now sits on.
   */
  invitationsLabel: {
    en: "Client invitations",
    ha: "Gayyatar abokan ciniki",
    yo: "Àwọn ìpè oníbàárà",
    ig: "Ọkpụkpọ ndị ahịa",
    fr: "Invitations clients",
    pt: "Convites de clientes",
    sw: "Mialiko ya wateja",
    ar: "دعوات العملاء",
    tw: "Adetɔfoɔ nfrɛ",
    zu: "Izimemo zamakhasimende",
  },
  /**
   * The lead under the heading on `/agency/clients/invitations`, which
   * was a second panel at the foot of the roster until 2026-09-08. It
   * says what an invitation *is* here, because the page it left made
   * that obvious by proximity and a page of its own does not.
   */
  invitationsPageBody: {
    en: "Addresses you have invited to become clients, and what has become of each one.",
    ha: "Adireshin da ka gayyata don su zama abokan ciniki, da abin da ya faru da kowanne.",
    yo: "Àwọn àdírẹ́sì tí o pè láti di oníbàárà, àti ohun tí ó ṣẹlẹ̀ sí ọ̀kọ̀ọ̀kan.",
    ig: "Adreesị ndị ị kpọrọ òkù ka ha bụrụ ndị ahịa, na ihe mere nke ọ bụla.",
    fr: "Les adresses que vous avez invitées à devenir clientes, et ce qu'il est advenu de chacune.",
    pt: "Endereços que convidou para se tornarem clientes, e o que aconteceu a cada um.",
    sw: "Anwani ulizoalika kuwa wateja, na kilichotokea kwa kila moja.",
    ar: "العناوين التي دعوتها لتصبح عملاء، وما آل إليه كل منها.",
    tw: "Adreseɛ a woafrɛ sɛ wɔnyɛ adetɔfoɔ, ne deɛ asi biara.",
    zu: "Amakheli owamemile ukuthi abe ngamakhasimende, nokwenzeke kulelo nalelo.",
  },
  pendingWord: {
    en: "pending",
    ha: "jiran amsa",
    yo: "tí ń dúró",
    ig: "na-echere",
    fr: "en attente",
    pt: "pendentes",
    sw: "zinazosubiri",
    ar: "قيد الانتظار",
    tw: "retwɛn",
    zu: "kulindile",
  },
  invitationsEmpty: {
    en: "Nobody has been invited yet. Send an invitation and it appears here until it is accepted, revoked or expires.",
    ha: "Ba a gayyaci kowa ba tukuna. Aika gayyata kuma za ta bayyana a nan har sai an amince da ita, an soke ta, ko ta ƙare.",
    yo: "A kò tíì pe ẹnikẹ́ni síbẹ̀. Fi ìpè ránṣẹ́, yóò sì farahàn níhìn-ín títí a óo fi tẹ́wọ́gbà á, yọkúrò tàbí kí ó parí.",
    ig: "Akpọbeghị onye ọ bụla oku. Zipu ọkpụkpọ ma ọ ga-apụta ebe a ruo mgbe a nabatara ya, kagburu ya ma ọ bụ ọ kwụsịrị.",
    fr: "Personne n'a encore été invité. Envoyez une invitation et elle apparaît ici jusqu'à ce qu'elle soit acceptée, révoquée ou expirée.",
    pt: "Ainda ninguém foi convidado. Envie um convite e ele aparece aqui até ser aceite, revogado ou expirar.",
    sw: "Bado hakuna aliyealikwa. Tuma mwaliko nao utaonekana hapa hadi ukubaliwe, ubatilishwe au umalizike muda wake.",
    ar: "لم تتم دعوة أحد بعد. أرسل دعوة وستظهر هنا حتى يتم قبولها أو إلغاؤها أو انتهاء صلاحيتها.",
    tw: "Wɔnnfrɛɛ obiara ɛnora. Soma frɛ na ɛbɛda ha akɔsi sɛ wɔbɛgye atom, wɔatwa mu, anaasɛ ano bɛtɔ.",
    zu: "Akekho osemenywa okwamanje. Thumela isimemo bese sivela lapha kuze kube siyamukelwa, sihoxiswe noma siphelelwe yisikhathi.",
  },
  destinationNotSet: {
    en: "Destination not set",
    ha: "Ba a saita wurin zuwa ba",
    yo: "A kò tíì ṣètò ibi tí ó ń lọ",
    ig: "Edobebeghị ebe a na-aga",
    fr: "Destination non définie",
    pt: "Destino não definido",
    sw: "Unakoenda hakujawekwa",
    ar: "لم يتم تحديد الوجهة",
    tw: "Wɔnhyehyɛɛ baabi a wɔrekɔ",
    zu: "Indawo oya kuyo ayikasethwa",
  },
  timelineInvitedExpires: {
    en: "Invited {created} · expires {expires}",
    ha: "An gayyata {created} · ƙarewa {expires}",
    yo: "A pè {created} · yóò parí {expires}",
    ig: "A kpọrọ oku {created} · ga-agwụ {expires}",
    fr: "Invité le {created} · expire le {expires}",
    pt: "Convidado a {created} · expira a {expires}",
    sw: "Alialikwa {created} · itaisha {expires}",
    ar: "دُعي في {created} · تنتهي في {expires}",
    tw: "Wɔfrɛɛ no {created} · ano bɛtɔ {expires}",
    zu: "Umenywe {created} · iphelelwa {expires}",
  },
  timelineAccepted: {
    en: "Accepted {date}",
    ha: "An amince a ranar {date}",
    yo: "A tẹ́wọ́gbà á ní {date}",
    ig: "Anabatara ya {date}",
    fr: "Acceptée le {date}",
    pt: "Aceite a {date}",
    sw: "Ilikubaliwa {date}",
    ar: "تم القبول في {date}",
    tw: "Wɔgyee tom {date}",
    zu: "Yamukelwe {date}",
  },
  timelineExpired: {
    en: "Expired {date}",
    ha: "Ta ƙare a ranar {date}",
    yo: "Ó parí ní {date}",
    ig: "Kwụsịrị {date}",
    fr: "Expirée le {date}",
    pt: "Expirou a {date}",
    sw: "Ilimalizika {date}",
    ar: "انتهت في {date}",
    tw: "Ano tɔɔ {date}",
    zu: "Iphelelwe {date}",
  },
  timelineInvited: {
    en: "Invited {date}",
    ha: "An gayyata a ranar {date}",
    yo: "A pè á ní {date}",
    ig: "A kpọrọ oku {date}",
    fr: "Invité le {date}",
    pt: "Convidado a {date}",
    sw: "Alialikwa {date}",
    ar: "دُعي في {date}",
    tw: "Wɔfrɛɛ no {date}",
    zu: "Umenywe {date}",
  },
  assignedToYou: {
    en: "Assigned to you",
    ha: "An ba ka su",
    yo: "Tí a fi lé ọ lọ́wọ́",
    ig: "Enyere gị",
    fr: "Qui vous sont confiés",
    pt: "Atribuídos a si",
    sw: "Uliyopewa",
    ar: "المسندة إليك",
    tw: "A wɔde ama wo",
    zu: "Okwabelwe wena",
  },
  assignedEmpty: {
    en: "Nothing is yours yet. Your director hands you a case, or you take one from the list below.",
    ha: "Babu abin da yake naka tukuna. Daraktan zai ba ka shari'a, ko kuma ka ɗauki ɗaya daga jerin da ke ƙasa.",
    yo: "Kò sí ohun tí í ṣe tìrẹ síbẹ̀. Olùdarí rẹ yóò fi ẹjọ́ lé ọ lọ́wọ́, tàbí kí o gba ọ̀kan nínú àtòjọ tí ó wà nísàlẹ̀.",
    ig: "Ọ dịghị ihe bụ nke gị. Onye nduzi gị ga-enye gị ikpe, ma ọ bụ were otu site na ndepụta dị n'okpuru.",
    fr: "Rien ne vous est encore confié. Votre directeur vous confie un dossier, ou vous en prenez un dans la liste ci-dessous.",
    pt: "Ainda não tem nada. O seu diretor entrega-lhe um processo, ou assume um da lista abaixo.",
    sw: "Bado huna chochote. Mkurugenzi wako atakupa kesi, au uchukue moja kwenye orodha iliyo hapa chini.",
    ar: "لا شيء لك بعد. سيسند إليك المدير حالة، أو تأخذ واحدة من القائمة أدناه.",
    tw: "Biribiara nyɛ wo dea ɛnnɛ. Wo panyin de asɛm bi bɛma wo, anaasɛ wo ara fa bi firi nhwɛso a ɛwɔ aseɛ no mu.",
    zu: "Akukho okungokwakho okwamanje. Umqondisi wakho ukunika icala, noma uthathe elilodwa ohlwini olungezansi.",
  },
  noAssignedClients: {
    en: "You have not been assigned a client yet. Your director hands you one, or you take an open case from your dashboard.",
    ha: "Ba a ba ka wani abokin ciniki ba tukuna. Daraktan zai ba ka ɗaya, ko kuma ka ɗauki shari'a a buɗe daga dashbod ɗinka.",
    yo: "A kò tíì fi oníbàárà kankan lé ọ lọ́wọ́. Olùdarí rẹ yóò fún ọ ní ọ̀kan, tàbí kí o gba ẹjọ́ tí ó ṣí sílẹ̀ láti pátákó rẹ.",
    ig: "E nyebeghị gị onye ahịa. Onye nduzi gị ga-enye gị otu, ma ọ bụ were ikpe ghere oghe site na dashboard gị.",
    fr: "Aucun client ne vous a encore été confié. Votre directeur vous en confie un, ou vous prenez un dossier ouvert depuis votre tableau de bord.",
    pt: "Ainda não lhe foi atribuído nenhum cliente. O seu diretor entrega-lhe um, ou assume um caso aberto a partir do seu painel.",
    sw: "Bado hujapewa mteja. Mkurugenzi wako atakupa mmoja, au uchukue kesi iliyo wazi kutoka kwenye dashibodi yako.",
    ar: "لم يُسند إليك أي عميل بعد. سيسند إليك المدير عميلاً، أو تأخذ حالة مفتوحة من لوحتك.",
    tw: "Wɔmfaa adetɔni biara mmaa wo. Wo panyin de baako bɛma wo, anaasɛ wofa asɛm a ɛda hɔ firi wo dashboard so.",
    zu: "Awukanikwa ikhasimende. Umqondisi wakho ukunika elilodwa, noma uthathe icala elivulekile kudeshibhodi yakho.",
  },
  unclaimedLabel: {
    en: "Open to your team",
    ha: "A buɗe ga ƙungiyarka",
    yo: "Ó ṣí sílẹ̀ fún ẹgbẹ́ rẹ",
    ig: "Ọ ghere oghe nye ndị otu gị",
    fr: "Ouverts à votre équipe",
    pt: "Abertos à sua equipa",
    sw: "Wazi kwa timu yako",
    ar: "متاحة لفريقك",
    tw: "Ɛbue ma wo kuo",
    zu: "Kuvulekele ithimba lakho",
  },
  unclaimedEmpty: {
    en: "Nobody is waiting. Every client here has a handler.",
    ha: "Babu wanda ke jira. Kowane abokin ciniki a nan yana da mai kula da shi.",
    yo: "Kò sí ẹni tí ń dúró. Gbogbo oníbàárà níbí ní ẹni tí ń bójú tó wọn.",
    ig: "Ọ dịghị onye na-eche. Onye ahịa ọ bụla ebe a nwere onye na-ahụ maka ya.",
    fr: "Personne n'attend. Chaque client ici a quelqu'un qui le suit.",
    pt: "Ninguém está à espera. Cada cliente aqui tem quem o acompanhe.",
    sw: "Hakuna anayesubiri. Kila mteja hapa ana anayemshughulikia.",
    ar: "لا أحد ينتظر. كل عميل هنا لديه من يتولاه.",
    tw: "Obiara nretwɛn. Adetɔni biara a ɔwɔ ha wɔ obi a ɔhwɛ ne so.",
    zu: "Akekho olindile. Ikhasimende ngalinye lapha linaye omphathayo.",
  },
  clientsCardBody: {
    en: "Everyone whose visa you are handling, with a live completion score for each.",
    ha: "Duk wanda kake sarrafa bizarsa, tare da madogarar cikawa mai rai ga kowanne.",
    yo: "Gbogbo ẹni tí o ń ṣàkóso fisa rẹ̀, pẹ̀lú ìwọ̀n ìparí tí ń ṣiṣẹ́ lọ́wọ́lọ́wọ́ fún ẹnìkọ̀ọ̀kan.",
    ig: "Onye ọ bụla ị na-elekọta visa ya, ya na akara mmecha dị ndụ maka onye ọ bụla.",
    fr: "Toutes les personnes dont vous gérez le visa, avec un score d'achèvement en direct pour chacune.",
    pt: "Todas as pessoas cujo visto está a tratar, com uma pontuação de conclusão em tempo real para cada uma.",
    sw: "Kila mtu ambaye unashughulikia visa yake, na alama ya ukamilifu inayosasishwa kwa kila mmoja.",
    ar: "كل شخص تتولى تأشيرته، مع درجة إنجاز مباشرة لكل واحد منهم.",
    tw: "Obiara a woredi ne visa ho dwuma, a ewiei akontaahyɛde a ɛda hɔ ka obiara ho.",
    zu: "Wonke umuntu omphathela i-visa yakhe, enamaphuzu okuqedwa asebenzayo ngamunye.",
  },
  teamCardBody: {
    en: "The colleagues who review your clients' documents.",
    ha: "Abokan aikin da suke duba takardun abokan cinikinka.",
    yo: "Àwọn alábàáṣiṣẹ́ tí wọ́n ń ṣàyẹ̀wò àwọn ìwé àwọn oníbàárà rẹ.",
    ig: "Ndị ọrụ ibe gị na-enyocha akwụkwọ ndị ahịa gị.",
    fr: "Les collègues qui vérifient les documents de vos clients.",
    pt: "Os colegas que verificam os documentos dos seus clientes.",
    sw: "Wenzako wanaokagua nyaraka za wateja wako.",
    ar: "الزملاء الذين يراجعون مستندات عملائك.",
    tw: "Wo nnwumayɛfoɔ a wɔhwɛ wo adetɔfoɔ nkrataa so.",
    zu: "Ozakwenu abahlola amadokhumenti amakhasimende akho.",
  },
  yourTeamLabel: {
    en: "Your team",
    ha: "Ƙungiyarka",
    yo: "Ẹgbẹ́ rẹ",
    ig: "Ndị otu gị",
    fr: "Votre équipe",
    pt: "A sua equipa",
    sw: "Timu yako",
    ar: "فريقك",
    tw: "Wo kuo",
    zu: "Ithimba lakho",
  },
  memberWord: {
    en: "member",
    ha: "memba",
    yo: "ọmọ ẹgbẹ́",
    ig: "onye otu",
    fr: "membre",
    pt: "membro",
    sw: "mwanachama",
    ar: "عضو",
    tw: "memba",
    zu: "ilungu",
  },
  membersWord: {
    en: "members",
    ha: "membobi",
    yo: "àwọn ọmọ ẹgbẹ́",
    ig: "ndị otu",
    fr: "membres",
    pt: "membros",
    sw: "wanachama",
    ar: "أعضاء",
    tw: "memfoɔ",
    zu: "amalungu",
  },
  teamEmpty: {
    en: "Only you so far. Invite a colleague and they appear here once they accept.",
    ha: "Kai kaɗai ne har yanzu. Gayyaci abokin aiki, zai bayyana a nan da zarar ya amince.",
    yo: "Ìwọ nìkan ni fún ìsinsìnyí. Pe alábàáṣiṣẹ́ kan, yóò sì farahàn níhìn-ín bí ó bá ti tẹ́wọ́gbà.",
    ig: "Naanị gị ruo ugbu a. Kpọọ onye ọrụ ibe gị oku, ọ ga-apụta ebe a ozugbo ọ nabatara.",
    fr: "Vous seul pour l'instant. Invitez un collègue et il apparaîtra ici dès qu'il aura accepté.",
    pt: "Só você por enquanto. Convide um colega e ele aparece aqui assim que aceitar.",
    sw: "Wewe pekee kwa sasa. Mwalike mwenzako naye ataonekana hapa mara atakapokubali.",
    ar: "أنت وحدك حتى الآن. ادعُ زميلاً وسيظهر هنا بمجرد قبوله.",
    tw: "Wo nko ara na ɛwɔ hɔ seesei. Frɛ wo yɔnko adwumayɛni na ɔbɛpue wɔ ha sɛ ɔgye tom a.",
    zu: "Nguwe wedwa okwamanje. Mema ozakwenu bese evela lapha uma esamukela.",
  },
  teamInvitationsEmpty: {
    en: "No colleague has been invited yet. Send an invitation and it appears here until it is accepted, revoked or expires.",
    ha: "Ba a gayyaci wani abokin aiki ba tukuna. Aika gayyata kuma za ta bayyana a nan har sai an amince da ita, an soke ta, ko ta ƙare.",
    yo: "A kò tíì pe alábàáṣiṣẹ́ kankan. Fi ìpè ránṣẹ́, yóò sì farahàn níhìn-ín títí a óo fi tẹ́wọ́gbà á, yọkúrò tàbí kí ó parí.",
    ig: "Akpọbeghị onye ọrụ ibe ọ bụla oku. Zipu ọkpụkpọ ma ọ ga-apụta ebe a ruo mgbe a nabatara ya, kagburu ya ma ọ bụ ọ kwụsịrị.",
    fr: "Aucun collègue n'a encore été invité. Envoyez une invitation et elle apparaît ici jusqu'à ce qu'elle soit acceptée, révoquée ou expirée.",
    pt: "Ainda não foi convidado nenhum colega. Envie um convite e ele aparece aqui até ser aceite, revogado ou expirar.",
    sw: "Bado hakuna mwenzako aliyealikwa. Tuma mwaliko nao utaonekana hapa hadi ukubaliwe, ubatilishwe au umalizike muda wake.",
    ar: "لم تتم دعوة أي زميل بعد. أرسل دعوة وستظهر هنا حتى يتم قبولها أو إلغاؤها أو انتهاء صلاحيتها.",
    tw: "Wɔnnfrɛɛ adwumayɛni foforɔ biara ɛnora. Soma frɛ na ɛbɛda ha akɔsi sɛ wɔbɛgye atom, wɔatwa mu, anaasɛ ano bɛtɔ.",
    zu: "Akekho ozakwenu osemenywa. Thumela isimemo bese sivela lapha kuze kube siyamukelwa, sihoxiswe noma siphelelwe yisikhathi.",
  },
  joinedOn: {
    en: "Joined {date}",
    ha: "Ya shiga {date}",
    yo: "Ó dara pọ̀ ní {date}",
    ig: "Ọ sonyere {date}",
    fr: "A rejoint le {date}",
    pt: "Entrou a {date}",
    sw: "Alijiunga {date}",
    ar: "انضم في {date}",
    tw: "Ɔbaa mu {date}",
    zu: "Ujoyine {date}",
  },
  jobTitleNotSet: {
    en: "Colleague",
    ha: "Abokin aiki",
    yo: "Alábàáṣiṣẹ́",
    ig: "Onye ọrụ ibe",
    fr: "Collègue",
    pt: "Colega",
    sw: "Mwenzako",
    ar: "زميل",
    tw: "Adwumayɛni",
    zu: "Ozakwenu",
  },
  searchClients: {
    en: "Search clients…",
    ha: "Nemi abokan ciniki…",
    yo: "Wá àwọn oníbàárà…",
    ig: "Chọọ ndị ahịa…",
    fr: "Rechercher des clients…",
    pt: "Pesquisar clientes…",
    sw: "Tafuta wateja…",
    ar: "البحث عن العملاء…",
    tw: "Hwehwɛ adetɔfoɔ…",
    zu: "Sesha amakhasimende…",
  },
  anyStatus: {
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
  anyDate: {
    en: "Any date",
    ha: "Kowane kwanan wata",
    yo: "Ọjọ́ yòówù",
    ig: "Ụbọchị ọ bụla",
    fr: "Toute date",
    pt: "Qualquer data",
    sw: "Tarehe yoyote",
    ar: "أي تاريخ",
    tw: "Da biara",
    zu: "Noma yiluphi usuku",
  },
  dateLast7: {
    en: "Last 7 days",
    ha: "Kwanaki 7 da suka wuce",
    yo: "Ọjọ́ 7 sẹ́yìn",
    ig: "Ụbọchị 7 gara aga",
    fr: "7 derniers jours",
    pt: "Últimos 7 dias",
    sw: "Siku 7 zilizopita",
    ar: "آخر 7 أيام",
    tw: "Nna 7 a atwam",
    zu: "Izinsuku ezingu-7 ezedlule",
  },
  dateLast30: {
    en: "Last 30 days",
    ha: "Kwanaki 30 da suka wuce",
    yo: "Ọjọ́ 30 sẹ́yìn",
    ig: "Ụbọchị 30 gara aga",
    fr: "30 derniers jours",
    pt: "Últimos 30 dias",
    sw: "Siku 30 zilizopita",
    ar: "آخر 30 يومًا",
    tw: "Nna 30 a atwam",
    zu: "Izinsuku ezingu-30 ezedlule",
  },
  dateLast90: {
    en: "Last 90 days",
    ha: "Kwanaki 90 da suka wuce",
    yo: "Ọjọ́ 90 sẹ́yìn",
    ig: "Ụbọchị 90 gara aga",
    fr: "90 derniers jours",
    pt: "Últimos 90 dias",
    sw: "Siku 90 zilizopita",
    ar: "آخر 90 يومًا",
    tw: "Nna 90 a atwam",
    zu: "Izinsuku ezingu-90 ezedlule",
  },
  dateNotSubmitted: {
    en: "Not submitted",
    ha: "Ba a gabatar ba",
    yo: "Kò tíì fi ránṣẹ́",
    ig: "Ezigabeghị",
    fr: "Non envoyé",
    pt: "Não enviado",
    sw: "Haijawasilishwa",
    ar: "لم يُرسل",
    tw: "Wɔmfaa mmenae",
    zu: "Akuthunyelwe",
  },
  kpi: {
    // Settled client fees. Deliberately not called "revenue": the money
    // is the traveller's fee for their own application, and an agency
    // reading it as its own earnings would be reading the wrong ledger.
    clientsPaid: {
      label: {
        en: "Paid by clients",
        ha: "Abokan ciniki sun biya",
        yo: "Ó san láti ọwọ́ àwọn oníbàárà",
        ig: "Ndị ahịa kwụrụ",
        fr: "Payé par les clients",
        pt: "Pago pelos clientes",
        sw: "Kilicholipwa na wateja",
        ar: "ما دفعه العملاء",
        tw: "Deɛ adetɔfoɔ atua",
        zu: "Okukhokhwe amakhasimende",
      },
      sub: {
        en: "Settled application fees",
        ha: "Kuɗin nema da aka biya",
        yo: "Owó ìbéèrè tí a ti san",
        ig: "Ụgwọ ngwa arịrịọ akwụchara",
        fr: "Frais de dossier réglés",
        pt: "Taxas de candidatura liquidadas",
        sw: "Ada za maombi zilizolipwa",
        ar: "رسوم الطلبات المسددة",
        tw: "Abisadeɛ ho ka a wɔatua",
        zu: "Izimali zezicelo ezikhokhiwe",
      },
      // Shown instead of the plain sub line when settled fees exist in
      // more than one currency, because the figure above is then one
      // currency's total rather than everything clients have paid.
      mixed: {
        en: "In one currency — others not shown",
        ha: "A kuɗi ɗaya — ba a nuna sauran ba",
        yo: "Nínú owó kan ṣoṣo — a kò fi àwọn yòókù hàn",
        ig: "N'otu ego — egosighị ndị ọzọ",
        fr: "Dans une seule devise — les autres ne sont pas affichées",
        pt: "Numa só moeda — as outras não são mostradas",
        sw: "Kwa sarafu moja — nyingine hazionyeshwi",
        ar: "بعملة واحدة — لا تظهر العملات الأخرى",
        tw: "Sika baako mu — wɔnkyerɛ nkaeɛ no",
        zu: "Ngohlobo olulodwa lwemali — okunye akuboniswa",
      },
    },
    clients: {
      label: {
        en: "Clients",
        ha: "Abokan ciniki",
        yo: "Àwọn oníbàárà",
        ig: "Ndị ahịa",
        fr: "Clients",
        pt: "Clientes",
        sw: "Wateja",
        ar: "العملاء",
        tw: "Adetɔfoɔ",
        zu: "Amakhasimende",
      },
      sub: {
        en: "Everyone this agency is handling",
        ha: "Duk wanda wannan kamfani ke kula da shi",
        yo: "Gbogbo ẹni tí àjọ yìí ń bójú tó",
        ig: "Onye ọ bụla ụlọ ọrụ a na-elekọta",
        fr: "Toutes les personnes suivies par cette agence",
        pt: "Todas as pessoas que esta agência acompanha",
        sw: "Kila mtu ambaye shirika hili linamshughulikia",
        ar: "كل من تتولى هذه الوكالة ملفه",
        tw: "Obiara a saa akuo yi hwɛ ne so",
        zu: "Wonke umuntu le nhlangano emsizayo",
      },
    },
    awaitingReview: {
      label: {
        en: "Awaiting review",
        ha: "Ana jiran bita",
        yo: "Ń dúró de àyẹ̀wò",
        ig: "Na-echere nyocha",
        fr: "En attente d'examen",
        pt: "A aguardar revisão",
        sw: "Inasubiri ukaguzi",
        ar: "في انتظار المراجعة",
        tw: "Ɛretwɛn nhwehwɛmu",
        zu: "Kulindwe ukubuyekezwa",
      },
      sub: {
        en: "Sent in, and nobody has opened it yet",
        ha: "An aika, amma babu wanda ya buɗe shi tukuna",
        yo: "A ti fi ránṣẹ́, kò sí ẹni tí ó ṣí i síbẹ̀",
        ig: "E zigara ya, ọ dịghị onye mepere ya",
        fr: "Envoyé, et personne ne l'a encore ouvert",
        pt: "Enviado, e ainda ninguém o abriu",
        sw: "Imetumwa, na bado hakuna aliyeifungua",
        ar: "أُرسل، ولم يفتحه أحد بعد",
        tw: "Wɔde amena, na obiara mmuee no",
        zu: "Kuthunyelwe, futhi akekho osevule",
      },
    },
    withHandler: {
      label: {
        en: "With a handler",
        ha: "Yana hannun mai kula",
        yo: "Ó wà lọ́wọ́ olùbójútó",
        ig: "Ọ nọ n'aka onye na-elekọta",
        fr: "Chez un agent",
        pt: "Com um agente",
        sw: "Kwa wakala",
        ar: "لدى موظف",
        tw: "Ɛwɔ ɔhwɛfoɔ nsam",
        zu: "Kumphathi",
      },
      sub: {
        en: "A colleague has the file open",
        ha: "Wani abokin aiki yana da fayil ɗin a buɗe",
        yo: "Alábàáṣiṣẹ́ kan ní fáìlì náà ní ṣíṣí",
        ig: "Otu onye ọrụ ibe mepere faịlụ ahụ",
        fr: "Un collègue a le dossier ouvert",
        pt: "Um colega tem o processo aberto",
        sw: "Mwenzako amefungua faili",
        ar: "زميل يفتح الملف حاليًا",
        tw: "Adwumayɛni bi abue fael no",
        zu: "Ozakwenu uvule ifayela",
      },
    },
    invitations: {
      label: {
        en: "Outstanding invitations",
        ha: "Gayyata da ba a amsa ba",
        yo: "Àwọn ìpè tí a kò tíì gbà",
        ig: "Òkù a na-echere",
        fr: "Invitations en attente",
        pt: "Convites pendentes",
        sw: "Mialiko inayosubiri",
        ar: "دعوات معلقة",
        tw: "Nsato a wɔnnyee so",
        zu: "Izimemo ezilindile",
      },
      sub: {
        en: "Sent, and not yet accepted",
        ha: "An aika, ba a karɓa ba tukuna",
        yo: "A ti fi ránṣẹ́, kò tíì gbà",
        ig: "E zigara, a nabatabeghị ya",
        fr: "Envoyées, pas encore acceptées",
        pt: "Enviados, ainda não aceites",
        sw: "Imetumwa, bado haijakubaliwa",
        ar: "أُرسلت، ولم تُقبل بعد",
        tw: "Wɔde amena, na wonnyee so",
        zu: "Kuthunyelwe, akukamukelwa",
      },
    },
  },
  tableHead: {
    client: {
      en: "Client",
      ha: "Abokin ciniki",
      yo: "Oníbàárà",
      ig: "Onye ahịa",
      fr: "Client",
      pt: "Cliente",
      sw: "Mteja",
      ar: "العميل",
      tw: "Adetɔfoɔ",
      zu: "Iklayenti",
    },
    route: {
      en: "Route",
      ha: "Hanya",
      yo: "Ọ̀nà",
      ig: "Ụzọ",
      fr: "Itinéraire",
      pt: "Rota",
      sw: "Njia",
      ar: "المسار",
      tw: "Kwan",
      zu: "Umzila",
    },
    documents: {
      en: "Documents",
      ha: "Takardu",
      yo: "Àwọn ìwé",
      ig: "Akwụkwọ",
      fr: "Documents",
      pt: "Documentos",
      sw: "Nyaraka",
      ar: "المستندات",
      tw: "Nkrataa",
      zu: "Amadokhumenti",
    },
    status: {
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
    submitted: {
      en: "Submitted",
      ha: "An gabatar",
      yo: "A fi ránṣẹ́",
      ig: "Ezigara",
      fr: "Envoyé",
      pt: "Enviado",
      sw: "Imewasilishwa",
      ar: "تم الإرسال",
      tw: "Wɔde amena",
      zu: "Kuthunyelwe",
    },
    colleague: {
      en: "Colleague",
      ha: "Abokin aiki",
      yo: "Alábàáṣiṣẹ́",
      ig: "Onye ọrụ ibe",
      fr: "Collègue",
      pt: "Colega",
      sw: "Mwenzako",
      ar: "زميل",
      tw: "Adwumayɛni",
      zu: "Ozakwenu",
    },
    joined: {
      en: "Joined",
      ha: "Ya shiga",
      yo: "Ó dara pọ̀",
      ig: "Ọ sonyeere",
      fr: "Arrivé",
      pt: "Entrou",
      sw: "Alijiunga",
      ar: "انضم",
      tw: "Ɔbɛkaa ho",
      zu: "Wajoyina",
    },
    rank: {
      en: "Rank",
      ha: "Matsayi",
      yo: "Ipò",
      ig: "Ọkwa",
      fr: "Rôle",
      pt: "Função",
      sw: "Cheo",
      ar: "الرتبة",
      tw: "Dibea",
      zu: "Isikhundla",
    },
    invitation: {
      en: "Invitation",
      ha: "Gayyata",
      yo: "Ìpè",
      ig: "Òkù",
      fr: "Invitation",
      pt: "Convite",
      sw: "Mwaliko",
      ar: "الدعوة",
      tw: "Nsato",
      zu: "Isimemo",
    },
    destination: {
      en: "Destination",
      ha: "Inda za a je",
      yo: "Ibi tí a ń lọ",
      ig: "Ebe a na-aga",
      fr: "Destination",
      pt: "Destino",
      sw: "Unakoenda",
      ar: "الوجهة",
      tw: "Baabi a wɔrekɔ",
      zu: "Indawo oya kuyo",
    },
    jobTitle: {
      en: "Job title",
      ha: "Sunan aiki",
      yo: "Orúkọ iṣẹ́",
      ig: "Aha ọrụ",
      fr: "Fonction",
      pt: "Cargo",
      sw: "Cheo cha kazi",
      ar: "المسمى الوظيفي",
      tw: "Adwuma din",
      zu: "Isihloko somsebenzi",
    },
  },
  pipelineTitle: {
    en: "Where your clients' cases stop",
    ha: "Inda shari'o'in abokan cinikinku ke tsayawa",
    yo: "Ibi tí àwọn ẹjọ́ oníbàárà yín ń dúró sí",
    ig: "Ebe ikpe ndị ahịa gị na-akwụsị",
    fr: "Où s'arrêtent les dossiers de vos clients",
    pt: "Onde param os processos dos seus clientes",
    sw: "Mahali kesi za wateja wako zinasimama",
    ar: "أين تتوقف ملفات عملائك",
    tw: "Baabi a wo adetɔfoɔ nsɛm gyina",
    zu: "Lapho amacala amakhasimende akho ema khona",
  },
  pipelineEmpty: {
    en: "No cases yet. Each stage fills in as your clients work through their documents.",
    ha: "Babu shari'a tukuna. Kowane mataki zai cika yayin da abokan cinikinku ke aiki kan takardunsu.",
    yo: "Kò sí ẹjọ́ kankan síbẹ̀. Ìpele kọ̀ọ̀kan yóò kún bí àwọn oníbàárà yín ṣe ń ṣiṣẹ́ lórí àwọn ìwé wọn.",
    ig: "Enweghị ikpe ugbu a. Ogbo ọ bụla na-ejupụta ka ndị ahịa gị na-arụ ọrụ na akwụkwọ ha.",
    fr: "Aucun dossier pour l'instant. Chaque étape se remplit à mesure que vos clients avancent dans leurs documents.",
    pt: "Ainda não há processos. Cada etapa preenche-se à medida que os seus clientes tratam dos documentos.",
    sw: "Bado hakuna kesi. Kila hatua hujaa wateja wako wanapoendelea na hati zao.",
    ar: "لا توجد ملفات بعد. تمتلئ كل مرحلة مع تقدّم عملائك في مستنداتهم.",
    tw: "Asɛm biara nni hɔ seesei. Ɔfa biara bɛyɛ ma bere a wo adetɔfoɔ reyɛ wɔn nkrataa ho adwuma.",
    zu: "Awekho amacala okwamanje. Isigaba ngasinye siyagcwala njengoba amakhasimende akho eqhubeka namadokhumenti awo.",
  },
  pipelineOfPrevious: {
    en: "{pct} of previous",
    ha: "{pct} na na baya",
    yo: "{pct} nínú tí ó ṣáájú",
    ig: "{pct} nke nke gara aga",
    fr: "{pct} de l'étape précédente",
    pt: "{pct} da etapa anterior",
    sw: "{pct} ya hatua iliyotangulia",
    ar: "{pct} من المرحلة السابقة",
    tw: "{pct} wɔ deɛ ɛdi kan no mu",
    zu: "{pct} yesigaba esidlule",
  },
  pipelineStalled: {
    en: "{n} never submitted",
    ha: "{n} ba a taɓa aikawa ba",
    yo: "{n} kò fi ránṣẹ́ rárá",
    ig: "{n} ezigaghị ya ma ọlị",
    fr: "{n} jamais envoyé",
    pt: "{n} nunca enviado",
    sw: "{n} hawakuwahi kuwasilisha",
    ar: "{n} لم يُرسل قط",
    tw: "{n} amfa ankɔ da",
    zu: "{n} abakaze bathumele",
  },
  funnel: {
    started: {
      en: "Started",
      ha: "An fara",
      yo: "Bẹ̀rẹ̀",
      ig: "Malitere",
      fr: "Commencé",
      pt: "Iniciado",
      sw: "Imeanza",
      ar: "بدأ",
      tw: "Afiri aseɛ",
      zu: "Kuqaliwe",
    },
    intake: {
      en: "Finished intake",
      ha: "An kammala tambayoyi",
      yo: "Parí ìforúkọsílẹ̀",
      ig: "Mechara ajụjụ mbata",
      fr: "Questionnaire terminé",
      pt: "Questionário concluído",
      sw: "Amemaliza maswali",
      ar: "أكمل الاستبيان",
      tw: "Awie nsɛmmisa no",
      zu: "Uqedile imibuzo",
    },
    collected: {
      en: "Documents complete",
      ha: "Takardu sun cika",
      yo: "Àwọn ìwé ti pé",
      ig: "Akwụkwọ zuru ezu",
      fr: "Documents complets",
      pt: "Documentos completos",
      sw: "Hati zimekamilika",
      ar: "اكتملت المستندات",
      tw: "Nkrataa no awie",
      zu: "Amadokhumenti aphelele",
    },
    submitted: {
      en: "Submitted",
      ha: "An aika",
      yo: "Ti fi ránṣẹ́",
      ig: "Ezigara ya",
      fr: "Envoyé",
      pt: "Enviado",
      sw: "Imewasilishwa",
      ar: "تم الإرسال",
      tw: "Wɔde akɔ",
      zu: "Kuthunyelwe",
    },
    decided: {
      en: "Decided",
      ha: "An yanke shawara",
      yo: "Ti pinnu",
      ig: "Ekpebiela",
      fr: "Décidé",
      pt: "Decidido",
      sw: "Imeamuliwa",
      ar: "تم البت فيه",
      tw: "Wɔasi gyinaeɛ",
      zu: "Kunqunyiwe",
    },
  },
  billTitle: {
    en: "What your agency is charged",
    ha: "Abin da ake caji kamfaninku",
    yo: "Ohun tí a ń gba lọ́wọ́ àjọ yín",
    ig: "Ihe a na-anara ụlọ ọrụ gị",
    fr: "Ce que votre agence paie",
    pt: "O que a sua agência paga",
    sw: "Kile shirika lako linatozwa",
    ar: "ما تدفعه وكالتك",
    tw: "Deɛ wɔgye firi wo adwumakuo hɔ",
    zu: "Okukhokhiswa inhlangano yakho",
  },
  billEmpty: {
    en: "No billing history yet. A cycle appears here once your agency has been through one.",
    ha: "Babu tarihin biyan kuɗi tukuna. Zagaye zai bayyana nan da zarar kamfaninku ya cika ɗaya.",
    yo: "Kò sí ìtàn ìsanwó síbẹ̀. Àkókò kan yóò farahàn níhìn-ín ní kété tí àjọ yín bá ti kọjá ọ̀kan.",
    ig: "Enweghị akụkọ ụgwọ ugbu a. Otu oge ga-apụta ebe a ozugbo ụlọ ọrụ gị gafere otu.",
    fr: "Aucun historique de facturation. Un cycle apparaîtra ici dès que votre agence en aura terminé un.",
    pt: "Ainda não há histórico de faturação. Um ciclo aparece aqui assim que a sua agência concluir um.",
    sw: "Bado hakuna historia ya malipo. Mzunguko utaonekana hapa mara shirika lako litakapokamilisha mmoja.",
    ar: "لا يوجد سجل فوترة بعد. تظهر الدورة هنا بمجرد أن تُكمل وكالتك واحدة.",
    tw: "Sika tua ho abakɔsɛm biara nni hɔ. Bere bi bɛda adi ha bere a wo adwumakuo awie baako.",
    zu: "Awukho umlando wokukhokha okwamanje. Umjikelezo uvela lapha uma inhlangano yakho isiqede owodwa.",
  },
  billCharged: {
    en: "Charged",
    ha: "An caji",
    yo: "Tí a gbà",
    ig: "Anara ya",
    fr: "Facturé",
    pt: "Cobrado",
    sw: "Imetozwa",
    ar: "المبلغ المستحق",
    tw: "Wɔagye",
    zu: "Kukhokhisiwe",
  },
  billBaseFee: {
    en: "Base fee",
    ha: "Kuɗin asali",
    yo: "Owó ìpìlẹ̀",
    ig: "Ụgwọ ntọala",
    fr: "Forfait de base",
    pt: "Taxa base",
    sw: "Ada ya msingi",
    ar: "الرسوم الأساسية",
    tw: "Ntoasoɔ ka",
    zu: "Imali eyisisekelo",
  },
  billPerCase: {
    en: "Per case",
    ha: "Kowace shari'a",
    yo: "Fún ẹjọ́ kọ̀ọ̀kan",
    ig: "Maka ikpe ọ bụla",
    fr: "Par dossier",
    pt: "Por processo",
    sw: "Kwa kila kesi",
    ar: "لكل ملف",
    tw: "Asɛm biara",
    zu: "Ngecala ngalinye",
  },
  billCases: {
    en: "{n} cases this cycle",
    ha: "Shari'o'i {n} a wannan zagaye",
    yo: "Ẹjọ́ {n} ní àkókò yìí",
    ig: "Ikpe {n} n'oge a",
    fr: "{n} dossiers ce cycle",
    pt: "{n} processos neste ciclo",
    sw: "Kesi {n} katika mzunguko huu",
    ar: "{n} ملفات في هذه الدورة",
    tw: "Nsɛm {n} wɔ saa bere yi mu",
    zu: "Amacala angu-{n} kulo mjikelezo",
  },
  billThisCycle: {
    en: "This cycle",
    ha: "Wannan zagaye",
    yo: "Àkókò yìí",
    ig: "Oge a",
    fr: "Ce cycle",
    pt: "Este ciclo",
    sw: "Mzunguko huu",
    ar: "هذه الدورة",
    tw: "Saa bere yi",
    zu: "Lo mjikelezo",
  },
  /**
   * The client-fee chart's words.
   *
   * Every one of these is written to avoid a single sentence:
   * "your earnings". The fees are the traveller's, paid to BeOrchid for
   * their own application — `payment_shape_matches_kind` in `schema.ts`
   * is explicit that the agency is not the payee — and what an agency
   * charges its own clients is not modelled in this product at all.
   * `clientFeesNote` says so on the panel rather than leaving a director
   * to assume the friendlier reading.
   */
  clientFeesTitle: {
    en: "Paid by your clients",
    ha: "Abokan cinikinku sun biya",
    yo: "Ó san láti ọwọ́ àwọn oníbàárà rẹ",
    ig: "Ndị ahịa gị kwụrụ",
    fr: "Payé par vos clients",
    pt: "Pago pelos seus clientes",
    sw: "Kilicholipwa na wateja wako",
    ar: "ما دفعه عملاؤك",
    tw: "Deɛ w'adetɔfoɔ atua",
    zu: "Okukhokhwe amakhasimende akho",
  },
  clientFeesWindow: {
    en: "Last 6 months",
    ha: "Watanni 6 da suka gabata",
    yo: "Oṣù 6 sẹ́yìn",
    ig: "Ọnwa 6 gara aga",
    fr: "6 derniers mois",
    pt: "Últimos 6 meses",
    sw: "Miezi 6 iliyopita",
    ar: "آخر 6 أشهر",
    tw: "Abosome 6 a atwam",
    zu: "Izinyanga eziyi-6 ezedlule",
  },
  clientFeesNote: {
    en: "Application fees your clients paid Toplance. Not your agency's own charges.",
    ha: "Kuɗin nema da abokan cinikinku suka biya Toplance. Ba kuɗin da hukumarku ke karɓa ba.",
    yo: "Owó ìbéèrè tí àwọn oníbàárà rẹ san fún Toplance. Kì í ṣe owó tí ilé-iṣẹ́ rẹ gbà.",
    ig: "Ụgwọ arịrịọ ndị ahịa gị kwụrụ Toplance. Ọ bụghị ụgwọ ụlọ ọrụ gị na-ana.",
    fr: "Frais de dossier que vos clients ont payés à Toplance. Pas les honoraires de votre agence.",
    pt: "Taxas de candidatura que os seus clientes pagaram à Toplance. Não os honorários da sua agência.",
    sw: "Ada za maombi ambazo wateja wako walilipa Toplance. Si malipo ya wakala wako.",
    ar: "رسوم الطلبات التي دفعها عملاؤك إلى Toplance. وليست أتعاب وكالتك.",
    tw: "Abisadeɛ ho ka a w'adetɔfoɔ tuaa Toplance. Ɛnyɛ wo adwumakuo no ankasa ka.",
    zu: "Izimali zezicelo amakhasimende akho azikhokhele i-Toplance. Akuzona izimali ze-ejensi yakho.",
  },
  clientFeesEmpty: {
    en: "No client fees have settled in the last six months.",
    ha: "Babu kuɗin abokan ciniki da aka biya cikin watanni shida da suka gabata.",
    yo: "Kò sí owó oníbàárà kankan tí a san ní oṣù mẹ́fà sẹ́yìn.",
    ig: "Ọ dịghị ụgwọ ndị ahịa akwụchara n'ọnwa isii gara aga.",
    fr: "Aucun frais client n'a été réglé ces six derniers mois.",
    pt: "Nenhuma taxa de cliente foi liquidada nos últimos seis meses.",
    sw: "Hakuna ada za wateja zilizolipwa katika miezi sita iliyopita.",
    ar: "لم تُسدَّد أي رسوم عملاء خلال الأشهر الستة الماضية.",
    tw: "Wɔntuaa adetɔfoɔ ho ka biara wɔ abosome nsia a atwam no mu.",
    zu: "Azikho izimali zamakhasimende ezikhokhelwe ezinyangeni eziyisithupha ezedlule.",
  },
  clientFeesPaid: {
    en: "Paid",
    ha: "An biya",
    yo: "A san",
    ig: "Akwụrụ",
    fr: "Payé",
    pt: "Pago",
    sw: "Imelipwa",
    ar: "مدفوع",
    tw: "Wɔatua",
    zu: "Kukhokhiwe",
  },
  clientFeesCases: {
    en: "{n} cases paid for",
    ha: "An biya shari'o'i {n}",
    yo: "A san fún ẹjọ́ {n}",
    ig: "A kwụrụ ụgwọ ikpe {n}",
    fr: "{n} dossiers payés",
    pt: "{n} processos pagos",
    sw: "Kesi {n} zimelipiwa",
    ar: "{n} ملفات مدفوعة",
    tw: "Wɔatua nsɛm {n} ho ka",
    zu: "Amacala angu-{n} akhokhelwe",
  },
  clientFeesMixed: {
    en: "Fees settled in another currency are not shown here.",
    ha: "Ba a nuna kuɗin da aka biya da wata kuɗi daban a nan ba.",
    yo: "A kò fi owó tí a san ní owó orílẹ̀-èdè mìíràn hàn níbí.",
    ig: "Egosighị ụgwọ akwụrụ n'ego ọzọ ebe a.",
    fr: "Les frais réglés dans une autre devise ne figurent pas ici.",
    pt: "As taxas liquidadas noutra moeda não aparecem aqui.",
    sw: "Ada zilizolipwa kwa sarafu nyingine hazionyeshwi hapa.",
    ar: "الرسوم المسددة بعملة أخرى غير معروضة هنا.",
    tw: "Wɔnkyerɛ ka a wɔtua wɔ sika foforɔ mu wɔ ha.",
    zu: "Izimali ezikhokhwe ngenye imali azivezwa lapha.",
  },
  billStatus: {
    paid: {
      en: "Paid",
      ha: "An biya",
      yo: "Ti san",
      ig: "Akwụọla",
      fr: "Payé",
      pt: "Pago",
      sw: "Imelipwa",
      ar: "مدفوع",
      tw: "Watua",
      zu: "Kukhokhiwe",
    },
    draft: {
      en: "Still accruing",
      ha: "Har yanzu yana ƙaruwa",
      yo: "Ó ṣì ń pọ̀ sí i",
      ig: "Ka na-abawanye",
      fr: "En cours d'accumulation",
      pt: "Ainda a acumular",
      sw: "Bado inaongezeka",
      ar: "قيد التراكم",
      tw: "Ɛda so redɔɔso",
      zu: "Kusanda",
    },
    open: {
      en: "Outstanding",
      ha: "Ba a biya ba",
      yo: "Kò tíì san",
      ig: "Akwụbeghị",
      fr: "Impayé",
      pt: "Em dívida",
      sw: "Bado haijalipwa",
      ar: "غير مسدد",
      tw: "Wɔntuaeɛ",
      zu: "Akukakhokhwa",
    },
    failed: {
      en: "Payment failed",
      ha: "Biyan kuɗi ya gaza",
      yo: "Ìsanwó kùnà",
      ig: "Ịkwụ ụgwọ dara",
      fr: "Échec du paiement",
      pt: "Pagamento falhou",
      sw: "Malipo yameshindikana",
      ar: "فشل الدفع",
      tw: "Sika tua no anyɛ yie",
      zu: "Ukukhokha kwehlulekile",
    },
  },
};
