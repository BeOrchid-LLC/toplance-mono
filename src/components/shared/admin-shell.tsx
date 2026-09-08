import { cookies } from "next/headers";

import { AccountMenu } from "@/components/app/account-menu";
import { AdminMobileNav } from "@/components/shared/admin-mobile-nav";
import { AdminRail, RailProvider, RailToggle } from "@/components/shared/admin-rail";
import { RAIL_COOKIE } from "@/components/shared/admin-rail-cookie";
import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { getLocale } from "@/lib/i18n/server";
import { SettingsCluster } from "@/components/shared/settings-cluster";
import type { AdminNavGroup } from "@/components/shared/admin-nav";

/**
 * The operator consoles' frame: a rail, a working bar, and a page.
 *
 * Replaces `AppBar` on `/ops` and `/employer` only. The traveller
 * surfaces keep the bar, and that split is the point — guideline §1 says
 * this product looks like documents rather than a dashboard, which is
 * true of the screens a traveller reads and false of the screen a
 * reviewer works eight hours a day. Documents stay documents; the two
 * consoles become consoles. Client's call, 2026-09-07.
 *
 * Content is *not* wrapped in `Shell`. `Shell` centres a 1240px measure
 * in the viewport, which is right for a page somebody reads and wrong
 * for a table somebody scans: with a rail beside it the measure no
 * longer sits under the heading, and the table gets narrower the moment
 * the rail appears. The bar and the page share one padding instead, so
 * every column starts on the same vertical as the title above it.
 */
export async function AdminShell({
  groups,
  activeId,
  railTitle,
  railSubtitle,
  account,
  title,
  lead,
  actions,
  search,
  children,
}: {
  groups: AdminNavGroup[];
  activeId: string;
  railTitle: string;
  railSubtitle?: string;
  /**
   * Who is signed in. The shell takes the facts rather than rendered
   * chrome because it has to put the control in two places: at the foot
   * of the rail on a wide screen, and in the bar below `lg`, where the
   * rail is `hidden` and an account block living only inside it would
   * take sign-out, the theme and the locale off the screen with it —
   * `AccountMenu` is where all three live below `md`.
   */
  account: {
    name: string;
    email: string;
    subtitle?: string;
    avatarUrl?: string | null;
    profileHref?: string;
  };
  /**
   * Omitted by a detail screen that opens with a header sheet of its own
   * — a case file names the person at the top of the sheet, and a second
   * `h1` in the chrome above it would say the same name twice.
   */
  title?: string;
  lead?: string;
  /** Primary actions for this page — an invite button, an export. */
  actions?: React.ReactNode;
  /** The filter row, when the page has a table worth filtering. */
  search?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Read on the server so the rail is already at its stored width in the
  // first paint. Deciding this on the client would render the rail open
  // on every navigation and snap it shut after hydration.
  const collapsed = (await cookies()).get(RAIL_COOKIE)?.value === "collapsed";
  const locale = await getLocale();

  return (
    <RailProvider defaultCollapsed={collapsed}>
      <div className="flex min-h-dvh bg-bg">
        <AdminRail>
          <AdminSidebar
            groups={groups}
            activeId={activeId}
            title={railTitle}
            subtitle={railSubtitle}
            navLabel={ADMIN_CONSOLE.menuTitle[locale]}
            footer={
              <div className="flex items-center gap-3 px-1.5 py-1 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0">
                <AccountMenu {...account} />
                <div className="min-w-0 group-data-[collapsed]/rail:hidden">
                  <p className="t-title truncate">{account.name}</p>
                  <p className="special truncate text-ink-3">{account.email}</p>
                </div>
              </div>
            }
          />
        </AdminRail>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* The bar carries what is true of the whole console — who you
              are, what is new, how it looks — and nothing about the page
              below it. The page's own title sits in the page, where a
              heading belongs, rather than being pulled up into chrome that
              then has to re-state it on every route. */}
          <header className="sticky top-0 z-30 flex h-[var(--bar-h)] shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
            <RailToggle />
            <AdminMobileNav groups={groups} activeId={activeId} />
            <div className="min-w-0 flex-1">{search}</div>
            <SettingsCluster className="max-md:hidden" />
            {actions}
            {/* The same control the rail foot carries, for the widths
                where there is no rail. Below `md` this is also the only
                way to the theme and the locale, which `SettingsCluster`
                drops at that width and `AccountMenu` picks up. */}
            <div className="lg:hidden">
              <AccountMenu {...account} />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">
            {title && (
              <div className="mb-8 min-w-0">
                <h1 className="t-h2">{title}</h1>
                {lead && <p className="t-muted mt-2 max-w-[62ch]">{lead}</p>}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </RailProvider>
  );
}
