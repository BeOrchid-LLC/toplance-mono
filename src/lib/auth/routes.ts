/**
 * The auth surfaces and where each one sends a visitor who is already
 * signed in. Clerk runs in single-session mode: a second sign-in attempt
 * from the same browser is rejected with `session_exists`, so the only
 * useful thing an auth page can do for a signed-in visitor is move them
 * along. Both the proxy redirect and the form's error handling resolve
 * their destination here so the two can never disagree.
 *
 * Order matters: the more specific prefixes come first, since `/sign-in`
 * would otherwise shadow `/employer/sign-in` in a first-match search.
 */
export const authRoutes = [
  { prefix: "/employer/sign-in", home: "/employer" },
  { prefix: "/employer/sign-up", home: "/employer" },
  { prefix: "/ops/sign-in", home: "/ops" },
  // The generic doors cannot know who walked in — staff and employers
  // sign in here too, and roles live in Postgres where neither this
  // module nor the proxy can read them. `/go` can: it looks the role up
  // and forwards to `homeFor` it.
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
      return "/employer";
    default:
      return "/app";
  }
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
 * Where a signed-in visitor at `pathname` should land, or `null` when
 * the path is not an auth surface and no redirect belongs.
 */
export function signedInDestination(
  pathname: string,
  next?: string | null
): string | null {
  const route = authRoutes.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  if (!route) return null;
  return isInternalPath(next) ? next : route.home;
}
