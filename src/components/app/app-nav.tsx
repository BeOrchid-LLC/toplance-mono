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
              // Full bar height, so the mark below lands on the bar's own
              // bottom edge rather than on the bottom of a pill floating
              // inside it. That is the whole idea: the current page marks
              // the laminate hairline the bar closes on.
              "nav-label relative flex h-full shrink-0 items-center px-3.5 text-[15px] font-semibold transition-colors",
              // `z-10` because `.bar-edge::after` is a pseudo-element of
              // the header and therefore paints after its children in DOM
              // order — at auto z-index the 1px edge would draw over the
              // 2px mark. Colour is the only thing that animates; the
              // mark holds its box whether lit or not, so nothing reflows
              // and nothing grows on hover.
              "after:absolute after:inset-x-2 after:bottom-0 after:z-10 after:rounded-full after:transition-colors after:duration-[var(--dur-toggle)] after:ease-[var(--ease-out)]",
              active
                ? // Text goes to full --ink rather than brand. Brand-coloured
                  // labels plus a brand-tinted pill said the same thing
                  // twice; the mark says it once, and the weight of the
                  // ink is what makes the word itself feel current.
                  "text-ink after:h-0.5 after:bg-brand"
                : // Hover is the same signal at lower intensity — thinner,
                  // neutral — so it reads as a preview of becoming active.
                  // It used to be a `bg-surface-2` pill, a second shape at
                  // nearly the lightness of the active one, which is why
                  // hovering an inactive item looked so much like arriving
                  // at it.
                  "text-ink-2 after:h-px after:bg-transparent hover:text-ink hover:after:bg-border-strong",
              item.locked &&
                "pointer-events-none text-ink-3 hover:after:bg-transparent",
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
