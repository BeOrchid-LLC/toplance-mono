import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The two payment screens: an agency buying its plan, and a client
 * buying their application.
 *
 * One file for both because they are one subject — what somebody is
 * being asked for and why — even though they sit in different consoles.
 * Splitting them would put the same sentence about a test payment in two
 * places to drift apart.
 *
 * Amounts and dates are never in here. Money is formatted by
 * `formatMoney` from the rate card's own currency, and a figure written
 * into a translation is a figure that stops matching the card the day
 * somebody edits the row.
 *
 * `{placeholder}` tokens rather than template literals, for the reason
 * every other file here has them: the string has to be chosen by locale
 * before anything is interpolated into it.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const BILLING: {
  navBilling: L;
  planTitle: L;
  planBody: L;
  planName: L;
  reviewerLead: L;
  reviewerNotice: L;
  reviewerBlocked: L;
  perMonth: L;
  perApplicationNote: L;
  payPlan: L;
  paying: L;
  planActiveUntil: L;
  planEndingSoon: L;
  planLapsed: L;
  planCancelled: L;
  cancelPlan: L;
  cancelling: L;
  cancelConfirmTitle: L;
  cancelConfirmBody: L;
  keepPlan: L;
  planEnded: L;
  historyTitle: L;
  historyEmpty: L;
  testPaymentNotice: L;
  paymentFailed: L;
  notVerifiedYet: L;
} = {
  navBilling: {
    en: "Billing",
    ha: "Biyan kuɗi",
    yo: "Ìsanwó",
    ig: "Ịkwụ ụgwọ",
    fr: "Facturation",
    pt: "Faturação",
    sw: "Malipo",
    ar: "الفوترة",
    tw: "Akatua",
    zu: "Ukukhokha",
  },
  planTitle: {
    en: "Your plan",
    ha: "Shirinku",
    yo: "Ètò yín",
    ig: "Atụmatụ gị",
    fr: "Votre formule",
    pt: "O seu plano",
    sw: "Mpango wako",
    ar: "خطتك",
    tw: "Wo nhyehyɛe",
    zu: "Uhlelo lwakho",
  },
  planBody: {
    en: "Your console opens once the plan is paid for. Everything in it — your clients, your colleagues and every case — is waiting on the other side.",
    ha: "Na'urar sarrafa ku za ta buɗe bayan an biya kuɗin shirin. Duk abin da ke ciki — abokan cinikinku, abokan aikinku da kowane fayil — yana jira a ɗaya gefen.",
    yo: "Kọ̀nsólù yín yóò ṣí lẹ́yìn tí a bá san owó ètò náà. Gbogbo ohun tó wà nínú rẹ̀ — àwọn oníbàárà yín, àwọn ẹlẹgbẹ́ yín àti gbogbo ẹjọ́ — ń dúró de yín ní ìhà kejì.",
    ig: "Consul gị ga-emeghe ozugbo a kwụrụ ụgwọ atụmatụ ahụ. Ihe niile dị na ya — ndị ahịa gị, ndị ọrụ ibe gị na ikpe ọ bụla — na-echere n'akụkụ nke ọzọ.",
    fr: "Votre console s'ouvre dès que la formule est payée. Tout ce qu'elle contient — vos clients, vos collègues et chaque dossier — vous attend de l'autre côté.",
    pt: "A sua consola abre assim que o plano for pago. Tudo o que está lá dentro — os seus clientes, os seus colegas e cada processo — espera do outro lado.",
    sw: "Kiweko chako kitafunguka mara tu mpango utakapolipiwa. Kila kitu ndani yake — wateja wako, wenzako na kila kesi — kinakusubiri upande wa pili.",
    ar: "تُفتح لوحتك بمجرد دفع قيمة الخطة. كل ما فيها — عملاؤك وزملاؤك وكل ملف — في انتظارك على الجانب الآخر.",
    tw: "Wo console no bebue bere a wɔatua nhyehyɛe no ka. Biribiara a ɛwɔ mu — wo adetɔfo, wo nnwumayɛfo ne asɛm biara — retwɛn wo wɔ ɔfa foforo no.",
    zu: "Ikhonsoli yakho ivuleka uma uhlelo selukhokhelwe. Konke okukulo — amakhasimende akho, ozakwenu nawo wonke amacala — kukulindile ngakolunye uhlangothi.",
  },
  planName: {
    en: "Agency plan",
    ha: "Shirin hukuma",
    yo: "Ètò ilé-iṣẹ́",
    ig: "Atụmatụ ụlọ ọrụ",
    fr: "Formule agence",
    pt: "Plano de agência",
    sw: "Mpango wa wakala",
    ar: "خطة الوكالة",
    tw: "Adwumakuw nhyehyɛe",
    zu: "Uhlelo lwenhlangano",
  },
  /**
   * The three strings a travel agent sees on this page, and the whole of
   * what it tells them. No amount, no renewal date, no receipt — see the
   * note on the reviewer branch in `billing/page.tsx` for why they reach
   * a screen at all rather than a redirect.
   */
  reviewerLead: {
    en: "What your agency pays is your director's to manage.",
    ha: "Abin da hukumarka ke biya, daraktanka ne ke kula da shi.",
    yo: "Ohun tí ilé-iṣẹ́ rẹ ń san jẹ́ ti olùdarí rẹ láti ṣàkóso.",
    ig: "Ihe ụlọ ọrụ gị na-akwụ bụ nke onye nduzi gị ga-elekọta.",
    fr: "Ce que votre agence paie relève de votre directeur.",
    pt: "O que a sua agência paga é da responsabilidade do seu diretor.",
    sw: "Kile wakala wako analipa ni jukumu la mkurugenzi wako.",
    ar: "ما تدفعه وكالتك من شأن مديرك.",
    tw: "Deɛ w'adwumakuo tua no yɛ wo panyin no dea sɛ ɔhwɛ so.",
    zu: "Lokho i-ejensi yakho ekukhokhayo kungokomqondisi wakho.",
  },
  reviewerNotice: {
    en: "The plan is running and there is nothing here for you to do. Carry on with your cases — your director can see the plan, the renewal date and every payment on this page.",
    ha: "Shirin yana gudana kuma babu abin da za ka yi a nan. Ka ci gaba da shari'o'inka — daraktanka zai iya ganin shirin, ranar sabuntawa da kowane biyan kuɗi a wannan shafin.",
    yo: "Ètò náà ń lọ, kò sì sí ohun tí o ní láti ṣe níbí. Máa bá àwọn ẹjọ́ rẹ lọ — olùdarí rẹ lè rí ètò náà, ọjọ́ ìsọdọ̀tun àti gbogbo owó tí a san ní ojú-ìwé yìí.",
    ig: "Atụmatụ ahụ na-arụ ọrụ, ọ dịghịkwa ihe ị ga-eme ebe a. Gaa n'ihu na ndị ọrụ gị — onye nduzi gị nwere ike ịhụ atụmatụ ahụ, ụbọchị mmeghari na ụgwọ ọ bụla e kwụrụ na peeji a.",
    fr: "La formule est active et vous n'avez rien à faire ici. Poursuivez vos dossiers — votre directeur voit la formule, la date de renouvellement et chaque paiement sur cette page.",
    pt: "O plano está ativo e não há nada a fazer aqui. Continue com os seus processos — o seu diretor vê o plano, a data de renovação e cada pagamento nesta página.",
    sw: "Mpango unaendelea na hakuna cha kufanya hapa. Endelea na kesi zako — mkurugenzi wako anaona mpango, tarehe ya kuhuisha na kila malipo kwenye ukurasa huu.",
    ar: "الخطة سارية ولا شيء عليك فعله هنا. تابع ملفاتك — يرى مديرك الخطة وتاريخ التجديد وكل دفعة في هذه الصفحة.",
    tw: "Nhyehyɛe no rekɔ so na biribiara nni ha a ɛsɛ sɛ woyɛ. Kɔ so yɛ wo nsɛm no — wo panyin no tumi hu nhyehyɛe no, da a wɔbɛyɛ no foforɔ ne sika biara a wɔatua wɔ krataafa yi so.",
    zu: "Uhlelo luyasebenza futhi akukho okumele ukwenze lapha. Qhubeka namacala akho — umqondisi wakho ubona uhlelo, usuku lokuvuselela nayo yonke inkokhelo kuleli khasi.",
  },
  reviewerBlocked: {
    en: "Your agency's plan has ended, which is why the rest of your console is closed. Only a director can start it again — ask a colleague who holds that rank.",
    ha: "Shirin hukumarka ya ƙare, shi ya sa sauran na'urarka ta rufe. Darakta kaɗai zai iya sake fara shi — ka tambayi abokin aiki mai wannan matsayi.",
    yo: "Ètò ilé-iṣẹ́ rẹ ti parí, ìdí nìyẹn tí ìyókù kọ̀ǹsólù rẹ fi tì. Olùdarí nìkan ni ó lè bẹ̀rẹ̀ rẹ̀ lẹ́ẹ̀kansí — bi ẹlẹgbẹ́ rẹ tí ó ní ipò yẹn.",
    ig: "Atụmatụ ụlọ ọrụ gị akwụsịla, nke ahụ mere ka ndị ọzọ na kọnsol gị mechie. Naanị onye nduzi nwere ike ịmalite ya ọzọ — jụọ onye ọrụ ibe gị nwere ọkwa ahụ.",
    fr: "La formule de votre agence a pris fin, d'où la fermeture du reste de votre console. Seul un directeur peut la relancer — demandez à un collègue qui a ce rang.",
    pt: "O plano da sua agência terminou, e é por isso que o resto da sua consola está fechado. Só um diretor o pode reiniciar — peça a um colega que tenha essa posição.",
    sw: "Mpango wa wakala wako umeisha, ndiyo maana sehemu nyingine ya konsoli yako imefungwa. Mkurugenzi pekee ndiye anayeweza kuuanzisha tena — muulize mwenzako mwenye cheo hicho.",
    ar: "انتهت خطة وكالتك، ولهذا أُغلق باقي لوحتك. المدير وحده يستطيع تجديدها — اسأل زميلاً يحمل هذه الرتبة.",
    tw: "W'adwumakuo nhyehyɛe no aba awieeɛ, ɛno na ɛma wo console no nkaeɛ ato mu. Ɔpanyin nko ara na ɔbɛtumi ahyɛ aseɛ bio — bisa wo yɔnko a ɔwɔ saa dibea no.",
    zu: "Uhlelo lwe-ejensi yakho luphelile, yingakho okunye kwekhonsoli yakho kuvaliwe. Umqondisi kuphela ongaluqala kabusha — buza ozakwenu onaleso sikhundla.",
  },
  perMonth: {
    en: "per month",
    ha: "kowane wata",
    yo: "lóṣooṣù",
    ig: "kwa ọnwa",
    fr: "par mois",
    pt: "por mês",
    sw: "kwa mwezi",
    ar: "شهريًا",
    tw: "ɔsram biara",
    zu: "ngenyanga",
  },
  perApplicationNote: {
    en: "Applications are charged on top, at the rate your volume reaches.",
    ha: "Ana ƙara kuɗin kowane takarda a kai, bisa ga adadin da yawan ku ya kai.",
    yo: "A ó gba owó lórí ìbéèrè kọ̀ọ̀kan lẹ́yìn èyí, ní ìwọ̀n tí iye yín bá dé.",
    ig: "A na-anakwu ụgwọ maka arịrịọ ọ bụla n'elu ya, n'ọnụego ọnụ ọgụgụ gị ruru.",
    fr: "Les dossiers sont facturés en plus, au tarif atteint par votre volume.",
    pt: "Os processos são cobrados à parte, à taxa que o seu volume atingir.",
    sw: "Maombi yanatozwa juu ya hayo, kwa kiwango ambacho wingi wako unafikia.",
    ar: "تُحتسب الطلبات إضافةً إلى ذلك، بالسعر الذي يبلغه حجم أعمالك.",
    tw: "Wɔgye adesrɛ biara ho ka ka ho, sɛnea wo dodow no du.",
    zu: "Izicelo zikhokhiswa ngaphezulu, ngezinga elifinyelelwa yinani lakho.",
  },
  payPlan: {
    en: "Pay and open the console",
    ha: "Biya ka buɗe na'urar sarrafa",
    yo: "San owó kí o sí kọ̀nsólù",
    ig: "Kwụọ ụgwọ meghee consul",
    fr: "Payer et ouvrir la console",
    pt: "Pagar e abrir a consola",
    sw: "Lipa na ufungue kiweko",
    ar: "ادفع وافتح اللوحة",
    tw: "Tua ka na bue console no",
    zu: "Khokha uvule ikhonsoli",
  },
  paying: {
    en: "Taking payment…",
    ha: "Ana karɓar kuɗi…",
    yo: "À ń gba owó…",
    ig: "Na-anara ụgwọ…",
    fr: "Paiement en cours…",
    pt: "A processar o pagamento…",
    sw: "Inapokea malipo…",
    ar: "جارٍ تحصيل الدفعة…",
    tw: "Yɛregye ka no…",
    zu: "Ithatha inkokhelo…",
  },
  planActiveUntil: {
    en: "Your plan runs until {date}.",
    ha: "Shirinku yana aiki har zuwa {date}.",
    yo: "Ètò yín ń lọ títí di {date}.",
    ig: "Atụmatụ gị na-aga ruo {date}.",
    fr: "Votre formule court jusqu'au {date}.",
    pt: "O seu plano é válido até {date}.",
    sw: "Mpango wako unaendelea hadi {date}.",
    ar: "خطتك سارية حتى {date}.",
    tw: "Wo nhyehyɛe no kɔ so kosi {date}.",
    zu: "Uhlelo lwakho lusebenza kuze kube ngu-{date}.",
  },
  planEndingSoon: {
    en: "Your plan ends on {date}. Nothing renews it — the console closes that day, and the next month can be bought from here once it has.",
    ha: "Shirinku zai ƙare a {date}. Babu abin da ke sabunta shi — na'urar sarrafa za ta rufe a wannan ranar, kuma za a iya sayen watan gaba daga nan bayan ta rufe.",
    yo: "Ètò yín yóò parí ní {date}. Kò sí ohun tí ó ń tún un ṣe — kọ̀nsólù yóò tì ní ọjọ́ náà, a sì lè ra oṣù tó ń bọ̀ láti ibí yìí lẹ́yìn tí ó bá ti tì.",
    ig: "Atụmatụ gị ga-akwụsị na {date}. Ọ dịghị ihe na-emeghari ya — consul ga-emechi n'ụbọchị ahụ, a ga-enwekwa ike ịzụta ọnwa ọzọ site ebe a mgbe o mechiri.",
    fr: "Votre formule prend fin le {date}. Rien ne la renouvelle — la console se ferme ce jour-là, et le mois suivant s'achète ici une fois qu'elle l'est.",
    pt: "O seu plano termina a {date}. Nada o renova — a consola fecha nesse dia, e o mês seguinte pode ser comprado aqui assim que fechar.",
    sw: "Mpango wako unaisha tarehe {date}. Hakuna kinachouhuisha — kiweko kitafungwa siku hiyo, na mwezi ujao unaweza kununuliwa hapa mara tu kitakapofungwa.",
    ar: "تنتهي خطتك في {date}. لا شيء يجددها — تُغلق اللوحة في ذلك اليوم، ويمكن شراء الشهر التالي من هنا بعد إغلاقها.",
    tw: "Wo nhyehyɛe no bɛba awiei wɔ {date}. Biribiara nsan nyɛ no foforo — console no bɛto mu saa da no, na wubetumi atɔ ɔsram a edi hɔ no wɔ ha bere a ato mu.",
    zu: "Uhlelo lwakho luphela ngomhla ka-{date}. Akukho okuluvuselelayo — ikhonsoli ivalwa ngalolo suku, futhi inyanga elandelayo ingathengwa lapha uma isivaliwe.",
  },
  planLapsed: {
    en: "Your plan ended on {date}. The console opens again as soon as the next month is paid for.",
    ha: "Shirinku ya ƙare a {date}. Na'urar sarrafa za ta sake buɗewa da zarar an biya kuɗin watan gaba.",
    yo: "Ètò yín parí ní {date}. Kọ̀nsólù yóò tún ṣí ní kété tí a bá san owó oṣù tó ń bọ̀.",
    ig: "Atụmatụ gị kwụsịrị na {date}. Consul ga-emeghe ọzọ ozugbo a kwụrụ ụgwọ ọnwa ọzọ.",
    fr: "Votre formule a pris fin le {date}. La console rouvre dès que le mois suivant est payé.",
    pt: "O seu plano terminou a {date}. A consola volta a abrir assim que o mês seguinte for pago.",
    sw: "Mpango wako uliisha tarehe {date}. Kiweko kitafunguka tena mara tu mwezi ujao utakapolipiwa.",
    ar: "انتهت خطتك في {date}. تُفتح اللوحة من جديد بمجرد دفع قيمة الشهر التالي.",
    tw: "Wo nhyehyɛe no baa awiei wɔ {date}. Console no bebue bio bere a wɔatua ɔsram a edi hɔ no ka.",
    zu: "Uhlelo lwakho luphele ngomhla ka-{date}. Ikhonsoli ivuleka futhi uma inyanga elandelayo isikhokhelwe.",
  },
  planCancelled: {
    en: "You ended your plan on {date}. The console opens again as soon as the next month is paid for.",
    ha: "Kun ƙare shirinku a {date}. Na'urar sarrafa za ta sake buɗewa da zarar an biya kuɗin watan gaba.",
    yo: "Ẹ parí ètò yín ní {date}. Kọ̀nsólù yóò tún ṣí ní kété tí a bá san owó oṣù tó ń bọ̀.",
    ig: "I kwụsịrị atụmatụ gị na {date}. Consul ga-emeghe ọzọ ozugbo a kwụrụ ụgwọ ọnwa ọzọ.",
    fr: "Vous avez mis fin à votre formule le {date}. La console rouvre dès que le mois suivant est payé.",
    pt: "Terminou o seu plano a {date}. A consola volta a abrir assim que o mês seguinte for pago.",
    sw: "Ulisitisha mpango wako tarehe {date}. Kiweko kitafunguka tena mara tu mwezi ujao utakapolipiwa.",
    ar: "أنهيت خطتك في {date}. تُفتح اللوحة من جديد بمجرد دفع قيمة الشهر التالي.",
    tw: "Wode wo nhyehyɛe no baa awiei wɔ {date}. Console no bebue bio bere a wɔatua ɔsram a edi hɔ no ka.",
    zu: "Uluqedile uhlelo lwakho ngomhla ka-{date}. Ikhonsoli ivuleka futhi uma inyanga elandelayo isikhokhelwe.",
  },
  cancelPlan: {
    en: "End the plan",
    ha: "Ƙare shirin",
    yo: "Parí ètò náà",
    ig: "Kwụsị atụmatụ ahụ",
    fr: "Mettre fin à la formule",
    pt: "Terminar o plano",
    sw: "Sitisha mpango",
    ar: "إنهاء الخطة",
    tw: "Ma nhyehyɛe no mmra awiei",
    zu: "Qeda uhlelo",
  },
  cancelling: {
    en: "Ending the plan…",
    ha: "Ana ƙare shirin…",
    yo: "À ń parí ètò náà…",
    ig: "Na-akwụsị atụmatụ ahụ…",
    fr: "Fin de la formule en cours…",
    pt: "A terminar o plano…",
    sw: "Inasitisha mpango…",
    ar: "جارٍ إنهاء الخطة…",
    tw: "Yɛrema nhyehyɛe no aba awiei…",
    zu: "Iqeda uhlelo…",
  },
  cancelConfirmTitle: {
    en: "End the agency plan?",
    ha: "A ƙare shirin hukumar?",
    yo: "Ṣé kí a parí ètò ilé-iṣẹ́ náà?",
    ig: "Ị chọrọ ịkwụsị atụmatụ ụlọ ọrụ ahụ?",
    fr: "Mettre fin à la formule de l'agence ?",
    pt: "Terminar o plano da agência?",
    sw: "Kusitisha mpango wa wakala?",
    ar: "إنهاء خطة الوكالة؟",
    tw: "Wopɛ sɛ adwumakuw nhyehyɛe no ba awiei?",
    zu: "Uqeda uhlelo lwenhlangano?",
  },
  /**
   * What lands the moment the button commits, and none of it is on the
   * screen behind the dialog: that it is immediate, that it closes on
   * colleagues mid-case and not only on whoever clicked, and that the
   * days already paid for go with it.
   */
  cancelConfirmBody: {
    en: "The console closes now — for you and for every colleague, in the middle of whatever case they have open. You have paid up to {date} and none of it is refunded.",
    ha: "Na'urar sarrafa za ta rufe yanzu — gare ku da kowane abokin aiki, a tsakiyar duk fayil ɗin da suke kai. Kun biya har zuwa {date} kuma ba za a mayar da kome ba.",
    yo: "Kọ̀nsólù yóò tì báyìí — fún yín àti fún gbogbo ẹlẹgbẹ́ yín, ní àárín ẹjọ́ yòówù tí wọ́n ṣí. Ẹ ti san owó títí di {date} a kò sì ní dá ọ̀kankan padà.",
    ig: "Consul ga-emechi ugbu a — maka gị na maka onye ọrụ ibe gị ọ bụla, n'etiti ikpe ọ bụla ha meghere. Ị kwụrụ ụgwọ ruo {date} ma a gaghị eweghachi ihe ọ bụla.",
    fr: "La console se ferme maintenant — pour vous et pour chaque collègue, au milieu du dossier qu'il a ouvert. Vous avez payé jusqu'au {date} et rien n'est remboursé.",
    pt: "A consola fecha agora — para si e para cada colega, a meio do processo que tiver aberto. Pagou até {date} e nada é reembolsado.",
    sw: "Kiweko kinafungwa sasa — kwako na kwa kila mwenzako, katikati ya kesi yoyote aliyoifungua. Umelipa hadi {date} na hakuna kinachorejeshwa.",
    ar: "تُغلق اللوحة الآن — لك ولكل زميل، في منتصف أي ملف مفتوح لديه. لقد دفعت حتى {date} ولا يُسترد شيء من ذلك.",
    tw: "Console no bɛto mu seesei — ama wo ne wo nnwumayɛfo biara, wɔ asɛm biara a wɔabue mu no mfimfini. Woatua ka akosi {date} na wɔrensan mma biribiara.",
    zu: "Ikhonsoli ivalwa manje — kuwe nakuzo zonke ozakwenu, phakathi nanoma yiliphi icala abalivulile. Ukhokhele kuze kube ngu-{date} futhi akukho okubuyiselwayo.",
  },
  keepPlan: {
    en: "Keep the plan",
    ha: "Ci gaba da shirin",
    yo: "Jẹ́ kí ètò náà wà",
    ig: "Hapụ atụmatụ ahụ ka ọ dịrị",
    fr: "Conserver la formule",
    pt: "Manter o plano",
    sw: "Endelea na mpango",
    ar: "الإبقاء على الخطة",
    tw: "Ma nhyehyɛe no ntena hɔ",
    zu: "Gcina uhlelo",
  },
  planEnded: {
    en: "Your plan has ended.",
    ha: "Shirinku ya ƙare.",
    yo: "Ètò yín ti parí.",
    ig: "Atụmatụ gị akwụsịla.",
    fr: "Votre formule a pris fin.",
    pt: "O seu plano terminou.",
    sw: "Mpango wako umesitishwa.",
    ar: "انتهت خطتك.",
    tw: "Wo nhyehyɛe no aba awiei.",
    zu: "Uhlelo lwakho seluphelile.",
  },
  historyTitle: {
    en: "Payments",
    ha: "Biyan kuɗi",
    yo: "Àwọn ìsanwó",
    ig: "Ụgwọ ekwụrụ",
    fr: "Paiements",
    pt: "Pagamentos",
    sw: "Malipo",
    ar: "المدفوعات",
    tw: "Akatua",
    zu: "Izinkokhelo",
  },
  historyEmpty: {
    en: "Nothing has been paid yet.",
    ha: "Ba a biya kome ba tukuna.",
    yo: "A kò tíì san ohunkóhun.",
    ig: "A kwụbeghị ihe ọ bụla.",
    fr: "Rien n'a encore été payé.",
    pt: "Ainda não foi pago nada.",
    sw: "Bado hakuna kilicholipwa.",
    ar: "لم يُدفع شيء بعد.",
    tw: "Wontuaa hwee ɛ.",
    zu: "Akukho lutho olukhokhiwe okwamanje.",
  },
  testPaymentNotice: {
    en: "This is a test payment. No money moves, and nothing is charged to a card.",
    ha: "Wannan biyan gwaji ne. Babu kuɗin da ke motsi, kuma ba a caji kati ba.",
    yo: "Ìsanwó ìdánwò ni èyí. Kò sí owó tó ń rìn, a kò sì gba owó lórí káàdì kankan.",
    ig: "Nke a bụ ụgwọ nnwale. Ọ dịghị ego na-aga, ọ dịghịkwa ihe a na-anara na kaadị.",
    fr: "Il s'agit d'un paiement de test. Aucun argent ne circule et aucune carte n'est débitée.",
    pt: "Este é um pagamento de teste. Não há dinheiro a circular e nenhum cartão é debitado.",
    sw: "Haya ni malipo ya majaribio. Hakuna pesa inayohamishwa, wala kadi yoyote haitozwi.",
    ar: "هذه دفعة تجريبية. لا تنتقل أي أموال ولا تُخصم من أي بطاقة.",
    tw: "Eyi yɛ sɔhwɛ akatua. Sika biara nkɔ, na wonnye biribiara mfi kaad so.",
    zu: "Lena yinkokhelo yokuhlola. Ayikho imali ehambayo, futhi ayikho ikhadi elikhokhiswayo.",
  },
  /**
   * `purchaseSubscription`'s refusal for an agency BeOrchid has not
   * activated. Rarely read: the holding screen keeps a director away
   * from the Pay button, and this is what answers a direct POST.
   */
  notVerifiedYet: {
    en: "We are still verifying your agency. You will be emailed the moment your console is open.",
    ha: "Har yanzu muna tabbatar da hukumarku. Za a aika muku da imel nan da nan da na'urar sarrafa ta buɗe.",
    yo: "À ṣì ń jẹ́rìísí ilé-iṣẹ́ yín. A ó fi ímeèlì ránṣẹ́ sí yín kété tí kọ̀nsólù yín bá ṣí.",
    ig: "Ka anyị ka na-akwado ụlọ ọrụ gị. A ga-ezigara gị ozi ozugbo consul gị meghere.",
    fr: "Nous vérifions encore votre agence. Vous recevrez un e-mail dès l'ouverture de votre console.",
    pt: "Ainda estamos a verificar a sua agência. Receberá um e-mail assim que a sua consola abrir.",
    sw: "Bado tunathibitisha wakala wako. Utatumiwa barua pepe mara kiweko chako kitakapofunguka.",
    ar: "ما زلنا نتحقق من وكالتك. سنراسلك بالبريد فور فتح لوحتك.",
    tw: "Yɛda so ara resɔ wo adwumakuo no ano. Yɛbɛsoma email akɔma wo bere a wo console no bue.",
    zu: "Sisaqinisekisa i-ejensi yakho. Uzothunyelwa i-imeyili ngokushesha lapho ikhonsoli yakho ivuleka.",
  },
  paymentFailed: {
    en: "That payment could not be taken. Nothing has been charged — try again.",
    ha: "Ba a iya karɓar wannan biyan ba. Ba a caji kome ba — sake gwadawa.",
    yo: "A kò lè gba ìsanwó náà. A kò gba owó kankan — gbìyànjú lẹ́ẹ̀kansí.",
    ig: "Enweghị ike ịnara ụgwọ ahụ. A naraghị ihe ọ bụla — nwaa ọzọ.",
    fr: "Ce paiement n'a pas pu être encaissé. Rien n'a été débité — réessayez.",
    pt: "Não foi possível processar esse pagamento. Nada foi cobrado — tente novamente.",
    sw: "Malipo hayo hayakuweza kupokelewa. Hakuna kilichotozwa — jaribu tena.",
    ar: "تعذّر تحصيل هذه الدفعة. لم يُخصم أي مبلغ — حاول مرة أخرى.",
    tw: "Yɛantumi annye saa ka no. Wonnyee hwee — sɔ bio.",
    zu: "Le nkokhelo ayikwazanga ukuthathwa. Akukho okukhokhisiwe — zama futhi.",
  },
};

