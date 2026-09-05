import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `CorridorBar` and `CorridorBoard`'s own copy — the status words, the
 * column headers and the two sentences that interpolate the corridor
 * itself.
 *
 * The origin, destination and purpose interpolated into the templates
 * below are corridor data (a passport, a destination name, a travel
 * purpose), not UI copy — per this repo's AGENTS.md they stay in
 * English and are never run through a dictionary. Only the sentence
 * around them is translated; call sites fill in `{{o}}`, `{{d}}`,
 * `{{p}}` and `{{route}}` with those untranslated values.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house, the same way
 * as the rest of `src/lib/i18n/*`.
 */
export const CORRIDOR_PICKER: {
  inBuild: L;
  liveRoute: L;
  live: L;
  requestThisRoute: L;
  travelingFrom: L;
  /** "for {{p}}" — the purpose tag next to the origin picker. */
  forPurposeTemplate: L;
  routeColumnHeader: L;
  statusColumnHeader: L;
  /** "Run the {{route}} corridor" */
  runRouteTemplate: L;
  missingRoute: L;
  /** "{{o}} → {{d}} for {{p}} is not open yet — …" */
  notOpenYetTemplate: L;
} = {
  inBuild: {
    en: "In build",
    ha: "Ana gina shi",
    yo: "Ń kọ́ ṣí sílẹ̀",
    ig: "Na-arụ ya",
    fr: "En construction",
    pt: "Em construção",
    sw: "Inajengwa",
    ar: "قيد الإنشاء",
    tw: "Wɔreyɛ",
    zu: "Kusakhiwa",
  },
  liveRoute: {
    en: "Live route",
    ha: "Hanya mai aiki",
    yo: "Ọ̀nà tí ń ṣiṣẹ́",
    ig: "Ụzọ na-arụ ọrụ",
    fr: "Itinéraire actif",
    pt: "Rota ativa",
    sw: "Njia inayofanya kazi",
    ar: "مسار نشط",
    tw: "Kwan a ɛreyɛ adwuma",
    zu: "Indlela esebenzayo",
  },
  live: {
    en: "Live",
    ha: "Yana Aiki",
    yo: "Ń Ṣiṣẹ́",
    ig: "Na-arụ Ọrụ",
    fr: "Actif",
    pt: "Ativa",
    sw: "Inafanya kazi",
    ar: "نشط",
    tw: "Ɛreyɛ Adwuma",
    zu: "Iyasebenza",
  },
  requestThisRoute: {
    en: "Request this route",
    ha: "Nemi wannan hanya",
    yo: "Béèrè fún ọ̀nà yìí",
    ig: "Rịọ ụzọ a",
    fr: "Demander cet itinéraire",
    pt: "Solicitar esta rota",
    sw: "Omba njia hii",
    ar: "اطلب هذا المسار",
    tw: "Bisa saa kwan yi",
    zu: "Cela le ndlela",
  },
  travelingFrom: {
    en: "Traveling from",
    ha: "Tafiya daga",
    yo: "Ń rìnrìn-àjò láti",
    ig: "Na-eme njem site na",
    fr: "En voyage depuis",
    pt: "A viajar de",
    sw: "Kusafiri kutoka",
    ar: "السفر من",
    tw: "Akwantuo firi",
    zu: "Uhamba usuka",
  },
  forPurposeTemplate: {
    en: "for {{p}}",
    ha: "don {{p}}",
    yo: "fún {{p}}",
    ig: "maka {{p}}",
    fr: "pour {{p}}",
    pt: "para {{p}}",
    sw: "kwa {{p}}",
    ar: "من أجل {{p}}",
    tw: "ma {{p}}",
    zu: "ngenxa ye-{{p}}",
  },
  routeColumnHeader: {
    en: "Route",
    ha: "Hanya",
    yo: "Ọ̀nà",
    ig: "Ụzọ",
    fr: "Itinéraire",
    pt: "Rota",
    sw: "Njia",
    ar: "المسار",
    tw: "Kwan",
    zu: "Indlela",
  },
  statusColumnHeader: {
    en: "Status",
    ha: "Matsayi",
    yo: "Ipò",
    ig: "Ọnọdụ",
    fr: "Statut",
    pt: "Estado",
    sw: "Hali",
    ar: "الحالة",
    tw: "Tebea",
    zu: "Isimo",
  },
  runRouteTemplate: {
    en: "Run the {{route}} corridor",
    ha: "Fara hanyar {{route}}",
    yo: "Bẹ̀rẹ̀ ọ̀nà {{route}}",
    ig: "Malite ụzọ {{route}}",
    fr: "Lancer le trajet {{route}}",
    pt: "Executar a rota {{route}}",
    sw: "Anzisha njia ya {{route}}",
    ar: "شغّل المسار {{route}}",
    tw: "Fi kwan {{route}} no ase",
    zu: "Qala umzila {{route}}",
  },
  missingRoute: {
    en: "Missing a route? Ask for it and it enters the build queue with the demand attached to it.",
    ha: "Babu hanyar da kake nema? Nemi ta kuma za a saka ta cikin jerin ginawa tare da buƙatarka a haɗe.",
    yo: "Ọ̀nà tí o ń wá kò sí níbí? Béèrè fún un yóò sì wọ inú àtòjọ ìkọ́ pẹ̀lú ìbéèrè rẹ so mọ́ ọn.",
    ig: "Ị chọrọ ụzọ na-adịghị ebe a? Rịọ ya, ọ ga-abanye na ndepụta ihe a na-ewu ya, na arịrịọ gị na-esonyere ya.",
    fr: "Un itinéraire manque ? Demandez-le et il entre dans la file de construction avec votre demande attachée.",
    pt: "Falta uma rota? Peça-a e ela entra na fila de construção com o seu pedido associado.",
    sw: "Njia haipo? Iombe nayo itaingia kwenye foleni ya ujenzi ikiwa na ombi lako limeambatanishwa.",
    ar: "هل يفوتك مسار؟ اطلبه وسيدخل في قائمة الإنشاء مع طلبك مرفقًا به.",
    tw: "Kwan bi nni ha? Bisa na ɛbɛkɔ nsiesie kuo mu a wo abisade ka ho.",
    zu: "Kukhona indlela engekho? Yicele bese ingena ohlwini lokwakhiwa nesicelo sakho sinamathele kuyo.",
  },
  notOpenYetTemplate: {
    en: "{{o}} → {{d}} for {{p}} is not open yet — a corridor is all three, so switching any one of them may land on a live one. Ask for this one and it enters the build queue with your demand attached.",
    ha: "{{o}} → {{d}} don {{p}} har yanzu ba a buɗe ba — hanya tana ƙunshe da abu uku ne, don haka canja ɗayansu na iya kaiwa ga wanda yake aiki. Nemi wannan kuma za a saka ta cikin jerin ginawa tare da buƙatarka a haɗe.",
    yo: "{{o}} → {{d}} fún {{p}} kò tíì ṣí sílẹ̀ — ọ̀nà kan ní ẹ̀yà mẹ́ta pátápátá, nítorí náà yíyí ọ̀kan lára wọn padà lè mú ọ dé ọ̀dọ̀ ọ̀kan tí ń ṣiṣẹ́. Béèrè fún èyí yóò sì wọ inú àtòjọ ìkọ́ pẹ̀lú ìbéèrè rẹ so mọ́ ọn.",
    ig: "{{o}} → {{d}} maka {{p}} amepechabeghị — ụzọ bụ ihe atọ niile, ya mere ịgbanwe otu n'ime ha nwere ike ime ka ị rute n'otu na-arụ ọrụ. Rịọ maka nke a, ọ ga-abanyekwa na ndepụta ihe a na-ewu na arịrịọ gị na-esonyere ya.",
    fr: "{{o}} → {{d}} pour {{p}} n'est pas encore ouvert — un itinéraire tient sur ces trois éléments, donc changer l'un d'eux peut aboutir à un itinéraire actif. Demandez celui-ci et il entre dans la file de construction avec votre demande attachée.",
    pt: "{{o}} → {{d}} para {{p}} ainda não está aberta — uma rota é o conjunto dos três, por isso mudar qualquer um deles pode levá-lo a uma rota ativa. Peça esta e ela entra na fila de construção com o seu pedido associado.",
    sw: "{{o}} → {{d}} kwa {{p}} bado haijafunguliwa — njia ni mambo matatu yote, hivyo kubadilisha lolote kati yao kunaweza kukupeleka kwenye njia inayofanya kazi. Iombe hii nayo itaingia kwenye foleni ya ujenzi ikiwa na ombi lako limeambatanishwa.",
    ar: "{{o}} → {{d}} من أجل {{p}} غير مفتوح بعد — المسار هو الثلاثة معًا، لذا فتغيير أي واحد منها قد يوصلك إلى مسار نشط. اطلب هذا وسيدخل في قائمة الإنشاء مع طلبك مرفقًا به.",
    tw: "{{o}} → {{d}} ma {{p}} mmuei ɛ da — kwan yɛ nneɛma mmiɛnsa yi nyinaa, enti sɛ wosesa emu biako a, ebia wobɛkɔ deɛ ɛreyɛ adwuma so. Bisa yei na ɛbɛkɔ nsiesie kuo mu a wo abisade ka ho.",
    zu: "{{o}} → {{d}} ngenxa ye-{{p}} ayikavulwa okwamanje — indlela iyizinto ezintathu zonke, ngakho ukushintsha noma iyiphi kuzo kungakuholela kwenye esebenzayo. Cela le futhi izongena ohlwini lokwakhiwa nesicelo sakho sinamathele kuyo.",
  },
};

/** `"{{o}} → {{d}}"` style interpolation — the only kind these templates need. */
export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template
  );
}
