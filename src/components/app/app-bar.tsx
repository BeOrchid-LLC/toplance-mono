import { LocaleMenu } from "@/components/shared/locale-menu";
import { Shell } from "@/components/shared/shell";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { AccountMenu } from "@/components/app/account-menu";
import { AppNav, type NavItem } from "@/components/app/app-nav";
import { AppNavMenu } from "@/components/app/app-nav-menu";

export type { NavItem };

/**
 * The product chrome. A hairline rule and a plain surface, matching
 * `site-nav` — a signed-in screen is the same product as the page that
 * argued for it, and a second bar treatment is the fastest way to make
 * it look like a different one.
 *
 * The active item is a soft brand-tinted pill. The tint mixes toward
 * transparent, so it sits on the same surface as the bar rather than
 * punching an opaque shape through it — the bar's own colours are
 * unchanged.
 */
export function AppBar({
  nav,
  name,
  email,
  subtitle,
  avatarUrl,
  profileHref,
  notifications,
}: {
  nav: NavItem[];
  name: string;
  email: string;
  subtitle?: string;
  /** A short-lived signed link to the profile photo, when one exists. */
  avatarUrl?: string | null;
  profileHref?: string;
  /** The bell, built by the caller — AppBar stays dumb about what it is. */
  notifications?: React.ReactNode;
}) {
  return (
    // The bar spans the viewport; what is *in* it does not. Background
    // and bottom rule stay full-bleed — a sticky bar that stops short of
    // the edges reads as a floating card — while the row inside sits in
    // the same `Shell` every page's content sits in, so the wordmark
    // starts on the same vertical as the heading below it. It used to be
    // `px-4 sm:px-6` on the header itself, which put the avatar hard
    // against the right edge of a wide monitor with the content it
    // belongs to centred a couple of hundred pixels away.
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <Shell className="flex h-[var(--bar-h)] items-center gap-6">
        <div className="flex min-w-0 items-center gap-3 lg:gap-6">
          {/* Below `lg` the bar hides its nav, and the items move into a
              hamburger — a scrolling rail used to sit under the bar
              instead, but it cost a row of phone height and hid how many
              items there were. */}
          {nav.length > 1 && (
            <span className="lg:hidden">
              <AppNavMenu nav={nav} />
            </span>
          )}
          <Wordmark href={nav[0]?.href ?? "/app"} />
          <AppNav nav={nav} className="hidden items-center gap-1 lg:flex" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {notifications}
          <span className="hidden md:inline-flex">
            <ThemeSwitch />
          </span>
          <span className="hidden md:inline-flex">
            <LocaleMenu />
          </span>
          <AccountMenu
            name={name}
            email={email}
            subtitle={subtitle}
            avatarUrl={avatarUrl}
            profileHref={profileHref}
          />
        </div>
      </Shell>
    </header>
  );
}
