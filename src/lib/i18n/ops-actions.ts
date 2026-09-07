import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The error strings `@/app/[locale]/ops/actions.ts` returns as `{ error }`.
 *
 * Resolved server-side, with `getActionLocale()` reading the
 * `x-toplance-locale` header — a Server Action runs as a POST to the
 * page that rendered its button, so `proxy.ts` has already set the
 * header by the time the action body runs. Server Components read the
 * `[locale]` route segment instead, which a Server Action cannot. The
 * client components that call these actions (`add-case-note.tsx`,
 * `review-row.tsx`, `status-control.tsx`, `corridor-decision.tsx`,
 * `requirement-condition.tsx`) just `toast.error(result.error)` whatever
 * comes back, so there is nothing to re-translate on their side.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_ACTIONS: {
  onlyOwnerApprove: L;
  onlyOwnerReject: L;
  onlyOwnerCondition: L;
  chooseAtLeastOneAnswer: L;
  ruleNotRecognized: L;
  tenantNotFound: L;
  demoRequestNotFound: L;
  demoRequestAlreadyConverted: L;
  provisionFailed: L;
  chooseADemoStatus: L;
  chooseARole: L;
  conversionNotAStatus: L;
  agencyNameRequired: L;
  agencyNameTooLong: L;
  ownerEmailInvalid: L;
  seatsInvalid: L;
  billingEmailInvalid: L;
  notAMember: L;
  lastOwner: L;
} = {
  onlyOwnerApprove: {
    en: "Only a super admin can approve a route.",
    ha: "Babban admin ne kawai zai iya amincewa da hanya.",
    yo: "Alábòójútó gíga nìkan ló lè fọwọ́ sí ipa ọ̀nà.",
    ig: "Ọ bụ naanị onyeisi kachasị elu nwere ike ikwenye ụzọ.",
    fr: "Seul un super administrateur peut approuver un itinéraire.",
    pt: "Só um super administrador pode aprovar uma rota.",
    sw: "Msimamizi mkuu pekee ndiye anayeweza kuidhinisha njia.",
    ar: "المشرف الأعلى وحده يمكنه اعتماد المسار.",
    tw: "Ɔhwɛfoɔ kɛseɛ nko ara na ɔbɛtumi apene ɛkwan so.",
    zu: "Umphathi omkhulu kuphela ongagunyaza indlela.",
  },
  onlyOwnerReject: {
    en: "Only a super admin can reject a route.",
    ha: "Babban admin ne kawai zai iya ƙin hanya.",
    yo: "Alábòójútó gíga nìkan ló lè kọ ipa ọ̀nà.",
    ig: "Ọ bụ naanị onyeisi kachasị elu nwere ike ajụ ụzọ.",
    fr: "Seul un super administrateur peut refuser un itinéraire.",
    pt: "Só um super administrador pode rejeitar uma rota.",
    sw: "Msimamizi mkuu pekee ndiye anayeweza kukataa njia.",
    ar: "المشرف الأعلى وحده يمكنه رفض المسار.",
    tw: "Ɔhwɛfoɔ kɛseɛ nko ara na ɔbɛtumi apo ɛkwan.",
    zu: "Umphathi omkhulu kuphela ongenqaba indlela.",
  },
  onlyOwnerCondition: {
    en: "Only a super admin can write a requirement rule.",
    ha: "Babban admin ne kawai zai iya rubuta ƙa'idar buƙata.",
    yo: "Alábòójútó gíga nìkan ló lè kọ òfin ohun tí a béèrè.",
    ig: "Ọ bụ naanị onyeisi kachasị elu nwere ike ide iwu ihe achọrọ.",
    fr: "Seul un super administrateur peut rédiger une règle d'exigence.",
    pt: "Só um super administrador pode escrever uma regra de requisito.",
    sw: "Msimamizi mkuu pekee ndiye anayeweza kuandika sheria ya hitaji.",
    ar: "المشرف الأعلى وحده يمكنه كتابة قاعدة متطلب.",
    tw: "Ɔhwɛfoɔ kɛseɛ nko ara na ɔbɛtumi atwerɛ ahyɛde mmara.",
    zu: "Umphathi omkhulu kuphela ongabhala umthetho wesidingo.",
  },
  chooseAtLeastOneAnswer: {
    en: "Choose at least one answer this document applies to.",
    ha: "Zaɓi aƙalla amsa ɗaya da wannan takarda ta shafa.",
    yo: "Yan ó kéré tán ìdáhùn kan tí ìwé yìí kàn.",
    ig: "Họrọ opekata mpe otu azịza akwụkwọ a metụtara.",
    fr: "Choisissez au moins une réponse à laquelle ce document s'applique.",
    pt: "Escolha pelo menos uma resposta a que este documento se aplica.",
    sw: "Chagua jibu moja angalau ambalo hati hii inahusika nalo.",
    ar: "اختر إجابة واحدة على الأقل ينطبق عليها هذا المستند.",
    tw: "Yi mmuae baako a saa krataa yi fa ho no.",
    zu: "Khetha okungenani impendulo eyodwa lolu hlaka olusebenza kuyo.",
  },
  ruleNotRecognized: {
    en: "That rule does not name an intake question we ask.",
    ha: "Wannan ƙa'idar bata ambaci wata tambaya da muke yi ba.",
    yo: "Òfin náà kò dárúkọ ìbéèrè tí a béèrè.",
    ig: "Iwu ahụ akpọpụtaghị ajụjụ ọ bụla anyị na-ajụ.",
    fr: "Cette règle ne nomme aucune question posée à l'admission.",
    pt: "Essa regra não indica nenhuma pergunta de admissão que fazemos.",
    sw: "Sheria hiyo haitaji swali lolote la kuandikisha tunaloliuliza.",
    ar: "هذه القاعدة لا تشير إلى أي سؤال استقبال نطرحه.",
    tw: "Saa mmara no nkyerɛ nsɛmmisa biara a yɛbisa.",
    zu: "Lowo mthetho awuqambi umbuzo wokubhaliswa esiwubuzayo.",
  },
  tenantNotFound: {
    en: "We could not find that agency.",
    ha: "Ba mu sami wannan hukumar ba.",
    yo: "A kò rí ilé-iṣẹ́ yẹn.",
    ig: "Anyị ahụghị ụlọ ọrụ ahụ.",
    fr: "Nous n'avons pas trouvé cette agence.",
    pt: "Não encontrámos essa agência.",
    sw: "Hatukupata wakala huyo.",
    ar: "لم نتمكن من العثور على تلك الوكالة.",
    tw: "Yɛanhu saa adwumakuo no.",
    zu: "Asiyitholanga leyo ejensi.",
  },
  demoRequestNotFound: {
    en: "We could not find that demo request.",
    ha: "Ba mu sami wannan buƙatar nunin ba.",
    yo: "A kò rí ìbéèrè àfihàn yẹn.",
    ig: "Anyị ahụghị arịrịọ ngosi ahụ.",
    fr: "Nous n'avons pas trouvé cette demande de démonstration.",
    pt: "Não encontrámos esse pedido de demonstração.",
    sw: "Hatukupata ombi hilo la onyesho.",
    ar: "لم نتمكن من العثور على طلب العرض التوضيحي.",
    tw: "Yɛanhu saa yɛkyerɛ abisadeɛ no.",
    zu: "Asisitholanga leso sicelo somboniso.",
  },
  /**
   * `provisionTenantTx` refuses to re-provision a demo request that is
   * already `converted` — the guard that stops a double-submit from
   * orphaning the first agency (`@/lib/data/tenants`). Deliberately not
   * `demoRequestNotFound`: the operator is looking at this row, so
   * telling them it does not exist would be a worse lie than the bug it
   * replaces.
   */
  demoRequestAlreadyConverted: {
    en: "That demo request has already become an agency.",
    ha: "Wannan buƙatar nunin ta riga ta zama hukuma.",
    yo: "Ìbéèrè àfihàn yẹn ti di ilé-iṣẹ́ tẹ́lẹ̀.",
    ig: "Arịrịọ ngosi ahụ abụrụlarị ụlọ ọrụ.",
    fr: "Cette demande de démonstration est déjà devenue une agence.",
    pt: "Esse pedido de demonstração já se tornou uma agência.",
    sw: "Ombi hilo la onyesho tayari limekuwa wakala.",
    ar: "لقد أصبح طلب العرض التوضيحي هذا وكالة بالفعل.",
    tw: "Saa yɛkyerɛ abisadeɛ no adan adwumakuo dedaw.",
    zu: "Leso sicelo somboniso sesibe yiejensi kakade.",
  },
  provisionFailed: {
    en: "We could not set that agency up. Nothing was created.",
    ha: "Ba mu iya kafa wannan hukumar ba. Ba a ƙirƙiri kome ba.",
    yo: "A kò lè ṣètò ilé-iṣẹ́ yẹn. A kò dá ohunkóhun.",
    ig: "Anyị enweghị ike ịtọlite ụlọ ọrụ ahụ. E kereghị ihe ọ bụla.",
    fr: "Nous n'avons pas pu créer cette agence. Rien n'a été créé.",
    pt: "Não conseguimos criar essa agência. Nada foi criado.",
    sw: "Hatukuweza kusanidi wakala huyo. Hakuna kilichoundwa.",
    ar: "لم نتمكن من إعداد تلك الوكالة. لم يتم إنشاء أي شيء.",
    tw: "Yɛantumi ansiesie saa adwumakuo no. Wɔanyɛ biribiara.",
    zu: "Asikwazanga ukusetha leyo ejensi. Akukho okudaliwe.",
  },
  chooseADemoStatus: {
    en: "Choose a status for this request.",
    ha: "Zaɓi matsayi don wannan buƙatar.",
    yo: "Yan ipò kan fún ìbéèrè yìí.",
    ig: "Họrọ ọnọdụ maka arịrịọ a.",
    fr: "Choisissez un statut pour cette demande.",
    pt: "Escolha um estado para este pedido.",
    sw: "Chagua hali kwa ombi hili.",
    ar: "اختر حالة لهذا الطلب.",
    tw: "Yi gyinabea bi ma saa abisadeɛ yi.",
    zu: "Khetha isimo salesi sicelo.",
  },
  /**
   * `updateDemoRequestStatus` refuses `converted` as a status an
   * operator sets — it is the other half of `provisionTenantTx`
   * (`@/lib/data/tenants`), stamped only when the agency it names
   * actually gets created. Deliberately not `provisionFailed`: nobody
   * attempted a provision here, so a string that reports one failing
   * describes the wrong operation and gives the operator nothing to do
   * next. This one points at the actual next step.
   */
  chooseARole: {
    en: "Choose whether this person is an owner or a reviewer.",
    ha: "Zaɓi ko wannan mutumin mai shi ne ko mai dubawa.",
    yo: "Yàn bóyá ẹni yìí jẹ́ olóhun tàbí olùyẹ̀wò.",
    ig: "Họrọ ma onye a ọ̀ bụ onyenwe ya ma ọ bụ onye nyocha.",
    fr: "Choisissez si cette personne est propriétaire ou réviseur.",
    pt: "Escolha se esta pessoa é proprietária ou revisora.",
    sw: "Chagua kama mtu huyu ni mmiliki au mkaguzi.",
    ar: "اختر ما إذا كان هذا الشخص مالكًا أو مراجعًا.",
    tw: "Paw sɛ saa onipa yi yɛ owura anaa ɔhwɛfoɔ.",
    zu: "Khetha ukuthi lo muntu ungumnikazi noma umbuyekezi.",
  },
  conversionNotAStatus: {
    en: "Conversion is recorded when you create the agency from this request — provision it instead.",
    ha: "Ana yin rikodin canzawa ne lokacin da ka ƙirƙiri hukumar daga wannan buƙatar — maimakon haka, sai ka kafa ta.",
    yo: "A máa ń kọ ìyípadà sílẹ̀ nígbà tí o bá dá ilé-iṣẹ́ sílẹ̀ láti inú ìbéèrè yìí — dípò bẹ́ẹ̀, ṣètò rẹ̀.",
    ig: "A na-edekọ mgbanwe mgbe ị guzobere ụlọ ọrụ site na arịrịọ a — kama nke ahụ, tọlite ya.",
    fr: "La conversion est enregistrée lorsque vous créez l'agence à partir de cette demande — créez-la plutôt.",
    pt: "A conversão é registada quando cria a agência a partir deste pedido — crie-a antes.",
    sw: "Ubadilishaji unarekodiwa unapounda wakala kutoka ombi hili — badala yake, mwanzishe.",
    ar: "يُسجَّل التحويل عند إنشاء الوكالة من هذا الطلب — أنشئها بدلاً من ذلك.",
    tw: "Wɔkyerɛw nsakrae no bere a wobɛbɔ adwumakuo no afiri saa abisadeɛ yi mu — sɛ wobɛyɛ saa a, hyɛ ase.",
    zu: "Ukuguqulwa kurekhodwa lapho udala i-ejensi kusukela kulesi sicelo — kunalokho, iqale.",
  },
  agencyNameRequired: {
    en: "Enter a name for the agency.",
    ha: "Shigar da sunan hukumar.",
    yo: "Tẹ orúkọ ilé-iṣẹ́ náà sí i.",
    ig: "Tinye aha ụlọ ọrụ ahụ.",
    fr: "Saisissez un nom pour l'agence.",
    pt: "Introduza um nome para a agência.",
    sw: "Weka jina la wakala.",
    ar: "أدخل اسمًا للوكالة.",
    tw: "Kyerɛw adwumakuo no din.",
    zu: "Faka igama le-ejensi.",
  },
  agencyNameTooLong: {
    en: "That name is too long.",
    ha: "Wannan sunan ya yi tsawo sosai.",
    yo: "Orúkọ yẹn gùn jù.",
    ig: "Aha ahụ dị ogologo nke ukwuu.",
    fr: "Ce nom est trop long.",
    pt: "Esse nome é demasiado longo.",
    sw: "Jina hilo ni refu mno.",
    ar: "هذا الاسم طويل جدًا.",
    tw: "Saa din no ware dodo.",
    zu: "Lelo gama lide kakhulu.",
  },
  ownerEmailInvalid: {
    en: "Enter a valid email address for the first owner.",
    ha: "Shigar da adireshin imel mai inganci don mai mallakar farko.",
    yo: "Tẹ àdírẹ́sì ímeèlì tó tọ́ sí i fún onílé àkọ́kọ́.",
    ig: "Tinye adreesị ozi-e ziri ezi maka onye nwe mbụ.",
    fr: "Saisissez une adresse e-mail valide pour le premier propriétaire.",
    pt: "Introduza um endereço de email válido para o primeiro proprietário.",
    sw: "Weka anwani sahihi ya barua pepe kwa mmiliki wa kwanza.",
    ar: "أدخل عنوان بريد إلكتروني صالحًا للمالك الأول.",
    tw: "Kyerɛw email address a ɛfata ma owura a odi kan no.",
    zu: "Faka ikheli le-imeyili elisebenzayo lomnikazi wokuqala.",
  },
  seatsInvalid: {
    en: "Seats must be a whole number, zero or more.",
    ha: "Wuraren zama dole su zama cikakken lamba, sifili ko fiye.",
    yo: "Àwọn ìjókòó gbọ́dọ̀ jẹ́ nọ́mbà odindi, ó kéré tán ọ̀ọ́dún.",
    ig: "Oche aghaghị ịbụ nọmba zuru oke, efu ma ọ bụ karịa.",
    fr: "Le nombre de sièges doit être un nombre entier, zéro ou plus.",
    pt: "Os lugares devem ser um número inteiro, zero ou mais.",
    sw: "Viti lazima viwe nambari kamili, sifuri au zaidi.",
    ar: "يجب أن يكون عدد المقاعد رقمًا صحيحًا، صفرًا أو أكثر.",
    tw: "Nkonguabea dodow no ho hia sɛ ɛyɛ nɔma a ɛkyerɛ pɔtee, efi hwee anaa nea ɛboro so.",
    zu: "Izihlalo kufanele zibe yinombolo ephelele, iqanda noma ngaphezulu.",
  },
  billingEmailInvalid: {
    en: "Enter a valid email address for the billing contact.",
    ha: "Shigar da adireshin imel mai inganci don mai lissafin kuɗi.",
    yo: "Tẹ àdírẹ́sì ímeèlì tó tọ́ sí i fún alábàáṣiṣẹ́pọ̀ owó.",
    ig: "Tinye adreesị ozi-e ziri ezi maka onye nkwụnye ụgwọ.",
    fr: "Saisissez une adresse e-mail valide pour le contact de facturation.",
    pt: "Introduza um endereço de email válido para o contacto de faturação.",
    sw: "Weka anwani sahihi ya barua pepe kwa mawasiliano ya malipo.",
    ar: "أدخل عنوان بريد إلكتروني صالحًا لجهة اتصال الفوترة.",
    tw: "Kyerɛw email address a ɛfata ma sika tua ho nnipa a wɔne no di dwuma.",
    zu: "Faka ikheli le-imeyili elisebenzayo lomuntu wokuxhumana ngezokukhokhwa.",
  },
  notAMember: {
    en: "That person is not a member of this agency.",
    ha: "Wannan mutumin ba memba na wannan hukumar ba ne.",
    yo: "Ẹni náà kì í ṣe ọmọ ẹgbẹ́ ilé-iṣẹ́ yìí.",
    ig: "Onye ahụ abụghị onye òtù nke ụlọ ọrụ a.",
    fr: "Cette personne n'est pas membre de cette agence.",
    pt: "Essa pessoa não é membro desta agência.",
    sw: "Mtu huyo si mwanachama wa wakala huyu.",
    ar: "هذا الشخص ليس عضوًا في هذه الوكالة.",
    tw: "Saa onipa no nyɛ saa adwumakuo yi muni.",
    zu: "Lowo muntu akayilungu lale ejensi.",
  },
  /**
   * `setMemberRole` refuses to demote an agency's only owner rather than
   * leaving it able to invite nobody and change no billing with no way
   * back in (`@/lib/data/tenants`). The string says why, not just that
   * the write failed — this is the refusal an operator will genuinely
   * hit, by trying to demote the one owner an agency has.
   */
  lastOwner: {
    en: "This agency has only one owner. Promote someone else before you remove this one.",
    ha: "Wannan hukumar tana da mai mallaka ɗaya kacal. Ɗaga wani kafin ka cire wannan.",
    yo: "Ilé-iṣẹ́ yìí ní onílé kan ṣoṣo. Gbé ẹlòmíràn ga kí o tó yọ ẹni yìí kúrò.",
    ig: "Ụlọ ọrụ a nwere naanị otu onye nwe ya. Bulie onye ọzọ tupu ị wepụ onye a.",
    fr: "Cette agence n'a qu'un seul propriétaire. Promouvez quelqu'un d'autre avant de retirer celui-ci.",
    pt: "Esta agência tem apenas um proprietário. Promova outra pessoa antes de remover este.",
    sw: "Wakala huyu ana mmiliki mmoja tu. Mpandishe mtu mwingine kabla ya kumwondoa huyu.",
    ar: "هذه الوكالة لديها مالك واحد فقط. رقِّ شخصًا آخر قبل إزالة هذا المالك.",
    tw: "Saa adwumakuo yi wɔ owura biako pɛ. Ma obi foforo so ansa na woayi oyi afiri hɔ.",
    zu: "Le ejensi inomnikazi oyedwa kuphela. Khuphula omunye umuntu ngaphambi kokususa lo.",
  },
};
