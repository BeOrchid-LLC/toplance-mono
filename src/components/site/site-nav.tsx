"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#orgs", label: "For organisations" },
  { href: "#where", label: "Where we work" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteNav() {
  const t = useT();

  return (
    <nav className="sticky top-0 z-90 flex h-[var(--bar-h)] items-center gap-4 border-b border-border bg-[color-mix(in_srgb,var(--surface)_97%,transparent)] px-[max(16px,calc((100%-1140px)/2))] backdrop-blur-md">
      <Wordmark className="[&_.wordmark-label]:max-md:hidden" />

      <div className="hidden min-w-0 items-center overflow-hidden lg:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-[var(--row-h)] items-center whitespace-nowrap rounded-sm px-3 text-base font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeSwitch className="px-0 [&>span]:h-7 [&>span]:w-[52px] sm:[&>span]:h-8 sm:[&>span]:w-[60px]" />
        <LocaleMenu className="max-[400px]:[&_.lang-label]:hidden" />
        <Button asChild variant="tertiary" size="sm" className="hidden xl:inline-flex">
          <Link href="/sign-in">{t(HERO.signIn)}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/sign-up">{t(HERO.ctaShort)}</Link>
        </Button>
      </div>
    </nav>
  );
}
