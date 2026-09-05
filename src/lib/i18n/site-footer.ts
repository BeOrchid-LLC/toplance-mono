import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `SiteFooter`'s own copy — the blurb, the column headings and the
 * entries that are not already covered by `SITE_CHROME` or `HERO`.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house, the same way
 * as the rest of `src/lib/i18n/*`.
 */
export const SITE_FOOTER: {
  blurb: L;
  travelerCta: L;
  columnProduct: L;
  columnAgencies: L;
  columnCompany: L;
  talkToSales: L;
  requestARoute: L;
  aboutToplance: L;
  securityAndPrivacy: L;
  termsOfService: L;
  opsSignIn: L;
  copyright: L;
} = {
  blurb: {
    en: "Visa and relocation processing for travel agencies working out of West Africa — and for the people going through it themselves.",
    ha: "Sarrafa fasfo da ƙaura don hukumomin tafiye-tafiye da ke aiki daga Afirka ta Yamma — da kuma ga mutanen da ke shiga ta kansu.",
    yo: "Ìṣàkóso fisa àti ìṣílọ fún àwọn àjọ ìrìnnà tí ń ṣiṣẹ́ láti Ìwọ̀-oòrùn Áfíríkà — àti fún àwọn ènìyàn tí ń gba ìlànà náà fúnra wọn.",
    ig: "Nhazi visa na mbugharị maka ụlọ ọrụ njem na-arụ ọrụ site na West Africa — na maka ndị na-agafe ya n'onwe ha.",
    fr: "Traitement des visas et de la relocalisation pour les agences de voyage opérant depuis l'Afrique de l'Ouest — et pour les personnes qui vivent la démarche elles-mêmes.",
    pt: "Processamento de vistos e mudança para agências de viagens que operam a partir da África Ocidental — e para as pessoas que passam pelo processo por si mesmas.",
    sw: "Uchakataji wa viza na uhamiaji kwa mashirika ya usafiri yanayofanya kazi kutoka Afrika Magharibi — na kwa watu wanaopitia mchakato huo wenyewe.",
    ar: "معالجة التأشيرات والانتقال لوكالات السفر العاملة من غرب أفريقيا — وللأشخاص الذين يخوضون الإجراء بأنفسهم.",
    tw: "Visa ne atutena ho adwumayɛ ma akwantuo adwumakuo a wɔyɛ adwuma firi West Africa — ne ma nnipa a wɔn ankasa fa saa kwan no so.",
    zu: "Ukucutshungulwa kwamavisa nokufuduka kwezinhlangano zokuhamba ezisebenza zisuka eNtshonalanga Afrika — nakubantu abadlula kulolu hlelo bona uqobo.",
  },
  travelerCta: {
    en: "Traveling yourself? The individual path",
    ha: "Kai kanka za ka yi tafiya? Hanyar mutum ɗaya",
    yo: "Ìwọ fúnra rẹ ni o ń rìnrìn-àjò? Ọ̀nà ẹnìkọ̀ọ̀kan",
    ig: "Ị na-eme njem n'onwe gị? Ụzọ onye ọ bụla",
    fr: "Vous voyagez vous-même ? Le parcours individuel",
    pt: "Vai viajar sozinho? O percurso individual",
    sw: "Unasafiri mwenyewe? Njia ya mtu binafsi",
    ar: "هل تسافر بنفسك؟ المسار الفردي",
    tw: "Wo ara na worekɔ akwantuo? Ankorankoro kwan",
    zu: "Uzohamba wena? Indlela yomuntu ngamunye",
  },
  columnProduct: {
    en: "Product",
    ha: "Samfur",
    yo: "Ọjà",
    ig: "Ngwaahịa",
    fr: "Produit",
    pt: "Produto",
    sw: "Bidhaa",
    ar: "المنتج",
    tw: "Adeɛ",
    zu: "Umkhiqizo",
  },
  columnAgencies: {
    en: "Agencies",
    ha: "Hukumomi",
    yo: "Àwọn Àjọ",
    ig: "Ụlọ Ọrụ",
    fr: "Agences",
    pt: "Agências",
    sw: "Mashirika",
    ar: "الوكالات",
    tw: "Adwumakuo",
    zu: "Izinhlangano",
  },
  columnCompany: {
    en: "Company",
    ha: "Kamfani",
    yo: "Ilé-iṣẹ́",
    ig: "Ụlọ Ọrụ",
    fr: "Entreprise",
    pt: "Empresa",
    sw: "Kampuni",
    ar: "الشركة",
    tw: "Adwumakuo",
    zu: "Inkampani",
  },
  talkToSales: {
    en: "Talk to sales",
    ha: "Yi magana da tawagar tallace-tallace",
    yo: "Bá ẹgbẹ́ tà sọ̀rọ̀",
    ig: "Gwa ndị ahịa okwu",
    fr: "Parler aux ventes",
    pt: "Fale com as vendas",
    sw: "Zungumza na mauzo",
    ar: "تحدث إلى المبيعات",
    tw: "Ka wo ho kyerɛ adwadifoɔ",
    zu: "Khuluma nabathengisi",
  },
  requestARoute: {
    en: "Request a route",
    ha: "Nemi hanya",
    yo: "Béèrè fún ọ̀nà kan",
    ig: "Rịọ maka ụzọ",
    fr: "Demander un itinéraire",
    pt: "Solicitar uma rota",
    sw: "Omba njia",
    ar: "اطلب مسارًا",
    tw: "Bisa kwan bi",
    zu: "Cela indlela",
  },
  aboutToplance: {
    en: "About Toplance",
    ha: "Game da Toplance",
    yo: "Nípa Toplance",
    ig: "Maka Toplance",
    fr: "À propos de Toplance",
    pt: "Sobre a Toplance",
    sw: "Kuhusu Toplance",
    ar: "عن Toplance",
    tw: "Toplance ho asɛm",
    zu: "Mayelana ne-Toplance",
  },
  securityAndPrivacy: {
    en: "Security and privacy",
    ha: "Tsaro da sirri",
    yo: "Ààbò àti àṣírí",
    ig: "Nchekwa na nzuzo",
    fr: "Sécurité et confidentialité",
    pt: "Segurança e privacidade",
    sw: "Usalama na faragha",
    ar: "الأمان والخصوصية",
    tw: "Banbɔ ne kokoamsɛm",
    zu: "Ukuphepha nobumfihlo",
  },
  termsOfService: {
    en: "Terms of service",
    ha: "Sharuɗɗan hidima",
    yo: "Àwọn òfin iṣẹ́",
    ig: "Usoro ọrụ",
    fr: "Conditions d'utilisation",
    pt: "Termos de serviço",
    sw: "Vigezo vya huduma",
    ar: "شروط الخدمة",
    tw: "Ɔsom ho mmara",
    zu: "Imigomo yesevisi",
  },
  opsSignIn: {
    en: "Toplance operations sign-in",
    ha: "Shiga na sashen ayyuka na Toplance",
    yo: "Wíwọlé ìmọ̀ iṣẹ́ Toplance",
    ig: "Nbanye ọrụ Toplance",
    fr: "Connexion opérations Toplance",
    pt: "Entrada das operações Toplance",
    sw: "Kuingia kwa uendeshaji wa Toplance",
    ar: "تسجيل دخول عمليات Toplance",
    tw: "Toplance nnwuma hyɛnmu",
    zu: "Ukungena kwezinhlelo ze-Toplance",
  },
  copyright: {
    en: "© 2026 BeOrchid · Toplance. Prototype — not a live service.",
    ha: "© 2026 BeOrchid · Toplance. Samfur — ba sabis mai aiki ba ne.",
    yo: "© 2026 BeOrchid · Toplance. Àpẹẹrẹ — kì í ṣe iṣẹ́ tí ń ṣiṣẹ́ lọ́wọ́lọ́wọ́.",
    ig: "© 2026 BeOrchid · Toplance. Ihe nnwale — ọ bụghị ọrụ na-arụ ọrụ ugbu a.",
    fr: "© 2026 BeOrchid · Toplance. Prototype — pas un service en production.",
    pt: "© 2026 BeOrchid · Toplance. Protótipo — não é um serviço em produção.",
    sw: "© 2026 BeOrchid · Toplance. Mfano wa awali — si huduma inayofanya kazi.",
    ar: "© 2026 BeOrchid · Toplance. نموذج أولي — ليست خدمة فعلية.",
    tw: "© 2026 BeOrchid · Toplance. Nhwɛso — ɛnyɛ ɔsom a ɛreyɛ adwuma.",
    zu: "© 2026 BeOrchid · Toplance. Isibonelo sokuqala — akuyona isevisi esebenzayo.",
  },
};
