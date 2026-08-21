import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { AccountMenu } from "@/components/app/account-menu";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; locked?: boolean };

export function AppBar({
  nav,
  active,
  name,
  email,
  subtitle,
  showAgentButton = false,
}: {
  nav: NavItem[];
  active: string;
  name: string;
  email: string;
  subtitle?: string;
  showAgentButton?: boolean;
}) {
  return (
    <header className="flex h-[var(--bar-h)] items-center gap-6 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-6">
        <Wordmark href={nav[0]?.href ?? "/app"} />
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.locked ? "#" : item.href}
              aria-disabled={item.locked}
              aria-current={active === item.href ? "page" : undefined}
              className={cn(
                "flex min-h-[var(--row-h)] items-center rounded-sm px-3 text-base font-medium transition-colors",
                active === item.href
                  ? "bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] text-brand-text"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                item.locked && "pointer-events-none text-ink-3"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
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
  );
}
