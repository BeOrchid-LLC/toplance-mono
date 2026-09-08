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
 * Three entries. Route curation is one half of the console; tenant
 * management is the other, and it arrived with `/ops/tenants`.
 * `/ops/staff` is how BeOrchid brings in its own people — before it,
 * `profiles.staff_role` was written by hand in SQL and by nothing else
 * in the product. An audit-log reader still belongs here when it is
 * built.
 *
 * The third entry renders only for an owner, and the page turns anyone
 * else away: who works at BeOrchid, and at what rank, is a question
 * about running the platform. Hiding the link is the courtesy; the
 * redirect is the guard.
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
  { href: "/ops/staff", label: "Colleagues" },
];

/**
 * `opsNav`, with each label resolved to `locale` — what every ops page
 * actually renders.
 *
 * `isOwner` drops the colleagues tab for a reviewer. It is not the
 * guard: `/ops/staff` redirects them itself, because a hidden link is a
 * courtesy and a typed URL is not an exception.
 */
export function localizedOpsNav(locale: Locale, isOwner = false): NavItem[] {
  return [
    { ...opsNav[0], label: OPS_COMMON.nav.routes[locale] },
    { ...opsNav[1], label: OPS_COMMON.nav.tenants[locale] },
    ...(isOwner ? [{ ...opsNav[2], label: OPS_COMMON.nav.staff[locale] }] : []),
  ];
}
