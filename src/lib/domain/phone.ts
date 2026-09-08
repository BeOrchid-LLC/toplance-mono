import { countryBy } from "@/lib/domain/countries";

/**
 * The national number length a country allows, as a closed range.
 *
 * Read from `Country.nationalLength`, never counted off `Country.mask`.
 * The mask is a display hint: it says where to put the spaces, and it is
 * written the way people write the number down — which for the
 * Netherlands meant with the trunk zero this module strips, so counting
 * its dots gave ten for a nine-digit plan and refused every Dutch
 * number. Germany failed the other way, its plan allowing eleven where
 * the mask showed ten.
 */
function allowedLength(iso: string): { min: number; max: number } {
  const n = countryBy(iso).nationalLength;
  return typeof n === "number"
    ? { min: n, max: n }
    : { min: n[0], max: n[1] };
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
 *
 * This is the canonical form. Everything that stores, submits or
 * validates a number runs it through here first — a caller that reads
 * the raw field state instead is the bug this function exists to close.
 */
export function nationalDigits(iso: string, input: string): string {
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";

  const dial = countryBy(iso).dial.replace(/\D/g, "");
  const floor = allowedLength(iso).min;

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
 *
 * `expected` is what to say the length should be: one number, or "9–10"
 * where the plan allows a range.
 */
export type PhoneProblem =
  | { kind: "required" }
  | { kind: "length"; country: string; expected: string; actual: number };

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

  const { min, max } = allowedLength(iso);
  if (!min && !max) return null;

  if (digits.length < min || digits.length > max) {
    return {
      kind: "length",
      country: countryBy(iso).name,
      expected: min === max ? String(min) : `${min}–${max}`,
      actual: digits.length,
    };
  }

  return null;
}
