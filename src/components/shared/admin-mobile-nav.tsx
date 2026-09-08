"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useT } from "@/components/locale-provider";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { ADMIN_ICONS } from "@/components/shared/admin-icons";
import type { AdminNavGroup } from "@/components/shared/admin-nav";

/**
 * The rail's destinations below `lg`, where there is no room for a rail.
 *
 * A menu rather than a drawer, matching `AppNavMenu` on the traveller
 * side — the console has a handful of destinations, and a full-height
 * sheet for six rows is more chrome than the thing it contains. Same
 * reasoning as the traveller bar's hamburger: a scrolling strip under
 * the bar costs a row of phone height and hides how many items there are.
 */
export function AdminMobileNav({
  groups,
  activeId,
}: {
  groups: AdminNavGroup[];
  activeId: string;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t(ADMIN_CONSOLE.menuTitle)}
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface text-ink-2 transition-colors hover:text-ink lg:hidden"
      >
        <Menu className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[248px]">
        {groups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`}>
            {gi > 0 && <DropdownMenuSeparator />}
            {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
            {group.items.map((item) => {
              const active = item.id === activeId;
              const Icon = ADMIN_ICONS[item.icon];
              return (
                <DropdownMenuItem key={item.id} asChild>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("gap-2.5", active && "font-semibold text-ink")}
                  >
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0",
                        active ? "text-brand-text" : "text-ink-3"
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="num ms-auto text-[13px] font-semibold text-ink-3">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
