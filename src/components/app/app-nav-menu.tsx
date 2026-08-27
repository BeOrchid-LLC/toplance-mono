"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isActive, type NavItem } from "@/components/app/app-nav";

/**
 * The nav below `lg`, where the bar hides `AppNav`. A hamburger rather
 * than the old scrolling rail: the rail spent a full row of a phone's
 * height on items that were mostly off-screen anyway, and hid how many
 * there were. The menu names them all at once and gives the row back.
 */
export function AppNavMenu({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const root = nav[0]?.href ?? "/app";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Navigation menu"
        className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
      >
        <Menu className="size-5" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[220px]">
        {nav.map((item) => {
          const active = isActive(pathname, item.href, root);
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.locked ? "#" : item.href}
                aria-disabled={item.locked}
                aria-current={active ? "page" : undefined}
                className={cn(
                  active &&
                    "bg-[color-mix(in_srgb,var(--brand)_11%,transparent)] font-semibold text-brand-text",
                  item.locked && "pointer-events-none text-ink-3",
                )}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
