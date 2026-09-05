import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The error strings `@/app/ops/actions.ts` returns as `{ error }`.
 *
 * Resolved server-side, with `getLocale()` reading the same
 * `x-toplance-locale` header a Server Component would — a Server Action
 * runs as a POST to the page that rendered its button, so `proxy.ts`
 * has already set the header by the time the action body runs. The
 * client components that call these actions (`add-case-note.tsx`,
 * `review-row.tsx`, `status-control.tsx`, `corridor-decision.tsx`,
 * `requirement-condition.tsx`) just `toast.error(result.error)` whatever
 * comes back, so there is nothing to re-translate on their side.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_ACTIONS: {
  chooseVerdict: L;
  chooseStatus: L;
  onlyOwnerApprove: L;
  onlyOwnerReject: L;
  onlyOwnerCondition: L;
  chooseAtLeastOneAnswer: L;
  ruleNotRecognized: L;
} = {
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
};
