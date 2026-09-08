import type { Metadata } from "next";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { AvatarUpload } from "@/components/app/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { EditableName, EditablePhone } from "@/components/app/profile-fields";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { countryBy } from "@/lib/domain/countries";
import { opsSubtitle } from "@/lib/domain/ops-account";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_PROFILE } from "@/lib/i18n/ops-profile";
import { PROFILE } from "@/lib/i18n/profile";
import { getLocale } from "@/lib/i18n/server";
import {
  getNotifications,
  unreadNotificationCount,
} from "@/lib/notifications/notify";
import { signedDocumentUrl } from "@/lib/storage/documents";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_PROFILE.heading[locale] };
}

/** One read-only fact, in the anatomy both other profiles use. */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-3">
      <dt className="special-caps">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold">{value}</dd>
    </div>
  );
}

/**
 * The platform staff member's own profile.
 *
 * Last of the three personas to get one. `updateProfile` and
 * `uploadAvatar` have always accepted a name, a phone and a photo from
 * any signed-in actor; travellers had a screen to use them from, then
 * agencies did, and staff had neither — so a reviewer appeared to every
 * colleague and every provisioned agency under whatever name the sign-up
 * form happened to capture, with no way to correct it and no photo.
 *
 * Not owner-only, unlike `/ops/staff` and `/ops/dashboard`. Who works
 * here and what the business earns are questions about running the
 * platform; your own name is not one of them, and a reviewer who could
 * not fix their own name would be the bug this screen exists to close.
 * Anyone past `requireStaffConsole` — staff, second factor enrolled —
 * may open it, and every write it makes is scoped to their own row by
 * the action, never by this page.
 *
 * Name and phone are editable; the email is not, for the reason the
 * agency's profile gives: identity is Clerk's and `profiles.email` is a
 * copy of it, so an input here would either lie to the person typing in
 * it or quietly disagree with the address they sign in with. The rank
 * beside the photo is not editable either, and by a stronger rule —
 * `staff_role` is written only by an owner's invitation, and a field
 * that let a reviewer set it would be the privilege escalation the whole
 * invitation flow was built to avoid.
 *
 * `activeId` deliberately matches no rail row. This is reached from the
 * account menu, not from the nav, so nothing should light up — the
 * agency's profile borrows `overview` and wrongly highlights its
 * dashboard.
 */
export default async function OpsProfilePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [counts, notifications, unreadCount, account] = await Promise.all([
    getOpsCounts(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
    opsAccount(profile, actor, locale),
  ]);

  // The stored phone is E.164; the inline editor wants national digits
  // with the dial code supplied by the country picker — the same split
  // the other two profiles make.
  const dial = countryBy(profile.countryIso).dial.replace("+", "");
  const phoneDigits = profile.phone
    ? profile.phone.replace(/^\+/, "").replace(new RegExp(`^${dial}`), "")
    : "";

  // Signed again rather than read off `account`: the block's copy is for
  // the avatar in the chrome, and this one is the page's own — reusing
  // it would tie the photo on the sheet to whatever the rail happens to
  // want, which is exactly the coupling the block was extracted to end.
  const avatarUrl = profile.avatarPath
    ? await signedDocumentUrl(profile.avatarPath)
    : null;

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: isOwner(actor) })}
      activeId="profile"
      railTitle="Toplance"
      railSubtitle={opsSubtitle(actor.staffRole, locale)}
      account={account}
      title={OPS_PROFILE.heading[locale]}
      lead={OPS_PROFILE.intro[locale]}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <Panel className="max-w-[720px]">
        <PanelHeader label={OPS_PROFILE.detailsLabel[locale]} />
        <PanelBody className="pt-6">
          {/* The photo and the name it belongs to, above the fields
              that spell them out. Until they upload one the rail shows
              initials — which is what the account footer has always
              shown every member of staff. */}
          <div className="flex items-start gap-5 sm:gap-7">
            <AvatarUpload fullName={profile.fullName} avatarUrl={avatarUrl} />
            {/* What they are here, beside the photo rather than as a
                fourth labelled field: it is the one fact on this page
                they cannot change, and it identifies them the way a
                colleague would. */}
            <div className="min-w-0 flex-1">
              <p className="d-sm truncate">
                {profile.fullName || profile.email}
              </p>
              {/* Split out of `opsSubtitle` rather than rendered through
                  it, and only here. That helper's whole point is that
                  the rail and the account menu say the same string, so
                  this page reads its two halves instead — the operation
                  as quiet text, the rank as a badge. Same change, same
                  day and same reason as the agency profile's. An absent
                  `staffRole` is a reviewer, the lesser of the two, so a
                  row that lost its rank can never read as an owner. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="t-muted truncate">
                  {OPS_COMMON.subtitlePrefix[locale]}
                </span>
                <Badge variant="neutral">
                  {OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-border pt-2">
            {/* One grid rather than two fixed half-columns, so the sheet
                reads in rows and collapses to a single column without
                re-ordering. */}
            <dl className="grid gap-x-10 sm:grid-cols-2">
              <EditableName fullName={profile.fullName} />
              <DetailField
                label={PROFILE.emailLabel[locale]}
                value={profile.email}
              />
              <EditablePhone countryIso={profile.countryIso} digits={phoneDigits} />
            </dl>
          </div>
        </PanelBody>
      </Panel>
    </AdminShell>
  );
}
