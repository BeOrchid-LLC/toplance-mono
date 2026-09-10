import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The first thing in the tab order, and invisible until it has focus.
 *
 * Without it a keyboard or screen-reader user tabs the whole rail — a
 * dozen destinations and an account menu — on every navigation, before
 * reaching the page they asked for.
 *
 * `sr-only` rather than an off-screen transform: the link has to be
 * reachable, announced and then visible on focus, and `focus:not-sr-only`
 * is the one pattern that does all three without a magic offset.
 *
 * `focus:` rather than `focus-visible:`, unlike everything else in the
 * product. A skip link is reached by Tab and by nothing else, so the two
 * are the same set here — and a link that stayed invisible when it held
 * focus would be worse than no link at all.
 *
 * `start-4`, not `left-4`: this renders on `/ar` too, where the tab
 * order runs the other way and a link pinned left would appear at the
 * end of the row it is supposed to open.
 */
export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-[var(--shadow)] focus:outline-2 focus:outline-ring"
    >
      {ADMIN_CONSOLE.skipToContent[locale]}
    </a>
  );
}
