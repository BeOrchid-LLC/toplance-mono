import {
  Building2,
  CalendarClock,
  ChartColumn,
  CreditCard,
  LayoutDashboard,
  Route,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The side rail's icons, addressed by name.
 *
 * A rail group travels from a server component into `AdminMobileNav`,
 * which is a client component, and React cannot serialise a function
 * across that boundary — passing the icon itself fails with "Functions
 * cannot be passed directly to Client Components". So `AdminNavItem`
 * carries a key from this table and both sides look it up.
 *
 * One entry per console destination that exists. Adding a key here
 * without a route to hang it on is how a sidebar grows a dead link.
 */
export const ADMIN_ICONS = {
  // Platform console — `/ops`.
  routes: Route,
  agencies: Building2,
  // A demo enquiry is a requested meeting slot — the row leads to a
  // queue of times somebody asked for, not to a list of companies.
  enquiries: CalendarClock,
  colleagues: ShieldCheck,
  // Bars rather than the agency console's `overview` panel: this row
  // leads to revenue and a chart, not to a summary of your own work.
  business: ChartColumn,
  // Agency console — `/agency`.
  overview: LayoutDashboard,
  clients: UserRoundCheck,
  team: UsersRound,
  billing: CreditCard,
} satisfies Record<string, LucideIcon>;

export type AdminIconName = keyof typeof ADMIN_ICONS;
