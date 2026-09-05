import { DESTINATION_ISO, NATIONALITY_ISO } from "@/lib/domain/corridors";

/**
 * What a country spends, for every country this product lists.
 *
 * The traveller's own currency is picked from where they *live*, not
 * from the language they read. A Nigerian passport holder living in
 * Accra pays in cedis, and the intake asks `residence_country` for
 * exactly this kind of reason; language is a reading preference and
 * says nothing about which notes are in someone's pocket. Arabic is the
 * clearest case — one language, eight currencies.
 *
 * Keyed on the same lowercase ISO-3166 alpha-2 codes as
 * `DESTINATION_ISO` and `NATIONALITY_ISO`, and asserted against them in
 * `currencies.test.ts`: a country added to either list without a
 * currency here is a test failure rather than a silent blank on a
 * traveller's screen.
 */
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // Nationalities.
  ng: "NGN",
  gh: "GHS",
  ke: "KES",
  za: "ZAR",
  cm: "XAF",

  // Destinations — Europe and the eurozone.
  gb: "GBP",
  ie: "EUR",
  de: "EUR",
  nl: "EUR",
  fr: "EUR",
  pt: "EUR",
  it: "EUR",
  es: "EUR",
  be: "EUR",
  at: "EUR",
  gr: "EUR",
  mt: "EUR",
  se: "SEK",
  no: "NOK",
  dk: "DKK",
  ch: "CHF",
  pl: "PLN",
  cz: "CZK",
  tr: "TRY",

  // Americas and Oceania.
  us: "USD",
  ca: "CAD",
  br: "BRL",
  mx: "MXN",
  au: "AUD",

  // Africa.
  eg: "EGP",
  ma: "MAD",
  rw: "RWF",
  et: "ETB",
  tz: "TZS",
  ug: "UGX",
  // The CFA franc, west and central: Senegal, Côte d'Ivoire, Benin and
  // Togo share XOF; Cameroon is XAF above. They are pegged to the euro
  // at the same rate but they are not the same currency, and a bank in
  // Dakar will not take a note printed for Douala.
  sn: "XOF",
  ci: "XOF",
  bj: "XOF",
  tg: "XOF",

  // Gulf and Middle East.
  ae: "AED",
  sa: "SAR",
  qa: "QAR",
  kw: "KWD",
  bh: "BHD",
  om: "OMR",
  jo: "JOD",

  // Asia.
  cn: "CNY",
  in: "INR",
  jp: "JPY",
  sg: "SGD",
  my: "MYR",
};

/**
 * The currency for a country named the way the intake records it —
 * "Nigeria", not "ng". The answers rail stores the label the traveller
 * tapped or spoke, so this is the lookup every screen actually needs.
 */
export function currencyForCountryName(
  name: string | null | undefined
): string | null {
  if (!name) return null;
  const iso = NATIONALITY_ISO[name] ?? DESTINATION_ISO[name];
  return currencyForCountry(iso);
}

/** Every country code this product can name, in either direction. */
export function listedCountryCodes(): string[] {
  return [
    ...new Set([
      ...Object.values(NATIONALITY_ISO),
      ...Object.values(DESTINATION_ISO),
    ]),
  ];
}

/**
 * The currency someone living in this country spends, or null when the
 * country is not one this product lists.
 *
 * Null rather than a default: showing a Kenyan an approximation in naira
 * because naira is our busiest currency would be worse than showing
 * them nothing, and "nothing" is a state the fee row already handles.
 */
export function currencyForCountry(
  iso2: string | null | undefined
): string | null {
  if (!iso2) return null;
  return CURRENCY_BY_COUNTRY[iso2.toLowerCase()] ?? null;
}
