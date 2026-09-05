import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * Static copy on the auth pages themselves: `(auth)/layout.tsx`'s footer
 * link, `/sign-up`'s invitation-only dead end, and the marketing panel
 * each of the three branded doors (employer sign-up, employer sign-in,
 * ops sign-in) carries next to the form. These are Server Components, so
 * every field here is read with `getLocale()`, never `useT()`.
 *
 * `DEAD_END_MESSAGE`'s own titles (`src/components/invite/dead-end.tsx`)
 * are out of scope for this file — that component is not owned here —
 * so an expired/revoked/accepted token still shows an English title even
 * where the surrounding page is translated. See the handoff notes.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the
 * English, like `HERO` before it.
 */
/**
 * The `<title>` each auth page sets. Kept apart from the copy above
 * because these are read with `generateMetadata()`, not rendered inline —
 * a separate call to `getLocale()` from the one the page body makes.
 */
export const AUTH_PAGE_TITLES: {
  signIn: L;
  signUp: L;
  employerSignIn: L;
  employerSignUp: L;
  opsSignIn: L;
} = {
  signIn: {
    en: "Sign in",
    ha: "Shiga",
    yo: "Wọlé",
    ig: "Banye",
    fr: "Se connecter",
    pt: "Entrar",
    sw: "Ingia",
    ar: "تسجيل الدخول",
    tw: "Hyɛn mu",
    zu: "Ngena",
  },
  signUp: {
    en: "Create your account",
    ha: "Ƙirƙiri asusunka",
    yo: "Dá àkọọ́lẹ̀ rẹ sílẹ̀",
    ig: "Mepụta akaụntụ gị",
    fr: "Créez votre compte",
    pt: "Crie a sua conta",
    sw: "Fungua akaunti yako",
    ar: "أنشئ حسابك",
    tw: "Yɛ wo akaunt",
    zu: "Dala i-akhawunti yakho",
  },
  employerSignIn: {
    en: "Employer sign-in",
    ha: "Shigar ma'aikaci",
    yo: "Ìwọlé agbanisíṣẹ́",
    ig: "Nbanye onye ọrụ",
    fr: "Connexion employeur",
    pt: "Início de sessão de empregador",
    sw: "Kuingia kwa mwajiri",
    ar: "تسجيل دخول صاحب العمل",
    tw: "Adwumawura hyɛn mu",
    zu: "Ukungena komqashi",
  },
  employerSignUp: {
    en: "Employer sign-up",
    ha: "Rijistar ma'aikaci",
    yo: "Ìforúkọsílẹ̀ agbanisíṣẹ́",
    ig: "Ndebanye aha onye ọrụ",
    fr: "Inscription employeur",
    pt: "Registo de empregador",
    sw: "Usajili wa mwajiri",
    ar: "تسجيل صاحب العمل",
    tw: "Adwumawura akwankyerɛ",
    zu: "Ukubhalisa umqashi",
  },
  opsSignIn: {
    en: "Operations sign-in",
    ha: "Shigar ma'aikata",
    yo: "Ìwọlé iṣẹ́",
    ig: "Nbanye ọrụ",
    fr: "Connexion opérations",
    pt: "Início de sessão das operações",
    sw: "Kuingia kwa uendeshaji",
    ar: "تسجيل دخول العمليات",
    tw: "Nnwuma mu hyɛn",
    zu: "Ukungena komsebenzi",
  },
};

export const AUTH_LAYOUT: { backToSite: L } = {
  backToSite: {
    en: "Back to toplance.ca",
    ha: "Koma zuwa toplance.ca",
    yo: "Padà sí toplance.ca",
    ig: "Laghachi na toplance.ca",
    fr: "Retour à toplance.ca",
    pt: "Voltar a toplance.ca",
    sw: "Rudi toplance.ca",
    ar: "العودة إلى toplance.ca",
    tw: "San kɔ toplance.ca",
    zu: "Buyela ku-toplance.ca",
  },
};

