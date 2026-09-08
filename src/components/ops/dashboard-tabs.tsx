"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * The dashboard's four sections.
 *
 * A client component wrapping server-rendered children: every panel is
 * built on the server in the page's single data pass and handed here as
 * a node, so switching tabs is a visibility change rather than a
 * fetch. The dashboard is one query pass either way, and a tab that
 * spins before it shows a number nobody is waiting on would be worse
 * than one that is already there.
 *
 * Overview is first and is the default, because it is the only tab a
 * director opening this screen for ten seconds needs.
 */

export type DashboardTab = {
  value: string;
  label: string;
  panel: React.ReactNode;
};

export function DashboardTabs({ tabs }: { tabs: DashboardTab[] }) {
  return (
    /* `mt-8` for the same reason `CounterRow` carries one: `AdminShell`
       stacks a page's blocks with no gap of its own, so each block owns
       the space above it. Without it the tab strip sat flush against the
       counter row's bottom edge — two separate things reading as one
       control. `gap-8` is the space *inside*, between the strip and the
       panel it switches. */
    <Tabs defaultValue={tabs[0].value} className="mt-8 gap-8">
      {/* Its own scroller: four labels fit a laptop and do not fit a
          phone, and the page body must never scroll sideways. */}
      <div className="-mx-1 overflow-x-auto px-1">
        {/* Bordered because this strip sits on the page ground rather
            than on a panel, and --bg moved close enough to --surface-2
            that the fill alone no longer frames it. See the neutrals
            note in globals.css. */}
        <TabsList className="w-max border border-border">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-8">
          {tab.panel}
        </TabsContent>
      ))}
    </Tabs>
  );
}
