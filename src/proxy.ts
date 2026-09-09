import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

import { withoutHandshake } from "@/lib/auth/handshake";
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
  // The buffered-email sweep. Listed individually like the rest — the
  // wildcard is deliberately not used here; see the note above.
  "/api/cron/notification-emails",
]);

const withClerkSession = clerkMiddleware(async (auth, request) => {
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

/**
 * Whether this is the refusal we know how to recover from.
 *
 * Clerk throws a plain `Error` reading `"handshake status without
 * redirect"`; there is no typed class exported to test against, so the
 * message is what there is. Matching the word rather than the whole
 * sentence survives a rewording, and everything that does not match is
 * re-thrown untouched.
 */
function isHandshakeRefusal(error: unknown): boolean {
  return error instanceof Error && /handshake/i.test(error.message);
}

/**
 * Set on the redirect that strips a refused handshake, and read on the
 * way back in.
 *
 * A handshake refused because the token was stale clears on one retry.
 * One refused because the instance is misconfigured does not, and from
 * inside a single request the two look identical: strip, redirect,
 * Clerk starts a fresh handshake, that one is refused too, strip again
 * — until the browser stops with ERR_TOO_MANY_REDIRECTS, which is a
 * worse answer than the 500 this replaced. The cookie is what tells
 * the second attempt apart from the first.
 *
 * Thirty seconds covers one round trip through Clerk's frontend API
 * and little else. It is deliberately not cleared on the success path:
 * doing that would mean wrapping every response in this proxy to reach
 * one cookie, and the cost of leaving it is that a second, unrelated
 * stale handshake inside the same half minute goes straight to the
 * door instead of getting its own retry.
 *
 * `sameSite: "lax"` because the trip that sets it and the trip that
 * reads it are separated by a top-level navigation to Clerk's own
 * domain and back; `strict` would not come back.
 */
const HANDSHAKE_RETRY_COOKIE = "__toplance_handshake_retried";

/**
 * The handshake this instance could not verify, answered as a redirect
 * rather than a 500.
 *
 * The catch has to sit out here, around `clerkMiddleware` itself, rather
 * than around the `auth()` call inside it. Clerk resolves the request
 * state — handshake included — before it ever invokes the handler above,
 * and throws `"handshake status without redirect"` from there when it
 * decides a handshake is needed but has no location to send the browser
 * to. By the time `auth()` is called the state is already resolved, so a
 * `try` around it catches nothing; this was written that way first and
 * the 500 was still there.
 *
 * A refused handshake token is spent, so the request cannot be repeated
 * as it stands. `withoutHandshake` takes it out of the URL and this asks
 * for the same page again without it, which is the one thing that can
 * clear the loop — Clerk starts a fresh handshake if it still wants one.
 *
 * What is recovered from is decided by the error, not by the URL. An
 * earlier version asked only whether the address carried a handshake
 * parameter, which meant any unrelated failure on such a request — a
 * throw from `serve`, from `signedInDestination`, from anything below —
 * was silently answered with a redirect and its error discarded. Only a
 * handshake refusal is caught here; everything else is re-thrown, and a
 * proxy that swallows every error is a product that fails silently.
 */
export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent
) {
  try {
    return await withClerkSession(request, event);
  } catch (error) {
    if (!isHandshakeRefusal(error)) throw error;

    const retry = withoutHandshake(request.nextUrl);
    if (!retry) throw error;

    // Said out loud, not swallowed. This branch exists so that a
    // refused handshake stops being invisible to the person hitting
    // it; it must not become invisible to us instead. The bracketed
    // prefix is the shape `[audit]` and `[clerk-admin]` already use
    // where they absorb a failure.
    console.error("[auth] handshake refused — retrying without it", error);

    if (request.cookies.has(HANDSHAKE_RETRY_COOKIE)) {
      console.error(
        "[auth] handshake refused twice inside the retry window — " +
          "sending to the sign-in door rather than looping"
      );
      const { locale } = splitLocalePath(request.nextUrl.pathname);
      const door = NextResponse.redirect(
        new URL(withLocalePrefix(SIGN_IN_DOOR, locale), request.url)
      );
      door.cookies.delete(HANDSHAKE_RETRY_COOKIE);
      return door;
    }

    // Rebuilt against `request.url`, like every other redirect in this
    // file. `nextUrl` carries whatever protocol the origin was reached
    // on, and this one sits behind a CDN that terminates TLS — taking
    // the address from it can answer an https request with an http
    // Location.
    const response = NextResponse.redirect(
      new URL(`${retry.pathname}${retry.search}`, request.url)
    );
    response.cookies.set(HANDSHAKE_RETRY_COOKIE, "1", {
      maxAge: 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
    "/__clerk/:path*",
  ],
};
