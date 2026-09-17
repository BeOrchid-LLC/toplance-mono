/**
 * A person's name, short enough for a table cell: "Ngozi B.".
 *
 * The client's review of 17 September asked for the Assigned To column
 * to stop spending a laptop's width on full names — first name plus the
 * last name's initial, with the whole name a hover away (the caller puts
 * it in a `title`).
 *
 * `profiles.full_name` is one free-text column, so this is a reading of
 * it rather than a lookup: the first word and the initial of the last,
 * split on any run of whitespace. One word stays whole — there is no
 * second initial to add. No name at all falls back to the address
 * before its `@`, which is the same fallback every roster in the
 * product prints, only shorter.
 *
 * The initial is taken by code point, not by UTF-16 unit, so a name
 * that opens with a character outside the BMP is not cut in half.
 */
export function shortName(fullName: string | null | undefined, email?: string | null): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return (email ?? "").split("@")[0] ?? "";
  if (words.length === 1) return words[0];

  const [initial] = Array.from(words[words.length - 1]);
  return `${words[0]} ${initial.toLocaleUpperCase()}.`;
}
