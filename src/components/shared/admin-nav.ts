import type { AdminIconName } from "@/components/shared/admin-icons";
import { AGENCY } from "@/lib/i18n/agency";
import { BILLING } from "@/lib/i18n/billing";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The two operator consoles' side navigation.
 *
 * The client asked on 2026-09-07 for these screens to work like admin
 * panels: the destinations down the side rather than along the top. One
 * row of pills is the right chrome for a traveller walking a journey of
 * four steps and the wrong one for staff working a queue all day.
 *
 * This does not decide *what* the consoles contain — `opsNav` and
 * `agencyNav` already answer that, and their tests pin it. It reads the
 * same destinations and adds what a rail needs and a top bar does not:
 * grouping, an icon per row, and a badge where a live figure changes
 * what somebody does next. The guards are theirs too, and are repeated
 * here rather than reinvented: an owner-only row, a director-only row,
 * and nothing at all before an organisation has been named.
 *
 * Every href is a destination that actually renders. A sidebar is the
 * one place a dead link stays invisible until somebody clicks it
 * (guideline §7 — nothing on screen implies a capability that is not
 * there). In particular there is no case queue here: the v1.3 tenancy
 * moved review into the agency and deleted `/ops`'s queue, because that
 * screen read documents without passing through
 * `requireApplicationAccess`. A rail row pointing back at it would be
 * rebuilding the hole.
 */
export type AdminNavItem = {
  /** Stable identity, so a page can say which row it is without URL parsing. */
  id: string;
  href: string;
  label: string;
  /**
   * Looked up in `ADMIN_ICONS`. A name, not the component — the group
   * list is passed from a server component into the client mobile nav,
   * and React cannot serialise a function across that boundary.
   */
  icon: AdminIconName;
  /**
   * A live figure shown at the end of the row. Only for counts that
   * change what somebody does next — a badge on every row is decoration
   * and stops being read.
   */
  badge?: number;
};

export type AdminNavGroup = {
  /** Omitted for the first group, which needs no heading above the first row. */
  label?: string;
  items: AdminNavItem[];
};

/**
 * The platform console.
 *
 * Two groups because BeOrchid's staff do two different jobs here:
 * curating the reference data every case is judged against, and running
 * the platform itself. Only the first carries a badge — a route waiting
 * on a decision is work; a count of agencies is a fact nobody acts on.
 */
export function opsAdminNav({
  locale,
  pendingRoutes,
  openDemoRequests,
  isOwner = false,
}: {
  locale: Locale;
  /** Corridors sitting in `pending`, which is a reviewer's to-do list. */
  pendingRoutes: number;
  /**
   * Demo enquiries still open — the same set `/ops/tenants` counts for
   * its "Open enquiries" card, so the badge and the card agree. The
   * badge hangs on the enquiries row, which is where acting on that
   * number happens.
   */
  openDemoRequests: number;
  /**
   * Drops the colleagues and dashboard rows for a reviewer. Not the
   * guard — both pages turn them away themselves, because a hidden link
   * is a courtesy and a typed URL is not an exception.
   */
  isOwner?: boolean;
}): AdminNavGroup[] {
  return [
    {
      items: [
        {
          id: "routes",
          href: "/ops/corridors",
          label: OPS_COMMON.nav.routes[locale],
          icon: "routes",
          badge: pendingRoutes,
        },
      ],
    },
    {
      label: OPS_COMMON.subtitlePrefix[locale],
      items: [
        {
          // No badge. A count of agencies is a fact nobody acts on, and
          // the enquiry count that used to sit here has gone to the row
          // that actually leads to the work.
          id: "agencies",
          href: "/ops/tenants",
          label: OPS_COMMON.nav.tenants[locale],
          icon: "agencies",
        },
        {
          id: "enquiries",
          href: "/ops/enquiries",
          label: OPS_COMMON.nav.enquiries[locale],
          icon: "enquiries",
          badge: openDemoRequests,
        },
        ...(isOwner
          ? [
              {
                id: "colleagues",
                href: "/ops/staff",
                label: OPS_COMMON.nav.staff[locale],
                icon: "colleagues" as const,
              },
              {
                // No badge. Every figure on this screen is one a director
                // goes and reads; none of them is a queue that shortens
                // because somebody acted on it.
                id: "business",
                href: "/ops/dashboard",
                label: OPS_COMMON.nav.dashboard[locale],
                icon: "business" as const,
              },
            ]
          : []),
      ],
    },
  ];
}

/**
 * The agency console.
 *
 * "Clients", not "people" — an agency's travellers are its clients, and
 * the console is read by somebody who says it that way.
 *
 * A director who has signed up but not yet named an organisation gets
 * the dashboard alone, for the reason `agencyNav` gives: they have no
 * roster and no colleagues, so the other rows would be round trips back
 * to the screen they are already on.
 */
export function agencyAdminNav({
  locale,
  hasOrganisation,
  clients,
  pendingInvitations,
  isDirector = false,
}: {
  locale: Locale;
  hasOrganisation: boolean;
  clients: number;
  /** Invitations still outstanding — somebody is waiting on each one. */
  pendingInvitations: number;
  /**
   * The team roster and the plan are the director's: who works here and
   * what the agency pays are questions about running it, not about
   * handling a case. Both pages turn a reviewer away themselves.
   */
  isDirector?: boolean;
}): AdminNavGroup[] {
  const dashboard: AdminNavItem = {
    id: "overview",
    href: "/agency",
    label: AGENCY.navDashboard[locale],
    icon: "overview",
  };

  if (!hasOrganisation) return [{ items: [dashboard] }];

  return [
    {
      items: [
        dashboard,
        {
          id: "clients",
          href: "/agency/clients",
          label: AGENCY.navClients[locale],
          icon: "clients",
          badge: clients,
        },
      ],
    },
    ...(isDirector
      ? [
          {
            label: AGENCY.navTeam[locale],
            items: [
              {
                id: "team",
                href: "/agency/team",
                label: AGENCY.navTeam[locale],
                icon: "team" as const,
                badge: pendingInvitations,
              },
              {
                id: "billing",
                href: "/agency/billing",
                label: BILLING.navBilling[locale],
                icon: "billing" as const,
              },
            ],
          },
        ]
      : []),
  ];
}
