import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The landing page's "Book a demo" dialog — the form and the sheet it
 * becomes once the request is in.
 *
 * The trigger's label is not here, and neither is the title. The dialog
 * is titled with the very string that opened it —
 * `SITE_HOME.heroCtaBookDemo`, already translated and already the
 * client's own wording — so the heading can never drift from the button
 * that opens it, in any of the ten languages.
 *
 * `fullNameLabel` and the email wording deliberately repeat what
 * `PROFILE_FIELDS` and `INVITE_DIALOG` already say in each language.
 * Same field, same words, so a person who signs up after booking a demo
 * is not asked for something that sounds like a different thing.
 *
 * Errors the server returns are not here. Like `INVITE_DIALOG`, they
 * come back from the action — `requestDemo` in `@/app/[locale]/(site)/actions` —
 * and stay in English until every action in the codebase is translated,
 * which is its own piece of work rather than something to start here.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const DEMO_DIALOG: {
  description: L;
  fullNameLabel: L;
  emailLabel: L;
  companyLabel: L;
  jobTitleLabel: L;
  preferredLabel: L;
  timezoneLabel: L;
  submit: L;
  submitting: L;
  sentTitle: L;
  sentBody: L;
  close: L;
} = {
  description: {
    en: "Tell us who you are and when suits you. We will confirm the time by email.",
    ha: "Gaya mana ko wane ne kai da lokacin da ya dace da kai. Za mu tabbatar da lokacin ta imel.",
    yo: "Sọ fún wa ẹni tí o jẹ́ àti ìgbà tí ó bá ọ mu. A ó fi ímeèlì jẹ́rìí sí àkókò náà.",
    ig: "Gwa anyị onye ị bụ na mgbe dabara gị. Anyị ga-eji email kwenye oge ahụ.",
    fr: "Dites-nous qui vous êtes et quand vous êtes disponible. Nous confirmerons l'horaire par e-mail.",
    pt: "Diga-nos quem é e quando lhe dá jeito. Confirmamos o horário por e-mail.",
    sw: "Tuambie wewe ni nani na wakati unaokufaa. Tutathibitisha saa kwa barua pepe.",
    ar: "أخبرنا من أنت والوقت الذي يناسبك. سنؤكد الموعد عبر البريد الإلكتروني.",
    tw: "Ka onipa ko a woyɛ ne bere a ɛfata wo kyerɛ yɛn. Yɛde email besi bere no so dua.",
    zu: "Sitshele ukuthi ungubani nokuthi yisiphi isikhathi esikufanele. Sizoqinisekisa isikhathi nge-imeyili.",
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
    tw: "Din a edi mu",
    zu: "Igama eligcwele",
  },
  emailLabel: {
    en: "Work email",
    ha: "Imel na aiki",
    yo: "Ímeèlì iṣẹ́",
    ig: "Email ọrụ",
    fr: "E-mail professionnel",
    pt: "E-mail profissional",
    sw: "Barua pepe ya kazi",
    ar: "البريد الإلكتروني للعمل",
    tw: "Adwuma email",
    zu: "I-imeyili yomsebenzi",
  },
  companyLabel: {
    en: "Agency / Company name",
    ha: "Sunan hukuma / kamfani",
    yo: "Orúkọ ilé-iṣẹ́ arìnrìn-àjò / ilé-iṣẹ́",
    ig: "Aha ụlọ ọrụ njem / ụlọ ọrụ",
    fr: "Nom de l'agence / de l'entreprise",
    pt: "Nome da agência / empresa",
    sw: "Jina la wakala / kampuni",
    ar: "اسم الوكالة / الشركة",
    tw: "Ahyɛnsode / adwumakuw din",
    zu: "Igama le-ejensi / lenkampani",
  },
  jobTitleLabel: {
    en: "Job title / Role",
    ha: "Muƙami / matsayi",
    yo: "Orúkọ iṣẹ́ / ipò",
    ig: "Aha ọrụ / ọkwa",
    fr: "Fonction / poste",
    pt: "Cargo / função",
    sw: "Cheo / jukumu",
    ar: "المسمى الوظيفي / الدور",
    tw: "Adwuma dibea",
    zu: "Isikhundla / indima",
  },
  preferredLabel: {
    en: "Preferred demo date & time",
    ha: "Ranar da lokacin nuni da kake so",
    yo: "Ọjọ́ àti àkókò ìfihàn tí o fẹ́",
    ig: "Ụbọchị na oge ngosi ị chọrọ",
    fr: "Date et heure souhaitées",
    pt: "Data e hora preferidas",
    sw: "Tarehe na saa unayopendelea",
    ar: "التاريخ والوقت المفضلان",
    tw: "Da ne bere a wopɛ",
    zu: "Usuku nesikhathi osithandayo",
  },
  timezoneLabel: {
    en: "Timezone",
    ha: "Yankin lokaci",
    yo: "Àgbègbè àkókò",
    ig: "Mpaghara oge",
    fr: "Fuseau horaire",
    pt: "Fuso horário",
    sw: "Saa za eneo",
    ar: "المنطقة الزمنية",
    tw: "Bere mpɔtam",
    zu: "Isikhathi sendawo",
  },
  submit: {
    en: "Request a demo",
    ha: "Nemi nuni",
    yo: "Béèrè fún ìfihàn",
    ig: "Rịọ maka ngosi",
    fr: "Demander une démo",
    pt: "Pedir uma demonstração",
    sw: "Omba onyesho",
    ar: "اطلب عرضًا توضيحيًا",
    tw: "Bisa demo",
    zu: "Cela idemo",
  },
  submitting: {
    en: "Sending…",
    ha: "Ana aikawa…",
    yo: "Ń fi ránṣẹ́…",
    ig: "Na-eziga…",
    fr: "Envoi…",
    pt: "A enviar…",
    sw: "Inatuma…",
    ar: "جارٍ الإرسال…",
    tw: "Ɛresoma…",
    zu: "Iyathumela…",
  },
  sentTitle: {
    en: "Your request is in",
    ha: "An karɓi buƙatarka",
    yo: "A ti gba ìbéèrè rẹ",
    ig: "Anatala arịrịọ gị",
    fr: "Votre demande est enregistrée",
    pt: "O seu pedido foi recebido",
    sw: "Ombi lako limepokelewa",
    ar: "تم استلام طلبك",
    tw: "Yɛanya w'abisade no",
    zu: "Isicelo sakho sitholakele",
  },
  sentBody: {
    en: "We have your details and will email {{email}} to confirm a time.",
    ha: "Muna da bayananka kuma za mu tura imel zuwa {{email}} don tabbatar da lokaci.",
    yo: "A ti ní àwọn àlàyé rẹ, a ó sì fi ímeèlì ránṣẹ́ sí {{email}} láti jẹ́rìí sí àkókò kan.",
    ig: "Anyị nwere nkọwa gị, anyị ga-ezigakwa email na {{email}} iji kwenye oge.",
    fr: "Nous avons vos coordonnées et vous écrirons à {{email}} pour convenir d'un horaire.",
    pt: "Temos os seus dados e vamos escrever para {{email}} para confirmar um horário.",
    sw: "Tumepokea maelezo yako na tutakutumia barua pepe kwa {{email}} kuthibitisha saa.",
    ar: "لدينا بياناتك وسنراسلك على {{email}} لتأكيد الموعد.",
    tw: "Yɛwɔ wo ho nsɛm na yɛbɛsoma email akɔ {{email}} de asi bere no so dua.",
    zu: "Sinemininingwane yakho futhi sizothumela i-imeyili ku-{{email}} ukuqinisekisa isikhathi.",
  },
  close: {
    en: "Close",
    ha: "Rufe",
    yo: "Tì",
    ig: "Mechie",
    fr: "Fermer",
    pt: "Fechar",
    sw: "Funga",
    ar: "إغلاق",
    tw: "To mu",
    zu: "Vala",
  },
};
