/**
 * Kept out of `client.ts` so it carries no `server-only` import: the
 * deployment checker (`scripts/verify-encryption.mts`) has to apply the
 * exact same rule as the running app, and duplicating a security
 * predicate into a script is how the two drift apart.
 */

/**
 * Whether the socket to this host stays inside a network we control.
 *
 * Demanding TLS on a loopback would only mean every developer
 * generating a self-signed certificate to protect a connection that
 * never leaves the machine. The same argument covers a private network:
 * Coolify reaches its managed Postgres by Docker service name over a
 * private bridge, and warning about that connection is worse than
 * saying nothing — a warning that fires on safe configurations becomes
 * scenery, and then reads identically on the one that is not safe.
 *
 * The set started as three loopback literals, which meant exactly that
 * false positive on the deployment this actually runs on.
 */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();

  if (h === "localhost" || h === "::1") return true;

  // IPv6 literals are settled here, before the single-label rule below
  // gets to them: `2606:4700::1` contains no dot either, and calling a
  // public address private is the one mistake this function must not
  // make. Unique-local (fc00::/7) and link-local (fe80::/10) only.
  if (h.includes(":")) {
    return /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h);
  }

  // A single label — `postgres`, `db` — cannot be resolved by public
  // DNS, so it is a Compose service, a Kubernetes short name or an
  // /etc/hosts entry. All of them are on a network we control.
  if (!h.includes(".")) return true;

  // Suffixes reserved for names that are not globally routable.
  if (/\.(internal|local|localdomain|home\.arpa)$/.test(h)) return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC 1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
    if (a === 192 && b === 168) return true; // RFC 1918
    if (a === 169 && b === 254) return true; // link-local
    return false;
  }

  return false;
}
