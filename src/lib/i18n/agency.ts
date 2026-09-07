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
  profileOrgLabel: L;
  roleLabel: { owner: L; reviewer: L };
  roleReason: { owner: L; reviewer: L };
  nameOrgLabel: L;
  nameOrgBody: L;
  yourOrganisationFallback: L;
  seatsInUse: L;
  seatCountNotSetOne: L;
  seatCountNotSetOther: L;
  pendingSuffixOne: L;
  pendingSuffixOther: L;
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
  profileOrgLabel: {
    en: "Agency",
    ha: "Kamfani",
    yo: "Àjọ",
    ig: "Ụlọ ọrụ",
    fr: "Agence",
    pt: "Agência",
    sw: "Wakala",
    ar: "الوكالة",
    tw: "Adwumakuo",
    zu: "I-ejensi",
  },
  roleLabel: {
    owner: {
      en: "Owner",
      ha: "Mai kamfani",
      yo: "Onílé-iṣẹ́",
      ig: "Onyenwe",
      fr: "Propriétaire",
      pt: "Proprietário",
      sw: "Mmiliki",
      ar: "المالك",
      tw: "Ɔwura",
      zu: "Umnikazi",
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
      en: "You are the owner because you created this organisation. Owners can invite people, manage the account and see everyone's progress.",
      ha: "Kai ne mai wannan kamfani domin kai ne ka kafa shi. Masu kamfani suna iya gayyatar mutane, su sarrafa asusun, kuma su ga ci gaban kowa da kowa.",
      yo: "Ìwọ ni onílé-iṣẹ́ nítorí ìwọ ni o dá àjọ yìí sílẹ̀. Àwọn onílé-iṣẹ́ lè pe àwọn ènìyàn, ṣàkóso àkọọ́lẹ̀ náà, kí wọ́n sì rí ìtẹ̀síwájú gbogbo ènìyàn.",
      ig: "Ị bụ onyenwe n'ihi na ị bụ onye guzobere ụlọ ọrụ a. Ndị nwe nwere ike ịkpọ ndị mmadụ oku, jikwaa akaụntụ ahụ, ma hụ ọganihu onye ọ bụla.",
      fr: "Vous êtes le propriétaire parce que vous avez créé cette organisation. Les propriétaires peuvent inviter des personnes, gérer le compte et voir la progression de chacun.",
      pt: "É o proprietário porque criou esta organização. Os proprietários podem convidar pessoas, gerir a conta e ver o progresso de todos.",
      sw: "Wewe ndiye mmiliki kwa sababu ndiwe uliyeunda shirika hili. Wamiliki wanaweza kualika watu, kusimamia akaunti na kuona maendeleo ya kila mtu.",
      ar: "أنت المالك لأنك أنشأت هذه المؤسسة. يمكن للمالكين دعوة الأشخاص وإدارة الحساب ورؤية تقدم الجميع.",
      tw: "Wone ɔwura no ɛfiri sɛ wo na wobɔɔ akuo yi. Awuranom bɛtumi afrɛ nnipa, ahwɛ akaunti no so, na wɔahu obiara nkɔso.",
      zu: "Ungumnikazi ngoba nguwe owadala le nhlangano. Abanikazi bangamema abantu, baphathe i-akhawunti futhi babone inqubekelaphambili yawo wonke umuntu.",
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
  seatsInUse: {
    en: "{used} of {seats} seats in use",
    ha: "{used} daga cikin {seats} wurare ana amfani da su",
    yo: "{used} nínú {seats} ipò tí à ń lò",
    ig: "{used} n'ime {seats} ọnọdụ ka a na-eji",
    fr: "{used} places sur {seats} utilisées",
    pt: "{used} de {seats} vagas em uso",
    sw: "{used} kati ya {seats} nafasi zinatumika",
    ar: "{used} من أصل {seats} مقعد قيد الاستخدام",
    tw: "{seats} mu {used} na wɔde redi dwuma",
    zu: "{used} kwezingu-{seats} izikhala ezisetshenzisiwe",
  },
  seatCountNotSetOne: {
    en: "{used} person · seat count not set yet",
    ha: "Mutum {used} · ba a saita adadin wurare ba tukuna",
    yo: "Ènìyàn {used} · a kò tíì ṣètò iye ipò",
    ig: "Mmadụ {used} · edobebeghị ọnụọgụ ọnọdụ",
    fr: "{used} personne · nombre de places non encore défini",
    pt: "{used} pessoa · número de vagas ainda não definido",
    sw: "Mtu {used} · idadi ya nafasi bado haijawekwa",
    ar: "{used} شخص · لم يُحدَّد عدد المقاعد بعد",
    tw: "Onipa {used} · wɔnhyehyɛɛ beaeɛ dodoɔ ɛnora",
    zu: "Umuntu {used} · inani lezikhala alikasethwa",
  },
  seatCountNotSetOther: {
    en: "{used} people · seat count not set yet",
    ha: "Mutane {used} · ba a saita adadin wurare ba tukuna",
    yo: "Àwọn ènìyàn {used} · a kò tíì ṣètò iye ipò",
    ig: "Ndị mmadụ {used} · edobebeghị ọnụọgụ ọnọdụ",
    fr: "{used} personnes · nombre de places non encore défini",
    pt: "{used} pessoas · número de vagas ainda não definido",
    sw: "Watu {used} · idadi ya nafasi bado haijawekwa",
    ar: "{used} أشخاص · لم يُحدَّد عدد المقاعد بعد",
    tw: "Nnipa {used} · wɔnhyehyɛɛ beaeɛ dodoɔ ɛnora",
    zu: "Abantu {used} · inani lezikhala alikasethwa",
  },
  pendingSuffixOne: {
    en: " · {n} invitation pending",
    ha: " · gayyata {n} tana jira",
    yo: " · ìpè {n} kan ń dúró",
    ig: " · ọkpụkpọ {n} nọ na-eche",
    fr: " · {n} invitation en attente",
    pt: " · {n} convite pendente",
    sw: " · mwaliko {n} unasubiri",
    ar: " · دعوة {n} قيد الانتظار",
    tw: " · frɛ {n} retwɛn",
    zu: " · isimemo {n} silindile",
  },
  pendingSuffixOther: {
    en: " · {n} invitations pending",
    ha: " · gayyata {n} suna jira",
    yo: " · ìpè {n} ń dúró",
    ig: " · ọkpụkpọ {n} na-eche",
    fr: " · {n} invitations en attente",
    pt: " · {n} convites pendentes",
    sw: " · mialiko {n} inasubiri",
    ar: " · {n} دعوات قيد الانتظار",
    tw: " · frɛ {n} retwɛn",
    zu: " · izimemo {n} zilindile",
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
  invitationsLabel: {
    en: "Invitations",
    ha: "Gayyata",
    yo: "Àwọn ìpè",
    ig: "Ọkpụkpọ",
    fr: "Invitations",
    pt: "Convites",
    sw: "Mialiko",
    ar: "الدعوات",
    tw: "Nfrɛ",
    zu: "Izimemo",
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
};
