"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
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

  /**
   * The hero is a light ground now, so the bar no longer has to invert
   * itself over a dark field — it only has to stop floating once the page
   * moves under it. At the top it is invisible; after that it is the
   * surface it always was, with a rule to sit on.
   */
  const [lifted, setLifted] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-90 flex h-[var(--bar-h)] items-center gap-4 border-b px-[max(16px,calc((100%-1240px)/2))] transition-colors duration-[var(--dur-toggle)] ease-[var(--ease-out)]",
        lifted
          ? "border-border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <Wordmark className="[&_.wordmark-label]:max-md:hidden" />

      <div className="hidden min-w-0 items-center overflow-hidden lg:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-[var(--row-h)] items-center whitespace-nowrap rounded-sm px-3 text-[15px] font-medium text-ink-2 transition-colors hover:text-brand-text"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeSwitch variant="icon" />
        <LocaleMenu size="sm" className="max-[400px]:[&_.lang-label]:hidden" />
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
