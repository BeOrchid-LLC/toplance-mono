import type { NavItem } from "@/components/app/app-nav";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The platform console's nav, in one place.
 *
 * There is no `/ops` layout — every page builds its own `AppBar` — so
 * the list was pasted per page and drifted. One answer here means the
 * screens cannot disagree.
 *
 * Five entries. `/ops/dashboard` leads, because the client asked on
 * 2026-09-08 for the overview to be the console's front door and
 * `AppNav.isActive` matches item 0 exactly as the section root. Route
 * curation now closes the list rather than opening it — same request,
 * and the two moves are one decision: the reference data a case is
 * judged against is the console's deepest screen, not its lobby.
 * `/ops/tenants` is tenant management, `/ops/enquiries` the queue that
 * becomes those tenants — it used to be a table at the foot of
 * `/ops/tenants`, below the agency list and its pagination, where nobody
 * scrolled to find it. `/ops/staff` is how BeOrchid brings in its own
 * people — before it, `profiles.staff_role` was written by hand in SQL
 * and by nothing else in the product. An audit-log reader still belongs
 * here when it is built.
 *
 * The dashboard and the colleagues roster render only for a director,
 * and both pages turn anyone else away: who works at BeOrchid and at
 * what rank, and what the business collected this month, are questions
 * about running the platform. Hiding the links is the courtesy; the gate
 * is the guard.
 *
 * Which means item 0 is a screen a reviewer cannot open — so `/ops` no
 * longer redirects at a fixed path. `OpsHome` reads the rank and sends a
 * director to the dashboard and a reviewer to route curation, which is
 * where `/ops` has always taken them.
 *
 * Nothing that reaches a traveller's case is here. The v1.3 tenancy
 * moved review into the agency and deleted the case queue and case
 * detail screens with it: they read documents directly, without passing
 * through `requireApplicationAccess`, so they were the enforcement gap
 * rather than merely a surface nobody should visit. `/ops/tenants` is
 * built to the same rule — it counts an agency's applications and can
 * open none of them.
 *
 * Kept in English here — `ops-nav.test.ts` asserts against this shape —
 * and localised for actual rendering by `localizedOpsNav` below.
 */
export const opsNav: NavItem[] = [
  { href: "/ops/dashboard", label: "Dashboard" },
  { href: "/ops/tenants", label: "Agencies" },
  { href: "/ops/enquiries", label: "Demo requests" },
  { href: "/ops/staff", label: "Team" },
  { href: "/ops/corridors", label: "Routes" },
];

/**
 * `opsNav`, with each label resolved to `locale` — what every ops page
 * actually renders.
 *
 * `isOwner` drops the dashboard and colleagues tabs for a reviewer. It
 * is not the guard: both pages turn them away themselves, because a
 * hidden link is a courtesy and a typed URL is not an exception.
 *
 * Route curation stays last for both ranks. A reviewer's list is the
 * three screens that are theirs, in the order a director sees them —
 * the tabs a rank cannot open are removed from the row, never
 * reshuffled into a different one.
 */
export function localizedOpsNav(locale: Locale, isOwner = false): NavItem[] {
  return [
    ...(isOwner ? [{ ...opsNav[0], label: OPS_COMMON.nav.dashboard[locale] }] : []),
    { ...opsNav[1], label: OPS_COMMON.nav.tenants[locale] },
    // Every rank, not just a director: the enquiry queue is the console's
    // shared work, and `/ops/tenants` has always let any reviewer move
    // one of these rows along.
    { ...opsNav[2], label: OPS_COMMON.nav.enquiries[locale] },
    ...(isOwner ? [{ ...opsNav[3], label: OPS_COMMON.nav.staff[locale] }] : []),
    { ...opsNav[4], label: OPS_COMMON.nav.routes[locale] },
  ];
}
