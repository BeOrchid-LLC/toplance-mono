"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SettingsCluster } from "@/components/shared/settings-cluster";
import { Shell } from "@/components/shared/shell";
import { Wordmark } from "@/components/shared/wordmark";
import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";

/**
 * Bare fragments rather than `/#how`, because both landing pages carry
 * the same section ids — the bar sits above `/` and `/travellers` alike,
 * and a link that jumped you to the other page's version of the section
 * you are already reading would be a worse answer than scrolling.
 *
 * "For organisations" became "For travellers" rather than being added
 * beside it: `/` addresses organisations now, so the old entry pointed
 * the reader at where they already were, and the traveller page is
 * otherwise unreachable from the chrome. Swapping rather than appending
 * also keeps the count at four — the strip is `overflow-hidden`, so a
 * fifth entry clips instead of wrapping between `lg` and roughly 1140px.
 * `#orgs` keeps its footer entry.
 */
const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#where", label: "Where we work" },
  { href: "#pricing", label: "Pricing" },
  { href: "/travellers", label: "For travellers" },
];

export function SiteNav() {
  const t = useT();

  /**
   * The hero is a light ground now, so the bar no longer has to invert
   * itself over a dark field — it only has to stop floating once the page
   * moves under it. At the top it is invisible; after that it is the
   * surface it always was, with a rule to sit on.
   *
   * The rule is `bar-edge` now, the same optically-variable laminate
   * hairline `AppBar` closes on and the documents in this product already
   * carry. Its opacity rides `--bar-edge-o` rather than the header's own,
   * so the wordmark and the call to action stay at full strength while
   * only the rule fades in.
   */
  const [lifted, setLifted] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // The rule and the blur span the viewport; the row inside sits in
    // the page `Shell`. This was `px-[max(16px,calc((100%-1240px)/2))]`,
    // which centres a 1240 box — but `Shell` is 1240 *including* its
    // `px-6`, so the wordmark sat 24px outside the content it heads.
    // Being off by a padding is worse than being obviously wrong: it
    // reads as a wobble rather than a decision.
    <nav
      className={cn(
        "bar-edge sticky top-0 z-90 transition-colors duration-[var(--dur-toggle)] ease-[var(--ease-out)]",
        lifted
          ? "bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-md"
          : "bg-transparent [--bar-edge-o:0]"
      )}
    >
      <Shell className="flex h-[var(--bar-h)] items-center gap-4">
        <Wordmark className="[&_.wordmark-label]:max-md:hidden" />

        {/* `items-stretch` and `h-full` for the same reason as `AppBar`:
            each link marks the bar's bottom edge from its own bottom, so
            a link shorter than the bar would leave its mark floating in
            mid-air. These are anchors into the page rather than routes,
            so none of them is ever the current one — the hover mark is
            the whole of the treatment here. */}
        <div className="hidden h-full min-w-0 items-stretch overflow-hidden lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-label relative flex h-full items-center whitespace-nowrap px-3.5 text-[15px] font-semibold text-ink-2 transition-colors after:absolute after:inset-x-2 after:bottom-0 after:z-10 after:h-px after:rounded-full after:bg-transparent after:transition-colors after:duration-[var(--dur-toggle)] hover:text-ink hover:after:bg-border-strong"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SettingsCluster />
          <Button asChild variant="tertiary" size="sm" className="hidden xl:inline-flex">
            <Link href="/sign-in">{t(HERO.signIn)}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/employer/sign-up">{t(HERO.ctaSecondary)}</Link>
          </Button>
        </div>
      </Shell>
    </nav>
  );
}
