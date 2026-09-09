/**
 * Recovering from a handshake Clerk will not accept.
 *
 * A development instance runs cookieless (`url_based_session_syncing`),
 * so it settles session state by redirecting the browser to its own
 * frontend API and back, carrying the answer in the query string. When
 * that answer is stale, replayed, or minted by a different instance,
 * `auth()` throws while verifying it — and because the proxy is the
 * first thing to touch the request, the throw becomes Next's generic
 * `text/plain` 500 rather than any page this product has written.
 *
 * The token is spent either way, so the request cannot be retried as it
 * stands. Taking the handshake out of the URL is what makes it
 * retryable: the same path, minus the one parameter that fails.
 */
const HANDSHAKE_PARAMS = [
  "__clerk_handshake",
  "__clerk_handshake_nonce",
] as const;

/**
 * The same URL with a refused handshake removed, or `null` when there
 * was no handshake in it.
 *
 * `null` rather than an unchanged copy on purpose: the caller redirects
 * to whatever this returns, and redirecting to the URL the browser is
 * already on is a loop rather than a recovery. Only the handshake
 * parameters are dropped — `__clerk_db_jwt` carries the dev browser's
 * identity and belongs to the next attempt, not the failed one.
 */
export function withoutHandshake(url: URL): URL | null {
  const present = HANDSHAKE_PARAMS.some((param) => url.searchParams.has(param));
  if (!present) return null;

  const retry = new URL(url);
  for (const param of HANDSHAKE_PARAMS) retry.searchParams.delete(param);
  return retry;
}
