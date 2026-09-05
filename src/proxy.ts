import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { authRoutes, signedInDestination, signInDoorFor } from "@/lib/auth/routes";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

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
 * English lives unprefixed at today's exact paths; every other locale
 * is reachable at `/{code}/...`, which is a rewrite of the same route
 * — no route file moves. Every routing decision below (`isPublicRoute`,
 * `signInDoorFor`, `signedInDestination`) reads the *stripped* path, so
 * a Yoruba visitor at `/yo/app/profile` gets exactly the same decision
 * as the English visitor at `/app/profile`; the prefix is only added
 * back at the edges — when this proxy issues its own redirect, or when
 * it rewrites through to the real route and needs to tell the Server
 * Components which locale that was.
 */

const LOCALE_HEADER = "x-toplance-locale";

/** Every locale code except English, which is never URL-prefixed. */
const PREFIXED_LOCALES = LOCALES.map((l) => l.code).filter(
  (code): code is Exclude<Locale, "en"> => code !== "en"
);

/**
 * Splits a raw request pathname into the locale it names (defaulting to
 * English when no `/xx` segment is present) and the "real" pathname —
 * the one the rest of this file, and the route tree itself, understand.
 * `/fr/travelers` -> `{ locale: "fr", rest: "/travelers" }`; `/fr` alone
 * -> `{ locale: "fr", rest: "/" }`; anything with no recognised prefix
 * is treated as plain English.
 */
function splitLocale(pathname: string): { locale: Locale; rest: string } {
  for (const code of PREFIXED_LOCALES) {
    if (pathname === `/${code}`) return { locale: code, rest: "/" };
    if (pathname.startsWith(`/${code}/`)) {
      return { locale: code, rest: pathname.slice(code.length + 1) };
    }
  }
  return { locale: "en", rest: pathname };
}

/**
 * The inverse of `splitLocale`'s `rest`: re-applies `/{code}` to an
 * internal, unprefixed path. English is the untranslated fallback and
 * stays unprefixed, matching today's URLs exactly.
 *
 * `path` is assumed to already be unprefixed — every path value that
 * flows through this file (`signInDoorFor`'s result, `authRoutes`
 * homes, a stripped `next` param) is kept unprefixed until the moment
 * it is handed to this function, specifically so a value can never
 * pick up two prefixes.
 */
function withLocalePrefix(path: string, locale: Locale): string {
  if (locale === "en") return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

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
  const { locale, rest: realPathname } = splitLocale(pathname);

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
  const realNext = nextParam ? splitLocale(nextParam).rest : nextParam;

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
  url.pathname = withLocalePrefix(signInDoorFor(realPathname), locale);
  url.searchParams.set("next", withLocalePrefix(realPathname, locale));
  return NextResponse.redirect(url);
});

/**
 * Actually serves the page at `realPathname`. When a locale prefix was
 * present, that means rewriting through to the unprefixed route and
 * telling it which locale this was via `LOCALE_HEADER`, since the
 * Server Component on the other end has no other way to see a prefix
 * this proxy just rewrote away. When there was no prefix (English, the
 * common case), it is a plain pass-through — no rewrite, no header,
 * `getLocale()` defaults to English on its own.
 */
function serve(
  request: NextRequest,
  locale: Locale,
  realPathname: string,
  rawPathname: string
) {
  if (realPathname === rawPathname) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = realPathname;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
    "/__clerk/:path*",
  ],
};
