import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { authRoutes, signedInDestination, signInDoorFor } from "@/lib/auth/routes";

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
  // The traveller's landing page, which is marketing and not a console.
  // It needs naming separately because `"/"` matches only `/` itself —
  // when the traveller copy moved off the home page it silently became
  // a protected route, and a signed-out visitor following "For
  // travelers" from the nav was bounced to `/sign-in`, which is a door
  // invite-only travellers cannot open.
  "/travelers",
  // The pre-01/09 spelling, kept public so the permanent redirect in
  // `next.config.ts` is the thing that answers it. Whether this proxy
  // runs before or after that redirect is a detail of the framework's
  // routing order, and an old link in someone's inbox should not depend
  // on which way round it is.
  "/travellers",
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
  // The VisaList warming job, on the same terms. Listed individually
  // rather than as `/api/cron(.*)`: a wildcard would make every future
  // route under that prefix public the moment someone adds one, and the
  // secret check that makes it safe lives in the route, not here.
  "/api/cron/visa-warm",
  "/api/cron/corridor-recheck",
  "/api/cron/fx-rates",
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
  url.pathname = signInDoorFor(pathname);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
    "/__clerk/:path*",
  ],
};
