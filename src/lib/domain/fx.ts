/**
 * Converting one government fee into what it costs where the traveller
 * lives, and saying how confident we are about it.
 *
 * Pure, like `freshness` and `corridor-gap`: the arithmetic and the
 * staleness rule are arguable, so they live where they can be argued
 * with in a test rather than inside a page. The database work — fetching
 * and caching — is `@/lib/fx/rates`.
 *
 * Every figure this module produces is an **approximation**, and the
 * callers are expected to say so. A visa fee is charged by a mission in
 * its own currency, on a day nobody here picks, at whatever rate that
 * traveller's own bank applies. The number is worth showing because
 * "£819" answers nothing for someone who thinks in naira; it is not
 * worth showing as though it were the amount that will leave their
 * account.
 */

/**
 * How old a rate may get before a converted figure stops being shown.
 *
 * Two days rather than one: the refresh runs daily, and a single failed
 * run should not blank the figure off every screen — that turns a
 * provider hiccup into a visible product regression. Past two days the
 * currencies this product deals in (naira especially) can have moved far
 * enough that the number misleads, and no number is better than a wrong
 * one.
 */
export const RATE_STALE_AFTER_HOURS = 48;

export type Converted = {
  /** Minor units of the target currency — kobo, cents, and so on. */
  minor: number;
  currency: string;
  /** When the rate behind this figure was fetched. */
  fetchedAt: Date;
};

/**
 * Currencies with no minor unit, where a "minor amount" is the amount.
 *
 * `Intl` knows this, but the arithmetic below has to as well: dividing a
 * JPY fee by 100 would show a traveller a bill one hundredth of the real
 * one. The three-decimal Gulf currencies are the mirror image and are
 * listed for the same reason.
 */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "XOF", "XAF", "RWF", "UGX", "CLP", "ISK"]);
const THREE_DECIMAL = new Set(["KWD", "BHD", "OMR", "JOD", "TND"]);

/** How many minor units make one unit of this currency. */
export function minorUnitsPer(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 1;
  if (THREE_DECIMAL.has(code)) return 1000;
  return 100;
}

/**
 * The rate between two currencies, given both quoted against the same
 * base — which is how every provider on a metered plan sells them: one
 * call returns "USD → everything", and every pair is a cross of two.
 *
 * Null when either side is missing, rather than 1. A missing rate that
 * silently means "the same amount" would print a £819 fee as ₦819.
 */
export function crossRate(
  perBaseFrom: number | null | undefined,
  perBaseTo: number | null | undefined
): number | null {
  if (!perBaseFrom || !perBaseTo) return null;
  if (perBaseFrom <= 0 || perBaseTo <= 0) return null;
  if (!Number.isFinite(perBaseFrom) || !Number.isFinite(perBaseTo)) return null;
  return perBaseTo / perBaseFrom;
}

/**
 * One fee, in the traveller's own currency.
 *
 * Returns null — and callers render nothing at all — when the fee is
 * unknown, the currencies match (there is nothing to approximate), the
 * rate is missing, or the rate is too old to stand behind. Each of those
 * is a reason to say less, not to guess.
 */
export function convertFee({
  minor,
  from,
  to,
  rate,
  fetchedAt,
  now = new Date(),
}: {
  minor: number | null;
  from: string | null;
  to: string | null;
  /** Units of `to` per one unit of `from`. */
  rate: number | null;
  fetchedAt: Date | null;
  now?: Date;
}): Converted | null {
  if (minor == null || !from || !to || !rate || !fetchedAt) return null;
  if (from.toUpperCase() === to.toUpperCase()) return null;
  if (!Number.isFinite(rate) || rate <= 0) return null;

  const ageHours = (now.getTime() - fetchedAt.getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours > RATE_STALE_AFTER_HOURS) return null;
  // A rate fetched "tomorrow" is a clock problem, not a rate. Refusing it
  // keeps a wrong server time from freezing a figure on screen forever.
  if (ageHours < -1) return null;

  const major = minor / minorUnitsPer(from);
  const converted = major * rate;

  return {
    minor: Math.round(converted * minorUnitsPer(to)),
    currency: to.toUpperCase(),
    fetchedAt,
  };
}

/**
 * The approximation as a traveller reads it: rounded hard, and marked as
 * approximate in the string itself.
 *
 * Rounded to three significant figures above a thousand, because the
 * digits after that are noise — a fee that converts to ₦2,013,447 is not
 * known to the naira, and printing it to the naira claims it is. `≈` and
 * the rounding do the same job twice on purpose: the symbol is easy to
 * miss on a phone.
 */
export function formatApproximate(
  { minor, currency }: Pick<Converted, "minor" | "currency">,
  locale: string
): string {
  const major = minor / minorUnitsPer(currency);
  const rounded = major >= 1000 ? roundToSignificant(major, 3) : major;

  return `≈ ${new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(rounded)}`;
}

function roundToSignificant(value: number, digits: number): number {
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (magnitude - digits + 1);
  return Math.round(value / factor) * factor;
}
