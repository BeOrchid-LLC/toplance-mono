import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * What the documents page tells a traveller before they photograph
 * anything.
 *
 * This was `UPLOAD_GUIDANCE`, a single English template literal in
 * `@/lib/domain/uploads`, printed above the upload table on the one
 * screen the whole product funnels into. Legibility is the largest
 * single cause of a re-upload and the only part of it entirely within
 * the traveller's control at the moment they take the picture — so a
 * reader who cannot read the warning pays for it with a round trip.
 *
 * `{formats}` and `{size}` are filled at the call site from
 * `ACCEPTED_FORMATS` and `MAX_UPLOAD_LABEL` (`@/lib/domain/uploads`),
 * the same way `UPLOAD_ACTIONS.tooLarge` takes its `{size}`. That is
 * deliberate rather than tidier-looking: the limit and the format list
 * are stated in one place and cannot drift from the ones `ACCEPT` and
 * `validateUpload` actually enforce, which is the whole reason those
 * constants exist.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, like `UPLOAD_ACTIONS` beside it.
 */
export const UPLOADS: { guidance: L; acceptedFormats: L } = {
  guidance: {
    en: "Upload a clear, high-resolution image or PDF — a blurred, cropped or dark file cannot be read and will be sent back. {formats}, up to {size} each.",
    ha: "Ɗora hoto ko PDF mai haske, mai kyawun kaifi — fayil da ya ruɗe, aka yanke, ko mai duhu ba za a iya karantawa ba, kuma za a mayar da shi. {formats}, har zuwa {size} kowanne.",
    yo: "Gbé àwòrán tàbí PDF tí ó ṣe kedere, tí ó sì mọ́ dáadáa sókè — fáìlì tí ó rú, tí a gé kúrò, tàbí tí ó ṣú, kò ṣeé kà, a ó sì dá a padà. {formats}, tí kò ju {size} lọ ọ̀kọ̀ọ̀kan.",
    ig: "Bugoo onyonyo ma ọ bụ PDF doro anya, nke nwere ọdịdị dị elu — faịlụ gbagwojuru anya, nke a bepụrụ, ma ọ bụ nke gbara ọchịchịrị agaghị agụ, a ga-ezighachikwa ya. {formats}, ruo {size} nke ọ bụla.",
    fr: "Déposez une image ou un PDF net et en haute résolution — un fichier flou, rogné ou sombre ne peut pas être lu et vous sera renvoyé. {formats}, jusqu'à {size} chacun.",
    pt: "Carregue uma imagem ou PDF nítido e de alta resolução — um ficheiro desfocado, cortado ou escuro não pode ser lido e será devolvido. {formats}, até {size} cada.",
    sw: "Pakia picha au PDF iliyo wazi na yenye ubora wa juu — faili lenye ukungu, lililokatwa au lenye giza haliwezi kusomwa na litarudishwa. {formats}, hadi {size} kila moja.",
    ar: "ارفع صورة أو ملف PDF واضحاً وعالي الدقة — الملف المشوّش أو المقصوص أو الداكن لا يمكن قراءته وسيُعاد إليك. {formats}، بحد أقصى {size} لكل ملف.",
    tw: "Fa mfonini anaa PDF a emu da hɔ na ne su korɔn to so — krataa a ani ntew, wɔatwa mu, anaa ɛyɛ sum no, wɔntumi nkenkan, na wɔbɛsan de akɔma wo. {formats}, a emu biara nnoo {size}.",
    zu: "Layisha isithombe noma i-PDF ecacile nesezingeni eliphezulu — ifayela elifiphele, elinqunyiwe, noma elimnyama alikwazi ukufundwa futhi lizobuyiselwa. {formats}, kufika ku-{size} ngalinye.",
  },

  /**
   * The four format names, joined the way each language joins a list.
   *
   * Only the conjunction and the noun-class prefixes differ — the tokens
   * themselves are `ACCEPTED_FORMATS` and must stay verbatim, because
   * they name what `ACCEPT` offers and `isAcceptedType` allows. This is
   * the one string here that a translator may not rewrite freely, and
   * `uploads.test.ts` is what says so.
   */
  acceptedFormats: {
    en: "JPG, PNG, HEIC or PDF",
    ha: "JPG, PNG, HEIC ko PDF",
    yo: "JPG, PNG, HEIC tàbí PDF",
    ig: "JPG, PNG, HEIC ma ọ bụ PDF",
    fr: "JPG, PNG, HEIC ou PDF",
    pt: "JPG, PNG, HEIC ou PDF",
    sw: "JPG, PNG, HEIC au PDF",
    ar: "JPG أو PNG أو HEIC أو PDF",
    tw: "JPG, PNG, HEIC anaa PDF",
    zu: "I-JPG, i-PNG, i-HEIC noma i-PDF",
  },
};
