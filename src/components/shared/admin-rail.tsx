"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/components/locale-provider";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { RAIL_COOKIE } from "@/components/shared/admin-rail-cookie";

/**
 * Whether the rail is collapsed, shared between the rail and the button
 * in the bar that collapses it.
 *
 * Context rather than lifting the state into `AdminShell`: the shell is a
 * server component (it reads the session and the cookie), and state that
 * changes on a click cannot live there. This is the smallest client
 * island that still lets the toggle sit in the bar, where the reference
 * design puts it, rather than inside the rail it is collapsing.
 */
const RailContext = createContext<{
  collapsed: boolean;
  toggle: () => void;
} | null>(null);

export function RailProvider({
  defaultCollapsed,
  children,
}: {
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);

    // Written here rather than inside the `setCollapsed` updater. An
    // updater has to be pure — React is free to call it more than once,
    // and in StrictMode it does — so a `document.cookie` write in there
    // is a side effect on a code path with no guarantee about when, or
    // how often, it runs.
    //
    // A cookie rather than `localStorage`, because the server has to read
    // it: `AdminShell` renders the rail at its stored width on the very
    // first paint, so a reviewer who collapsed it yesterday never sees it
    // flash open today. `localStorage` is invisible to the server and
    // would guarantee that flash on every navigation.
    //
    // `SameSite=Lax` and no `Secure`: this is a display preference, it is
    // read on same-site navigations only, and marking it `Secure` would
    // silently drop it on a plain-HTTP local dev server.
    document.cookie = `${RAIL_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; SameSite=Lax`;
  }, [collapsed]);

  const value = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);

  return <RailContext.Provider value={value}>{children}</RailContext.Provider>;
}

function useRail() {
  const context = useContext(RailContext);
  if (!context) throw new Error("useRail must be used inside a RailProvider");
  return context;
}

/**
 * The rail's frame.
 *
 * Collapsing narrows it to the width of one icon rather than hiding it.
 * A rail that disappears entirely costs the reviewer the thing they
 * collapsed it for — knowing where they are — and turns every navigation
 * into "open the menu first". At 64px the icons and the current-row tick
 * survive, so the console still says which console it is.
 *
 * The state reaches the rail's contents as `data-collapsed` on this
 * element, so `AdminSidebar` stays a server component and hides its
 * labels with CSS rather than with a second render.
 */
export function AdminRail({ children }: { children: React.ReactNode }) {
  const { collapsed } = useRail();

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "group/rail sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-surface lg:flex",
        // Width is the only thing that animates, and it uses the toggle
        // duration the rest of the product uses for a state change.
        "transition-[width] duration-[var(--dur-toggle)] ease-[var(--ease-out)]",
        collapsed ? "w-16" : "w-[248px]"
      )}
    >
      {children}
    </aside>
  );
}

/** The control that collapses it, for the bar. */
export function RailToggle() {
  const t = useT();
  const { collapsed, toggle } = useRail();

  return (
    <button
      type="button"
      onClick={toggle}
      // The button is always "collapse or expand the menu", so the label
      // says which one this press will do rather than naming the region.
      aria-label={t(collapsed ? ADMIN_CONSOLE.expandMenu : ADMIN_CONSOLE.collapseMenu)}
      aria-expanded={!collapsed}
      className="hidden size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface text-ink-2 transition-colors hover:text-ink lg:inline-flex"
    >
      <PanelLeft className="size-[18px]" aria-hidden />
    </button>
  );
}
