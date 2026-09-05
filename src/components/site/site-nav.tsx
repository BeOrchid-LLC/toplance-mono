"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

/**
 * In document order, which is what makes "the last one whose top has
 * passed the bar" the right answer below. Derived rather than written
 * twice, so adding a link to `LINKS` cannot leave the spy behind.
 */
const SECTION_IDS = LINKS.filter((l) => l.href.startsWith("#")).map((l) =>
  l.href.slice(1)
);

export function SiteNav() {
  const t = useT();
  const pathname = usePathname();

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

  /**
   * Which section is being read, so the bar answers "where am I" and not
   * only "where could I go". `null` until the first section reaches the
   * bar — at the top of the page the reader is in the hero, which has no
   * link, and lighting `How it works` there would be a lie.
   *
   * The rule is the last section whose top has passed under the bar,
   * rather than the largest visible area or the one nearest the
   * viewport's middle: those flip back and forth between two neighbours
   * whenever one section is much shorter than the other, and this bar
   * sits over sections of very uneven height.
   */
  const [current, setCurrent] = React.useState<string | null>(null);

  React.useEffect(() => {
    // One listener for both, since both answer the same event and the
    // handler is cheap: three `getBoundingClientRect` reads, no writes,
    // so it neither forces a second layout nor fights the compositor.
    const onScroll = () => {
      setLifted(window.scrollY > 24);

      const line = parseFloat(
        getComputedStyle(document.body).getPropertyValue("--bar-h")
      );
      // A little past the bar's own edge: a heading that is level with
      // the rule is one the reader has not arrived at yet.
      const threshold = (Number.isFinite(line) ? line : 64) + 8;

      let seen: string | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) seen = id;
      }
      setCurrent(seen);
    };

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
            mid-air.

            The active mark is `AppNav`'s, to the pixel — 2px of brand
            under the label, hover the same signal thinner and neutral.
            Two bars in one product marking "you are here" two different
            ways is how chrome stops being read at all. What differs is
            only where the answer comes from: a route for the app, the
            scroll position for a page whose links are its own
            sections. */}
        <div className="hidden h-full min-w-0 items-stretch overflow-hidden lg:flex">
          {LINKS.map((l) => {
            /*
             * At most one mark, ever.
             *
             * `/travellers` carries the same section ids the spy watches
             * (`how`, `where`, `pricing`), and it is itself one of these
             * links — so scrolling to Pricing on that page lit both
             * "Pricing" and "For travellers", which is precisely the
             * "two ways of saying you are here" this treatment exists to
             * avoid.
             *
             * The section wins because it is the more specific answer:
             * while you are reading one, "For travellers" tells you only
             * that you are on the page you were already on. Above the
             * first section there is no section to name, so the route
             * link takes the mark back.
             */
            const active = l.href.startsWith("#")
              ? current === l.href.slice(1)
              : pathname === l.href && current === null;
            return (
              <Link
                key={l.href}
                href={l.href}
                // `location` rather than `page` for the fragments: they
                // are places within this page, and a screen reader that
                // announces three "current page" links has been told
                // something false about all but one of them.
                aria-current={
                  active ? (l.href.startsWith("#") ? "location" : "page") : undefined
                }
                className={cn(
                  "nav-label relative flex h-full items-center whitespace-nowrap px-3.5 text-[15px] font-semibold transition-colors",
                  "after:absolute after:inset-x-2 after:bottom-0 after:z-10 after:rounded-full after:transition-colors after:duration-[var(--dur-toggle)] after:ease-[var(--ease-out)]",
                  active
                    ? "text-ink after:h-0.5 after:bg-brand"
                    : "text-ink-2 after:h-px after:bg-transparent hover:text-ink hover:after:bg-border-strong"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SettingsCluster />
          {/* From `sm`, not `xl`. The footer's sign-in doors are the
              agency's and operations', so hiding this one until 1280px
              left a returning traveller on a phone or a tablet with no
              route back to their own account anywhere on the page. */}
          <Button
            asChild
            variant="tertiary"
            size="sm"
            className="hidden sm:inline-flex"
          >
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