export const SIGN_UP_PAGE: {
  noTokenTitle: L;
  noTokenBody: L;
  signInLink: L;
  invalidTokenBody: L;
  alreadyHaveAccountSignIn: L;
} = {
  noTokenTitle: {
    en: "Toplance accounts are created by invitation",
    ha: "Ana ƙirƙiro asusun Toplance ne ta hanyar gayyata",
    yo: "Wọ́n ń dá àwọn àkọọ́lẹ̀ Toplance sílẹ̀ nípasẹ̀ ìpè",
    ig: "A na-emepụta akaụntụ Toplance site na òkù",
    fr: "Les comptes Toplance sont créés sur invitation",
    pt: "As contas Toplance são criadas por convite",
    sw: "Akaunti za Toplance huundwa kwa mwaliko",
    ar: "تُنشأ حسابات Toplance عن طريق الدعوة",
    tw: "Wɔyɛ Toplance akaunt denam nsakraeɛ so",
    zu: "Ama-akhawunti e-Toplance enziwa ngokumenywa",
  },
  noTokenBody: {
    en: "An organisation sponsors your application and sends you a link. If you are expecting one, ask whoever is arranging your travel — and if you already have an account, sign in instead.",
    ha: "Wata ƙungiya ce ke ɗaukar nauyin buƙatarka kuma ta aiko maka da hanyar haɗi. Idan kana jiran ɗaya, tambayi wanda ke shirya tafiyarka — kuma idan kana da asusu tuni, ka shiga a maimakon haka.",
    yo: "Àjọ kan ni ó ń ṣàrànṣe ìbéèrè rẹ tí ó sì ń fi ìjápọ̀ ránṣẹ́ sí ọ. Bí o bá ń retí ọ̀kan, béèrè lọ́wọ́ ẹni tí ń ṣètò ìrìnàjò rẹ — bí o bá sì ti ní àkọọ́lẹ̀ tẹ́lẹ̀, wọlé dípò bẹ́ẹ̀.",
    ig: "Ụlọ ọrụ na-akwado ngwa gị ma zigara gị njikọ. Ọ bụrụ na ị na-atụ anya nke a, jụọ onye na-ahazi njem gị — ọ bụrụkwa na ị nweelarị akaụntụ, banye kama.",
    fr: "Une organisation parraine votre demande et vous envoie un lien. Si vous en attendez un, demandez à la personne qui organise votre voyage — et si vous avez déjà un compte, connectez-vous plutôt.",
    pt: "Uma organização patrocina o seu pedido e envia-lhe uma ligação. Se está à espera de uma, pergunte a quem está a organizar a sua viagem — e se já tem uma conta, inicie sessão em vez disso.",
    sw: "Shirika hufadhili ombi lako na kukutumia kiungo. Ikiwa unatarajia kimoja, muulize anayepanga safari yako — na ikiwa tayari una akaunti, ingia badala yake.",
    ar: "تتولى إحدى المؤسسات رعاية طلبك وترسل لك رابطاً. إذا كنت تنتظر واحداً، فاسأل من يرتب سفرك — وإذا كان لديك حساب بالفعل، فسجّل الدخول بدلاً من ذلك.",
    tw: "Kuo bi hwɛ wo application so na ɔsoma wo link. Sɛ wotwɛn bi a, bisa obi a ɔrehyehyɛ wo akwantuo — na sɛ wowɔ akaunt dedaw a, hyɛn mu mmom.",
    zu: "Inhlangano ixhasa isicelo sakho futhi ikuthumelele isixhumanisi. Uma ulindele esinye, buza noma ubani ohlela uhambo lwakho — futhi uma usunayo i-akhawunti, ngena kunalokho.",
  },
  signInLink: {
    en: "Sign in",
    ha: "Shiga",
    yo: "Wọlé",
    ig: "Banye",
    fr: "Se connecter",
    pt: "Entrar",
    sw: "Ingia",
    ar: "تسجيل الدخول",
    tw: "Hyɛn mu",
    zu: "Ngena",
  },
  invalidTokenBody: {
    en: "Ask whoever invited you to send a new one — nothing about your account has changed.",
    ha: "Ka tambayi wanda ya gayyace ka ya aika sabon ɗaya — babu abin da ya canja game da asusunka.",
    yo: "Béèrè lọ́wọ́ ẹni tí ó pè ọ́ láti fi ọ̀kan tuntun ránṣẹ́ — kò sí ohunkóhun tí ó yí padà nípa àkọọ́lẹ̀ rẹ.",
    ig: "Jụọ onye kpọrọ gị ka o zigara gị nke ọhụrụ — ọ dịghị ihe gbanwere gbasara akaụntụ gị.",
    fr: "Demandez à la personne qui vous a invité de vous en envoyer un nouveau — rien n'a changé concernant votre compte.",
    pt: "Peça a quem o convidou que envie um novo — nada mudou na sua conta.",
    sw: "Muulize aliyekualika akutumie mpya — hakuna kilichobadilika kuhusu akaunti yako.",
    ar: "اطلب ممن دعاك أن يرسل لك رابطاً جديداً — لم يتغيّر شيء بشأن حسابك.",
    tw: "Bisa obi a ɔto wo nsa frɛɛ wo no ma ɔnsoma foforo — biribiara nsesaee wɔ wo akaunt ho.",
    zu: "Cela lowo owakumemayo akuthumelele esisha — akukho okushintshile mayelana ne-akhawunti yakho.",
  },
  alreadyHaveAccountSignIn: {
    en: "Already have an account? Sign in",
    ha: "Kana da asusu tuni? Shiga",
    yo: "Ṣé o ti ní àkọọ́lẹ̀ tẹ́lẹ̀? Wọlé",
    ig: "Ị nweelarị akaụntụ? Banye",
    fr: "Vous avez déjà un compte ? Se connecter",
    pt: "Já tem uma conta? Entrar",
    sw: "Tayari una akaunti? Ingia",
    ar: "هل لديك حساب بالفعل؟ سجّل الدخول",
    tw: "Wowɔ akaunt dedaw? Hyɛn mu",
    zu: "Usunayo i-akhawunti? Ngena",
  },
};

