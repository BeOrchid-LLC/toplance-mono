/**
 * The credit the rates licence obliges us to display.
 *
 * Its own module, and deliberately not in `provider.ts` beside the rest
 * of the vendor's details: that file is `server-only`, and this string
 * has to be renderable from wherever a converted figure appears. Nothing
 * here touches the network, so nothing here needs the guard.
 *
 * **Not optional and not decoration.** ExchangeRate-API's open endpoint
 * is free for commercial conversion *on the condition* that this link is
 * shown. A screen that prints an approximate fee without it is not using
 * a cheaper vendor, it is using an unlicensed one — so the rule is that
 * the credit travels with the figure: add a third surface that converts
 * a fee, and it carries this too.
 *
 * Untranslated, like a rule set's own `attribution`. It is the wording
 * the provider asks for and a name, not a sentence of ours to render in
 * ten languages.
 */
export const FX_ATTRIBUTION = {
  label: "Rates By Exchange Rate API",
  url: "https://www.exchangerate-api.com",
} as const;
