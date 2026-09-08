import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `PhoneField`'s own chrome. The country list itself (`@/lib/domain/countries`)
 * stays in English in every locale — it is a shared, non-owned data file, and
 * its names are proper nouns rather than UI copy.
 *
 * `{name}` and `{dial}` in `countryCodeAriaLabel` are literal markers the
 * call site replaces; the country name behind `{name}` is deliberately left
 * untranslated for the reason above.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the English,
 * like `HERO` before it.
 */
export const PHONE_FIELD: {
  defaultLabel: L;
  countryCodeAriaLabel: L;
  searchPlaceholder: L;
  commonHere: L;
  allCountries: L;
  noMatchTemplate: L;
  numberRequired: L;
  wrongLengthTemplate: L;
} = {
  defaultLabel: {
    en: "Mobile number",
    ha: "Lambar waya",
    yo: "Nọ́mbà fóònù alágbèéká",
    ig: "Nọmba ekwentị",
    fr: "Numéro de mobile",
    pt: "Número de telemóvel",
    sw: "Nambari ya simu",
    ar: "رقم الهاتف المحمول",
    tw: "Mobile nɔma",
    zu: "Inombolo yeselula",
  },
  countryCodeAriaLabel: {
    en: "Country code: {name} {dial}",
    ha: "Lambar ƙasa: {name} {dial}",
    yo: "Àmì orílẹ̀-èdè: {name} {dial}",
    ig: "Koodu obodo: {name} {dial}",
    fr: "Indicatif du pays : {name} {dial}",
    pt: "Indicativo do país: {name} {dial}",
    sw: "Msimbo wa nchi: {name} {dial}",
    ar: "رمز الدولة: {name} {dial}",
    tw: "Ɔman koodu: {name} {dial}",
    zu: "Ikhodi yezwe: {name} {dial}",
  },
  searchPlaceholder: {
    en: "Search countries",
    ha: "Nemo ƙasashe",
    yo: "Wá àwọn orílẹ̀-èdè",
    ig: "Chọọ obodo",
    fr: "Rechercher un pays",
    pt: "Pesquisar países",
    sw: "Tafuta nchi",
    ar: "ابحث عن دولة",
    tw: "Hwehwɛ aman",
    zu: "Sesha amazwe",
  },
  commonHere: {
    en: "Common here",
    ha: "Ana amfani da su a nan",
    yo: "Tí ó wọ́pọ̀ níbí",
    ig: "Ndị a na-ejikarị ebe a",
    fr: "Fréquents ici",
    pt: "Comuns aqui",
    sw: "Za kawaida hapa",
    ar: "شائع هنا",
    tw: "Deɛ ɛba mu wɔ ha",
    zu: "Ejwayelekile lapha",
  },
  allCountries: {
    en: "All countries",
    ha: "Duk ƙasashe",
    yo: "Gbogbo orílẹ̀-èdè",
    ig: "Obodo niile",
    fr: "Tous les pays",
    pt: "Todos os países",
    sw: "Nchi zote",
    ar: "جميع الدول",
    tw: "Aman nyinaa",
    zu: "Wonke amazwe",
  },
  noMatchTemplate: {
    en: "No country matches “{query}”.",
    ha: "Babu ƙasar da ta yi daidai da “{query}”.",
    yo: "Kò sí orílẹ̀-èdè tí ó bá “{query}” mu.",
    ig: "Ọ dịghị obodo dabara na “{query}”.",
    fr: "Aucun pays ne correspond à « {query} ».",
    pt: "Nenhum país corresponde a “{query}”.",
    sw: "Hakuna nchi inayolingana na “{query}”.",
    ar: "لا توجد دولة مطابقة لـ ”{query}“.",
    tw: "Ɔman biara nni hɔ a ɛne “{query}” hyia.",
    zu: "Alikho izwe elifana ne-“{query}”.",
  },
  numberRequired: {
    en: "Enter your mobile number.",
    ha: "Shigar da lambar wayarka.",
    yo: "Tẹ nọ́mbà fóònù alágbèéká rẹ sí i.",
    ig: "Tinye nọmba ekwentị gị.",
    fr: "Saisissez votre numéro de mobile.",
    pt: "Introduza o seu número de telemóvel.",
    sw: "Weka nambari yako ya simu.",
    ar: "أدخل رقم هاتفك المحمول.",
    tw: "Kyerɛw wo mobile nɔma no.",
    zu: "Faka inombolo yakho yeselula.",
  },
  /**
   * `{country}` is a proper noun and stays English, like the country
   * list itself. `{expected}` and `{actual}` are digit counts — the
   * sentence names both so somebody who mistyped one digit knows which
   * direction to correct in.
   */
  wrongLengthTemplate: {
    en: "A {country} mobile number is {expected} digits. This one has {actual}.",
    ha: "Lambar waya ta {country} tana da lambobi {expected}. Wannan tana da {actual}.",
    yo: "Nọ́mbà fóònù {country} ní nọ́mbà {expected}. Èyí ní {actual}.",
    ig: "Nọmba ekwentị {country} nwere ọnụọgụ {expected}. Nke a nwere {actual}.",
    fr: "Un numéro de mobile {country} compte {expected} chiffres. Celui-ci en a {actual}.",
    pt: "Um número de telemóvel de {country} tem {expected} dígitos. Este tem {actual}.",
    sw: "Nambari ya simu ya {country} ina tarakimu {expected}. Hii ina {actual}.",
    ar: "رقم الهاتف المحمول في {country} من {expected} أرقام. هذا الرقم به {actual}.",
    tw: "{country} mobile nɔma wɔ dijit {expected}. Yei wɔ {actual}.",
    zu: "Inombolo yeselula yase-{country} inezinombolo ezingu-{expected}. Le inezingu-{actual}.",
  },
};
