import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { AccountMenu } from "@/components/app/account-menu";
import { AppNav, type NavItem } from "@/components/app/app-nav";

export type { NavItem };

/**
 * The product chrome. A hairline rule and a plain surface, matching
 * `site-nav` — a signed-in screen is the same product as the page that
 * argued for it, and a second bar treatment is the fastest way to make
 * it look like a different one.
 *
 * The active item is a rule under the tab rather than a tinted pill.
 * Guideline §6 is rules over boxes, and a pill here would be the third
 * rounded object in the top 120px of every screen, competing with the
 * one card that is meant to be the signature moment.
 */
export function AppBar({
  nav,
  name,
  email,
  subtitle,
  showAgentButton = false,
}: {
  nav: NavItem[];
  name: string;
  email: string;
  subtitle?: string;
  showAgentButton?: boolean;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 flex h-[var(--bar-h)] items-center gap-6 border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Wordmark href={nav[0]?.href ?? "/app"} />
          <AppNav
            nav={nav}
            className="hidden items-center gap-1 lg:flex"
            itemClassName="relative after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-[var(--radius-pill)] aria-[current=page]:after:bg-brand"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {showAgentButton && (
            <Button asChild variant="tertiary" size="sm" className="hidden md:inline-flex">
              <Link href="/app/agent">
                <Sparkles /> Ask the agent
              </Link>
            </Button>
          )}
          <span className="hidden md:inline-flex">
            <ThemeSwitch />
          </span>
          <span className="hidden md:inline-flex">
            <LocaleMenu />
          </span>
          <AccountMenu name={name} email={email} subtitle={subtitle} />
        </div>
      </header>

      {/* Below `lg` the bar above hides its nav, and until now nothing
          replaced it — the whole product was unreachable from a phone
          except by typing URLs, on a surface whose quality floor is
          390px. A scrolling rail of the same items, ruled the same way. */}
      {nav.length > 1 && (
        <div className="sticky top-[var(--bar-h)] z-30 border-b border-border bg-surface lg:hidden">
          <AppNav
            nav={nav}
            className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            itemClassName="relative after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-[var(--radius-pill)] aria-[current=page]:after:bg-brand"
          />
        </div>
      )}
    </>
  );
}
