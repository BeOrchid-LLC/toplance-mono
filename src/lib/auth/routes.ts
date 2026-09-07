/**
 * The one sign-in door. Every role signs in here — the accounts are all
 * rows in one `profiles` table, and which console a person gets is a
 * question about that row, not about the URL they typed.
 *
 * A constant rather than a literal at each call site because the proxy,
 * the form and the two retired doors all have to name it, and a door
 * that three files spell independently is a door one of them eventually
 * misspells.
 */
export const SIGN_IN_DOOR = "/sign-in";

/**
 * The auth surfaces and where each one sends a visitor who is already
 * signed in. Clerk runs in single-session mode: a second sign-in attempt
 * from the same browser is rejected with `session_exists`, so the only
 * useful thing an auth page can do for a signed-in visitor is move them
 * along. Both the proxy redirect and the form's error handling resolve
 * their destination here so the two can never disagree.
 *
 * Every sign-in now resolves to `/go`, including the two retired doors
 * that still answer as redirects. No auth surface can know who walked in
 * — roles live in Postgres, where neither this module nor the proxy can
 * read them — and `/go` is the one place that looks the role up and
 * forwards to `homeFor` it. Sending `/ops/sign-in` to `/ops` on the
 * strength of the URL was the guess this removes: it was right only for
 * the person who typed it correctly about themselves.
 *
 * Order matters: the more specific prefixes come first, since `/sign-in`
 * would otherwise shadow `/agency/sign-in` in a first-match search.
 */
export const authRoutes = [
  { prefix: "/agency/sign-in", home: "/go" },
  { prefix: "/agency/sign-up", home: "/agency" },
  { prefix: "/ops/sign-in", home: "/go" },
  { prefix: "/sign-in", home: "/go" },
  { prefix: "/sign-up", home: "/go" },
] as const;

/**
 * Each role's own console. The one answer to "where does a signed-in
 * person belong", used by the `/go` dispatcher — anything that knows a
 * role should resolve a destination through this, never hardcode one.
 */
export function homeFor(role: "traveler" | "org_member" | "staff"): string {
  switch (role) {
    case "staff":
      return "/ops";
    case "org_member":
      return "/agency";
    default:
      return "/app";
  }
}

/**
 * Where the `/go` dispatcher sends a signed-in visitor, or `null` when
 * the chain has to stop and `/go` should explain itself instead.
 *
 * `homeFor` answers "which console does this role own"; this answers the
 * question one step out — whether that console has anything to open. The
 * two differ for exactly one person, and that person is why this exists.
 *
 * A traveller's console *is* their application. Only `acceptInvitation`
 * creates one, so a traveller who never accepted an invitation holds a
 * profile and nothing else, and every page under `/app` redirects away
 * on a null application. Forwarding them to `homeFor("traveler")` puts
 * the two halves in a loop the browser only leaves with
 * ERR_TOO_MANY_REDIRECTS — the same trap `/sign-in` was, moved one door
 * along. `null` is the terminal answer, and `/go` already has the copy
 * for it: accounts are created from an invitation.
 *
 * Only the traveller console is an application. A reviewer's queue and a
 * staff member's corridors stand on their own, so `hasApplication` is
 * not consulted for them.
 */
export function goDestination(
  actor: { role: "traveler" | "org_member" | "staff" } | null,
  hasApplication: boolean
): string | null {
  if (!actor) return null;
  if (actor.role === "traveler" && !hasApplication) return null;
  return homeFor(actor.role);
}

/**
 * A `next` value is only trusted when it cannot leave the site: it must
 * be a path, not an absolute URL (`https://…`), a protocol-relative one
 * (`//…`), or a backslash variant browsers normalise into one.
 */
export function isInternalPath(next: string | null | undefined): next is string {
  return !!next && next.startsWith("/") && !/^\/[/\\]/.test(next);
}

/**
 * Invitation tokens are hex from the database. Anything else in that
 * slot is a stranger's string, and `/invite/${it}` would happily build a
 * path out of `../ops` or `a/b` that this module never meant to name.
 */
function isTokenShaped(token: string | null | undefined): token is string {
  return !!token && /^[A-Za-z0-9_-]+$/.test(token);
}

/**
 * Where a signed-in visitor at `pathname` should land, or `null` when
 * the path is not an auth surface and no redirect belongs.
 *
 * `token` exists for one case, and it is not a nicety. Clerk activating
 * a brand-new session refreshes the router, which re-requests whatever
 * URL the visitor is still standing on — mid-sign-up, that is the
 * sign-up page itself, and this function answers it. The invite-only
 * traveller door carries its destination in `?token=` rather than
 * `?next=`, so without this it resolves to `/go`, which for an account
 * whose profile row has not been written yet is a dead end rather than a
 * dispatcher.
 *
 * On that door the token outranks `next`. The door derives where to land
 * from a token it already resolved against the database and never sets
 * `next` itself, so anything arriving there is someone else's opinion
 * about where an invitation belongs.
 */
export function signedInDestination(
  pathname: string,
  next?: string | null,
  token?: string | null
): string | null {
  const route = authRoutes.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  if (!route) return null;

  if (route.prefix === "/sign-up" && isTokenShaped(token)) {
    return `/invite/${token}`;
  }

  return isInternalPath(next) ? next : route.home;
}
