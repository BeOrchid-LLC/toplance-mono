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
 * One entry, because route curation is what the platform console is now.
 * The v1.3 tenancy moved review into the agency and deleted the case
 * queue and case detail screens with it: they read documents directly,
 * without passing through `requireApplicationAccess`, so they were the
 * enforcement gap rather than merely a surface nobody should visit.
 * Tenant provisioning and an audit-log reader belong here when they are
 * built; nothing that reaches a traveller's case ever does.
 *
 * `AppNav.isActive` matches item 0 exactly as the section root, so the
 * first entry is the console's landing page — `/ops` redirects to it.
 *
 * Kept in English here — `ops-nav.test.ts` asserts against this shape —
 * and localised for actual rendering by `localizedOpsNav` below.
 */
export const opsNav: NavItem[] = [{ href: "/ops/corridors", label: "Routes" }];

/** `opsNav`, with each label resolved to `locale` — what every ops page actually renders. */
export function localizedOpsNav(locale: Locale): NavItem[] {
  return [{ ...opsNav[0], label: OPS_COMMON.nav.routes[locale] }];
}
