import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * A reviewer asking one traveller for a document the corridor never
 * listed.
 *
 * One dictionary for both sides — the reviewer's form, the withdrawal's
 * confirmation, and the label the traveller reads on the row — because
 * they describe one act, and two dictionaries would drift into two
 * vocabularies for it. The same argument `ATTENDANCE` makes.
 *
 * NEEDS NATIVE REVIEW before launch, as with `ops-common.ts`.
 */
export const DOCUMENT_REQUESTS: {
  trigger: L;
  panelTitle: L;
  panelLead: L;
  nameLabel: L;
  namePlaceholder: L;
  guidanceLabel: L;
  guidanceHint: L;
  guidancePlaceholder: L;
  send: L;
  sent: L;
  askedBadge: L;
  askedByAgency: L;
  withdraw: L;
  withdrawConfirmTitle: L;
  withdrawConfirmBody: L;
  withdrawConfirm: L;
  cancel: L;
  withdrawn: L;
} = {
  trigger: {
    en: "Ask for a document",
    ha: "Nemi takarda",
    yo: "Béèrè ìwé kan",
    ig: "Rịọ akwụkwọ",
    fr: "Demander un document",
    pt: "Pedir um documento",
    sw: "Omba hati",
    ar: "اطلب مستندًا",
    tw: "Bisa krataa bi",
    zu: "Cela idokhumenti",
  },
  panelTitle: {
    en: "Ask for a document",
    ha: "Nemi takarda",
    yo: "Béèrè ìwé kan",
    ig: "Rịọ akwụkwọ",
    fr: "Demander un document",
    pt: "Pedir um documento",
    sw: "Omba hati",
    ar: "اطلب مستندًا",
    tw: "Bisa krataa bi",
    zu: "Cela idokhumenti",
  },
  /**
   * Says the two things a reviewer has to know before typing: it goes on
   * this traveller's list only, and it is required once asked for.
   */
  panelLead: {
    en: "This goes on this traveller's checklist only, and they cannot submit until it is verified. To ask everyone on this route for it, revise the corridor instead.",
    ha: "Wannan zai shiga jerin wannan matafiyi kaɗai, kuma ba za su iya mikawa ba sai an tabbatar da shi. Don neman kowa a wannan hanya, sai a sake duba corridor.",
    yo: "Èyí wọ inú àkọsílẹ̀ arìnrìn-àjò yìí nìkan, wọn kò sì lè fi sílẹ̀ títí a fi jẹ́rìí sí i. Láti béèrè lọ́wọ́ gbogbo ènìyàn ní ọ̀nà yìí, tún corridor náà ṣe.",
    ig: "Nke a na-abanye naanị na ndepụta onye njem a, ha enweghịkwa ike ibunye ruo mgbe akwadoro ya. Iji rịọ onye ọ bụla nọ n'ụzọ a, gbanwee corridor ahụ.",
    fr: "Ceci n'apparaît que sur la liste de ce voyageur, et il ne pourra pas soumettre tant que ce n'est pas vérifié. Pour le demander à tous sur cet itinéraire, révisez le corridor.",
    pt: "Isto entra apenas na lista deste viajante, e não poderá submeter enquanto não for verificado. Para pedir a todos nesta rota, reveja o corredor.",
    sw: "Hii inaingia kwenye orodha ya msafiri huyu pekee, na hawezi kuwasilisha hadi ithibitishwe. Kuomba kila mtu kwenye njia hii, rekebisha corridor.",
    ar: "يُضاف هذا إلى قائمة هذا المسافر وحده، ولا يمكنه الإرسال حتى يتم التحقق منه. لطلبه من الجميع على هذا المسار، عدّل الممر.",
    tw: "Yei kɔ ɔkwantuni yi nkutoo ne krataa so, na ɔrentumi mfa nkɔma kosi sɛ wɔbɛgye atom. Sɛ wopɛ sɛ wobisa obiara a ɔfa ɔkwan yi so a, sesa corridor no.",
    zu: "Lokhu kungena ohlwini lwalesi sihambi kuphela, futhi ngeke bakwazi ukuthumela kuze kuqinisekiswe. Ukucela wonke umuntu kule ndlela, buyekeza i-corridor.",
  },
  nameLabel: {
    en: "What do you need?",
    ha: "Me kake buƙata?",
    yo: "Kí ni o nílò?",
    ig: "Gịnị ka ị chọrọ?",
    fr: "De quoi avez-vous besoin ?",
    pt: "Do que precisa?",
    sw: "Unahitaji nini?",
    ar: "ما الذي تحتاجه؟",
    tw: "Dɛn na wohia?",
    zu: "Udingani?",
  },
  namePlaceholder: {
    en: "Bank statements, last 6 months",
    ha: "Bayanan banki, watanni 6 na ƙarshe",
    yo: "Ìwé báǹkì, oṣù mẹ́fà sẹ́yìn",
    ig: "Akwụkwọ ụlọ akụ, ọnwa 6 gara aga",
    fr: "Relevés bancaires, 6 derniers mois",
    pt: "Extratos bancários, últimos 6 meses",
    sw: "Taarifa za benki, miezi 6 iliyopita",
    ar: "كشوف حسابك البنكي لآخر ٦ أشهر",
    tw: "Sikakorabea nkrataa, abosome 6 a atwam",
    zu: "Izitatimende zasebhange, izinyanga eziyi-6 ezedlule",
  },
  guidanceLabel: {
    en: "Anything they should know",
    ha: "Duk abin da ya kamata su sani",
    yo: "Ohunkóhun tí wọ́n gbọ́dọ̀ mọ̀",
    ig: "Ihe ọ bụla ha kwesịrị ịma",
    fr: "Ce qu'il faut qu'il sache",
    pt: "O que devem saber",
    sw: "Chochote wanachopaswa kujua",
    ar: "أي شيء ينبغي أن يعرفه",
    tw: "Biribiara a ɛsɛ sɛ wohu",
    zu: "Noma yini okufanele bayazi",
  },
  guidanceHint: {
    en: "Optional. They read this under the document's name.",
    ha: "Na zaɓi. Suna karanta wannan ƙarƙashin sunan takardar.",
    yo: "Àṣàyàn. Wọ́n ka èyí lábẹ́ orúkọ ìwé náà.",
    ig: "Nhọrọ. Ha na-agụ nke a n'okpuru aha akwụkwọ ahụ.",
    fr: "Facultatif. Il le lira sous le nom du document.",
    pt: "Opcional. Leem isto por baixo do nome do documento.",
    sw: "Si lazima. Wanasoma haya chini ya jina la hati.",
    ar: "اختياري. يظهر لهم أسفل اسم المستند.",
    tw: "Ɛnhia. Wɔkenkan yei wɔ krataa no din ase.",
    zu: "Akuphoqelekile. Bakufunda lokhu ngaphansi kwegama ledokhumenti.",
  },
  guidancePlaceholder: {
    en: "Every page, showing your name and the balance.",
    ha: "Kowane shafi, yana nuna sunanka da ma'auni.",
    yo: "Gbogbo ojú-ìwé, tí ó fi orúkọ rẹ àti iye owó hàn.",
    ig: "Ibe niile, na-egosi aha gị na ego dị.",
    fr: "Toutes les pages, avec votre nom et le solde.",
    pt: "Todas as páginas, com o seu nome e o saldo.",
    sw: "Kila ukurasa, ukionyesha jina lako na salio.",
    ar: "كل الصفحات، وعليها اسمك والرصيد.",
    tw: "Kratafa biara, a wo din ne sika a ɛwɔ so kyerɛ.",
    zu: "Wonke amakhasi, abonisa igama lakho nebhalansi.",
  },
  send: {
    en: "Ask for it",
    ha: "Nema shi",
    yo: "Béèrè fún un",
    ig: "Rịọ ya",
    fr: "Le demander",
    pt: "Pedir",
    sw: "Iombe",
    ar: "اطلبه",
    tw: "Bisa",
    zu: "Yicele",
  },
  sent: {
    en: "Added to their checklist. We have emailed them.",
    ha: "An ƙara a jerinsu. Mun aika musu imel.",
    yo: "A fi kún àkọsílẹ̀ wọn. A ti fi ìmẹ́lì ránṣẹ́ sí wọn.",
    ig: "Agbakwunyere na ndepụta ha. Anyị ezigala ha ozi.",
    fr: "Ajouté à sa liste. Nous l'avons prévenu par e-mail.",
    pt: "Adicionado à lista. Enviámos-lhes um e-mail.",
    sw: "Imeongezwa kwenye orodha yao. Tumewatumia barua pepe.",
    ar: "أُضيف إلى قائمتهم، وأرسلنا لهم بريدًا.",
    tw: "Wɔde aka wɔn krataa ho. Yɛde email akɔma wɔn.",
    zu: "Kwengeziwe ohlwini lwabo. Sibathumelele i-imeyili.",
  },
  /** On the row, both sides of the desk. */
  askedBadge: {
    en: "Asked for",
    ha: "An nema",
    yo: "A béèrè",
    ig: "A rịọrọ",
    fr: "Demandé",
    pt: "Pedido",
    sw: "Imeombwa",
    ar: "مطلوب",
    tw: "Wɔabisa",
    zu: "Kuceliwe",
  },
  /**
   * The traveller's side of the same badge. They need the *why* — this
   * appeared after they had finished, and without a reason it reads as
   * the checklist changing under them.
   */
  askedByAgency: {
    en: "Your agency asked for this one",
    ha: "Hukumarku ta nemi wannan",
    yo: "Ilé-iṣẹ́ rẹ béèrè fún èyí",
    ig: "Ụlọ ọrụ gị rịọrọ nke a",
    fr: "Votre agence a demandé ce document",
    pt: "A sua agência pediu este",
    sw: "Wakala wako aliomba hii",
    ar: "طلبت وكالتك هذا المستند",
    tw: "W'adwumakuo no na ɛbisaa yei",
    zu: "I-ejensi yakho icele leli",
  },
  withdraw: {
    en: "Withdraw",
    ha: "Janye",
    yo: "Fà á sẹ́yìn",
    ig: "Wepụ ya",
    fr: "Retirer",
    pt: "Retirar",
    sw: "Ondoa",
    ar: "سحب الطلب",
    tw: "Yi fi hɔ",
    zu: "Hoxisa",
  },
  withdrawConfirmTitle: {
    en: "Withdraw this request?",
    ha: "A janye wannan buƙatar?",
    yo: "Ṣé kí a fa ìbéèrè yìí sẹ́yìn?",
    ig: "Wepụ arịrịọ a?",
    fr: "Retirer cette demande ?",
    pt: "Retirar este pedido?",
    sw: "Uondoe ombi hili?",
    ar: "هل تسحب هذا الطلب؟",
    tw: "Yi abisadeɛ yi fi hɔ?",
    zu: "Uhoxisa lesi sicelo?",
  },
  /**
   * Says what lands on the click, in the present tense, and says
   * something the reviewer has not already read on the row behind the
   * dialog — that the traveller is not told, and that asking again means
   * typing it again.
   */
  withdrawConfirmBody: {
    en: "It comes off their checklist and they stop being asked for it. They are not told — the request simply goes. Asking again means typing it out again.",
    ha: "Zai fita daga jerinsu kuma ba za a ƙara neman sa ba. Ba za a gaya musu ba — buƙatar kawai ta ɓace. Sake nema yana nufin sake rubuta shi.",
    yo: "Yóò kúrò nínú àkọsílẹ̀ wọn, a kò sì ní béèrè fún un mọ́. A kò ní sọ fún wọn — ìbéèrè náà kàn parẹ́. Bíbéèrè lẹ́ẹ̀kan sí i túmọ̀ sí kíkọ ọ́ lẹ́ẹ̀kan sí i.",
    ig: "Ọ ga-apụ na ndepụta ha, a gaghịkwa arịọ ha ya ọzọ. A gaghị agwa ha — arịrịọ ahụ na-apụ. Ịrịọ ọzọ pụtara ịpịtụ ya ọzọ.",
    fr: "Le document quitte sa liste et ne lui est plus demandé. Il n'en est pas informé — la demande disparaît, simplement. Redemander veut dire tout retaper.",
    pt: "Sai da lista e deixa de ser pedido. Não são avisados — o pedido simplesmente desaparece. Pedir de novo significa escrevê-lo outra vez.",
    sw: "Itatoka kwenye orodha yao na hawataombwa tena. Hawaambiwi — ombi linatoweka tu. Kuomba tena kunamaanisha kuandika upya.",
    ar: "يُزال من قائمتهم ويتوقف طلبه منهم. ولن يُبلَّغوا — يختفي الطلب فحسب. وطلبه ثانيةً يعني كتابته من جديد.",
    tw: "Ɛbɛfi wɔn krataa no so na wɔremmisa bio. Wɔnka nkyerɛ wɔn — abisadeɛ no kɔ ara. Sɛ wopɛ bio a, ɛsɛ sɛ wotwerɛ bio.",
    zu: "Liyaphuma ohlwini lwabo futhi ayisaceliwe kubo. Abatshelwa — isicelo simane sinyamalale. Ukucela futhi kusho ukukubhala kabusha.",
  },
  withdrawConfirm: {
    en: "Withdraw the request",
    ha: "Janye buƙatar",
    yo: "Fa ìbéèrè náà sẹ́yìn",
    ig: "Wepụ arịrịọ ahụ",
    fr: "Retirer la demande",
    pt: "Retirar o pedido",
    sw: "Ondoa ombi",
    ar: "اسحب الطلب",
    tw: "Yi abisadeɛ no fi hɔ",
    zu: "Hoxisa isicelo",
  },
  cancel: {
    en: "Keep it",
    ha: "Bar shi",
    yo: "Fi sílẹ̀",
    ig: "Hapụ ya",
    fr: "La garder",
    pt: "Manter",
    sw: "Liache",
    ar: "أبقِه",
    tw: "Gyaa no hɔ",
    zu: "Yigcine",
  },
  withdrawn: {
    en: "Request withdrawn.",
    ha: "An janye buƙatar.",
    yo: "A ti fa ìbéèrè náà sẹ́yìn.",
    ig: "Ewepụla arịrịọ ahụ.",
    fr: "Demande retirée.",
    pt: "Pedido retirado.",
    sw: "Ombi limeondolewa.",
    ar: "تم سحب الطلب.",
    tw: "Wɔayi abisadeɛ no afi hɔ.",
    zu: "Isicelo sihoxisiwe.",
  },
};
