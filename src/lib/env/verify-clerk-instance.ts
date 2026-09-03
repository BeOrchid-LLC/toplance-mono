const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * A `sk_test_…` secret key runs Clerk's cookieless dev-instance mode:
 * the session lives on `*.clerk.accounts.dev` in a `__clerk_db_jwt`
 * query parameter instead of a first-party cookie on our domain. Behind
 * a real host that gap never closes — clerk-js holds a session the
 * server can never read, and sign-in loops between the form and
 * `/sign-in` forever. See "Clerk, one instance per environment" in the
 * README, and the staging incident it was written from.
 *
 * `appUrl` mirrors `APP_URL`'s own default: unset means local dev, so
 * only a value that resolves to a non-local host trips the guard.
 * `secretKey` unset is left alone — Clerk's own SDK already refuses to
 * start without one, and duplicating that message here would just be a
 * second, less specific error ahead of the real one.
 */
export function assertClerkInstanceMatchesHost(env: {
  secretKey: string | undefined;
  appUrl: string | undefined;
}): void {
  if (!env.secretKey || !env.appUrl) return;
  if (!env.secretKey.startsWith("sk_test_")) return;

  const { hostname } = new URL(env.appUrl);
  if (LOCAL_HOSTNAMES.has(hostname)) return;

  throw new Error(
    `CLERK_SECRET_KEY is a sk_test_ key but APP_URL (${env.appUrl}) is not local. ` +
      `A development Clerk instance cannot serve a real host: it runs cookieless, ` +
      `so the browser holds a session the server can never read and sign-in loops ` +
      `forever. Deploy a sk_live_ key pair from this environment's own Clerk ` +
      `application instead — see "Clerk, one instance per environment" in the README.`
  );
}
