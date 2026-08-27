/**
 * The sign-up form collects one passport-style full name; Clerk stores
 * `firstName` and `lastName` and renders them back joined with a
 * space. First word to firstName, the rest to lastName, so any name
 * survives the round trip — including multi-part surnames.
 */
export function splitFullName(fullName: string): {
  firstName: string | undefined;
  lastName: string | undefined;
} {
  const [first, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: first,
    lastName: rest.length ? rest.join(" ") : undefined,
  };
}
