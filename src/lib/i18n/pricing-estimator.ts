import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `PricingEstimator`'s own labels. The numbers it renders — the slider
 * value, the money amounts `formatMoney` produces — are real figures,
 * not copy, and stay in `en-US` number formatting exactly as
 * `compactMoney`/`formatMoney` already do elsewhere on the pricing
 * section; only the words around them are translated here.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house, the same way
 * as the rest of `src/lib/i18n/*`.
 */
export const PRICING_ESTIMATOR: {
  applicationsLabel: L;
  baseFee: L;
  applicationSingular: L;
  applicationPlural: L;
  monthlyTotal: L;
  disclaimer: L;
} = {
  applicationsLabel: {
    en: "Applications completed in a month",
    ha: "Aikace-aikacen da aka kammala a wata",
    yo: "Àwọn ìbéèrè tí a parí láàrin oṣù kan",
    ig: "Ngwa akwụchara n'ọnwa",
    fr: "Candidatures finalisées en un mois",
    pt: "Candidaturas concluídas num mês",
    sw: "Maombi yaliyokamilika kwa mwezi",
    ar: "الطلبات المكتملة في الشهر",
    tw: "Abisade a wɔawie wɔ bosome mu",
    zu: "Izicelo eziqediwe ngenyanga",
  },
  baseFee: {
    en: "Base fee",
    ha: "Kuɗin tushe",
    yo: "Owó ìpìlẹ̀",
    ig: "Ụgwọ ntọala",
    fr: "Frais de base",
    pt: "Taxa base",
    sw: "Ada ya msingi",
    ar: "الرسم الأساسي",
    tw: "Ntɔsoɔ hyɛaseɛ",
    zu: "Imali eyisisekelo",
  },
  applicationSingular: {
    en: "application",
    ha: "aikace-aikace",
    yo: "ìbéèrè",
    ig: "ngwa",
    fr: "candidature",
    pt: "candidatura",
    sw: "ombi",
    ar: "طلب",
    tw: "abisadeɛ",
    zu: "isicelo",
  },
  applicationPlural: {
    en: "applications",
    ha: "aikace-aikace",
    yo: "àwọn ìbéèrè",
    ig: "ngwa",
    fr: "candidatures",
    pt: "candidaturas",
    sw: "maombi",
    ar: "طلبات",
    tw: "abisade",
    zu: "izicelo",
  },
  monthlyTotal: {
    en: "Monthly total",
    ha: "Jimlar wata-wata",
    yo: "Àpapọ̀ oṣooṣù",
    ig: "Mkpokọta kwa ọnwa",
    fr: "Total mensuel",
    pt: "Total mensal",
    sw: "Jumla ya kila mwezi",
    ar: "الإجمالي الشهري",
    tw: "Bosome nyinaa",
    zu: "Isamba senyanga",
  },
  disclaimer: {
    en: "Only applications that finish are counted — a checklist your client completes, and every document past its check. An invitation nobody accepts, a checklist still being filled and one whose documents came back rejected are never charged.",
    ha: "Aikace-aikacen da suka kammala ne kaɗai ake ƙidaya — jerin abubuwan da abokin cinikinka ya cika, tare da kowace takarda da ta wuce dubawarta. Gayyatar da ba wanda ya karɓa, jerin da ake cikawa har yanzu, da wanda takardunsa suka dawo ba a yarda da su ba, ba a taɓa cajin su ba.",
    yo: "Àwọn ìbéèrè tí ó parí nìkan ni a ń kà — àkọsílẹ̀ tí oníbàárà rẹ parí, àti ìwé kọ̀ọ̀kan tí ó ti ré àyẹ̀wò rẹ̀. Ìpè tí kò sí ẹni tí ó gbà, àkọsílẹ̀ tí a ṣì ń kún, àti ọ̀kan tí àwọn ìwé rẹ̀ padà ní kíkọ̀ kò gba owó rí.",
    ig: "Naanị ngwa ndị mechara ka a na-agụ ọnụ — ndepụta onye ahịa gị mechara, na akwụkwọ ọ bụla gafere nlele ya. Òkù ọ dịghị onye anabatara, ndepụta ka a na-emeju, na nke akwụkwọ ya lọghachiri ka a jụrụ, anaghị akwụ ha ụgwọ mgbe ọ bụla.",
    fr: "Seules les candidatures menées à terme sont comptées — une liste que votre client complète, et chaque document ayant passé son contrôle. Une invitation que personne n'accepte, une liste encore en cours de remplissage et une dont les documents ont été rejetés ne sont jamais facturées.",
    pt: "Só as candidaturas concluídas são contadas — uma lista que o seu cliente preenche, com cada documento aprovado na verificação. Um convite que ninguém aceita, uma lista ainda por preencher e uma cujos documentos foram rejeitados nunca são cobradas.",
    sw: "Ni maombi yaliyokamilika pekee yanayohesabiwa — orodha ambayo mteja wako anaikamilisha, na kila hati iliyopita ukaguzi wake. Mwaliko ambao hakuna aliyeukubali, orodha inayoendelea kujazwa, na ile ambayo hati zake zilirudishwa zikikataliwa, hazitozwi malipo kamwe.",
    ar: "لا تُحتسب إلا الطلبات المكتملة — قائمة يُكمّلها عميلك، وكل مستند اجتاز فحصه. الدعوة التي لا يقبلها أحد، والقائمة التي لا تزال قيد التعبئة، وتلك التي رُفضت مستنداتها، لا تُفرض عليها رسوم أبدًا.",
    tw: "Abisade a wɔawie nkutoo na wɔkan — nhyehyɛeɛ a wo kastoma awie, ne krataa biara a atwa mu wɔ ne nhwehwɛmu mu. Nsakyɛ a obiara ngye, nhyehyɛeɛ a wɔda so ara reyɛ ho adwuma, ne deɛ ne nkrataa san bae sɛ wɔapo no, wɔmmɔ ho ka da.",
    zu: "Kubalwa kuphela izicelo eziqedile — uhlu umkhakha wakho aluqedayo, kanye nedokhumenti ngayinye edlule ukuhlolwa kwayo. Isimemo esingamukelwa muntu, uhlu olusagcwaliswa, kanye nalolo amadokhumenti alo abuye enqatshiwe, akuqashiswa ngazo nini.",
  },
};
