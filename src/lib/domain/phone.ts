import { countryBy } from "@/lib/domain/countries";

/**
 * How many national digits a country's number has, read off the mask the
 * field already formats with.
 *
 * The mask is the single source of truth for both jobs — one dot, one
 * digit — so the expected length cannot drift from the formatting the
 * traveller is looking at while they type. A second table of lengths
 * beside `COUNTRIES` is a table that goes stale.
 */
function expectedLength(iso: string): number {
  return (countryBy(iso).mask.match(/\./g) ?? []).length;
}

/**
 * The national part of whatever somebody typed.
 *
 * Two things people really do, neither of which the field used to
 * survive:
 *
 * A Nigerian writes their own number "0803 123 4567" — with the trunk
 * zero, because that is how it is written on every form they have ever
 * filled in. Kept, `toE164` builds "+2340803123456…", which is not a
 * number. That silent corruption is the actual defect behind "the
 * validator doesn't work so well" (client demo, 2026-09-07): nothing
 * rejected the input, it was simply stored wrong.
 *
 * And people paste the international form, "+234 803 …", into a field
 * that is already showing "+234" — which doubled the dial code.
 *
 * The dial code is only stripped when what is left is still long enough
 * to be a number. Ghana dials +233 and has nine-digit numbers that can
 * themselves begin "233", so a blind prefix strip would eat the first
 * three digits of a perfectly good number.
 */
export function nationalDigits(iso: string, input: string): string {
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";

  const dial = countryBy(iso).dial.replace(/\D/g, "");
  const expected = expectedLength(iso);
  const floor = expected || 4;

  if (dial && digits.startsWith(dial) && digits.length - dial.length >= floor) {
    digits = digits.slice(dial.length);
  }

  // One trunk zero, not all leading zeros: no national numbering plan
  // uses "00" as a trunk prefix, and eating a second zero would corrupt
  // a number that legitimately starts with one.
  if (digits.startsWith("0")) digits = digits.slice(1);

  return digits;
}

/**
 * What is wrong with a number, as a fact rather than a sentence.
 *
 * The sentence is `PhoneField`'s to build, because the sentence has ten
 * translations and this module has none: a domain rule that returned
 * English would be a string the locale switch cannot reach. `country`
 * travels as a name rather than an iso code for the same reason the
 * country list itself stays English — those names are proper nouns, not
 * UI copy.
 */
export type PhoneProblem =
  | { kind: "required" }
  | { kind: "length"; country: string; expected: number; actual: number };

/**
 * What is wrong with this number, or `null` when nothing is.
 *
 * Reports the expected length and the length given, rather than a bare
 * "invalid phone number". Somebody who has mistyped one digit needs to
 * know which direction to correct in, and a bare refusal makes them
 * retype the whole thing looking for a fault that is one character wide.
 *
 * Deliberately strict about length and silent about everything else. It
 * does not check operator prefixes or whether a number is allocated —
 * that needs a real numbering-plan library, and a validator that guesses
 * at those rejects working numbers, which is the failure mode the client
 * has already flagged once on this product (the document pre-check).
 */
export function phoneProblem(
  iso: string,
  input: string,
  { required = false }: { required?: boolean } = {}
): PhoneProblem | null {
  const digits = nationalDigits(iso, input);

  // Blank is only a fault where the number is asked for. Sign-up treats
  // the phone as optional (`auth-form.tsx` sends it only when present),
  // so a validator that refused an empty field would lock every
  // traveller who skipped it out of creating an account.
  if (!digits) return required ? { kind: "required" } : null;

  const expected = expectedLength(iso);
  if (!expected) return null;

  if (digits.length !== expected) {
    return {
      kind: "length",
      country: countryBy(iso).name,
      expected,
      actual: digits.length,
    };
  }

  return null;
}
