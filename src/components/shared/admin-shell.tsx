import { cookies } from "next/headers";

import { cn } from "@/lib/utils";

import { AccountMenu } from "@/components/app/account-menu";
import { AdminMobileNav } from "@/components/shared/admin-mobile-nav";
import { AdminRail, RailProvider, RailToggle } from "@/components/shared/admin-rail";
import { RAIL_COOKIE } from "@/components/shared/admin-rail-cookie";
import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { SkipLink } from "@/components/shared/skip-link";
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
  railBrand,
  railSubtitle,
  account,
  title,
  lead,
  actions,
  titleActions,
  centred = false,
  children,
}: {
  groups: AdminNavGroup[];
  activeId: string;
  railTitle: string;
  /**
   * A mark to print at the head of the rail in place of `railTitle`'s
   * text — the Toplance wordmark in `/ops`, an agency's own uploaded
   * logo in `/agency`.
   *
   * `railTitle` is still required alongside it, and still does two jobs a
   * picture cannot: it is the letter the rail shows when it is collapsed
   * to 56px, and it is the fallback when an agency has uploaded nothing.
   * A console whose identity vanished at the width somebody works at all
   * day would be worse than one that never had a logo.
   */
  railBrand?: React.ReactNode;
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
  /**
   * Console chrome that happens to sit in the bar — the notifications
   * bell, and anything else true of the whole console rather than of
   * this page.
   *
   * A page's *own* primary action belongs in `titleActions` instead, on
   * the row with the heading it acts on. The comment on the bar below
   * says why, and this slot predates it.
   */
  actions?: React.ReactNode;
  /**
   * This page's own primary action — an invite button, an export — on
   * the row with the `title` it belongs to.
   *
   * Rendered beside the `h1` rather than up in the bar, so the control
   * sits next to the thing it acts on: "Invite" is about the roster on
   * this screen, and in the bar it read as console furniture alongside
   * the theme toggle and the bell. Requires a `title` to sit beside; a
   * detail screen that omits one has no such row, and its controls go
   * in its own header sheet.
   */
  titleActions?: React.ReactNode;
  /**
   * Centres this page on a reading measure instead of letting it start
   * at the left padding.
   *
   * Off by default, and the comment above this component says why: a
   * table wants every pixel the rail leaves it, and a measure that
   * narrows when the rail opens is the wrong shape for one. A sheet of
   * a person's own details is the opposite case — it is a document, it
   * is ~720px wide whatever the viewport does, and left-aligning it
   * strands it against one edge of a very wide screen. Pages opt in;
   * the console's default stays wide.
   */
  centred?: boolean;
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
        <SkipLink locale={locale} />
        <AdminRail>
          <AdminSidebar
            groups={groups}
            activeId={activeId}
            title={railTitle}
            brand={railBrand}
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
              then has to re-state it on every route.

              `actions` used to be the one thing here that broke that rule:
              an invite button or an export is about the page, not the
              console, and beside the theme toggle and the bell it read as
              furniture. `titleActions` is where those go now — on the row
              with the heading they act on. What is left in this slot is
              the bell and anything else genuinely console-wide. */}
          <header className="sticky top-0 z-30 flex h-[var(--bar-h)] shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
            <RailToggle />
            <AdminMobileNav groups={groups} activeId={activeId} />
            {/* No search slot. A table's search and filters belong in
                that table's own panel header, beside the columns they
                act on — putting them here contradicted the rule this
                comment states, and grouped them with the account menu
                and the bell as though they were console chrome. */}
            <div className="min-w-0 flex-1" />
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

          <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-6">
            {/* One wrapper over the heading and the page, so a centred
                page keeps its title on the same vertical as its panel.
                Centring the children alone would leave the h1 at the
                left padding, describing a sheet sitting somewhere else. */}
            <div className={cn("min-w-0", centred && "mx-auto w-full max-w-[720px]")}>
              {title && (
                <div className="mb-8 min-w-0">
                  {/* The heading and this page's own control on one row.
                      `me-auto` on the heading rather than `justify-between`
                      on the row, so a title that wraps keeps the button
                      pinned to the end instead of the pair drifting apart
                      — the same reason the privacy summary on `/agency`
                      does it that way. Logical, so Arabic puts the button
                      at the left end without a second rule.

                      `items-center`: the button lines up with the heading,
                      not with the top of a block whose height depends on
                      whether there is a `lead` under it. The lead stays
                      below at full width, where a sentence belongs. */}
                  <div className="flex items-center gap-4">
                    <h1 className="t-h2 me-auto min-w-0 text-balance">{title}</h1>
                    {titleActions && <div className="shrink-0">{titleActions}</div>}
                  </div>
                  {/* No reading measure on the lead.
                      62ch is the right cap for prose somebody settles
                      into, and the wrong one for the single sentence
                      under a page title: capped, it wrapped into a
                      narrow column and pushed the table below the fold
                      on a wide screen, which is what the client saw on
                      8 September. A page lead is scanned once, so it
                      takes the width the page has. The measure stays on
                      empty states and body copy, where it earns its
                      keep. */}
                  {lead && <p className="t-muted mt-2 text-pretty">{lead}</p>}
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </RailProvider>
  );
}
