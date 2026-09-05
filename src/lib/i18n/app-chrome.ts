import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The phone-width hamburger `app-nav-menu.tsx` opens. The items it lists
 * come from `travellerNav` (not in this dictionary — that file is outside
 * this pass's ownership), only the trigger's own label lives here.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const APP_NAV: { menuLabel: L } = {
  menuLabel: {
    en: "Navigation menu",
    ha: "Jerin kewayawa",
    yo: "Àkójọ ìlọsíwájú",
    ig: "Menu ntụgharị",
    fr: "Menu de navigation",
    pt: "Menu de navegação",
    sw: "Menyu ya kusogeza",
    ar: "قائمة التنقل",
    tw: "Akwankyerɛ nhyehyɛeɛ",
    zu: "Imenyu yokuzulazula",
  },
};

type NotificationKindKey =
  | "application_submitted"
  | "checklist_complete"
  | "status_changed"
  | "document_flagged"
  | "message_received"
  | "itinerary_ready"
  | "companion_digest"
  | "checklist_changed"
  | "visa_expiring"
  | "advisory_changed";

/**
 * Chrome for the notifications bell (`notifications-menu.tsx`) — the
 * dropdown's own labels and the ten `KIND_COPY` lines it shows per
 * notification. Independent of the email subject line the same event
 * sends via `@/lib/notifications/templates`, same reasoning the English
 * comment on `KIND_COPY` already gives: a list item is read in passing
 * and an inbox subject is read on its own.
 *
 * `{n}` in `ariaUnread` is replaced by the caller with the unread count.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const NOTIFICATIONS: {
  title: L;
  empty: L;
  ariaUnread: L;
  ariaNoUnread: L;
  kind: Record<NotificationKindKey, L>;
} = {
  title: {
    en: "Notifications",
    ha: "Sanarwowi",
    yo: "Àwọn ìfitónilétí",
    ig: "Ọkwa",
    fr: "Notifications",
    pt: "Notificações",
    sw: "Arifa",
    ar: "الإشعارات",
    tw: "Nkaebɔ",
    zu: "Izaziso",
  },
  empty: {
    en: "Nothing yet.",
    ha: "Babu kome tukuna.",
    yo: "Kò sí ohunkóhun síbẹ̀.",
    ig: "Ọ dịbeghị ihe ọ bụla.",
    fr: "Rien pour l'instant.",
    pt: "Nada por aqui ainda.",
    sw: "Bado hakuna kitu.",
    ar: "لا شيء بعد.",
    tw: "Hwee nnya nsi.",
    zu: "Akukho lutho okwamanje.",
  },
  ariaUnread: {
    en: "Notifications, {n} unread",
    ha: "Sanarwowi, {n} da ba a karanta ba",
    yo: "Àwọn ìfitónilétí, {n} tí a kò tí ì kà",
    ig: "Ọkwa, {n} a na-agụbeghị",
    fr: "Notifications, {n} non lues",
    pt: "Notificações, {n} por ler",
    sw: "Arifa, {n} hazijasomwa",
    ar: "الإشعارات، {n} غير مقروءة",
    tw: "Nkaebɔ, {n} a wonkanee",
    zu: "Izaziso, {n} ezingakafundwa",
  },
  ariaNoUnread: {
    en: "Notifications",
    ha: "Sanarwowi",
    yo: "Àwọn ìfitónilétí",
    ig: "Ọkwa",
    fr: "Notifications",
    pt: "Notificações",
    sw: "Arifa",
    ar: "الإشعارات",
    tw: "Nkaebɔ",
    zu: "Izaziso",
  },
  kind: {
    application_submitted: {
      en: "A case reached 100% and was submitted",
      ha: "Wani shari'a ya kai kashi 100% kuma an gabatar da shi",
      yo: "Ẹjọ́ kan dé 100% a sì fi í ránṣẹ́",
      ig: "Otu ikpe ruru 100% ma e nyefee ya",
      fr: "Un dossier a atteint 100 % et a été soumis",
      pt: "Um processo atingiu 100% e foi submetido",
      sw: "Kesi moja imefikia 100% na imewasilishwa",
      ar: "وصلت حالة إلى 100% وتم تقديمها",
      tw: "Asɛm bi aduru 100% na wɔde akɔma",
      zu: "Icala elithile lifinyelele ku-100% futhi lithunyelwe",
    },
    checklist_complete: {
      en: "A case reached 100% but has not been submitted",
      ha: "Wani shari'a ya kai kashi 100% amma ba a gabatar da shi ba",
      yo: "Ẹjọ́ kan dé 100% ṣùgbọ́n a kò tí ì fi í ránṣẹ́",
      ig: "Otu ikpe ruru 100% mana e nyefeghị ya",
      fr: "Un dossier a atteint 100 % mais n'a pas été soumis",
      pt: "Um processo atingiu 100% mas ainda não foi submetido",
      sw: "Kesi moja imefikia 100% lakini bado haijawasilishwa",
      ar: "وصلت حالة إلى 100% لكن لم يتم تقديمها بعد",
      tw: "Asɛm bi aduru 100% nanso wɔmfa nkɔmaa",
      zu: "Icala elithile lifinyelele ku-100% kodwa alikathunyelwa",
    },
    status_changed: {
      en: "Your application status changed",
      ha: "Matsayin nemanka ya canza",
      yo: "Ipò ìwé ẹ̀bẹ̀ rẹ ti yípadà",
      ig: "Ọnọdụ ngwa gị agbanweela",
      fr: "L'état de votre dossier a changé",
      pt: "O estado do seu pedido mudou",
      sw: "Hali ya maombi yako imebadilika",
      ar: "تغيّرت حالة طلبك",
      tw: "Wo application tebea asesa",
      zu: "Isimo sesicelo sakho sishintshile",
    },
    document_flagged: {
      en: "A document needs another look",
      ha: "Wata takarda tana buƙatar sake dubawa",
      yo: "Ìwé kan nílò àyẹ̀wò mìíràn",
      ig: "Otu akwụkwọ chọrọ ka a ledaa ya anya ọzọ",
      fr: "Un document doit être revu",
      pt: "Um documento precisa de ser revisto",
      sw: "Hati moja inahitaji kuangaliwa tena",
      ar: "يحتاج مستند إلى مراجعة أخرى",
      tw: "Krataa bi hia sɛ wɔhwɛ bio",
      zu: "Idokhumenti idinga ukuhlolwa futhi",
    },
    message_received: {
      en: "You have a new message",
      ha: "Kana da sabon saƙo",
      yo: "O ní ìránṣẹ́ tuntun",
      ig: "Ị nwere ozi ọhụrụ",
      fr: "Vous avez un nouveau message",
      pt: "Tem uma nova mensagem",
      sw: "Una ujumbe mpya",
      ar: "لديك رسالة جديدة",
      tw: "Wowɔ nkrasɛm foforɔ",
      zu: "Unomlayezo omusha",
    },
    itinerary_ready: {
      en: "Your arrival plan is ready",
      ha: "Shirin isowarka a shirye yake",
      yo: "Ètò ìdé rẹ ti ṣetán",
      ig: "Atụmatụ mbata gị adịla njikere",
      fr: "Votre plan d'arrivée est prêt",
      pt: "O seu plano de chegada está pronto",
      sw: "Mpango wako wa kuwasili uko tayari",
      ar: "خطة وصولك جاهزة",
      tw: "Wo baberɛ ho nhyehyɛeɛ awie",
      zu: "Uhlelo lwakho lokufika selulungile",
    },
    companion_digest: {
      en: "Your weekly digest is ready",
      ha: "Taƙaitawarka ta mako a shirye take",
      yo: "Àkópọ̀ ọ̀sẹ̀ rẹ ti ṣetán",
      ig: "Nchịkọta izu gị adịla njikere",
      fr: "Votre résumé hebdomadaire est prêt",
      pt: "O seu resumo semanal está pronto",
      sw: "Muhtasari wako wa wiki uko tayari",
      ar: "ملخصك الأسبوعي جاهز",
      tw: "Wo dapɛn nhyehyɛeɛ tiawa awie",
      zu: "Isifinyezo sakho sesonto sesilungile",
    },
    checklist_changed: {
      en: "Your document checklist changed",
      ha: "Jerin takardunka ya canza",
      yo: "Àkọsílẹ̀ ìwé rẹ ti yípadà",
      ig: "Ndepụta akwụkwọ gị agbanweela",
      fr: "Votre liste de documents a changé",
      pt: "A sua lista de documentos mudou",
      sw: "Orodha yako ya nyaraka imebadilika",
      ar: "تغيّرت قائمة مستنداتك",
      tw: "Wo nkrataa ho nhyehyɛeɛ asesa",
      zu: "Uhlu lwakho lwamadokhumenti lushintshile",
    },
    visa_expiring: {
      en: "Your visa is approaching its expiry date",
      ha: "Bizarka tana gab da ƙarewa",
      yo: "Fisa rẹ ń sún mọ́ àkókò tí yóò parí",
      ig: "Visa gị na-erule oge ọ ga-agwụ",
      fr: "Votre visa approche de sa date d'expiration",
      pt: "O seu visto está a aproximar-se da data de validade",
      sw: "Viza yako inakaribia tarehe ya kuisha",
      ar: "تقترب تأشيرتك من تاريخ انتهائها",
      tw: "Wo visa reyɛ awie ne da a wɔahyɛ",
      zu: "I-visa yakho isizosiphelelwa yisikhathi",
    },
    advisory_changed: {
      en: "Travel advice for your destination changed",
      ha: "Shawarar tafiya zuwa wurin da za ka je ta canza",
      yo: "Ìmọ̀ràn ìrìnàjò fún ibi tí o ń lọ ti yípadà",
      ig: "Ndụmọdụ njem gaa n'ebe ị na-aga agbanweela",
      fr: "Les conseils aux voyageurs pour votre destination ont changé",
      pt: "As recomendações de viagem para o seu destino mudaram",
      sw: "Ushauri wa safari kwa unakoenda umebadilika",
      ar: "تغيّرت نصيحة السفر لوجهتك",
      tw: "Akwantuo ho afotuo a ɛfa baabi a woreko no asesa",
      zu: "Iseluleko sokuhamba sendawo oya kuyo sishintshile",
    },
  },
};