/**
 * The claim shown next to the form on the employer sign-up and employer
 * sign-in pages — deliberately identical text in both places, in the
 * same words and order as the landing page's organisations section.
 */
export const EMPLOYER_DOOR_PANEL: {
  tag: L;
  heading: L;
  body: L;
  bullets: [L, L, L];
} = {
  tag: {
    en: "For organisations",
    ha: "Ga kamfanoni",
    yo: "Fún àwọn àjọ",
    ig: "Maka ụlọ ọrụ",
    fr: "Pour les organisations",
    pt: "Para organizações",
    sw: "Kwa mashirika",
    ar: "للمؤسسات",
    tw: "Ma nkuraa ne akuw",
    zu: "Ezinhlangano",
  },
  heading: {
    en: "You see progress, not documents",
    ha: "Kana ganin ci gaba, ba takardu ba",
    yo: "Ìtẹ̀síwájú ni ó ń rí, kì í ṣe àwọn ìwé",
    ig: "Ị na-ahụ ọganihu, ọ bụghị akwụkwọ",
    fr: "Vous voyez l'avancement, pas les documents",
    pt: "Vê o progresso, não os documentos",
    sw: "Unaona maendeleo, si nyaraka",
    ar: "أنت ترى التقدّم، لا المستندات",
    tw: "Wohu nkɔso, ɛnyɛ nkrataa",
    zu: "Ubona inqubekelaphambili, hhayi amadokhumenti",
  },
  body: {
    en: "The organisation console shows completion, status and destination for everyone whose seat you sponsor. Passports, bank statements and police certificates stay between the traveler and Toplance.",
    ha: "Dashbodin ƙungiya yana nuna cikawa, matsayi da wurin zuwa na kowa da kuke ɗaukar nauyin wurinsa. Fasfo, bayanan banki da takardar shaidar ɗan sanda suna tsakanin matafiyi da Toplance kaɗai.",
    yo: "Pátákò àjọ ń fi ìparí, ipò àti ibi tí wọ́n ń lọ hàn fún gbogbo ẹni tí o ṣàrànṣe àyè rẹ̀. Ìwé ìrìnnà, àkọsílẹ̀ báǹkì àti ìwé ẹ̀rí ọlọ́pàá wà láàrin arìnrìn-àjò àti Toplance nìkan.",
    ig: "Ihuenyo ụlọ ọrụ na-egosi mmecha, ọnọdụ na ebe ọ na-aga maka onye ọ bụla ị kwadoro oche ya. Paspọtụ, akwụkwọ ndekọ ụlọ akụ na asambodo ndị uwe ojii na-anọ naanị n'etiti onye njem na Toplance.",
    fr: "Le tableau de bord de l'organisation affiche l'avancement, le statut et la destination de chaque personne dont vous parrainez le siège. Passeports, relevés bancaires et certificats de police restent entre le voyageur et Toplance.",
    pt: "O painel da organização mostra a conclusão, o estado e o destino de todas as pessoas cujo lugar patrocina. Passaportes, extratos bancários e certificados de registo criminal ficam apenas entre o viajante e a Toplance.",
    sw: "Dashibodi ya shirika inaonyesha ukamilifu, hali na mahali anapokwenda kila mtu unayemdhamini kiti. Pasipoti, taarifa za benki na vyeti vya polisi hubaki kati ya msafiri na Toplance pekee.",
    ar: "توضح لوحة تحكم المؤسسة نسبة الإنجاز والحالة والوجهة لكل شخص تموّل مقعده. تبقى جوازات السفر وكشوف الحسابات البنكية وشهادات حسن السير والسلوك بين المسافر و Toplance فقط.",
    tw: "Kuo no dashboard kyerɛ dwumadie a wɔawie, tebea ne baabi a obiara a wugye no kongua ho boa no rekɔ. Pasport, sikakorabea nsɛm ne polisifoɔ krataa gyina ɔkwantuni ne Toplance ntam nkutoo.",
    zu: "Ideshibhodi yenhlangano ibonisa ukuphothulwa, isimo nendawo yalowo naye owonke oxhasa isihlalo sakhe. Amaphasipoti, izitatimende zasebhange nezitifiketi zamaphoyisa kuhlala phakathi komhambi ne-Toplance kuphela.",
  },
  bullets: [
    {
      en: "Buy seats in advance and invite people by email",
      ha: "Sayi wurare tun da wuri ka kuma gayyaci mutane ta imel",
      yo: "Ra àwọn àyè ṣáájú kí o sì pe àwọn ènìyàn nípa ìmẹ́lì",
      ig: "Zụọ oche tupu oge ma kpọọ ndị mmadụ site na ozi-e",
      fr: "Achetez des sièges à l'avance et invitez vos collaborateurs par e-mail",
      pt: "Compre lugares antecipadamente e convide pessoas por e-mail",
      sw: "Nunua viti mapema na ualike watu kwa barua pepe",
      ar: "اشترِ المقاعد مسبقاً وادعُ الأشخاص عبر البريد الإلكتروني",
      tw: "Tɔ nkongua ansa na wode email frɛ nkurɔfoɔ",
      zu: "Thenga izihlalo kusengaphambili bese umema abantu nge-imeyili",
    },
    {
      en: "One roster with completion and status per person",
      ha: "Jeri ɗaya mai nuna cikawa da matsayin kowa",
      yo: "Àkójọ ọ̀kan pẹ̀lú ìparí àti ipò fún ẹnì kọ̀ọ̀kan",
      ig: "Otu ndepụta nwere mmecha na ọnọdụ nke onye ọ bụla",
      fr: "Un seul registre avec l'avancement et le statut de chaque personne",
      pt: "Uma única lista com a conclusão e o estado de cada pessoa",
      sw: "Orodha moja yenye ukamilifu na hali ya kila mtu",
      ar: "قائمة واحدة تعرض نسبة الإنجاز والحالة لكل شخص",
      tw: "Nhyehyɛeɛ biako a ɛkyerɛ obiara dwumadie a wawie ne ne tebea",
      zu: "Uhlu olulodwa oluneukuphothulwa nesimo somuntu ngamunye",
    },
    {
      en: "Nudge someone who has stalled without calling them",
      ha: "Tunatar da wanda ya makale ba tare da kiran su ba",
      yo: "Rán ẹni tí ó ti dúró jẹ́ létí láìpè wọ́n",
      ig: "Chetara onye kwụsịrị n'akwụkwa ya oku",
      fr: "Relancez quelqu'un qui a pris du retard sans avoir à l'appeler",
      pt: "Dê um empurrãozinho a quem parou, sem lhe ligar",
      sw: "Mkumbushe aliyekwama bila kumpigia simu",
      ar: "ذكّر شخصاً توقف عن المتابعة دون الاتصال به",
      tw: "Kae obi a watwɛn mu a wonnfrɛ no",
      zu: "Khumbuza umuntu ohlehlele emuva ngaphandle kokumshayela ucingo",
    },
  ],
};

