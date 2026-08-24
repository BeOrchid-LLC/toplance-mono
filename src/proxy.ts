import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Next 16 renamed Middleware to Proxy. Clerk's own guide still says
 * `middleware.ts`; the export shape is identical, so a default export
 * here is what Next picks up.
 *
 * Session handling and a convenience redirect only. Authorization
 * decisions belong in the data layer, where `@/lib/auth/guards`
 * enforces them: a redirect here is a courtesy to the user, never the
 * thing standing between them and someone else's passport.
 */

/** Prefixes a signed-out visitor may reach. Everything else redirects. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/employer/sign-in(.*)",
  "/ops/sign-in(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const { userId } = await auth();
  if (userId) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
    "/__clerk/:path*",
  ],
};
