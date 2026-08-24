import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";

/**
 * Auth surfaces carry the Toplance brand, per the client's decision.
 * The shared BeOrchid account is acknowledged in subtext rather than
 * owning the screen.
 *
 * The brand-gradient band that used to head these screens is gone. It was
 * the same device the landing page removed — a saturated slab cutting a
 * strip off the top of the page — and it made signing up look like a
 * different product from the one that just argued for itself. The chrome
 * now matches `site-nav`: one bar, one rule, the ground doing the work.
 *
 * `security-paper` on the ground is what the laminate on the form panel
 * refracts. Without it the glass has nothing to bend and reads as a flat
 * translucent rectangle.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-90 flex h-[var(--bar-h)] items-center gap-4 border-b border-border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-[max(16px,calc((100%-1140px)/2))] backdrop-blur-md">
        <Wordmark className="[&_.wordmark-label]:max-md:hidden" />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeSwitch variant="icon" />
          <LocaleMenu size="sm" className="max-[400px]:[&_.lang-label]:hidden" />
        </div>
      </header>

      <main className="relative isolate flex-1 px-6 py-14 md:py-20">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-0 -z-10"
        />
        {children}
      </main>

      <footer className="border-t border-border px-6 py-5">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4">
          <span className="tag">© 2026 BeOrchid · Toplance</span>
          <Link
            href="/"
            className="flex min-h-[var(--row-h)] items-center gap-2 text-[15px] font-medium text-ink-2 transition-colors hover:text-brand-text"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to toplance.com
          </Link>
        </div>
      </footer>
    </div>
  );
}
