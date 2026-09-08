import { AdminShell } from "@/components/shared/admin-shell";
import { agencyAdminNav } from "@/components/shared/admin-nav";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import type { AgencyMembership } from "@/app/[locale]/agency/console";
import type { Actor } from "@/lib/auth/policy";
import { countOrgClients } from "@/lib/data/organisations";
import { listInvitations } from "@/lib/data/invitations";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { signedDocumentUrl } from "@/lib/storage/documents";
import { AGENCY } from "@/lib/i18n/agency";
import type { Locale } from "@/lib/i18n/locales";
import type { Profile } from "@/lib/db/schema";

/**
 * The organisation console's chrome, in one place.
 *
 * This is `AgencyBar` after the client's 2026-09-07 review moved the
 * destinations down the side. It keeps that component's whole reason for
 * existing — seven pages were each assembling the nav, the name and the
 * `org · role` subtitle, and the ones that hand-rolled it forgot the
 * notifications bell — and swaps the bar it wrapped for `AdminShell`,
 * which carries the rail, the mobile nav and the account menu.
 *
 * The counts are read here rather than passed in because the pages
 * showing the rail do not all have them: the dashboard counts clients
 * anyway, but `/agency/profile` has no reason to and would have to pass
 * zeroes — so the same rail would show a badge on one screen and none on
 * the next. `ops-counts.ts` makes the same argument for the platform
 * rail, and names `countOrgClients` and `listInvitations` as the agency's
 * answer rather than a counter of its own.
 */
export async function AgencyShell({
  profile,
  membership,
  actor,
  orgId,
  locale,
  activeId,
  title,
  lead,
  actions,
  centred,
  children,
}: {
  profile: Profile;
  /** `null` before the director has named an organisation. */
  membership: AgencyMembership | null;
  actor: Actor;
  /** `null` in the same pre-organisation state as `membership`. */
  orgId: string | null;
  locale: Locale;
  /** Which rail row is lit — an `id` from `agencyAdminNav`. */
  activeId: string;
  title?: string;
  lead?: string;
  actions?: React.ReactNode;
  /** Centre this page on a reading measure — see `AdminShell`. */
  centred?: boolean;
  children: React.ReactNode;
}) {
  const [notifications, unreadCount, avatarUrl, clients, invitations] =
    await Promise.all([
      getNotifications(profile.id),
      unreadNotificationCount(profile.id),
      // Private bucket, so the photo is signed fresh per render — the same
      // stance the traveller's layout and profile take.
      profile.avatarPath ? signedDocumentUrl(profile.avatarPath) : null,
      // The agency's figure, not the viewer's: a badge that changed
      // depending on which colleague was logged in would not be a count
      // of anything.
      membership ? countOrgClients(actor.orgIds) : Promise.resolve(0),
      orgId ? listInvitations(orgId) : Promise.resolve([]),
    ]);

  const subtitle = membership
    ? `${membership.name} · ${AGENCY.roleLabel[membership.role][locale]}`
    : AGENCY.pageTitle[locale];

  return (
    <AdminShell
      groups={agencyAdminNav({
        locale,
        hasOrganisation: membership !== null,
        clients,
        pendingInvitations: invitations.filter((i) => i.status === "pending")
          .length,
        isDirector: membership?.role === "owner",
      })}
      activeId={activeId}
      // The agency's own name, not the product's. This rail belongs to
      // one organisation and says so; `/ops` reads "Toplance" because it
      // belongs to all of them.
      railTitle={membership?.name || AGENCY.yourOrganisationFallback[locale]}
      railSubtitle={subtitle}
      account={{
        name: profile.fullName,
        email: profile.email,
        subtitle,
        avatarUrl,
        profileHref: "/agency/profile",
      }}
      title={title}
      lead={lead}
      actions={
        <>
          {actions}
          {/* An agency notification whose payload has no url belongs on
              the screen that agency signed in to, not in the traveller's
              product. */}
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/agency"
          />
        </>
      }
      centred={centred}
    >
      {children}
    </AdminShell>
  );
}