export const OPS_DOOR_PANEL: {
  tag: L;
  heading: L;
  body: L;
  bullets: [L, L, L, L];
} = {
  tag: {
    en: "Staff entrance",
    ha: "Ƙofar ma'aikata",
    yo: "Ẹnu ọ̀nà òṣìṣẹ́",
    ig: "Ọnụ ụzọ ndị ọrụ",
    fr: "Entrée du personnel",
    pt: "Entrada da equipa",
    sw: "Mlango wa wafanyakazi",
    ar: "مدخل الموظفين",
    tw: "Adwumayɛfoɔ ɛpono",
    zu: "Umnyango wabasebenzi",
  },
  heading: {
    en: "Staff access only",
    ha: "Ma'aikata kaɗai ke da izinin shiga",
    yo: "Àwọn òṣìṣẹ́ nìkan ni a fún láààyè",
    ig: "Naanị ndị ọrụ nwere ohere",
    fr: "Accès réservé au personnel",
    pt: "Acesso apenas à equipa",
    sw: "Ufikiaji kwa wafanyakazi pekee",
    ar: "الدخول للموظفين فقط",
    tw: "Adwumayɛfoɔ nkutoo na wɔma wɔn kwan",
    zu: "Ukufinyelela kwabasebenzi kuphela",
  },
  body: {
    en: "This console holds identity documents for every applicant. Sessions are logged and every document view is recorded against your account.",
    ha: "Wannan dashbod yana riƙe da takardun shaida na kowane mai nema. Ana rikodin zaman aiki kuma ana rikodin kowane kallon takarda a kan asusunka.",
    yo: "Pátákò yìí ń tọ́jú àwọn ìwé ìdánimọ̀ fún olùbéèrè kọ̀ọ̀kan. A máa ń ṣàkọsílẹ̀ ìgbà ìlò, gbogbo ìgbà tí a bá sì wo ìwé ni a máa ń ṣàkọsílẹ̀ rẹ̀ sí àkọọ́lẹ̀ rẹ.",
    ig: "Ihuenyo a na-echekwa akwụkwọ njirimara maka onye ọ bụla na-arịọ. A na-edekọ oge nnọkọ, a na-edekwa oge ọ bụla e lere akwụkwọ anya na akaụntụ gị.",
    fr: "Cette console conserve les documents d'identité de chaque candidat. Les sessions sont journalisées et chaque consultation de document est enregistrée sur votre compte.",
    pt: "Esta consola guarda documentos de identidade de todos os candidatos. As sessões são registadas e cada visualização de documento é registada na sua conta.",
    sw: "Dashibodi hii inashikilia hati za utambulisho za kila mwombaji. Vipindi vinarekodiwa na kila kutazamwa kwa hati kunarekodiwa kwenye akaunti yako.",
    ar: "تحتفظ لوحة التحكم هذه بوثائق الهوية لكل مقدم طلب. تُسجَّل الجلسات ويُسجَّل كل عرض للمستند على حسابك.",
    tw: "Saa dashboard yi kora akwadaho krataa ma obiara a ɔabɔ mpaeɛ. Wɔkyerɛw session ho nsɛm na wɔkyerɛw krataa biara a wɔbɛhwɛ mu gu wo akaunt so.",
    zu: "Le deshibhodi igcina amadokhumenti obunikazi bawo wonke ofakayo. Iziseshini ziyarekhodwa futhi ukubukwa kwedokhumenti ngayinye kuyarekhodwa ku-akhawunti yakho.",
  },
  bullets: [
    {
      en: "A one-time code is emailed on every sign-in",
      ha: "Ana aika lambar amfani sau ɗaya ta imel a duk lokacin shiga",
      yo: "A máa fi àmì lílò-lẹ́ẹ̀kan ránṣẹ́ nípa ìmẹ́lì ní gbogbo ìgbà tí a bá wọlé",
      ig: "A na-eziga koodu otu ugbo site na ozi-e mgbe ọ bụla ị banyere",
      fr: "Un code à usage unique est envoyé par e-mail à chaque connexion",
      pt: "É enviado por e-mail um código de utilização única em cada início de sessão",
      sw: "Msimbo wa mara moja hutumwa kwa barua pepe kila unapoingia",
      ar: "يُرسل رمز لمرة واحدة عبر البريد الإلكتروني في كل تسجيل دخول",
      tw: "Wɔde one-time koodu somaa email berɛ biara a wobɛhyɛn mu",
      zu: "Ikhodi yakanye ithunyelwa nge-imeyili kuwo wonke ukungena",
    },
    {
      en: "An authenticator app is required as a second factor",
      ha: "Ana buƙatar manhajar tantancewa a matsayin hanya ta biyu",
      yo: "A nílò app ìdánimọ̀ gẹ́gẹ́ bí ọ̀nà kejì",
      ig: "A chọrọ ngwa nyocha dịka ihe nkwenye nke abụọ",
      fr: "Une application d'authentification est requise comme second facteur",
      pt: "É necessária uma aplicação de autenticação como segundo fator",
      sw: "Programu ya uthibitishaji inahitajika kama njia ya pili",
      ar: "يلزم تطبيق مصادقة كعامل ثانٍ",
      tw: "Wɔhwehwɛ authenticator app sɛ second factor",
      zu: "Kudingeka uhlelo lokuqinisekisa njengesici sesibili",
    },
    {
      en: "Sessions expire after 30 minutes idle",
      ha: "Zaman aiki yana ƙarewa bayan minti 30 na rashin aiki",
      yo: "Ìgbà ìlò máa parí lẹ́yìn ìṣẹ́jú 30 tí a kò bá lò ó",
      ig: "Oge nnọkọ na-agwụ mgbe nkeji 30 gabigara na-arụghị ọrụ",
      fr: "Les sessions expirent après 30 minutes d'inactivité",
      pt: "As sessões expiram ao fim de 30 minutos de inatividade",
      sw: "Vipindi huisha baada ya dakika 30 za kutofanya kazi",
      ar: "تنتهي صلاحية الجلسات بعد 30 دقيقة من عدم النشاط",
      tw: "Session tɔ sima bere a wonyɛ hwee sima 30 akyi",
      zu: "Iziseshini ziphelelwa isikhathi ngemva kwemizuzu engu-30 zingasetshenziswa",
    },
    {
      en: "Full audit trail on document access",
      ha: "Cikakken rikodin bincike a kan samun damar takardu",
      yo: "Àkọsílẹ̀ ìṣàyẹ̀wò kíkún lórí wíwọlé sí ìwé",
      ig: "Ndekọ nyocha zuru ezu na ohere ịbanye akwụkwọ",
      fr: "Traçabilité complète des accès aux documents",
      pt: "Registo de auditoria completo sobre o acesso a documentos",
      sw: "Kumbukumbu kamili ya ukaguzi kwenye ufikiaji wa hati",
      ar: "سجل تدقيق كامل للوصول إلى المستندات",
      tw: "Krataa mu kɔhwɛ nyinaa ho nsɛm a wɔakyerɛw",
      zu: "Umlando ophelele wokuhlolwa ekufinyeleleni amadokhumenti",
    },
  ],
};
