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
};
