"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; locked?: boolean };

/**
 * `active` used to be a prop, and every caller passed the empty string —
 * so the current route was never marked, on any screen, in either
 * layout. Reading the pathname here is the only way the answer cannot
 * drift from the truth, and it is the one thing on this bar that needs
 * the client.
 *
 * The first item is the section root (`/app`, `/employer`, `/ops`), so
 * it matches exactly. Everything else also matches its children, which
 * is what keeps `Documents` lit on a document's own page.
 */
export function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  nav,
  className,
  itemClassName,
}: {
  nav: NavItem[];
  className?: string;
  itemClassName?: string;
}) {
  const pathname = usePathname();
  const root = nav[0]?.href ?? "/app";

  return (
    <nav className={className}>
      {nav.map((item) => {
        const active = isActive(pathname, item.href, root);
        return (
          <Link
            key={item.href}
            href={item.locked ? "#" : item.href}
            aria-disabled={item.locked}
            // `pointer-events-none` below only stops a mouse. Without
            // this the locked item stays in the tab order, and Enter
            // still follows `href="#"` — jumping a keyboard user to the
            // top of the page with no explanation. `aria-disabled`
            // announces the state; this one enforces it.
            tabIndex={item.locked ? -1 : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-[var(--radius-pill)] px-4 text-base font-medium transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--brand)_11%,transparent)] font-semibold text-brand-text"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              item.locked && "pointer-events-none text-ink-3",
              itemClassName
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
