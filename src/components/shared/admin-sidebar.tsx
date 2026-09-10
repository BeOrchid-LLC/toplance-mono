import Link from "next/link";

import { cn } from "@/lib/utils";
import { ADMIN_ICONS } from "@/components/shared/admin-icons";
import type { AdminNavGroup } from "@/components/shared/admin-nav";

/**
 * What is inside the rail.
 *
 * A server component, deliberately. `AppNav` has to be a client component
 * because it reads the pathname to decide what is current; here each page
 * states its own `activeId`, which it knows without asking — so the nav
 * ships no JavaScript and the current row is correct on first paint
 * rather than after hydration.
 *
 * Collapsing is handled entirely in CSS, keyed off `data-collapsed` on
 * the `AdminRail` above (`group/rail`). That is what lets this stay on
 * the server while still responding to a click: the labels are always
 * rendered, and the rail decides whether they are shown. Rendering two
 * versions of the nav and swapping them would ship the same list twice
 * and put the current-row logic in two places.
 */
export function AdminSidebar({
  groups,
  activeId,
  title,
  brand,
  subtitle,
  navLabel,
  footer,
}: {
  groups: AdminNavGroup[];
  activeId: string;
  /** The console's own name. */
  title: string;
  /**
   * A mark printed in place of the name — see `AdminShell.railBrand`.
   * Only the name line is replaced: the subtitle under it says which
   * console this is and at what rank, which a logo never does.
   */
  brand?: React.ReactNode;
  subtitle?: string;
  /**
   * Names the landmark. A console page carries more than one `nav` —
   * this rail and the mobile menu at least — and unlabelled navigation
   * landmarks are indistinguishable to anyone listing them.
   */
  navLabel: string;
  /** The account block. Built by the caller so the rail stays dumb about auth. */
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex h-[var(--bar-h)] shrink-0 items-center border-b border-border px-5 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0">
        {/* Collapsed, the name shrinks to its first letter rather than
            vanishing: the rail is the only thing on screen that says
            which console this is. */}
        <span
          aria-hidden
          className="hidden size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-[15px] font-semibold text-ink group-data-[collapsed]/rail:flex"
        >
          {title.charAt(0)}
        </span>
        <div className="min-w-0 group-data-[collapsed]/rail:hidden">
          {brand ?? <p className="t-title truncate">{title}</p>}
          {subtitle && <p className="special truncate text-ink-3">{subtitle}</p>}
        </div>
      </div>

      {/* The rail scrolls independently of the page. A console that grows
          a tenth destination should not make the account block at the
          bottom unreachable. */}
      <nav
        aria-label={navLabel}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 group-data-[collapsed]/rail:px-2"
      >
        {groups.map((group, gi) => (
          /* The gap between groups is the room a heading sits in, so a
             group with no heading does not take it — it runs on from the
             one above. Three unlabelled groups used to render as three
             rows with 24px of nothing between them, spaced as though
             each were a titled section. `separated` is the opt-out, for
             a group whose whole point is standing apart unnamed. */
          <div
            key={group.label ?? `group-${gi}`}
            className={cn(gi > 0 && (group.label || group.separated) && "mt-6")}
          >
            {group.label && (
              <p className="special-caps px-2.5 pb-2 text-ink-3 group-data-[collapsed]/rail:hidden">
                {group.label}
              </p>
            )}
            {/* Collapsed, the heading becomes a rule. The grouping is
                real information — it survives, in the only form that
                fits. */}
            {group.label && (
              <div
                aria-hidden
                className="mx-2 mb-2 hidden border-t border-border group-data-[collapsed]/rail:block"
              />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.id === activeId;
                const Icon = ADMIN_ICONS[item.icon];
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      // The only label a collapsed rail has. Not a
                      // substitute for the text — it is the same text,
                      // reachable the way an icon-only control has to be.
                      title={item.label}
                      className={cn(
                        "relative flex min-h-[var(--row-h)] items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[15px] transition-colors duration-[var(--dur-tap)]",
                        "group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0",
                        // The 2px brand tick is the margin rail's mark
                        // from guideline §6, reused: the rail already
                        // means "the part you are reading", and this rail
                        // means the same thing about the console.
                        active
                          ? "bg-surface-2 font-semibold text-ink before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-brand"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                      )}
                    >
                      <span className="relative shrink-0">
                        <Icon
                          className={cn(
                            "size-[18px]",
                            active ? "text-brand-text" : "text-ink-3"
                          )}
                          aria-hidden
                        />
                        {/* Collapsed, the count moves onto the icon —
                            otherwise the one thing the rail is kept open
                            for, seeing that six cases have no handler,
                            is the first thing collapsing costs you. */}
                        {item.badge != null && item.badge > 0 && (
                          <span className="num absolute -end-2 -top-1.5 hidden min-w-4 rounded-full bg-brand px-1 text-center text-[11px] font-semibold leading-4 text-on-brand group-data-[collapsed]/rail:block">
                            {item.badge}
                          </span>
                        )}
                      </span>
                      <span className="truncate group-data-[collapsed]/rail:hidden">
                        {item.label}
                      </span>
                      {/* Zero is not shown. "Overdue 0" is a good fact
                          about the queue, but as a badge it reads as a
                          thing to go and clear. */}
                      {item.badge != null && item.badge > 0 && (
                        <span className="num ms-auto shrink-0 text-[13px] font-semibold text-ink-3 group-data-[collapsed]/rail:hidden">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && (
        <div className="border-t border-border p-3 group-data-[collapsed]/rail:px-2">
          {footer}
        </div>
      )}
    </>
  );
}
