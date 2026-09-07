import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

/**
 * The marketing pages' chrome. `SiteNav` is rendered unconditionally:
 * the header is the same for every visitor, signed in or out.
 *
 * It used to be a `SiteChrome` client component that waited for Clerk,
 * then swapped this bar for the visitor's own console `AppBar` — the
 * traveller's journey nav, the employer's People view, the reviewer's
 * case queue — filled in by a `getSignedInChrome` server action. That
 * swap is gone, along with both. The marketing bar's own doors already
 * carry a signed-in visitor to the right place: `/sign-in` resolves
 * through the proxy to `/go`, which reads the role from Postgres and
 * forwards to that person's console.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
