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
import { Panel } from "@/components/shared/panel";
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
        <ArrowLeft className="size-4" aria-hidden /> {OPS_KYB.backToQueue[locale]}
      </Link>

      {/* Dossier header — the consular sheet: name, standing, and the queue context in one line */}
      <Panel className="mt-4">
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="special-caps">Verification dossier</p>
              <h1 className="t-h2 mt-1.5">{agency.name}</h1>
              <p className="t-muted mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={
                      agency.standing === "activated"
                        ? "size-1.5 rounded-full bg-success"
                        : agency.standing === "ready"
                          ? "size-1.5 rounded-full bg-info"
                          : agency.standing === "in_review"
                            ? "size-1.5 rounded-full bg-brand"
                            : "size-1.5 rounded-full bg-border-strong"
                    }
                    aria-hidden
                  />
                  {OPS_KYB.standing[standing.key][locale]}
                </span>
                <span className="text-border-strong">·</span>
                <span className="num text-[13px] font-semibold tabular-nums">
                  {agency.progress.verified} of {agency.progress.total} verified
                </span>
                <span className="text-border-strong">·</span>
                <span className="hidden sm:inline">Each file is private to this dossier</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant={standing.variant}>{OPS_KYB.standing[standing.key][locale]}</Badge>
              <span className="special hidden sm:block">
                {agency.activatedAt
                  ? `Activated ${agency.activatedAt.toISOString().slice(0, 10)}`
                  : agency.progress.canActivate
                    ? "Ready — gate is open"
                    : `${agency.progress.total - agency.progress.verified} to verify`}
              </span>
            </div>
          </div>

          {/* thin progress rule — 6 ticks, one per requirement */}
          <div className="relative mt-5 flex gap-1">
            {agency.requirements.map((r) => (
              <div
                key={r.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-surface-inset"
                aria-hidden
              >
                <div
                  className={
                    r.state === "verified"
                      ? "h-full w-full rounded-full bg-success"
                      : r.state === "rejected"
                        ? "h-full w-full rounded-full bg-danger"
                        : r.state === "in_review"
                          ? "h-full w-full rounded-full bg-info"
                          : "h-full w-0 bg-transparent"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="mt-6 mb-16">
        <KybChecklist agency={agency} />
      </div>
    </AdminShell>
  );
}
