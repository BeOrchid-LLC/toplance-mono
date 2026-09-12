import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { TenantControls } from "@/components/ops/tenant-controls";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { TenantInvitesTable } from "@/components/ops/tenant-invites-table";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { CounterRow } from "@/components/shared/counter-row";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getTenant } from "@/lib/data/tenants";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { tenantInviteMatches } from "@/lib/domain/tenant-invite-table";
import { isUuid } from "@/lib/domain/uuid";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { activeSubscription } from "@/lib/data/payments";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
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

  // Never throws for a bad id: metadata for a page that is about to 404
  // should be the section's own title, not an error.
  if (!isUuid(id) || !hasDatabaseEnv) return { title: OPS_TENANTS.heading[locale] };

  /**
   * `generateMetadata` runs independently of the page component below —
   * Next does not skip it just because the component itself is about to
   * refuse the visitor. Without its own gate, an unauthenticated or
   * non-staff caller requesting this URL would get a page whose body is
   * the refusal but whose `<title>` already carries the real agency
   * name: an enumeration oracle over every organisation uuid, the exact
   * leak this whole console exists to avoid.
   *
   * `requireStaffConsole` only ever throws via `redirect()`, and the
   * Next.js docs for `generateMetadata` say `redirect()` and
   * `notFound()` are both safe to call from inside it, so calling the
   * same gate here is safe. Both it and `getTenant` are wrapped in React
   * `cache()`, so the page component below shares this request's answers
   * rather than repeating the gate's Clerk round trip and the agency's
   * queries — which is what "request-scoped" has to mean in code, not
   * just in a comment. Nothing in Next dedupes a plain async function on
   * its own; only `fetch` is deduped by default.
   *
   * Only a caller the page would actually render for ("ok") gets the
   * tenant's name; "refuse" and "enroll" both fall back to the section
   * heading, matching what the page component shows their bodies.
   */
  const gate = await requireStaffConsole();
  if (gate.decision !== "ok") return { title: OPS_TENANTS.heading[locale] };

  const tenant = await getTenant(id);
  return { title: tenant?.name ?? OPS_TENANTS.heading[locale] };
}

export default async function OpsTenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; kind?: string }>;
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

  /**
   * A malformed id must be indistinguishable from a missing one.
   * Postgres throws on a bad uuid before any row logic runs, so without
   * this a typed URL like /ops/tenants/1 is a 500 where a
   * wrong-but-well-formed id is a 404.
   */
  if (!isUuid(id)) notFound();

  /**
   * `id` goes to `getTenant` exactly as it came off the URL. Normalising
   * case is `getTenant`'s own job now — it lower-cases before it queries,
   * so a bookmarked link in different letter case cannot 404 a tenant
   * that exists, and no future caller has to remember to do it. Passing
   * the same string `generateMetadata` passed also means both share one
   * `cache()` entry rather than each running the agency's queries.
   */
  const [tenant, notifications, unreadCount] = await Promise.all([
    getTenant(id),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  if (!tenant) notFound();

  // No `sub` on any of these: every tile here is already scoped to this
  // one agency, so a gloss written for the list page's platform-wide
  // aggregates ("across every agency", "able to review a case", "not
  // yet converted or declined") would be false here, and the dictionary
  // has no per-agency wording to borrow instead. `CounterRow.sub` is
  // optional for exactly this — a tile that needs no gloss renders
  // without one rather than inventing or borrowing a wrong string.
  /**
   * Read, never set. BeOrchid does not sell the plan and cannot mark one
   * paid from here — the agency buys it in its own console. This is on
   * the screen because "why is that agency quiet" and "they have not
   * paid" are the same question, and the console had no way to see it.
   */
  const subscription = await activeSubscription(tenant.id);

  const query = await searchParams;
  const inviteSearch = (query.q ?? "").trim();
  const inviteKind = query.kind ?? "";
  const invitesNarrowed = Boolean(inviteSearch || inviteKind);
  const visibleInvites = tenant.pendingInvites.filter((i) =>
    tenantInviteMatches(i, inviteSearch, inviteKind)
  );

  const counters = [
    {
      label: OPS_TENANTS.planLabel[locale],
      value: subscription?.periodEnd
        ? OPS_TENANTS.planPaidUntil[locale].replace(
            "{date}",
            new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              subscription.periodEnd
            )
          )
        : OPS_TENANTS.planUnpaid[locale],
      tone: subscription ? "text-success-ink" : "text-warning-ink",
    },
    {
      label: OPS_TENANTS.tableHead.members[locale],
      value: String(tenant.members),
      tone: "text-ink",
    },
    {
      label: OPS_TENANTS.tableHead.applications[locale],
      value: String(tenant.applicationsTotal),
      tone: "text-ink",
    },
    {
      label: OPS_COMMON.awaitingReview[locale],
      value: String(tenant.withReviewer),
      tone: tenant.withReviewer ? "text-warning-ink" : "text-ink",
    },
    {
      label: OPS_COMMON.approved[locale],
      value: String(tenant.approved),
      tone: "text-success-ink",
    },
  ];

  const counts = await getOpsCounts();

  return (
    // No `title` — this screen opens with a header sheet naming the
    // agency, and a second heading in the chrome would say it twice.
    <AdminShell
      groups={opsAdminNav({
        locale,
        ...counts,
        isOwner: actor.staffRole === "owner",
      })}
      activeId="agencies"
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
            href="/ops/tenants"
            className="t-muted inline-flex items-center gap-2 hover:underline"
          >
            <ArrowLeft className="size-4" /> {OPS_TENANTS.detailBackToList[locale]}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="t-h2">{tenant.name}</h1>
            <Badge variant={tenant.suspendedAt ? "warning" : "success"}>
              {tenant.suspendedAt
                ? OPS_TENANTS.suspendedBadge[locale]
                : OPS_TENANTS.live[locale]}
            </Badge>
          </div>
          {tenant.domain && <p className="t-muted mt-2">{tenant.domain}</p>}

          {/* Five counters, so the row has to be told five — the
              default is four, and the fifth landed on a line of its
              own beside three empty cells. */}
          <CounterRow counters={counters} columns={5} />

          {/* Searchable, at the client's request on 8 September — she
              asked for it on every table, and an agency that has been
              onboarding for a month has more rows here than the two or
              three a fresh one shows. No pager: the panel lists one
              agency's outstanding invitations, which is a set that ends,
              unlike the console's other tables. */}
          <TenantInvitesTable
            rows={visibleInvites}
            locale={locale}
            pendingCount={tenant.pendingInvitations}
            className="mt-8"
            basePath={`/ops/tenants/${tenant.id}`}
            params={{ q: query.q, kind: query.kind }}
            total={visibleInvites.length}
            unfilteredTotal={tenant.pendingInvites.length}
            filteredLabel={
              invitesNarrowed
                ? ADMIN_CONSOLE.showingTemplate[locale]
                    .replace("{shown}", String(visibleInvites.length))
                    .replace("{total}", String(tenant.pendingInvites.length))
                : undefined
            }
          />

          <div className="mt-8 mb-16">
            <TenantControls tenant={tenant} />
          </div>
    </AdminShell>
  );
}
