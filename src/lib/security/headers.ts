/**
 * Response headers applied to every route by `next.config.ts`.
 *
 * Lives here rather than inline in the config so it can be tested: the
 * vitest suite only collects `src/**`, and "is HSTS actually on in a
 * production build" is exactly the kind of claim that should not rest
 * on someone re-reading the config.
 */

export type ResponseHeader = { key: string; value: string };

/**
 * The brief asks that all user data be encrypted in transit. Coolify's
 * proxy terminates TLS, which covers a request that already arrived
 * over HTTPS — but nothing told the browser it *must* use HTTPS next
 * time. Without HSTS the first request of every session is strippable:
 * a traveller on airport wifi typing the bare domain makes one
 * cleartext request carrying a session cookie before any redirect can
 * help.
 *
 * `isProduction` gates HSTS rather than the caller doing it, because
 * the reason is specific: HSTS is scoped to a host, not a scheme, so
 * serving it from `next dev` would pin `localhost` to HTTPS in the
 * developer's browser for a year — and with it every other project on
 * :3000. That is a genuinely painful thing to undo.
 *
 * `preload` is deliberately absent. Getting a domain onto the browsers'
 * preload list is easy and getting it off again takes months, so it is
 * a decision to make once the domain is settled, not a default.
 *
 * No Content-Security-Policy yet: Clerk, the OpenAI realtime transport
 * and R2 each need their own origins allowed, and a CSP guessed at
 * rather than derived breaks the intake agent in ways that only show up
 * in production. Tracked in docs/infrastructure-encryption.md.
 */
export function securityHeaders(isProduction: boolean): ResponseHeader[] {
  const headers: ResponseHeader[] = [
    // Cuts MIME-sniffing, which is what turns an uploaded passport scan
    // served with the wrong content type into executable script.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Nothing here is meant to be framed; the ops console least of all.
    { key: "X-Frame-Options", value: "DENY" },
    // Full URL same-origin, bare origin cross-origin. Document and case
    // paths carry ids with no business in a third party's referer log.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // `self` for both, not `()`: document-row.tsx uses
    // `capture="environment"` for the phone camera, and the intake
    // agent opens a microphone for the voice conversation. The rest is
    // denied.
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(self), geolocation=(), payment=()",
    },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