/**
 * The client's own screen. Separate object rather than more keys on
 * `BILLING`, because a traveller is being told something different from
 * an agency: one buys a console, the other buys their own application.
 */
export const CHECKOUT: {
  title: L;
  body: L;
  feeLabel: L;
  pay: L;
  paying: L;
  whatItBuys: L;
  paymentFailed: L;
} = {
  title: {
    en: "Your application fee",
    ha: "Kuɗin takardar neman ku",
    yo: "Owó ìbéèrè yín",
    ig: "Ụgwọ arịrịọ gị",
    fr: "Vos frais de dossier",
    pt: "A taxa do seu processo",
    sw: "Ada ya ombi lako",
    ar: "رسوم طلبك",
    tw: "Wo adesrɛ ho ka",
    zu: "Imali yesicelo sakho",
  },
  body: {
    en: "One fee, once, for this application. It covers the checklist, the document review and everything your agency does on the case.",
    ha: "Kuɗi ɗaya, sau ɗaya, don wannan takarda. Yana rufe jerin abubuwan, duban takardu da duk abin da hukumar ku ke yi a kan fayil ɗin.",
    yo: "Owó kan, ẹ̀ẹ̀kan, fún ìbéèrè yìí. Ó bo àkọsílẹ̀ ìwé, àyẹ̀wò àwọn ìwé àti gbogbo ohun tí ilé-iṣẹ́ yín ń ṣe lórí ẹjọ́ náà.",
    ig: "Otu ụgwọ, otu ugboro, maka arịrịọ a. Ọ na-ekpuchi ndepụta ahụ, nyocha akwụkwọ na ihe niile ụlọ ọrụ gị na-eme na ikpe ahụ.",
    fr: "Un seul paiement, une seule fois, pour ce dossier. Il couvre la liste, la vérification des documents et tout ce que votre agence fait sur le dossier.",
    pt: "Uma taxa, uma vez, para este processo. Cobre a lista, a verificação dos documentos e tudo o que a sua agência faz no processo.",
    sw: "Ada moja, mara moja, kwa ombi hili. Inagharamia orodha, ukaguzi wa nyaraka na kila kitu ambacho wakala wako hufanya kwenye kesi.",
    ar: "رسم واحد، مرة واحدة، لهذا الطلب. يغطي قائمة المستندات ومراجعتها وكل ما تقوم به وكالتك في الملف.",
    tw: "Ka baako, pɛnkoro, wɔ saa adesrɛ yi ho. Ɛkata nneɛma nhyehyɛe, nkrataa nhwehwɛmu ne biribiara a w'adwumakuw yɛ wɔ asɛm no ho.",
    zu: "Imali eyodwa, kanye, kwalesi sicelo. Ihlanganisa uhlu, ukubuyekezwa kwamadokhumenti nakho konke okwenziwa yinhlangano yakho ecaleni.",
  },
  feeLabel: {
    en: "Application fee",
    ha: "Kuɗin takarda",
    yo: "Owó ìbéèrè",
    ig: "Ụgwọ arịrịọ",
    fr: "Frais de dossier",
    pt: "Taxa de processo",
    sw: "Ada ya ombi",
    ar: "رسوم الطلب",
    tw: "Adesrɛ ho ka",
    zu: "Imali yesicelo",
  },
  pay: {
    en: "Pay and start",
    ha: "Biya ka fara",
    yo: "San owó kí o bẹ̀rẹ̀",
    ig: "Kwụọ ụgwọ malite",
    fr: "Payer et commencer",
    pt: "Pagar e começar",
    sw: "Lipa uanze",
    ar: "ادفع وابدأ",
    tw: "Tua ka na fi ase",
    zu: "Khokha uqale",
  },
  paying: {
    en: "Taking payment…",
    ha: "Ana karɓar kuɗi…",
    yo: "À ń gba owó…",
    ig: "Na-anara ụgwọ…",
    fr: "Paiement en cours…",
    pt: "A processar o pagamento…",
    sw: "Inapokea malipo…",
    ar: "جارٍ تحصيل الدفعة…",
    tw: "Yɛregye ka no…",
    zu: "Ithatha inkokhelo…",
  },
  whatItBuys: {
    en: "What it covers",
    ha: "Abin da yake rufewa",
    yo: "Ohun tí ó bò",
    ig: "Ihe ọ na-ekpuchi",
    fr: "Ce qu'ils couvrent",
    pt: "O que cobre",
    sw: "Inachogharamia",
    ar: "ما تغطيه",
    tw: "Nea ɛkata so",
    zu: "Okuhlanganisiwe",
  },
  paymentFailed: {
    en: "That payment could not be taken. Nothing has been charged — try again.",
    ha: "Ba a iya karɓar wannan biyan ba. Ba a caji kome ba — sake gwadawa.",
    yo: "A kò lè gba ìsanwó náà. A kò gba owó kankan — gbìyànjú lẹ́ẹ̀kansí.",
    ig: "Enweghị ike ịnara ụgwọ ahụ. A naraghị ihe ọ bụla — nwaa ọzọ.",
    fr: "Ce paiement n'a pas pu être encaissé. Rien n'a été débité — réessayez.",
    pt: "Não foi possível processar esse pagamento. Nada foi cobrado — tente novamente.",
    sw: "Malipo hayo hayakuweza kupokelewa. Hakuna kilichotozwa — jaribu tena.",
    ar: "تعذّر تحصيل هذه الدفعة. لم يُخصم أي مبلغ — حاول مرة أخرى.",
    tw: "Yɛantumi annye saa ka no. Wonnyee hwee — sɔ bio.",
    zu: "Le nkokhelo ayikwazanga ukuthathwa. Akukho okukhokhisiwe — zama futhi.",
  },
};
