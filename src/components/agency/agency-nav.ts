import type { NavItem } from "@/components/app/app-nav";
import { AGENCY } from "@/lib/i18n/agency";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The organisation console's nav, in one place.
 *
 * There is no `/agency` layout — each page resolves its own membership
 * through `requireAgencyConsole` and builds its own `AppBar`, the way
 * `/ops` does — so without this the list would be pasted three times and
 * drift, which is exactly what happened to the traveller's nav before
 * `travellerNav` existed.
 *
 * `AppNav.isActive` matches item 0 exactly as the section root and every
 * later item on its children too, so `/agency` stays unlit while
 * `/agency/clients` is open, and `Dashboard` must stay first.
 *
 * `hasOrganisation` is the whole reason this takes an argument. A
 * director who has signed up but not yet named an organisation has no
 * roster and no colleagues — `requireAgencyConsole` sends them back to
 * `/agency` from either page — so offering the two tabs would be
 * offering two round trips to the screen they are already on.
 */
export function agencyNav({
  locale,
  hasOrganisation,
  isDirector = false,
}: {
  locale: Locale;
  hasOrganisation: boolean;
  /**
   * The team roster is the director's: who works here, what rank they
   * hold and who may be invited are questions about running the agency,
   * not about handling a case. A reviewer's console is their own desk,
   * so the tab is not theirs — and `/agency/team` turns them away for
   * the same reason, since a hidden link is not a guard.
   */
  isDirector?: boolean;
}): NavItem[] {
  const dashboard = { href: "/agency", label: AGENCY.navDashboard[locale] };
  if (!hasOrganisation) return [dashboard];

  return [
    dashboard,
    { href: "/agency/clients", label: AGENCY.navClients[locale] },
    ...(isDirector
      ? [{ href: "/agency/team", label: AGENCY.navTeam[locale] }]
      : []),
  ];
}
