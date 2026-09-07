import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { agencyNav } from "@/components/agency/agency-nav";
import type { AgencyMembership } from "@/app/[locale]/agency/console";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { AGENCY } from "@/lib/i18n/agency";
import type { Locale } from "@/lib/i18n/locales";
import type { Profile } from "@/lib/db/schema";

/**
 * The organisation console's bar, in one place.
 *
 * Four pages were each assembling this — the nav, the name, the
 * `org · role` subtitle — and none of them carried the notifications
 * bell, which is why an agency had no way of learning that a document
 * had arrived except by opening the case and looking. `notifyAgency`
 * has been writing rows for those events since #51; nothing rendered
 * them.
 *
 * `fallbackHref` is the console's front page rather than `/app`: an
 * agency notification whose payload has no url belongs on the screen
 * that agency signed in to, not in the traveller's product.
 *
 * The subtitle names your rank, from `AGENCY.roleLabel`. This bar used
 * to print a hard-coded "HR" beside the organisation name — for
 * everyone, including the director who had just created the
 * organisation and whom `createOrganisationTx` writes as `owner`. So the
 * one place the product named your role was the one place it was
 * reliably wrong, and it read as a title assigned behind your back
 * rather than a fact about the account.
 */
export async function AgencyBar({
  profile,
  membership,
  locale,
}: {
  profile: Profile;
  /** `null` before the director has named an organisation. */
  membership: AgencyMembership | null;
  locale: Locale;
}) {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(profile.id),
    unreadNotificationCount(profile.id),
  ]);

  return (
    <AppBar
      nav={agencyNav({
        locale,
        hasOrganisation: membership !== null,
        isDirector: membership?.role === "owner",
      })}
      name={profile.fullName}
      email={profile.email}
      subtitle={
        membership
          ? `${membership.name} · ${AGENCY.roleLabel[membership.role][locale]}`
          : AGENCY.pageTitle[locale]
      }
      profileHref="/agency/profile"
      notifications={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/agency"
        />
      }
    />
  );
}
