/**
 * The shape check for anything that reaches a uuid column from outside —
 * a URL segment, a form field. Postgres throws on a malformed uuid
 * before any row logic runs, so without this a typed URL like
 * /ops/cases/1 is a 500 where a wrong-but-well-formed id is a 404.
 * A malformed id must be indistinguishable from a missing one.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
