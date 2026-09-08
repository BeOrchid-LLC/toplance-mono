import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The error strings `@/app/agency/actions.ts` returns as `{ error }`.
 *
 * Same shape and the same reasoning as `ops-actions.ts`: resolved
 * server-side with `getLocale()`, because a Server Action runs as a POST
 * to the page that rendered its button, so `proxy.ts` has already set
 * `x-toplance-locale` by the time the action body runs. The dialog that
 * calls these just toasts whatever comes back.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const AGENCY_ACTIONS: {
  onlyOwnerInvitesStaff: L;
  planNotPaid: L;
  chooseVerdict: L;
  chooseStatus: L;
  chooseFlagReason: L;
  chooseAttendanceKind: L;
  attendanceNeedsPlace: L;
} = {
  chooseAttendanceKind: {
    en: "Choose whether this is biometrics or an interview.",
    ha: "Zaɓi ko wannan biometrics ne ko tattaunawa.",
    yo: "Yan bóyá biometrics ni tàbí ìfọ̀rọ̀wánilẹ́nuwò.",
    ig: "Họrọ ma ọ bụ biometrics ka ọ bụ ajụjụ ọnụ.",
    fr: "Choisissez s'il s'agit de biométrie ou d'un entretien.",
    pt: "Escolha se é biometria ou uma entrevista.",
    sw: "Chagua kama ni biometriki au mahojiano.",
    ar: "اختر ما إذا كان هذا قياسات حيوية أم مقابلة.",
    tw: "Paw sɛ biometrics anaa nkɔmmɔbisa.",
    zu: "Khetha ukuthi yi-biometrics noma yinhlolokhono.",
  },
  attendanceNeedsPlace: {
    en: "Say where the traveller should go — an address they can find.",
    ha: "Faɗi inda matafiyin zai je — adireshin da za su iya samu.",
    yo: "Sọ ibi tí arìnrìn-àjò yóò lọ — àdírẹ́sì tí wọ́n lè rí.",
    ig: "Kwuo ebe onye njem ga-aga — adreesị ha nwere ike ịchọta.",
    fr: "Indiquez où le voyageur doit se rendre — une adresse qu'il peut trouver.",
    pt: "Diga para onde o viajante deve ir — uma morada que consiga encontrar.",
    sw: "Sema msafiri aende wapi — anwani wanayoweza kuipata.",
    ar: "حدّد إلى أين يذهب المسافر — عنوان يمكنه الوصول إليه.",
    tw: "Ka baabi a ɔkwantufoɔ no nkɔ — address a wɔbɛtumi ahu.",
    zu: "Sho ukuthi umhambi kufanele aye kuphi — ikheli angalithola.",
  },
  planNotPaid: {
    en: "Your plan is not paid for, so invitations are on hold. Nothing is lost — pay for the plan and send it again.",
    ha: "Ba a biya kuɗin shirinku ba, don haka an dakatar da gayyata. Ba a rasa kome ba — ku biya kuɗin shirin sannan ku sake aikawa.",
    yo: "A kò tíì san owó ètò yín, nítorí náà a ti dá àwọn ìpè dúró. Kò sí ohun tí ó sọnù — san owó ètò náà kí o sì tún fi ránṣẹ́.",
    ig: "A kwụghị ụgwọ atụmatụ gị, ya mere a kwụsịtụrụ ọkpụkpọ oku. Ọ dịghị ihe furu efu — kwụọ ụgwọ atụmatụ ahụ ziga ya ọzọ.",
    fr: "Votre formule n'est pas payée, les invitations sont donc suspendues. Rien n'est perdu — réglez la formule et renvoyez-la.",
    pt: "O seu plano não está pago, por isso os convites estão suspensos. Nada se perdeu — pague o plano e envie de novo.",
    sw: "Mpango wako haujalipiwa, kwa hivyo mialiko imesimamishwa. Hakuna kilichopotea — lipia mpango kisha utume tena.",
    ar: "لم تُدفع قيمة خطتك، لذا أُوقفت الدعوات. لم يضع شيء — ادفع قيمة الخطة ثم أرسلها مجددًا.",
    tw: "Wontuaa wo nhyehyɛe no ka, enti wɔagyae nsato no. Biribiara nyeraeɛ — tua nhyehyɛe no ka na san fa kɔ.",
    zu: "Uhlelo lwakho alukakhokhelwa, ngakho izimemo zimisiwe. Akukho okulahlekile — khokhela uhlelo bese uyithumela futhi.",
  },
  onlyOwnerInvitesStaff: {
    en: "Only a director can invite a colleague.",
    ha: "Darakta ne kawai zai iya gayyatar abokin aiki.",
    yo: "Olùdarí nìkan ló lè pe alábàáṣiṣẹ́.",
    ig: "Ọ bụ naanị onye nduzi nwere ike ịkpọ onye ọrụ ibe ya oku.",
    fr: "Seul un directeur peut inviter un collègue.",
    pt: "Só um diretor pode convidar um colega.",
    sw: "Mkurugenzi pekee ndiye anayeweza kualika mfanyakazi mwenzake.",
    ar: "المدير وحده يمكنه دعوة زميل.",
    tw: "Ɔpanyin nko ara na ɔbɛtumi afrɛ ne yɔnko adwumayɛfoɔ.",
    zu: "Umqondisi kuphela ongamema ozakwabo.",
  },
  chooseVerdict: {
    en: "Choose a verdict.",
    ha: "Zaɓi hukunci.",
    yo: "Yan ìdájọ́ kan.",
    ig: "Họrọ mkpebi.",
    fr: "Choisissez un verdict.",
    pt: "Escolha um veredito.",
    sw: "Chagua uamuzi.",
    ar: "اختر حكمًا.",
    tw: "Yi gyinaeɛ bi.",
    zu: "Khetha isinqumo.",
  },
  chooseStatus: {
    en: "Choose a status.",
    ha: "Zaɓi matsayi.",
    yo: "Yan ipò kan.",
    ig: "Họrọ ọnọdụ.",
    fr: "Choisissez un statut.",
    pt: "Escolha um estado.",
    sw: "Chagua hali.",
    ar: "اختر حالة.",
    tw: "Yi tebea bi.",
    zu: "Khetha isimo.",
  },
  chooseFlagReason: {
    en: "Say what kind of problem it is.",
    ha: "Faɗi wace irin matsala ce.",
    yo: "Sọ irú ìṣòro tí ó jẹ́.",
    ig: "Kwuo ụdị nsogbu ọ bụ.",
    fr: "Indiquez de quel type de problème il s'agit.",
    pt: "Diga que tipo de problema é.",
    sw: "Sema ni tatizo la aina gani.",
    ar: "حدد نوع المشكلة.",
    tw: "Ka ɔhaw ko a ɛyɛ.",
    zu: "Sho ukuthi yiluphi uhlobo lwenkinga.",
  },
};
