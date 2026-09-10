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
  titleActions,
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
  /** Console-wide chrome for the bar — see `AdminShell`. */
  actions?: React.ReactNode;
  /** This page's own primary action, on the row with its heading. */
  titleActions?: React.ReactNode;
  /** Centre this page on a reading measure — see `AdminShell`. */
  centred?: boolean;
  children: React.ReactNode;
}) {
  const [notifications, unreadCount, avatarUrl, logoUrl, clients, invitations] =
    await Promise.all([
      getNotifications(profile.id),
      unreadNotificationCount(profile.id),
      // Private bucket, so the photo is signed fresh per render — the same
      // stance the traveller's layout and profile take.
      profile.avatarPath ? signedDocumentUrl(profile.avatarPath) : null,
      // The agency's own logo, on the same terms. Signed here rather than
      // on the one screen that uploads it, because the rail is on every
      // screen and this component is the only place that renders it.
      membership?.logoPath ? signedDocumentUrl(membership.logoPath) : null,
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
        // Split by kind, because the two badges lead to two lists. One
        // figure served both rows until 2026-09-08, which put every
        // unanswered client invitation on the Team badge.
        pendingClientInvitations: invitations.filter(
          (i) => i.status === "pending" && i.kind === "client"
        ).length,
        pendingTeamInvitations: invitations.filter(
          (i) => i.status === "pending" && i.kind === "staff"
        ).length,
        isDirector: membership?.role === "owner",
      })}
      activeId={activeId}
      // The agency's own name, not the product's. This rail belongs to
      // one organisation and says so; `/ops` reads "Toplance" because it
      // belongs to all of them.
      railTitle={membership?.name || AGENCY.yourOrganisationFallback[locale]}
      // The agency's own mark, once its director has uploaded one on
      // `/agency/profile`. `railTitle` above stays the fallback and stays
      // the letter a collapsed rail shows — a picture cannot be either.
      railBrand={
        logoUrl ? (
          // A signed, short-lived URL: next/image's optimizer would cache
          // a link that expires in ten minutes, so the plain element is
          // the correct one. `object-contain`, never `cover` — a logo
          // cropped to fill its box is a logo with its edges cut off.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={membership?.name ?? ""}
            className="max-h-7 w-auto max-w-full object-contain"
          />
        ) : undefined
      }
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
      titleActions={titleActions}
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
