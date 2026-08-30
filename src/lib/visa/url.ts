/**
 * Scheme validation for links that arrive from outside this codebase.
 *
 * Six fields on a rule set — `sourceUrl`, `embassyUrl`, `evisaUrl`,
 * `registrationUrl` and the two on a `Contribution` — are strings a
 * visa vendor put in a JSON response, and the requirements sheet
 * renders every one of them as an `href`. A vendor that is compromised,
 * proxied, or simply wrong can therefore hand us `javascript:alert(...)`
 * and have it run in our origin the moment a traveller clicks it.
 * `target="_blank"` and `rel="noopener noreferrer"` do not prevent this:
 * they govern the window that opens, not the scheme that executes.
 *
 * So a URL is checked where it enters — in the provider that parses the
 * payload — rather than where it is rendered. Two reasons for the
 * boundary rather than the JSX: `embassyUrl` also reaches the itinerary
 * prompt as a grounded fact, and a value that is never adopted cannot
 * be forgotten at a second render site added later.
 */

/** The only two schemes a link on a rule set may carry. */
const ALLOWED = new Set(["http:", "https:"]);

/**
 * `value` if it is an absolute http(s) URL, otherwise null.
 *
 * Relative paths are rejected too. Every link here is a government or
 * vendor page somewhere else; a relative one is a malformed response,
 * not a route of ours.
 *
 * The vendor's own string is returned rather than a normalised one, so
 * what the sheet displays is what the source published. That is safe
 * because `new URL` strips the tabs and newlines inside a scheme in the
 * same way a browser does — anything that parses here as http(s) is
 * read as http(s) by the browser too.
 */
export function httpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  return ALLOWED.has(parsed.protocol) ? trimmed : null;
}
