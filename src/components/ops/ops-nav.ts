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
 * Four entries. Route curation is one half of the console; tenant
 * management is the other, and it arrived with `/ops/tenants`.
 * `/ops/enquiries` is the queue that becomes those tenants — it used to
 * be a table at the foot of `/ops/tenants`, below the agency list and
 * its pagination, where nobody scrolled to find it. `/ops/staff` is how
 * BeOrchid brings in its own people — before it, `profiles.staff_role`
 * was written by hand in SQL and by nothing else in the product. An
 * audit-log reader still belongs here when it is built.
 *
 * The last two render only for an owner, and both pages turn anyone else
 * away: who works at BeOrchid and at what rank, and what the business
 * collected this month, are questions about running the platform. Hiding
 * the links is the courtesy; the gate is the guard.
 *
 * `/ops/dashboard` sits last rather than first despite being an
 * overview. `AppNav.isActive` matches item 0 exactly as the section
 * root and `/ops` redirects to it, so a reviewer — who never sees the
 * dashboard — would land on a screen that refuses them.
 *
 * Nothing that reaches a traveller's case ever does. The v1.3 tenancy
 * moved review into the agency and deleted the case queue and case
 * detail screens with it: they read documents directly, without passing
 * through `requireApplicationAccess`, so they were the enforcement gap
 * rather than merely a surface nobody should visit. `/ops/tenants` is
 * built to the same rule — it counts an agency's applications and can
 * open none of them.
 *
 * `AppNav.isActive` matches item 0 exactly as the section root, so the
 * first entry is the console's landing page — `/ops` redirects to it.
 *
 * Kept in English here — `ops-nav.test.ts` asserts against this shape —
 * and localised for actual rendering by `localizedOpsNav` below.
 */
export const opsNav: NavItem[] = [
  { href: "/ops/corridors", label: "Routes" },
  { href: "/ops/tenants", label: "Agencies" },
  { href: "/ops/enquiries", label: "Enquiries" },
  { href: "/ops/staff", label: "Colleagues" },
  { href: "/ops/dashboard", label: "Dashboard" },
];

/**
 * `opsNav`, with each label resolved to `locale` — what every ops page
 * actually renders.
 *
 * `isOwner` drops the colleagues and dashboard tabs for a reviewer. It
 * is not the guard: both pages turn them away themselves, because a
 * hidden link is a courtesy and a typed URL is not an exception.
 */
export function localizedOpsNav(locale: Locale, isOwner = false): NavItem[] {
  return [
    { ...opsNav[0], label: OPS_COMMON.nav.routes[locale] },
    { ...opsNav[1], label: OPS_COMMON.nav.tenants[locale] },
    // Every rank, not just an owner: the enquiry queue is the console's
    // shared work, and `/ops/tenants` has always let any reviewer move
    // one of these rows along.
    { ...opsNav[2], label: OPS_COMMON.nav.enquiries[locale] },
    ...(isOwner
      ? [
          { ...opsNav[3], label: OPS_COMMON.nav.staff[locale] },
          { ...opsNav[4], label: OPS_COMMON.nav.dashboard[locale] },
        ]
      : []),
  ];
}
