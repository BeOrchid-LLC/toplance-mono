import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { SupportReply } from "@/components/shared/support-reply";
import { SupportThread } from "@/components/shared/support-thread";
import { Badge } from "@/components/ui/badge";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getSupportRequest, listSupportMessages } from "@/lib/data/support";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { canPostSupportMessage } from "@/lib/domain/support-thread";
import { isUuid } from "@/lib/domain/uuid";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
import { getLocale } from "@/lib/i18n/server";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { opsAccount } from "@/app/[locale]/ops/account";
import { replyToSupport } from "@/app/[locale]/ops/support/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_SUPPORT.heading[locale] };
}

const STATE_LABEL = {
  open: OPS_SUPPORT.stateOpen,
  claimed: OPS_SUPPORT.stateClaimed,
  resolved: OPS_SUPPORT.stateResolved,
} as const;

const STATE_VARIANT = {
  open: "warning" as const,
  claimed: "brand" as const,
  resolved: "success" as const,
};

/**
 * One support request, and the conversation on it.
 *
 * The queue could only ever be worked, not answered: claim, resolve,
 * and nothing to say. This is where somebody replies, which is what
 * the agency has been waiting for since the form went in.
 */
export default async function OpsSupportRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const { id } = await params;
  // A malformed id must be indistinguishable from a missing one:
  // Postgres throws on a bad uuid before any row logic runs.
  if (!isUuid(id)) notFound();

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [request, messages, counts, notifications, unreadCount, account] =
    await Promise.all([
      getSupportRequest(id),
      listSupportMessages(id),
      getOpsCounts(),
      getNotifications(actor.userId),
      unreadNotificationCount(actor.userId),
      opsAccount(profile, actor, locale),
    ]);

  if (!request) notFound();

  const open = canPostSupportMessage(request, { kind: "staff" });

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: isOwner(actor) })}
      activeId="support"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      title={request.subject}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/ops/support" className="font-semibold text-brand-text hover:underline">
          ← {OPS_SUPPORT.backToQueue[locale]}
        </Link>
        <Badge variant={STATE_VARIANT[request.state]}>
          {STATE_LABEL[request.state][locale]}
        </Badge>
        {request.orgName && (
          <Link
            href={`/ops/tenants/${request.orgId}`}
            className="font-semibold text-brand-text hover:underline"
          >
            {request.orgName}
          </Link>
        )}
      </div>

      <Panel className="mt-8">
        <PanelHeader label={OPS_SUPPORT.threadLabel[locale]} />
        <PanelBody>
          <SupportThread
            opening={{
              body: request.body,
              authorName: request.raisedByName,
              createdAt: request.createdAt,
            }}
            messages={messages}
            locale={locale}
          />
        </PanelBody>
      </Panel>

      <Panel className="mt-8 mb-16">
        <PanelBody>
          {open ? (
            <SupportReply requestId={request.id} action={replyToSupport} />
          ) : (
            <p className="t-muted max-w-[62ch]">{OPS_SUPPORT.resolvedNote[locale]}</p>
          )}
        </PanelBody>
      </Panel>
    </AdminShell>
  );
}
