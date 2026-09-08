import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { KybChecklist } from "@/components/ops/kyb-checklist";
import { KYB_STANDING } from "@/components/ops/kyb-standing";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getAgencyKyb } from "@/lib/data/kyb";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { isUuid } from "@/lib/domain/uuid";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { id } = await params;

  if (!isUuid(id) || !hasDatabaseEnv) return { title: OPS_KYB.heading[locale] };

  /**
   * The same gate the page body runs, for the reason
   * `/ops/tenants/[id]` documents at length: `generateMetadata` runs
   * independently of the component, so without its own gate a
   * non-staff caller gets a page whose body is a refusal but whose
   * `<title>` already carries the real agency name — an enumeration
   * oracle over every organisation uuid.
   *
   * Both this and `getAgencyKyb` are wrapped in React `cache()`, so the
   * component below shares this request's answers rather than repeating
   * the Clerk round trip and the queries.
   */
  const gate = await requireStaffConsole();
  if (gate.decision !== "ok") return { title: OPS_KYB.heading[locale] };

  const agency = await getAgencyKyb(id);
  return { title: agency?.name ?? OPS_KYB.heading[locale] };
}

export default async function OpsKybAgencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const account = await opsAccount(profile, actor, locale);

  const { id } = await params;

  // A malformed id must be indistinguishable from a missing one.
  // Postgres throws on a bad uuid before any row logic runs, so without
  // this a typed URL like /ops/kyb/1 is a 500 where a
  // wrong-but-well-formed id is a 404.
  if (!isUuid(id)) notFound();

  const [agency, notifications, unreadCount, counts] = await Promise.all([
    getAgencyKyb(id),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
    getOpsCounts(),
  ]);

  if (!agency) notFound();

  const standing = KYB_STANDING[agency.standing];

  return (
    // No `title` — the header sheet below names the agency, and a second
    // heading in the chrome would say it twice.
    <AdminShell
      groups={opsAdminNav({
        locale,
        ...counts,
        isOwner: actor.staffRole === "owner",
      })}
      activeId="kyb"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <Link
        href="/ops/kyb"
        className="t-muted inline-flex items-center gap-2 hover:underline"
      >
        <ArrowLeft className="size-4" /> {OPS_KYB.backToQueue[locale]}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="t-h2">{agency.name}</h1>
        <Badge variant={standing.variant}>
          {OPS_KYB.standing[standing.key][locale]}
        </Badge>
      </div>

      <div className="mt-8 mb-16">
        <KybChecklist agency={agency} />
      </div>
    </AdminShell>
  );
}
