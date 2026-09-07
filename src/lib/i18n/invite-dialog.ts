import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The employer's "Invite someone" dialog, both the form and the sent
 * sheet. Extracted from the client's English and translated in-house,
 * like `hero.ts`.
 *
 * `email@example.com` (the input's placeholder) is not in here — it is
 * an example address, not language, and reads the same in every locale.
 * The server-returned error a failed invite shows in a toast is not
 * static copy either; it comes back from `inviteTraveller` and stays in
 * English until that action itself is translated.
 *
 * The sent sheet's copy-link strings went with the button on 2026-09-07.
 * The invitation now travels by email alone, so the sheet no longer
 * offers to hand the link over — see `invite-dialog.tsx`.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const INVITE_DIALOG: {
  inviteButton: L;
  inviteSomeone: L;
  inviteClient: L;
  inviteTeamMember: L;
  sentTitle: L;
  sentDescriptionEmailPrefix: L;
  sheetFor: L;
  emailWord: L;
  sheetValidFor: L;
  sheetThirtyDays: L;
  onlyAddressNotice: L;
  onlyAddressFallback: L;
  doneButton: L;
  inviteDescription: L;
  emailHelp: L;
  nameFieldsetLegend: L;
  nameFieldsetTag: L;
  kindLegend: L;
  kindClient: L;
  kindClientHelp: L;
  kindStaff: L;
  kindStaffHelp: L;
  fullNameLabel: L;
  fullNameHelp: L;
  sendingButton: L;
  sendButton: L;
} = {
  /**
   * Every invite trigger in the agency console, in every locale: the
   * bare verb.
   *
   * The three strings below name who is being invited, and they still
   * do — as the dialog's heading. On the button they were saying it a
   * second time, in a place that already knew: the Clients page's one
   * action cannot invite a colleague, and the Team page's cannot invite
   * a client. A console reads as one product when its primary action is
   * spelled the same on every screen, and the noun that varied is the
   * one part of the sentence the surrounding page had already supplied.
   */
  inviteButton: {
    en: "Invite",
    ha: "Gayyata",
    yo: "Pè",
    ig: "Kpọọ oku",
    fr: "Inviter",
    pt: "Convidar",
    sw: "Alika",
    ar: "دعوة",
    tw: "Frɛ",
    zu: "Mema",
  },
  inviteSomeone: {
    en: "Invite someone",
    ha: "Gayyaci wani",
    yo: "Pe ẹnìkan",
    ig: "Kpọọ mmadụ oku",
    fr: "Inviter quelqu'un",
    pt: "Convidar alguém",
    sw: "Alika mtu",
    ar: "دعوة شخص",
    tw: "Frɛ obi",
    zu: "Mema umuntu",
  },
  inviteClient: {
    en: "Invite a client",
    ha: "Gayyaci abokin ciniki",
    yo: "Pe oníbàárà",
    ig: "Kpọọ onye ahịa",
    fr: "Inviter un client",
    pt: "Convidar um cliente",
    sw: "Mwalike mteja",
    ar: "دعوة عميل",
    tw: "To nsa frɛ adetɔni",
    zu: "Mema ikhasimende",
  },
  inviteTeamMember: {
    en: "Invite a team member",
    ha: "Gayyaci memban ƙungiya",
    yo: "Pe ọmọ ẹgbẹ́",
    ig: "Kpọọ onye otu",
    fr: "Inviter un membre de l'équipe",
    pt: "Convidar um membro da equipa",
    sw: "Mwalike mwanachama wa timu",
    ar: "دعوة عضو في الفريق",
    tw: "To nsa frɛ kuo no memba",
    zu: "Mema ilungu leqembu",
  },
  sentTitle: {
    en: "Invitation sent",
    ha: "An aika gayyata",
    yo: "A ti fi ìpè ránṣẹ́",
    ig: "Ezipụla ọkpụkpọ",
    fr: "Invitation envoyée",
    pt: "Convite enviado",
    sw: "Mwaliko umetumwa",
    ar: "تم إرسال الدعوة",
    tw: "Wɔasoma frɛ no",
    zu: "Isimemo sithunyelwe",
  },
  sentDescriptionEmailPrefix: {
    en: "An email is on its way to {email}. ",
    ha: "Ana aika imel zuwa {email}. ",
    yo: "Ímeèlì kan ń bọ̀ sí {email}. ",
    ig: "A na-eziga email na {email}. ",
    fr: "Un e-mail est en route vers {email}. ",
    pt: "Um e-mail está a caminho de {email}. ",
    sw: "Barua pepe iko njiani kwenda {email}. ",
    ar: "رسالة إلكترونية في طريقها إلى {email}. ",
    tw: "Wɔreto email akɔma {email}. ",
    zu: "I-imeyili isendleleni iya ku-{email}. ",
  },
  sheetFor: {
    en: "For",
    ha: "Ga",
    yo: "Fún",
    ig: "Maka",
    fr: "Pour",
    pt: "Para",
    sw: "Kwa",
    ar: "إلى",
    tw: "Ma",
    zu: "Ku",
  },
  emailWord: {
    en: "Email",
    ha: "Imel",
    yo: "Ímeèlì",
    ig: "Email",
    fr: "E-mail",
    pt: "E-mail",
    sw: "Barua pepe",
    ar: "البريد الإلكتروني",
    tw: "Email",
    zu: "I-imeyili",
  },
  sheetValidFor: {
    en: "Valid for",
    ha: "Inganci har",
    yo: "Ó wúlò fún",
    ig: "Ọ ga-adị irè ruo",
    fr: "Valable",
    pt: "Válido por",
    sw: "Inatumika kwa",
    ar: "صالحة لمدة",
    tw: "Ɛtena hɔ ma",
    zu: "Kusebenza",
  },
  sheetThirtyDays: {
    en: "30 days",
    ha: "Kwana 30",
    yo: "Ọjọ́ 30",
    ig: "Ụbọchị 30",
    fr: "30 jours",
    pt: "30 dias",
    sw: "Siku 30",
    ar: "30 يوماً",
    tw: "Nnafua 30",
    zu: "Izinsuku ezingu-30",
  },
  onlyAddressNotice: {
    en: "Only {email} can accept this invitation. Opened from any other address, it is refused.",
    ha: "{email} ne kaɗai zai iya amincewa da wannan gayyata. Idan an buɗe ta daga wani adireshi dabam, za a ƙi ta.",
    yo: "{email} nìkan ni ó lè tẹ́wọ́gba ìpè yìí. Bí a bá ṣí i láti ọ̀dọ̀ àdírẹ́sì mìíràn, a óò kọ̀ ọ́.",
    ig: "Ọ bụ naanị {email} nwere ike ịnabata ọkpụkpọ a. A gbanyere ya site n'adreesị ọ bụla ọzọ, a ga-ajụ ya.",
    fr: "Seule l'adresse {email} peut accepter cette invitation. Ouverte depuis toute autre adresse, elle est refusée.",
    pt: "Apenas {email} pode aceitar este convite. Se for aberto a partir de qualquer outro endereço, é recusado.",
    sw: "{email} pekee ndiye anaweza kukubali mwaliko huu. Ukifunguliwa kutoka anwani nyingine yoyote, utakataliwa.",
    ar: "يمكن فقط لـ {email} قبول هذه الدعوة. إذا فُتحت من أي عنوان آخر، سيتم رفضها.",
    tw: "{email} nko ara na ɔbɛtumi agye frɛ yi atom. Sɛ wobue firi adireesi foforɔ biara so a, wɔmpene so.",
    zu: "Ku-{email} kuphela okungamukela lesi simemo. Uma sivulwa kusuka kunoma iyiphi enye ikheli, siyenqatshelwa.",
  },
  onlyAddressFallback: {
    en: "the invited address",
    ha: "adireshin da aka gayyata",
    yo: "àdírẹ́sì tí a pè",
    ig: "adreesị a kpọrọ oku",
    fr: "l'adresse invitée",
    pt: "o endereço convidado",
    sw: "anwani iliyoalikwa",
    ar: "العنوان المدعو",
    tw: "adireesi a wɔfrɛɛ no",
    zu: "ikheli elimenyiwe",
  },
  doneButton: {
    en: "Done",
    ha: "An gama",
    yo: "Parí",
    ig: "Emechaala",
    fr: "Terminé",
    pt: "Concluído",
    sw: "Imekamilika",
    ar: "تم",
    tw: "Awie",
    zu: "Kwenziwe",
  },
  inviteDescription: {
    en: "They complete their own intake. You see their progress here, not their documents.",
    ha: "Za su cika bayanansu da kansu. Kana ganin ci gabansu a nan, ba takardunsu ba.",
    yo: "Àwọn fúnra wọn ni yóò parí ìforúkọsílẹ̀ wọn. O rí ìtẹ̀síwájú wọn níhìn-ín, kì í ṣe àwọn ìwé wọn.",
    ig: "Ha ga-emecha nzuputa aka ha. Ị na-ahụ ọganihu ha ebe a, ọ bụghị akwụkwọ ha.",
    fr: "Ils remplissent leur propre admission. Vous voyez leur progression ici, pas leurs documents.",
    pt: "Eles concluem a sua própria admissão. Vê o progresso deles aqui, não os documentos deles.",
    sw: "Watakamilisha uandikishaji wao wenyewe. Unaona maendeleo yao hapa, si nyaraka zao.",
    ar: "يكملون عملية التسجيل الخاصة بهم. ترى تقدمهم هنا، لا مستنداتهم.",
    tw: "Wɔn ankasa bɛwie wɔn nkyerɛmu. Wohu wɔn nkɔso wɔ ha, ɛnyɛ wɔn nkrataa.",
    zu: "Bazoqedela ukubhaliswa kwabo. Ubona inqubekelaphambili yabo lapha, hhayi amadokhumenti abo.",
  },
  emailHelp: {
    en: "The only field the invitation needs.",
    ha: "Kawai filin da gayyata take bukata.",
    yo: "Ẹyọ̀kan pé ni pápá tí ìpè náà nílò.",
    ig: "Naanị ngalaba ọkpụkpọ chọrọ.",
    fr: "Le seul champ dont l'invitation a besoin.",
    pt: "O único campo que o convite precisa.",
    sw: "Sehemu pekee inayohitajika kwa mwaliko.",
    ar: "الحقل الوحيد الذي تحتاجه الدعوة.",
    tw: "Kwan biako pɛ na frɛ no hia.",
    zu: "Yiyona nkambu kuphela isimemo esiyidingayo.",
  },
  nameFieldsetLegend: {
    en: "Their name, optional",
    ha: "Sunansu, ba dole ba",
    yo: "Orúkọ wọn, tí kò ṣe dandan",
    ig: "Aha ha, ọ bụghị iwu",
    fr: "Leur nom, facultatif",
    pt: "O nome deles, opcional",
    sw: "Jina lao, si lazima",
    ar: "اسمهم، اختياري",
    tw: "Wɔn din, ɛnhia",
    zu: "Igama labo, akuphoqelekile",
  },
  kindLegend: {
    en: "Who are you inviting?",
    ha: "Wa kake gayyata?",
    yo: "Ta ni o ń pè?",
    ig: "Onye ka ị na-akpọ oku?",
    fr: "Qui invitez-vous ?",
    pt: "Quem está a convidar?",
    sw: "Unamwalika nani?",
    ar: "من تدعو؟",
    tw: "Hwan na worefrɛ no?",
    zu: "Umema bani?",
  },
  kindClient: {
    en: "A client",
    ha: "Abokin ciniki",
    yo: "Oníbàárà",
    ig: "Onye ahịa",
    fr: "Un client",
    pt: "Um cliente",
    sw: "Mteja",
    ar: "عميل",
    tw: "Adetɔfoɔ",
    zu: "Iklayenti",
  },
  kindClientHelp: {
    en: "Someone whose visa you are handling. They get their own checklist.",
    ha: "Wanda kake tafiyar da bizarsa. Zai samu nasa jerin takardu.",
    yo: "Ẹnì tí o ń bójú tó fisa rẹ̀. Wọn yóò rí àkójọ ìwé tiwọn.",
    ig: "Onye ị na-elekọta visa ya. Ọ ga-enweta ndepụta nke ya.",
    fr: "Une personne dont vous gérez le visa. Elle reçoit sa propre liste.",
    pt: "Alguém cujo visto está a tratar. Recebe a sua própria lista.",
    sw: "Mtu ambaye unashughulikia viza yake. Atapata orodha yake mwenyewe.",
    ar: "شخص تتولى تأشيرته. سيحصل على قائمته الخاصة.",
    tw: "Obi a woredi ne visa ho dwuma. Ɔbɛnya n'ankasa nkrataa nhwɛso.",
    zu: "Umuntu omphathela i-visa. Uthola uhlu lwakhe.",
  },
  kindStaff: {
    en: "A colleague",
    ha: "Abokin aiki",
    yo: "Alábàáṣiṣẹ́",
    ig: "Onye ọrụ ibe",
    fr: "Un collègue",
    pt: "Um colega",
    sw: "Mfanyakazi mwenzako",
    ar: "زميل",
    tw: "Wo yɔnko adwumayɛfoɔ",
    zu: "Ozakwenu",
  },
  kindStaffHelp: {
    en: "Someone who works with you. They review your clients' documents.",
    ha: "Wanda kuke aiki tare. Zai duba takardun abokan cinikinku.",
    yo: "Ẹnì tí ẹ jọ ń ṣiṣẹ́. Wọn yóò yẹ àwọn ìwé oníbàárà yín wò.",
    ig: "Onye gị na ya na-arụkọ ọrụ. Ọ ga-enyocha akwụkwọ ndị ahịa gị.",
    fr: "Une personne qui travaille avec vous. Elle vérifie les documents de vos clients.",
    pt: "Alguém que trabalha consigo. Verifica os documentos dos seus clientes.",
    sw: "Mtu unayefanya naye kazi. Atakagua nyaraka za wateja wako.",
    ar: "شخص يعمل معك. سيراجع مستندات عملائك.",
    tw: "Obi a wo ne no yɛ adwuma. Ɔbɛhwɛ w'adetɔfoɔ nkrataa.",
    zu: "Umuntu osebenza naye. Uhlola amadokhumenti amakhasimende akho.",
  },
  nameFieldsetTag: {
    en: "Their name · optional",
    ha: "Sunansu · ba dole ba",
    yo: "Orúkọ wọn · tí kò ṣe dandan",
    ig: "Aha ha · ọ bụghị iwu",
    fr: "Leur nom · facultatif",
    pt: "O nome deles · opcional",
    sw: "Jina lao · si lazima",
    ar: "اسمهم · اختياري",
    tw: "Wɔn din · ɛnhia",
    zu: "Igama labo · akuphoqelekile",
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
    zu: "Igama eliphelele",
  },
  fullNameHelp: {
    en: "So the invitation greets them by name. Where they are going, and why, is theirs to answer in the intake.",
    ha: "Domin gayyata ta gaishe su da sunansu. Inda za su da kuma dalili, nasu ne su amsa a lokacin shigarwa.",
    yo: "Kí ìpè náà lè fi orúkọ kí wọn. Ibi tí wọ́n ń lọ, àti ìdí rẹ̀, ti ara wọn ni láti dáhùn nínú ìforúkọsílẹ̀.",
    ig: "Ka ọkpụkpọ ahụ jiri aha kelee ha. Ebe ha na-aga, na ihe mere, bụ nke ha ga-aza n'oge nzuputa.",
    fr: "Pour que l'invitation les salue par leur nom. Où ils vont, et pourquoi, c'est à eux de répondre lors de l'admission.",
    pt: "Para que o convite os cumprimente pelo nome. Para onde vão, e porquê, cabe a eles responder na admissão.",
    sw: "Ili mwaliko uwasalimu kwa jina. Wanakoenda, na kwa nini, ni jukumu lao kujibu wakati wa uandikishaji.",
    ar: "لكي تحيّيهم الدعوة باسمهم. أما وجهتهم ولماذا، فذلك أمر يجيبون عنه هم بأنفسهم أثناء التسجيل.",
    tw: "Sɛnea frɛ no bɛfa wɔn din akyea wɔn. Baabi a wɔrekɔ, ne deɛ enti a wɔrekɔ, ɛyɛ wɔn ara adwuma sɛ wɔbɛbua wɔ nkyerɛmu no mu.",
    zu: "Ukuze isimemo sibabingelele ngegama labo. Lapho beya khona, nokuthi kungani, kuwumsebenzi wabo ukuphendula lokho ekubhaliseni.",
  },
  sendingButton: {
    en: "Sending…",
    ha: "Ana aikawa…",
    yo: "Ń fi ránṣẹ́…",
    ig: "Na-eziga…",
    fr: "Envoi…",
    pt: "A enviar…",
    sw: "Inatuma…",
    ar: "جارٍ الإرسال…",
    tw: "Ɛreto soro…",
    zu: "Kuyathunyelwa…",
  },
  sendButton: {
    en: "Send invitation",
    ha: "Aika gayyata",
    yo: "Fi ìpè ránṣẹ́",
    ig: "Ziga ọkpụkpọ",
    fr: "Envoyer l'invitation",
    pt: "Enviar convite",
    sw: "Tuma mwaliko",
    ar: "إرسال الدعوة",
    tw: "Soma frɛ",
    zu: "Thumela isimemo",
  },
};
