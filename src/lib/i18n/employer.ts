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
 * `src/app/employer/page.tsx`.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const EMPLOYER: {
  pageTitle: L;
  navDashboard: L;
  roleLabel: { owner: L; hr_admin: L };
  roleReason: { owner: L; hr_admin: L };
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
  yourPeopleLabel: L;
  personWord: L;
  peopleWord: L;
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
    hr_admin: {
      en: "Administrator",
      ha: "Mai kula",
      yo: "Alábòójútó",
      ig: "Onye nchịkwa",
      fr: "Administrateur",
      pt: "Administrador",
      sw: "Msimamizi",
      ar: "المشرف",
      tw: "Sohwɛfoɔ",
      zu: "Umlawuli",
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
    hr_admin: {
      en: "You are an administrator because an owner invited you into this organisation. Administrators can invite people and see everyone's progress.",
      ha: "Kai mai kula ne domin wani mai kamfani ne ya gayyace ka zuwa cikin wannan kamfani. Masu kula suna iya gayyatar mutane kuma su ga ci gaban kowa da kowa.",
      yo: "Ìwọ ni alábòójútó nítorí onílé-iṣẹ́ kan ni ó pè ọ́ wọ àjọ yìí. Àwọn alábòójútó lè pe àwọn ènìyàn kí wọ́n sì rí ìtẹ̀síwájú gbogbo ènìyàn.",
      ig: "Ị bụ onye nchịkwa n'ihi na onyenwe kpọrọ gị oku ka ị banye n'ụlọ ọrụ a. Ndị nchịkwa nwere ike ịkpọ ndị mmadụ oku ma hụ ọganihu onye ọ bụla.",
      fr: "Vous êtes administrateur parce qu'un propriétaire vous a invité dans cette organisation. Les administrateurs peuvent inviter des personnes et voir la progression de chacun.",
      pt: "É administrador porque um proprietário o convidou para esta organização. Os administradores podem convidar pessoas e ver o progresso de todos.",
      sw: "Wewe ni msimamizi kwa sababu mmiliki alikualika kwenye shirika hili. Wasimamizi wanaweza kualika watu na kuona maendeleo ya kila mtu.",
      ar: "أنت مسؤول لأن أحد المالكين دعاك إلى هذه المؤسسة. يمكن للمسؤولين دعوة الأشخاص ورؤية تقدم الجميع.",
      tw: "Woyɛ sohwɛfoɔ ɛfiri sɛ ɔwura bi frɛɛ wo baa akuo yi mu. Asohwɛfoɔ bɛtumi afrɛ nnipa na wɔahu obiara nkɔso.",
      zu: "Ungumlawuli ngoba umnikazi wakumema kule nhlangano. Abalawuli bangamema abantu futhi babone inqubekelaphambili yawo wonke umuntu.",
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
  privacyHeading: {
    en: "You see progress, not documents",
    ha: "Kana ganin ci gaba, ba takardu ba",
    yo: "O rí ìtẹ̀síwájú, kì í ṣe àwọn ìwé",
    ig: "Ị na-ahụ ọganihu, ọ bụghị akwụkwọ",
    fr: "Vous voyez la progression, pas les documents",
    pt: "Vê o progresso, não os documentos",
    sw: "Unaona maendeleo, si nyaraka",
    ar: "ترى التقدم، لا المستندات",
    tw: "Wohu nkɔso, ɛnyɛ nkrataa",
    zu: "Ubona inqubekelaphambili, hhayi amadokhumenti",
  },
  privacyBody: {
    en: "Passports, bank statements and police certificates stay between the traveler and Toplance. You see the completion score, the status and whether someone is stuck.",
    ha: "Fasfo, cikakken bayanin banki da takardun sheda daga ‘yan sanda suna tsakanin matafiyi da Toplance kawai. Kana ganin madogarar cikawa, matsayi, da ko wani ya makale.",
    yo: "Ìwé ìrìnnà, àkọsílẹ̀ báńkì àti ìwé ẹ̀rí ọlọ́pàá wà láàrin arìnrìn àjò àti Toplance nìkan. O rí ìwọ̀n ìparí, ipò rẹ̀, àti bóyá ẹnìkan ti dúró jẹ́ẹ́.",
    ig: "Paspọtụ, nkọwa akaụntụ ụlọ akụ na akwụkwọ akaebe uwe ojii na-anọ naanị n'etiti onye njem na Toplance. Ị na-ahụ akara mmecha, ọnọdụ ya, na ma onye ọ bụla ọ dịghị aga n'ihu.",
    fr: "Les passeports, relevés bancaires et casiers judiciaires restent entre le voyageur et Toplance. Vous voyez le score d'achèvement, le statut et si quelqu'un est bloqué.",
    pt: "Passaportes, extratos bancários e certificados de registo criminal ficam apenas entre o viajante e a Toplance. Vê a pontuação de conclusão, o estado e se alguém está bloqueado.",
    sw: "Pasipoti, taarifa za benki na vyeti vya polisi hubaki kati ya msafiri na Toplance pekee. Unaona alama ya ukamilifu, hali, na kama kuna aliyekwama.",
    ar: "تبقى جوازات السفر وكشوف الحسابات المصرفية وشهادات الشرطة بين المسافر وToplance فقط. ترى درجة الإنجاز والحالة وما إذا كان أحدهم عالقاً.",
    tw: "Pasport, sikakorabea nkrataa, ne polisifoɔ adansedie krataa te ɔkwantuni ne Toplance ntam. Wohu ewiei akontaahyɛde, tebea, ne sɛ obi asisi anaa.",
    zu: "Amaphasipoti, izitatimende zasebhange nezitifiketi zamaphoyisa zihlala phakathi komhambi ne-Toplance. Ubona amaphuzu okuqedwa, isimo, nokuthi ngabe ukhona osesihibeni yini.",
  },
  yourPeopleLabel: {
    en: "Your people",
    ha: "Mutanenka",
    yo: "Àwọn ènìyàn rẹ",
    ig: "Ndị gị",
    fr: "Vos personnes",
    pt: "As suas pessoas",
    sw: "Watu wako",
    ar: "أفرادك",
    tw: "Wo nkurɔfoɔ",
    zu: "Abantu bakho",
  },
  personWord: {
    en: "person",
    ha: "mutum",
    yo: "ènìyàn",
    ig: "mmadụ",
    fr: "personne",
    pt: "pessoa",
    sw: "mtu",
    ar: "شخص",
    tw: "onipa",
    zu: "umuntu",
  },
  peopleWord: {
    en: "people",
    ha: "mutane",
    yo: "ènìyàn",
    ig: "ndị mmadụ",
    fr: "personnes",
    pt: "pessoas",
    sw: "watu",
    ar: "أشخاص",
    tw: "nnipa",
    zu: "abantu",
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
};
