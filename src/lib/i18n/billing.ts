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
  perMonth: L;
  perApplicationNote: L;
  payPlan: L;
  paying: L;
  planActiveUntil: L;
  historyTitle: L;
  historyEmpty: L;
  testPaymentNotice: L;
  paymentFailed: L;
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
