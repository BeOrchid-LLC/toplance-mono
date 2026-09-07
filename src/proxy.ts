import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { authRoutes, signedInDestination, SIGN_IN_DOOR } from "@/lib/auth/routes";
import type { Locale } from "@/lib/i18n/locales";
import {
  isNonPagePath,
  splitLocalePath,
  withLocalePrefix,
} from "@/lib/i18n/paths";

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
 *
 * This is also the only place that knows about locale URL prefixes.
 * English lives unprefixed at the app's plain paths; every other locale
 * is reachable at `/{code}/...`. The route tree itself lives under
 * `src/app/[locale]`, so a prefixed URL is already a real route and is
 * served as it stands; an unprefixed one is rewritten under `/en`.
 *
 * It used to work the other way round — the prefix was stripped here and
 * the locale handed onward as a request header. That cannot work on a
 * prerendered page, where `headers()` returns nothing, so `/` and
 * `/travelers` rendered in English in every language. A route segment is
 * readable at prerender time, which is why the locale is one now.
 *
 * Every routing decision below (`isPublicRoute`, `SIGN_IN_DOOR`,
 * `signedInDestination`) still reads the *stripped* path, so a Yoruba
 * visitor at `/yo/app/profile` gets exactly the same decision as the
 * English visitor at `/app/profile`; the prefix is added back only at
 * the edges, when this proxy issues a redirect of its own.
 */

/**
 * Still set on every request this proxy serves, and now read only by
 * `getActionLocale()` (`@/lib/i18n/server`). Server Components read the
 * route segment; a Server Action cannot see root parameters, so the
 * header remains its only way to know what language to answer in.
 */
const LOCALE_HEADER = "x-toplance-locale";

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
  // The pre-01/09 spelling. Kept in this list defensively — see the
  // dedicated `/travellers` handling below, which is what actually
  // answers it under a locale prefix, since `next.config.ts`'s
  // permanent redirect only matches the bare, unprefixed path.
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
  const { locale, rest: realPathname } = splitLocalePath(pathname);

  // `/travellers` (old spelling) has no page of its own to rewrite to —
  // `next.config.ts` permanently redirects it to `/travelers`, but that
  // config-level redirect only matches the literal, unprefixed source
  // path, and runs before this proxy ever sees the request. A prefixed
  // request like `/fr/travellers` never matches that literal source, so
  // it reaches here — and without this, it would rewrite straight to a
  // route that does not exist. Answering it the same way, just with the
  // prefix re-applied, keeps an old link working in every locale.
  if (realPathname === "/travellers") {
    return NextResponse.redirect(
      new URL(withLocalePrefix("/travelers", locale), request.url),
      308
    );
  }

  // `next` and `token` are trusted internal-path values elsewhere in
  // this file (see `@/lib/auth/routes`), so any locale prefix on an
  // incoming one is stripped before it is treated as such — otherwise a
  // stale or hand-edited `?next=/fr/app` would end up double-prefixed
  // once `withLocalePrefix` runs on the way back out.
  const nextParam = searchParams.get("next");
  const realNext = nextParam ? splitLocalePath(nextParam).rest : nextParam;

  if (userId) {
    const destination = signedInDestination(
      realPathname,
      realNext,
      searchParams.get("token")
    );
    if (destination) {
      return NextResponse.redirect(
        new URL(withLocalePrefix(destination, locale), request.url)
      );
    }
    return serve(request, locale, realPathname, pathname);
  }

  // `isPublicRoute` only ever reads `req.nextUrl.pathname` (see
  // `@clerk/nextjs`'s `createRouteMatcher`), so handing it a clone whose
  // pathname is the stripped one is enough to make the match run
  // against the real route rather than the locale-prefixed URL.
  const strippedUrl = request.nextUrl.clone();
  strippedUrl.pathname = realPathname;
  if (isPublicRoute({ nextUrl: strippedUrl } as unknown as NextRequest)) {
    return serve(request, locale, realPathname, pathname);
  }

  const url = request.nextUrl.clone();
  url.pathname = withLocalePrefix(SIGN_IN_DOOR, locale);
  url.searchParams.set("next", withLocalePrefix(realPathname, locale));
  return NextResponse.redirect(url);
});

/**
 * Actually serves the request, on the URL the route tree expects.
 *
 * Every page lives under `src/app/[locale]`, so the segment is not
 * optional there: a prefixed request already names it and passes
 * straight through, while an unprefixed one — English, the common case
 * and the URLs that are actually linked to — is rewritten under `/en`.
 * The browser's URL is untouched either way, which is what keeps
 * English unprefixed in public while still resolving to a real route.
 *
 * `LOCALE_HEADER` rides along on both paths. Nothing renders from it any
 * more, but a Server Action posting back to this URL cannot read the
 * route segment, and it is the only thing that tells the action which
 * language to answer in.
 */
function serve(
  request: NextRequest,
  locale: Locale,
  realPathname: string,
  rawPathname: string
) {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  // Route handlers and Clerk's callback are not pages and have no
  // `[locale]` segment to name. They fall inside the matcher below, so
  // without this they would be rewritten to `/en/api/...`, which does
  // not exist — and for `/api/cron/*` that is every scheduled job
  // 404ing with nobody watching.
  if (isNonPagePath(realPathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const target = `/${locale}${realPathname === "/" ? "" : realPathname}`;
  if (target === rawPathname) return NextResponse.next({ request: { headers } });

  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
    "/__clerk/:path*",
  ],
};
