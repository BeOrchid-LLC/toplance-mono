import Link from "next/link";

import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";

/**
 * Auth surfaces carry the Toplance brand, per the client's decision.
 * The shared BeOrchid account is acknowledged in subtext rather than
 * owning the screen.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative overflow-hidden bg-[image:var(--brand-grad)]">
        <div className="scrim on-scrim relative px-6 py-6">
          <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4">
            <Wordmark onBrand />
            <span className="flex items-center gap-3">
              <ThemeSwitch className="[&_span]:!border-white/45 [&_span]:!bg-white/15" />
              <LocaleMenu className="!border-white/45 !bg-white/15 !text-white hover:!bg-white/25" />
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-surface-2 px-6 py-12">{children}</main>

      <footer className="border-t border-border bg-surface px-6 py-5">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4">
          <span className="special">© 2026 BeOrchid · Toplance</span>
          <Link href="/" className="text-base text-brand-text hover:underline">
            Back to toplance.com
          </Link>
        </div>
      </footer>
    </div>
  );
}
