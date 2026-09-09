import type { AdminIconName } from "@/components/shared/admin-icons";
import { AGENCY } from "@/lib/i18n/agency";
import { AGENCY_RULE_SETS } from "@/lib/i18n/agency-rule-sets";
import { BILLING } from "@/lib/i18n/billing";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
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
 * running the platform itself, and curating the reference data every
 * case is judged against. Only the second carries a badge — a route
 * waiting on a decision is work; a count of agencies is a fact nobody
 * acts on.
 *
 * Route curation sits below "Toplance operations" rather than above it,
 * at the client's request on 2026-09-08 and for the reason the reorder
 * of `opsNav` gives: the console opens on the business, and the
 * reference data is the screen somebody goes down to. It keeps a group
 * of its own — folding it into the operations rows would file corridor
 * curation under running the platform, which is the one thing on this
 * rail that is not.
 */
export function opsAdminNav({
  locale,
  pendingRoutes,
  openDemoRequests,
  openSupport,
  agenciesAwaitingKyb,
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
  /** Support requests nobody has claimed — see `OpsCounts`. */
  openSupport: number;
  /** Agencies with no `activated_at` — the KYB queue's own to-do list. */
  agenciesAwaitingKyb: number;
  /**
   * Drops the colleagues and dashboard rows for a reviewer. Not the
   * guard — both pages turn them away themselves, because a hidden link
   * is a courtesy and a typed URL is not an exception.
   */
  isOwner?: boolean;
}): AdminNavGroup[] {
  return [
    {
      label: OPS_COMMON.subtitlePrefix[locale],
      items: [
        /* First, at the client's request on 8 September — and it took
           two goes. `opsNav` below already listed the dashboard first,
           which is what made this look done; the rail is a separate
           list and is the one that renders, and here the dashboard sat
           sixth. Still owner-gated: a reviewer's rail opens on
           Agencies, because the dashboard is not theirs to see. */
        ...(isOwner
          ? [
              {
                // No badge. Every figure on this screen is one a director
                // goes and reads; none of them is a queue that shortens
                // because somebody acted on it.
                id: "business" as const,
                href: "/ops/dashboard",
                label: OPS_COMMON.nav.dashboard[locale],
                icon: "business" as const,
              },
            ]
          : []),
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
          // Badged with the agencies BeOrchid has not let in yet: the
          // one number on this rail that shortens because somebody did
          // the work behind it, which is what a badge is for.
          id: "kyb",
          href: "/ops/kyb",
          label: OPS_COMMON.nav.kyb[locale],
          icon: "kyb",
          badge: agenciesAwaitingKyb,
        },
        {
          id: "enquiries",
          href: "/ops/enquiries",
          label: OPS_COMMON.nav.enquiries[locale],
          icon: "enquiries",
          badge: openDemoRequests,
        },
        {
          /* Badged, and beside the demo queue rather than under Routes:
             both rows are work that arrives from outside and shortens
             when somebody acts on it, which is the test the enquiries
             badge set. */
          id: "support",
          href: "/ops/support",
          label: OPS_SUPPORT.heading[locale],
          icon: "enquiries",
          badge: openSupport,
        },
        ...(isOwner
          ? [
              {
                id: "colleagues",
                href: "/ops/staff",
                label: OPS_COMMON.nav.staff[locale],
                icon: "colleagues" as const,
              },
            ]
          : []),
      ],
    },
    {
      // Unlabelled, so the rail does not print "Routes" as a heading over
      // a single row that already says it. The `mt-6` `AdminSidebar` puts
      // above every group but the first is the separation this needs.
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
 *
 * Invitations sit directly under Clients, and only for a director. They
 * were a second panel at the foot of `/agency/clients` until 2026-09-08,
 * when the client asked for the two to be pages — so the roster is what
 * `/agency/clients` still opens on, and the addresses waiting to join it
 * are the row beneath. Adjacent rather than indented because the rail
 * has one level: `AdminNavGroup` groups, it does not nest.
 *
 * Which is why those two now carry a heading of their own, at the
 * client's request on 2026-09-09: they were sharing an unlabelled group
 * with the dashboard, so the rail's one titled section was Team and the
 * clients half of the console read as loose rows under the front door.
 * The dashboard moves out to a group by itself — it is the console's
 * front door and belongs to no section — and Clients becomes a section
 * beside Team.
 *
 * The heading appears only when the section holds more than one row. A
 * reviewer has no invitations row, and "Clients" printed over a single
 * row called Clients is a label for a group of one. Same test the ops
 * rail applies to its route row and this file to Support: a lone entry
 * that already names itself needs no heading above it.
 */
export function agencyAdminNav({
  locale,
  hasOrganisation,
  clients,
  pendingClientInvitations,
  pendingTeamInvitations,
  isDirector = false,
}: {
  locale: Locale;
  hasOrganisation: boolean;
  clients: number;
  /**
   * Invitations still outstanding, split by what they invite somebody to
   * be — a client, or a colleague.
   *
   * One figure served both rows before, which put every unanswered client
   * invitation on the Team badge: a count of people waiting to join the
   * agency's staff that was mostly travellers. The two rows lead to two
   * different lists, so they carry two different numbers.
   */
  pendingClientInvitations: number;
  pendingTeamInvitations: number;
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

  const clientRows: AdminNavItem[] = [
    {
      id: "clients",
      href: "/agency/clients",
      label: AGENCY.navClients[locale],
      icon: "clients",
      badge: clients,
    },
    ...(isDirector
      ? [
          {
            id: "invitations",
            href: "/agency/clients/invitations",
            label: AGENCY.invitationsLabel[locale],
            icon: "invitations" as const,
            badge: pendingClientInvitations,
          },
        ]
      : []),
  ];

  return [
    { items: [dashboard] },
    {
      // The same word over the section and on the row inside it, exactly
      // as the team section does it below — and only once there are two
      // rows to gather.
      label: clientRows.length > 1 ? AGENCY.navClients[locale] : undefined,
      items: clientRows,
    },
    {
      /* The rules a checklist was built from, under the clients they
         were built for. Every rank, not only a director: the person who
         has to explain a required document is whoever is on the phone,
         and nothing on the screen is writable, so there is no
         permission to gate. `/ops/corridors` stays the only place a
         corridor is edited. */
      items: [
        {
          id: "rule-sets",
          href: "/agency/rule-sets",
          label: AGENCY_RULE_SETS.nav[locale],
          icon: "routes" as const,
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
                badge: pendingTeamInvitations,
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
    {
      /* Every rank, unlike the team and billing rows above it. A
         handler whose case was claimed by the wrong colleague is the
         person with the problem, and making the only channel out a
         director's row would make a dispute wait on somebody else's
         calendar. Unlabelled group, like the ops console's route row:
         one entry that already names itself. */
      items: [
        {
          id: "support",
          href: "/agency/support",
          label: OPS_SUPPORT.agencyHeading[locale],
          icon: "enquiries" as const,
        },
      ],
    },
  ];
}
