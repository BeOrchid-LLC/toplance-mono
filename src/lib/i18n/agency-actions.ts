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
  onlyDirectorChangesRank: L;
  chooseARank: L;
  lastDirector: L;
  notAColleague: L;
} = {
  onlyDirectorChangesRank: {
    en: "Only a director can change a colleague's rank.",
    ha: "Darakta ne kawai zai iya canza matsayin abokin aiki.",
    yo: "Olùdarí nìkan ló lè yí ipò alábàáṣiṣẹ́ padà.",
    ig: "Ọ bụ naanị onye nduzi nwere ike ịgbanwe ọkwa onye ọrụ ibe ya.",
    fr: "Seul un directeur peut changer le rôle d'un collègue.",
    pt: "Só um diretor pode alterar a função de um colega.",
    sw: "Mkurugenzi pekee ndiye anayeweza kubadilisha cheo cha mwenzake.",
    ar: "المدير وحده يمكنه تغيير رتبة زميل.",
    tw: "Ɔpanyin nko ara na ɔbɛtumi asesa ne yɔnko adwumayɛni dibea.",
    zu: "Umqondisi kuphela ongashintsha isikhundla sozakwabo.",
  },
  chooseARank: {
    en: "Choose whether this colleague is a director or a travel agent.",
    ha: "Zaɓi ko wannan abokin aikin darakta ne ko wakilin balaguro.",
    yo: "Yàn bóyá alábàáṣiṣẹ́ yìí jẹ́ olùdarí tàbí aṣojú ìrìn-àjò.",
    ig: "Họrọ ma onye ọrụ ibe a ọ̀ bụ onye nduzi ma ọ bụ onye ọrụ njem.",
    fr: "Choisissez si ce collègue est directeur ou agent de voyage.",
    pt: "Escolha se este colega é diretor ou agente de viagens.",
    sw: "Chagua kama mwenzako huyu ni mkurugenzi au wakala wa safari.",
    ar: "اختر ما إذا كان هذا الزميل مديرًا أو وكيل سفر.",
    tw: "Paw sɛ saa adwumayɛni yi yɛ ɔpanyin anaa akwantuo ho dwumayɛni.",
    zu: "Khetha ukuthi lo ozakwenu ungumqondisi noma i-ejenti yohambo.",
  },
  lastDirector: {
    en: "You are this agency's only director. Promote a colleague before you step down.",
    ha: "Kai ne kaɗai daraktan wannan hukumar. Ɗaga wani abokin aiki kafin ka sauka.",
    yo: "Ìwọ nìkan ni olùdarí ilé-iṣẹ́ yìí. Gbé alábàáṣiṣẹ́ kan ga kí o tó sọ̀ kalẹ̀.",
    ig: "Ọ bụ naanị gị bụ onye nduzi ụlọ ọrụ a. Bulie onye ọrụ ibe tupu ị hapụ ọkwa ahụ.",
    fr: "Vous êtes le seul directeur de cette agence. Promouvez un collègue avant de vous retirer.",
    pt: "É o único diretor desta agência. Promova um colega antes de sair do cargo.",
    sw: "Wewe ndiye mkurugenzi pekee wa wakala huyu. Mpandishe mwenzako kabla ya kujiuzulu.",
    ar: "أنت المدير الوحيد لهذه الوكالة. رقِّ زميلًا قبل أن تتنحى.",
    tw: "Wo nko ara ne saa adwumakuo yi panyin. Ma wo yɔnko so ansa na woasi hɔ.",
    zu: "Unguye kuphela umqondisi wale nhlangano. Khuphula ozakwenu ngaphambi kokwehla.",
  },
  notAColleague: {
    en: "That person does not work at this agency.",
    ha: "Wannan mutumin ba ya aiki a wannan hukumar.",
    yo: "Ẹni yìí kò ṣiṣẹ́ ní ilé-iṣẹ́ yìí.",
    ig: "Onye ahụ anaghị arụ ọrụ na ụlọ ọrụ a.",
    fr: "Cette personne ne travaille pas dans cette agence.",
    pt: "Essa pessoa não trabalha nesta agência.",
    sw: "Mtu huyo hafanyi kazi katika wakala huyu.",
    ar: "هذا الشخص لا يعمل في هذه الوكالة.",
    tw: "Saa onipa no nyɛ adwuma wɔ saa adwumakuo yi mu.",
    zu: "Lowo muntu akasebenzi kule nhlangano.",
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
