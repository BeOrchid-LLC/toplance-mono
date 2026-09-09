import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/staff` — the screen where BeOrchid brings in its own people.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const OPS_STAFF: {
  heading: L;
  intro: L;
  inviteAction: L;
  dialogTitle: L;
  emailLabel: L;
  fullNameLabel: L;
  rankLabel: L;
  rankHint: L;
  send: L;
  sending: L;
  sent: L;
  notDelivered: L;
  invitationsEmpty: L;
  ownerOnly: L;
  secondFactorNotice: L;
  searchPlaceholder: L;
  anyStatus: L;
  anyRank: L;
  colleaguesPanel: L;
  colleagueSearchPlaceholder: L;
  invitesPanel: L;
  colleaguesEmpty: L;
  tableHead: { person: L; rank: L; status: L; invited: L; joined: L; actions: L };
} = {
  heading: {
    en: "Colleagues",
    ha: "Abokan aiki",
    yo: "Àwọn ẹlẹgbẹ́",
    ig: "Ndị ọrụ ibe",
    fr: "Collègues",
    pt: "Colegas",
    sw: "Wenzetu",
    ar: "الزملاء",
    tw: "Nnwumayɛfo",
    zu: "Ozakwethu",
  },
  intro: {
    en: "Who works at BeOrchid, and who has been asked to. An invitation grants the rank you choose here, and only a director can send one.",
    ha: "Wa ke aiki a BeOrchid, da kuma wanda aka gayyata. Gayyata tana ba da matsayin da kuka zaɓa a nan, kuma darakta ne kaɗai zai iya aikawa.",
    yo: "Ta ni ó ń ṣiṣẹ́ ní BeOrchid, àti ẹni tí a ti pè. Ìpè kan ń fún ni ní ipò tí ẹ yàn níbí, olùdarí nìkan sì ló lè fi ránṣẹ́.",
    ig: "Onye na-arụ ọrụ na BeOrchid, na onye a kpọrọ òkù. Òkù na-enye ọkwa ị họọrọ ebe a, naanị onye nduzi nwekwara ike izipu ya.",
    fr: "Qui travaille chez BeOrchid, et qui a été invité à le faire. Une invitation accorde le rang choisi ici, et seul un directeur peut en envoyer une.",
    pt: "Quem trabalha na BeOrchid, e quem foi convidado. Um convite concede o nível escolhido aqui, e só um diretor pode enviá-lo.",
    sw: "Nani anafanya kazi BeOrchid, na nani amealikwa. Mwaliko hutoa cheo unachochagua hapa, na mkurugenzi pekee ndiye anayeweza kuutuma.",
    ar: "من يعمل في BeOrchid، ومن دُعي للعمل بها. تمنح الدعوة الرتبة التي تختارها هنا، ولا يرسلها إلا مدير.",
    tw: "Hena na ɔyɛ adwuma wɔ BeOrchid, ne hena na wɔafrɛ no. Nsato de dibea a wopaw wɔ ha ma, na ɔpanyin nko ara na obetumi de akɔ.",
    zu: "Ubani osebenza e-BeOrchid, nobani omenyiwe. Isimemo sinikeza izinga olikhethayo lapha, futhi umqondisi kuphela ongasithumela.",
  },
  inviteAction: {
    en: "Invite a colleague",
    ha: "Gayyaci abokin aiki",
    yo: "Pe alábàáṣiṣẹ́",
    ig: "Kpọọ onye ọrụ ibe òkù",
    fr: "Inviter un collègue",
    pt: "Convidar um colega",
    sw: "Alika mwenzako",
    ar: "دعوة زميل",
    tw: "Frɛ wo yɔnko adwumayɛfo",
    zu: "Mema ozakwenu",
  },
  dialogTitle: {
    en: "Invite a BeOrchid colleague",
    ha: "Gayyaci abokin aikin BeOrchid",
    yo: "Pe alábàáṣiṣẹ́ BeOrchid",
    ig: "Kpọọ onye ọrụ ibe BeOrchid òkù",
    fr: "Inviter un collègue BeOrchid",
    pt: "Convidar um colega da BeOrchid",
    sw: "Alika mwenzako wa BeOrchid",
    ar: "دعوة زميل في BeOrchid",
    tw: "Frɛ BeOrchid nnwumayɛfo",
    zu: "Mema ozakwenu base-BeOrchid",
  },
  emailLabel: {
    en: "Email address",
    ha: "Adireshin imel",
    yo: "Àdírẹ́sì ìmèlì",
    ig: "Adreesị ozi-e",
    fr: "Adresse e-mail",
    pt: "Endereço de e-mail",
    sw: "Anwani ya barua pepe",
    ar: "عنوان البريد الإلكتروني",
    tw: "Email adres",
    zu: "Ikheli le-imeyili",
  },
  fullNameLabel: {
    en: "Full name",
    ha: "Cikakken suna",
    yo: "Orúkọ kíkún",
    ig: "Aha zuru ezu",
    fr: "Nom complet",
    pt: "Nome completo",
    sw: "Jina kamili",
    ar: "الاسم الكامل",
    tw: "Din nyinaa",
    zu: "Igama eligcwele",
  },
  rankLabel: {
    en: "Rank",
    ha: "Matsayi",
    yo: "Ipò",
    ig: "Ọkwa",
    fr: "Rang",
    pt: "Nível",
    sw: "Cheo",
    ar: "الرتبة",
    tw: "Dibea",
    zu: "Izinga",
  },
  rankHint: {
    en: "A director can approve corridors and invite more colleagues. A reviewer can do neither. The rank is fixed now, by you — the person accepting cannot change it.",
    ha: "Darakta zai iya amincewa da hanyoyi da gayyatar ƙarin abokan aiki. Mai duba ba zai iya yin ko ɗaya ba. Ana kayyade matsayin yanzu, ta ku — wanda ya karɓa ba zai iya canza shi ba.",
    yo: "Olùdarí lè fọwọ́sí àwọn ọ̀nà àti pe àwọn ẹlẹgbẹ́ mìíràn. Olùyẹ̀wò kò lè ṣe ìkankan. Ẹ̀yin ni ẹ pinnu ipò náà báyìí — ẹni tí ó bá gbà kò lè yí i padà.",
    ig: "Onye nduzi nwere ike ikwado ụzọ na ịkpọ ndị ọrụ ibe ndị ọzọ òkù. Onye nyocha enweghị ike ime nke ọ bụla. Ị na-edozi ọkwa ahụ ugbu a — onye nabatara ya enweghị ike ịgbanwe ya.",
    fr: "Un directeur peut approuver des corridors et inviter d'autres collègues. Un relecteur ne peut ni l'un ni l'autre. Le rang est fixé maintenant, par vous — la personne qui accepte ne peut pas le changer.",
    pt: "Um diretor pode aprovar corredores e convidar mais colegas. Um revisor não pode fazer nem uma coisa nem outra. O nível é fixado agora, por si — quem aceita não o pode alterar.",
    sw: "Mkurugenzi anaweza kuidhinisha njia na kualika wenzake zaidi. Mkaguzi hawezi lolote kati ya hayo. Cheo kinawekwa sasa, na wewe — anayekubali hawezi kukibadilisha.",
    ar: "يمكن للمدير اعتماد المسارات ودعوة زملاء آخرين، ولا يمكن للمراجع أي منهما. تُحدَّد الرتبة الآن، من جانبك — ولا يستطيع من يقبل الدعوة تغييرها.",
    tw: "Ɔpanyin betumi apene akwan so na wafrɛ nnwumayɛfo foforo. Ɔhwɛfo ntumi nyɛ emu biara. Wo na wusi dibea no pi seesei — nea ogye no ntumi nsesa.",
    zu: "Umqondisi angagunyaza imizila futhi ameme abanye ozakwabo. Umbuyekezi akakwazi nakukodwa. Izinga limiswa manje, nguwe — lowo osamukelayo akakwazi ukulishintsha.",
  },
  send: {
    en: "Send invitation",
    ha: "Aika gayyata",
    yo: "Fi ìpè ránṣẹ́",
    ig: "Zipu òkù",
    fr: "Envoyer l'invitation",
    pt: "Enviar convite",
    sw: "Tuma mwaliko",
    ar: "إرسال الدعوة",
    tw: "Fa nsato no kɔ",
    zu: "Thumela isimemo",
  },
  sending: {
    en: "Sending…",
    ha: "Ana aikawa…",
    yo: "À ń fi ránṣẹ́…",
    ig: "Na-eziga…",
    fr: "Envoi en cours…",
    pt: "A enviar…",
    sw: "Inatuma…",
    ar: "جارٍ الإرسال…",
    tw: "Yɛde rekɔ…",
    zu: "Iyathumela…",
  },
  sent: {
    en: "Invitation sent",
    ha: "An aika gayyata",
    yo: "A ti fi ìpè ránṣẹ́",
    ig: "E zipụla òkù",
    fr: "Invitation envoyée",
    pt: "Convite enviado",
    sw: "Mwaliko umetumwa",
    ar: "أُرسلت الدعوة",
    tw: "Wɔde nsato no akɔ",
    zu: "Isimemo sithunyelwe",
  },
  notDelivered: {
    en: "The invitation was created, but the email did not go. Resend it from the list.",
    ha: "An ƙirƙiri gayyatar, amma imel ɗin bai tafi ba. Sake aika ta daga jerin.",
    yo: "A ṣẹ̀dá ìpè náà, ṣùgbọ́n ìmèlì náà kò lọ. Tún fi ránṣẹ́ láti inú àtòjọ.",
    ig: "E kere òkù ahụ, mana ozi-e agaghị. Zigharia ya site na ndepụta ahụ.",
    fr: "L'invitation a été créée, mais l'e-mail n'est pas parti. Renvoyez-la depuis la liste.",
    pt: "O convite foi criado, mas o e-mail não seguiu. Reenvie-o a partir da lista.",
    sw: "Mwaliko umeundwa, lakini barua pepe haikwenda. Utume tena kutoka kwenye orodha.",
    ar: "أُنشئت الدعوة لكن البريد لم يُرسل. أعد إرسالها من القائمة.",
    tw: "Wɔyɛɛ nsato no, nanso email no ankɔ. San fa kɔ fi nhyehyɛe no mu.",
    zu: "Isimemo sidaliwe, kodwa i-imeyili ayihambanga. Siphinde usithumele kusuka ohlwini.",
  },
  invitationsEmpty: {
    en: "Nobody has been invited yet.",
    ha: "Ba a gayyaci kowa ba tukuna.",
    yo: "A kò tíì pe ẹnikẹ́ni.",
    ig: "A kpọbeghị onye ọ bụla òkù.",
    fr: "Personne n'a encore été invité.",
    pt: "Ainda não foi convidado ninguém.",
    sw: "Bado hakuna aliyealikwa.",
    ar: "لم تُوجَّه دعوة لأحد بعد.",
    tw: "Wɔnnfrɛɛ obiara ɛ.",
    zu: "Akekho osamenyiwe.",
  },
  ownerOnly: {
    en: "Only a director can invite a BeOrchid colleague.",
    ha: "Darakta ne kaɗai zai iya gayyatar abokin aikin BeOrchid.",
    yo: "Olùdarí nìkan ló lè pe alábàáṣiṣẹ́ BeOrchid.",
    ig: "Ọ bụ naanị onye nduzi nwere ike ịkpọ onye ọrụ ibe BeOrchid òkù.",
    fr: "Seul un directeur peut inviter un collègue BeOrchid.",
    pt: "Só um diretor pode convidar um colega da BeOrchid.",
    sw: "Mkurugenzi pekee ndiye anayeweza kualika mwenzake wa BeOrchid.",
    ar: "المدير وحده يمكنه دعوة زميل في BeOrchid.",
    tw: "Ɔpanyin nko ara na obetumi afrɛ BeOrchid nnwumayɛfo.",
    zu: "Umqondisi kuphela ongamema ozakwabo base-BeOrchid.",
  },
  secondFactorNotice: {
    en: "They will be asked to set up a second factor before the console opens. The invitation email says so.",
    ha: "Za a nemi su kafa hanyar tabbatarwa ta biyu kafin na'urar ta buɗe. Imel ɗin gayyatar ya faɗi haka.",
    yo: "A ó béèrè lọ́wọ́ wọn láti ṣètò ọ̀nà ìjẹ́rìí kejì kí kọ̀nsólù náà tó ṣí. Ìmèlì ìpè náà sọ bẹ́ẹ̀.",
    ig: "A ga-arịọ ha ka ha tọọ ụzọ nkwenye nke abụọ tupu consul emeghe. Ozi-e òkù ahụ kwuru ya.",
    fr: "Il leur sera demandé de configurer un second facteur avant l'ouverture de la console. L'e-mail d'invitation le précise.",
    pt: "Ser-lhes-á pedido que configurem um segundo fator antes de a consola abrir. O e-mail de convite di-lo.",
    sw: "Wataombwa kuweka kithibitishi cha pili kabla kiweko hakijafunguka. Barua pepe ya mwaliko inasema hivyo.",
    ar: "سيُطلب منهم إعداد عامل تحقق ثانٍ قبل فتح اللوحة، وبريد الدعوة يذكر ذلك.",
    tw: "Wɔbɛka akyerɛ wɔn sɛ wonsi nokwaredi a ɛtɔ so mmienu bi hɔ ansa na console no abue. Nsato email no ka saa.",
    zu: "Bazocelwa ukuba basethe indlela yesibili yokuqinisekisa ngaphambi kokuba ikhonsoli ivuleke. I-imeyili yesimemo ikusho lokho.",
  },
  searchPlaceholder: {
    en: "Search by name or email…",
    ha: "Bincika da suna ko imel…",
    yo: "Wá pẹ̀lú orúkọ tàbí ìmèlì…",
    ig: "Chọọ site na aha ma ọ bụ ozi-e…",
    fr: "Rechercher par nom ou e-mail…",
    pt: "Pesquisar por nome ou e-mail…",
    sw: "Tafuta kwa jina au barua pepe…",
    ar: "ابحث بالاسم أو البريد…",
    tw: "Hwehwɛ din anaa email so…",
    zu: "Sesha ngegama noma nge-imeyili…",
  },
  anyStatus: {
    en: "Any status",
    ha: "Kowane hali",
    yo: "Ipò yòówù",
    ig: "Ọnọdụ ọ bụla",
    fr: "Tout statut",
    pt: "Qualquer estado",
    sw: "Hali yoyote",
    ar: "أي حالة",
    tw: "Tebea biara",
    zu: "Noma isiphi isimo",
  },
  anyRank: {
    en: "Any rank",
    ha: "Kowane matsayi",
    yo: "Ipele yòówù",
    ig: "Ọkwa ọ bụla",
    fr: "Tout rôle",
    pt: "Qualquer nível",
    sw: "Cheo chochote",
    ar: "أي رتبة",
    tw: "Dibea biara",
    zu: "Noma yiliphi izinga",
  },
  /**
   * The two lists this screen carries, split in two on 2026-09-08. One
   * panel called "Everyone invited" was the whole page, which made the
   * heading above it — "Who works at BeOrchid, and who has been asked
   * to" — a promise the screen only half kept: an invitation that had
   * been accepted a month ago still read as an invitation, and there was
   * nowhere at all to see who actually holds a console account.
   */
  colleagueSearchPlaceholder: {
    en: "Search by name or email",
    ha: "Nemo ta suna ko imel",
    yo: "Wá nípa orúkọ tàbí ímeèlì",
    ig: "Chọọ site na aha ma ọ bụ email",
    fr: "Rechercher par nom ou e-mail",
    pt: "Pesquisar por nome ou e-mail",
    sw: "Tafuta kwa jina au barua pepe",
    ar: "ابحث بالاسم أو البريد الإلكتروني",
    tw: "Hwehwɛ din anaa email so",
    zu: "Sesha ngegama noma i-imeyili",
  },
  colleaguesPanel: {
    en: "Colleagues",
    ha: "Abokan aiki",
    yo: "Àwọn ẹlẹgbẹ́",
    ig: "Ndị ọrụ ibe",
    fr: "Collègues",
    pt: "Colegas",
    sw: "Wenzetu",
    ar: "الزملاء",
    tw: "Nnwumayɛfo",
    zu: "Ozakwethu",
  },
  invitesPanel: {
    en: "Invites",
    ha: "Gayyatu",
    yo: "Àwọn ìpè",
    ig: "Òkù",
    fr: "Invitations",
    pt: "Convites",
    sw: "Mialiko",
    ar: "الدعوات",
    tw: "Nsato",
    zu: "Izimemo",
  },
  /**
   * Unreachable in practice — whoever is reading this screen is a
   * director, so the list holds at least them. Written anyway because
   * `DataTable` takes an empty state rather than inventing one, and a
   * fallback that says nothing is how a blank panel gets shipped.
   */
  colleaguesEmpty: {
    en: "Nobody holds a console account yet.",
    ha: "Babu wanda ke da asusun na'ura tukuna.",
    yo: "Kò sí ẹni tí ó ní àkàǹtì kọ́ńsólù síbẹ̀.",
    ig: "Ọ dịghị onye nwere akaụntụ console ugbu a.",
    fr: "Personne n'a encore de compte console.",
    pt: "Ainda ninguém tem conta na consola.",
    sw: "Bado hakuna mwenye akaunti ya konsoli.",
    ar: "لا أحد يملك حساب وحدة التحكم بعد.",
    tw: "Obiara nni console akawnt ɛ.",
    zu: "Akekho onalo i-akhawunti yekhonsoli okwamanje.",
  },
  tableHead: {
    person: {
      en: "Person",
      ha: "Mutum",
      yo: "Ẹnìkan",
      ig: "Onye",
      fr: "Personne",
      pt: "Pessoa",
      sw: "Mtu",
      ar: "الشخص",
      tw: "Onipa",
      zu: "Umuntu",
    },
    rank: {
      en: "Rank",
      ha: "Matsayi",
      yo: "Ipele",
      ig: "Ọkwa",
      fr: "Rôle",
      pt: "Nível",
      sw: "Cheo",
      ar: "الرتبة",
      tw: "Dibea",
      zu: "Izinga",
    },
    status: {
      en: "Status",
      ha: "Hali",
      yo: "Ipò",
      ig: "Ọnọdụ",
      fr: "Statut",
      pt: "Estado",
      sw: "Hali",
      ar: "الحالة",
      tw: "Tebea",
      zu: "Isimo",
    },
    actions: {
      en: "Actions",
      ha: "Ayyuka",
      yo: "Àwọn ìṣe",
      ig: "Omume",
      fr: "Actions",
      pt: "Ações",
      sw: "Vitendo",
      ar: "إجراءات",
      tw: "Nneyɛe",
      zu: "Izenzo",
    },
    joined: {
      en: "Joined",
      ha: "Ya shiga",
      yo: "Ó dara pọ̀",
      ig: "Sonyeere",
      fr: "Arrivé le",
      pt: "Entrou",
      sw: "Alijiunga",
      ar: "تاريخ الانضمام",
      tw: "Ɔbɛkaa ho",
      zu: "Wajoyina",
    },
    invited: {
      en: "Invited",
      ha: "An gayyata",
      yo: "A pè",
      ig: "A kpọrọ òkù",
      fr: "Invité le",
      pt: "Convidado",
      sw: "Alialikwa",
      ar: "تاريخ الدعوة",
      tw: "Wɔfrɛɛ no",
      zu: "Umenyiwe",
    },
  },
};
