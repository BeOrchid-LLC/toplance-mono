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
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const INVITE_DIALOG: {
  inviteSomeone: L;
  sentTitle: L;
  sentDescriptionEmailPrefix: L;
  sentDescriptionCopy: L;
  sheetFor: L;
  emailWord: L;
  sheetValidFor: L;
  sheetThirtyDays: L;
  onlyAddressNotice: L;
  onlyAddressFallback: L;
  copyLinkCopied: L;
  copyLinkDefault: L;
  doneButton: L;
  inviteDescription: L;
  emailHelp: L;
  nameFieldsetLegend: L;
  nameFieldsetTag: L;
  fullNameLabel: L;
  fullNameHelp: L;
  sendingButton: L;
  sendButton: L;
  toastCopyFailed: L;
} = {
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
  sentDescriptionCopy: {
    en: "Copy the link if you would rather hand it over yourself.",
    ha: "Kwafi hanyar haɗin idan ka fi son mika ta da kanka.",
    yo: "Ṣe àdàkọ ọ̀nà ìjápọ̀ náà bí o bá fẹ́ fúnra rẹ fi ìjápọ̀ náà lé wọn lọ́wọ́.",
    ig: "Detu njikọ ahụ ma ọ bụrụ na ị chọrọ inyefe ya n'aka gị.",
    fr: "Copiez le lien si vous préférez le transmettre vous-même.",
    pt: "Copie o link se preferir entregá-lo você mesmo.",
    sw: "Nakili kiungo ikiwa ungependa kukikabidhi mwenyewe.",
    ar: "انسخ الرابط إذا كنت تفضل تسليمه بنفسك.",
    tw: "Twerɛ link no bio sɛ wopɛ sɛ wode ma wɔn wo ara a.",
    zu: "Kopisha isixhumanisi uma ungathanda ukusinikeza ngokwakho.",
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
  copyLinkCopied: {
    en: "Copied",
    ha: "An kwafa",
    yo: "A ti dà á kọ",
    ig: "Edetuola",
    fr: "Copié",
    pt: "Copiado",
    sw: "Imenakiliwa",
    ar: "تم النسخ",
    tw: "Wɔatwerɛ",
    zu: "Kukopishiwe",
  },
  copyLinkDefault: {
    en: "Copy link",
    ha: "Kwafi hanyar haɗi",
    yo: "Dà ọ̀nà ìjápọ̀ kọ",
    ig: "Detu njikọ",
    fr: "Copier le lien",
    pt: "Copiar link",
    sw: "Nakili kiungo",
    ar: "نسخ الرابط",
    tw: "Twerɛ link no bio",
    zu: "Kopisha isixhumanisi",
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
  toastCopyFailed: {
    en: "Copy failed — select the link text instead.",
    ha: "Kwafi ya kasa — maimakon haka, zaɓi rubutun hanyar haɗin.",
    yo: "Àdàkọ kùnà — dípò rẹ̀, yan ọ̀rọ̀ ìjápọ̀ náà.",
    ig: "Ndetu ya emeghị — kama ya, họrọ ederede njikọ ahụ.",
    fr: "La copie a échoué — sélectionnez plutôt le texte du lien.",
    pt: "A cópia falhou — selecione o texto do link em vez disso.",
    sw: "Kunakili kumeshindwa — chagua maandishi ya kiungo badala yake.",
    ar: "فشل النسخ — حدد نص الرابط بدلاً من ذلك.",
    tw: "Twerɛ no anyɛ yie — yi link no nkyerɛwee mmom.",
    zu: "Ukukopisha kwehlulekile — khetha umbhalo wesixhumanisi kunalokho.",
  },
};
