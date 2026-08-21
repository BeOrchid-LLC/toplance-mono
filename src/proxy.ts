import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Next 16 renamed Middleware to Proxy. Same behaviour, new filename —
 * this is the one place Supabase's own SSR guide does not match this
 * project, because it still says `middleware.ts`.
 *
 * Session refresh only. Authorization decisions belong in the data
 * layer, where RLS enforces them: a redirect here is a convenience for
 * the user, never the thing standing between them and someone else's
 * passport.
 */

/** Prefixes a signed-out visitor may reach. Everything else redirects. */
const PUBLIC_PREFIXES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/auth",
  "/employer/sign-in",
  "/ops/sign-in",
];

export async function proxy(request: NextRequest) {
  // Before `.env.local` exists there is no session to refresh. Pass
  // through rather than throwing, so the public site still renders and
  // the developer sees the setup notice instead of a 500 on every route.
  if (!hasSupabaseEnv) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not put logic between createServerClient and getUser(). A stray
  // await here is the usual cause of users being signed out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => path === p || (p !== "/" && path.startsWith(p))
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
