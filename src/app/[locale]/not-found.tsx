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
 * No plate. §4 keeps one for a surface whose subject is a corridor, a
 * case or a person's standing in one, and this page has no subject at
 * all; a sheet here would be decoration with nothing on it. The ground
 * and the type scale are the whole treatment, which is §2's point about
 * matching through tokens rather than through devices.
 */
export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="relative isolate">
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
              is built from, so even the dead end looks like the product.

              Both rows turn their focus ring inward, the first of the two
              deviations `:focus-visible` in globals.css permits. Each row
              is the full width of the sheet and half its height, and the
              sheet is `overflow-hidden` so its rounded corners actually
              cut — so an outward ring survives only on the edge that
              faces the other row. Measured before and after rather than
              reasoned about: "Start from the beginning" answered a Tab
              with a single 2px bar under it and "Go to my application"
              with a single bar over it, which between them look less
              like two focused links than like one rule drawn twice.
              Drawn on the inside they ring, at 16.89:1 light and 4.99:1
              dark on the sheet, and 11.90 / 3.52 along the top row's
              bottom edge, where the band crosses the rule between the
              two rows. */}
          <div className="mt-10 max-w-[560px] overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]">
            <Link
              href="/"
              className="group flex items-center justify-between gap-6 border-b border-border px-5 py-5 transition-colors hover:bg-surface-2 hover:text-brand-text focus-visible:-outline-offset-2 sm:px-6"
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
              className="group flex items-center justify-between gap-6 px-5 py-5 transition-colors hover:bg-surface-2 hover:text-brand-text focus-visible:-outline-offset-2 sm:px-6"
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
