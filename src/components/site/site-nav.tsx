"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SettingsCluster } from "@/components/shared/settings-cluster";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Shell } from "@/components/shared/shell";
import { Wordmark } from "@/components/shared/wordmark";
import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";

const TRAVELERS = "/travelers";

/**
 * The bar addresses whichever of the two landing pages it is sitting on.
 *
 * It used to be one static list for both, which made three of its four
 * entries wrong on one page or the other. `#where` is "Where we work" on
 * the traveller page and "Where your travelers can go" on the agency
 * one. The cross-link was hardcoded to `/travelers`, so on the
 * traveller page the bar carried a link to the page you were already
 * reading — the scroll spy even had a special case apologising for it.
 * And the call to action said "For organisations" on the organisations'
 * own page.
 *
 * Fragments rather than `/#how`, because both pages carry the same
 * section ids: a link that jumped you to the other page's version of the
 * section you are reading is a worse answer than scrolling.
 *
 * `#where`'s agency label is "Where you can go" rather than the section's
 * full "Where your travelers can go". The strip is `overflow-hidden` and
 * clips a label that long between `lg` and roughly 1140px, and a nav
 * entry is a signpost rather than a heading.
 */
function chromeFor(pathname: string) {
  const traveller = pathname === TRAVELERS;

  return {
    sections: [
      { href: "#how", label: "How it works" },
      { href: "#where", label: traveller ? "Where we work" : "Where you can go" },
      { href: "#pricing", label: "Pricing" },
    ],
    cross: traveller
      ? { href: "/", label: "For agencies" }
      : { href: TRAVELERS, label: "For travelers" },
  };
}

/** In document order, which is what makes the spy's rule below correct. */
const SECTION_IDS = ["how", "where", "pricing"];

export function SiteNav() {
  const t = useT();
  const pathname = usePathname();
  const { sections, cross } = chromeFor(pathname);

  /**
   * The hero is a light ground now, so the bar no longer has to invert
   * itself over a dark field — it only has to stop floating once the page
   * moves under it. At the top it is invisible; after that it is the
   * surface it always was, with a rule to sit on.
   *
   * The rule is `bar-edge`, the same optically-variable laminate
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
   *
   * Only the three in-page anchors are watched. The cross-link is a
   * route now and lives in the other group, so the old "at most one
   * mark, ever" reconciliation between a route link and a section is
   * gone with the ambiguity that forced it.
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
        {/* The label survives to 380px now. It used to go at `md`, which
            left the smallest screens showing a 190px call to action
            beside a bare 24px pin — the brand smaller than the button
            asking you to buy from it. */}
        <Wordmark className="[&_.wordmark-label]:max-[379px]:hidden" />

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
          {sections.map((l) => {
            const active = current === l.href.slice(1);
            return (
              <Link
                key={l.href}
                href={l.href}
                // `location` rather than `page`: these are places within
                // this page, and a screen reader that announces three
                // "current page" links has been told something false
                // about all but one of them.
                aria-current={active ? "location" : undefined}
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

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          {/* The cross-link sits with the account doors rather than among
              the section anchors. It is the only entry that leaves the
              page, and grouping it with three fragments is what made the
              scroll spy ambiguous in the first place. */}
          <Button asChild variant="tertiary" size="sm" className="hidden lg:inline-flex">
            <Link href={cross.href}>{cross.label}</Link>
          </Button>

          {/* Appearance and language are one-time preferences. They keep
              their desktop spot and drop out of the bar below `lg`,
              where they used to be the controls that survived while the
              navigation itself did not — they are named rows in the menu
              instead. */}
          <SettingsCluster className="hidden lg:inline-flex" />

          <Button asChild variant="tertiary" size="sm" className="hidden lg:inline-flex">
            <Link href="/sign-in">{t(HERO.signIn)}</Link>
          </Button>

          {/* "Get started", not an audience name. The audience swap is
              the cross-link above, and this slot is the bar's one
              primary act — a button that named an audience read as a
              second navigation entry and left the page with no call to
              action at all. Both landing pages sell the same seat, so
              both send here. */}
          <Button asChild size="sm">
            <Link href="/employer/sign-up">{t(HERO.ctaShort)}</Link>
          </Button>

          {/* The menu, and the reason this file was reopened: below `lg`
              the bar carried no navigation at all — no links, no
              trigger, nothing. Every section of both landing pages was
              unreachable from the chrome on a phone or a tablet, on a
              product whose own components note that this page is mostly
              read on a mid-range Android. */}
          {/* Uncontrolled: every row inside is a `DialogClose`, so the
              sheet already shuts on the click that navigates. Mirroring
              that into React state would only add a second source of
              truth for something Radix already gets right. */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="neutral"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu />
              </Button>
            </DialogTrigger>

            {/* A sheet hanging off the bar rather than the centred card
                `DialogContent` defaults to: it is the bar's own content
                unfolding, so it belongs against the bar. Radix still
                gives the focus trap, the escape key, the scroll lock and
                the `aria-modal` wiring, none of which is worth
                hand-rolling for a menu.

                `pt-16` buys a strip for `DialogContent`'s own close
                button, which sits at `top-4 right-4`. It would otherwise
                land on the first link row.

                The close button has to be here, and an earlier pass that
                hid it in favour of "tap the hamburger again" was wrong:
                Radix puts `pointer-events: none` on the body while a
                modal is open, so the trigger is not clickable no matter
                what its `z-index` says, and it is `aria-hidden` besides.
                Without this button the only ways out were Escape and an
                overlay tap — and a hamburger that visibly does nothing
                when you tap it to dismiss is the worst of the three. */}
            <DialogContent
              className={cn(
                "left-0 top-[var(--bar-h)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-b-lg border-x-0 border-t-0 p-0 pb-2 pt-16",
                "data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
                "data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
              )}
            >
              <DialogTitle className="sr-only">Menu</DialogTitle>

              <div className="px-6 pb-4">
                {sections.map((l) => (
                  <DialogClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="flex min-h-[var(--control-h)] items-center border-b border-border text-[17px] font-semibold text-ink"
                    >
                      {l.label}
                    </Link>
                  </DialogClose>
                ))}
                <DialogClose asChild>
                  <Link
                    href={cross.href}
                    className="flex min-h-[var(--control-h)] items-center border-b border-border text-[17px] font-semibold text-brand-text"
                  >
                    {cross.label}
                  </Link>
                </DialogClose>
                <DialogClose asChild>
                  <Link
                    href="/sign-in"
                    className="flex min-h-[var(--control-h)] items-center text-[17px] font-semibold text-ink"
                  >
                    {t(HERO.signIn)}
                  </Link>
                </DialogClose>

                {/* Named rows, not the icon cluster. A setting you have
                    to recognise from a glyph is worse than one with a
                    word on it, which is the same call `AccountMenu`
                    makes on the product bar below `md`. */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="tag">Appearance</span>
                  <ThemeSwitch />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="tag">Language</span>
                  <LocaleMenu />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Shell>
    </nav>
  );
}
