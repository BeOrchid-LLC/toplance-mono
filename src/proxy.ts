import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { authRoutes, signedInDestination } from "@/lib/auth/routes";

/**
 * Next 16 renamed Middleware to Proxy. Clerk's own guide still says
 * `middleware.ts`; the export shape is identical, so a default export
 * here is what Next picks up.
 *
 * Session handling and convenience redirects only. Authorization
 * decisions belong in the data layer, where `@/lib/auth/guards`
 * enforces them: a redirect here is a courtesy to the user, never the
 * thing standing between them and someone else's passport.
 *
 * The courtesy runs both ways. A signed-out visitor on a protected page
 * goes to sign-in; a signed-in visitor on an auth page goes to their
 * destination, because Clerk's single-session mode rejects a second
 * sign-in attempt with `session_exists` and the form becomes a dead end.
 */

/** Prefixes a signed-out visitor may reach. Everything else redirects. */
const isPublicRoute = createRouteMatcher([
  "/",
  ...authRoutes.map((r) => `${r.prefix}(.*)`),
  // Not an auth route: a signed-in traveller must also reach this page
  // to accept, so it is deliberately absent from `authRoutes` — nothing
  // here should redirect a signed-in visitor away.
  "/invite(.*)",
  // The weekly digest cron: a server calling a server, never a browser
  // with a Clerk session, so there is no session for this proxy to find
  // — `CRON_SECRET`, checked inside the route itself, is the actual
  // guard. Public here only means "do not redirect it to sign-in".
  "/api/cron/companion",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname, searchParams } = request.nextUrl;

  if (userId) {
    const destination = signedInDestination(
      pathname,
      searchParams.get("next"),
      searchParams.get("token")
    );
    return destination
      ? NextResponse.redirect(new URL(destination, request.url))
      : NextResponse.next();
  }

  if (isPublicRoute(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
    "/__clerk/:path*",
  ],
};
