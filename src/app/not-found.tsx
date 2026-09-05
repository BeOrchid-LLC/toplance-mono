import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Shell } from "@/components/shared/shell";

export const metadata = { title: "Page not found" };

/**
 * There was no `not-found` before this, so a mistyped URL fell through to
 * Next's own black-on-white default — a page from a different product,
 * with no way back into this one.
 *
 * No laminate. §4 keeps it for a surface whose subject is a corridor, a
 * case or a person's standing in one, and this page has no subject at
 * all; glass here would be decoration with nothing underneath it. The
 * ruled ground and the type scale are the whole treatment, which is §2's
 * point about matching through tokens rather than through devices.
 */
export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="relative isolate">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        />
        <Shell className="py-24 md:py-32">
          <p className="kicker">Error 404</p>
          <h1 className="t-h1 mt-4 max-w-[26ch]">
            That page is not here
          </h1>
          <p className="t-body-lg mt-5 max-w-[62ch] text-ink-2">
            The link may be out of date, or the address may have a typo in it.
            Nothing has happened to your application.
          </p>

          {/* The two ways back, on one sheet — the same card the product
              is built from, so even the dead end looks like the product. */}
          <div className="mt-10 max-w-[560px] overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]">
            <Link
              href="/"
              className="group flex items-center justify-between gap-6 border-b border-border px-5 py-5 transition-colors hover:bg-surface-2 hover:text-brand-text sm:px-6"
            >
              <span>
                <span className="t-title block">Start from the beginning</span>
                <span className="t-muted mt-1 block">
                  Pick a route and see what it asks for
                </span>
              </span>
              <ArrowRight
                className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/app"
              className="group flex items-center justify-between gap-6 px-5 py-5 transition-colors hover:bg-surface-2 hover:text-brand-text sm:px-6"
            >
              <span>
                <span className="t-title block">Go to my application</span>
                <span className="t-muted mt-1 block">
                  Your checklist, documents and status
                </span>
              </span>
              <ArrowRight
                className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </Shell>
      </main>
      <SiteFooter />
    </div>
  );
}
