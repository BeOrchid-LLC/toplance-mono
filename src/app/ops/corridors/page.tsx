import type { Metadata } from "next";
import Link from "next/link";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { opsNav } from "@/components/ops/ops-nav";
import { Shell } from "@/components/shared/shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { freshnessOf } from "@/lib/domain/freshness";
import { listCorridors, type CorridorRow } from "@/lib/data/corridors";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { cn } from "@/lib/utils";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Corridor coverage" };

/**
 * The country's name, or the raw code upper-cased when this file cannot
 * resolve it. Never blank and never invented — a drafted corridor for a
 * code we do not map should still be reviewable.
 */
const countryName = (iso: string) => countryFromIso2(iso)?.name ?? iso.toUpperCase();

/**
 * What a row's review state should look like at a glance. `pending` is
 * the only one that is work rather than record, so it is the only one
 * that gets a colour demanding attention.
 */
const STATE_BADGE = {
  pending: { variant: "warning" as const, label: "Awaiting review" },
  approved: { variant: "success" as const, label: "Approved" },
  rejected: { variant: "neutral" as const, label: "Sent back" },
};

/**
 * How fresh a live corridor is, said in the fewest words that stay
 * honest. The traveller's screen carries the full sentence; a coverage
 * table needs the verdict.
 */
function freshnessLabel(row: CorridorRow) {
  const f = freshnessOf(row.lastVerifiedAt?.toISOString() ?? null, row.purpose);
  if (f.state === "unverified") return { text: "Not checked yet", tone: "text-danger-ink" };
  if (f.state === "stale") return { text: `Stale · ${f.checked}`, tone: "text-warning-ink" };
  return { text: f.checked, tone: "t-muted" };
}

export default async function OpsCorridorsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [rows, notifications, unreadCount] = await Promise.all([
    listCorridors(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const pending = rows.filter((r) => r.reviewState === "pending");
  const live = rows.filter((r) => r.isLive);
  const unverified = live.filter((r) => !r.lastVerifiedAt);

  const counters = [
    {
      label: "Live corridors",
      value: live.length,
      sub: "resolvable by a traveller",
      tone: "text-ink",
    },
    {
      label: "Awaiting review",
      value: pending.length,
      sub: "drafted, not yet published",
      tone: "text-warning-ink",
    },
    {
      // The number the whole plan is measured against, counted the way
      // PRD assumption #1 reads it: destinations, not destination ×
      // purpose. If the client means the other thing, this counter is
      // the first place it will show.
      label: "Destinations",
      value: new Set(live.map((r) => r.destinationIso)).size,
      sub: "of 50 required at launch",
      tone: "text-info-ink",
    },
    {
      label: "Not checked yet",
      value: unverified.length,
      sub: "live with no verification on record",
      tone: unverified.length ? "text-danger-ink" : "text-ink",
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={opsNav}
        name={profile.fullName}
        email={profile.email}
        subtitle={`Toplance operations · ${actor.staffRole ?? "reviewer"}`}
        notifications={
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        }
      />

      <div className="relative isolate">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px]"
        />

        <Shell className="pt-10">
          <h1 className="t-h2">Corridor coverage</h1>
          <p className="t-muted mt-2 max-w-[62ch]">
            Every rule set the engine can serve, and how long it has been
            since a person read it against its source.
          </p>

          <div className="laminate mt-8 overflow-hidden rounded-lg">
            <span aria-hidden className="laminate-sheen" />
            <dl className="relative z-[1] grid sm:grid-cols-2 lg:grid-cols-4">
              {counters.map((c, i) => (
                <div
                  key={c.label}
                  className={cn(
                    "border-border px-5 py-5",
                    "border-b sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0",
                    i < counters.length - 1 && "lg:border-r",
                    i % 2 === 0 && "sm:border-r"
                  )}
                >
                  <dt className="tag">{c.label}</dt>
                  <dd
                    className={cn(
                      "num mt-2 text-[32px] font-semibold leading-none",
                      c.tone
                    )}
                  >
                    {c.value}
                  </dd>
                  <dd className="t-muted mt-2">{c.sub}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Panel className="mt-8 mb-16">
            <PanelHeader
              label="All versions"
              aside={
                <Badge variant="outline">
                  <span className="num">{rows.length}</span> rows
                </Badge>
              }
            />
            {rows.length === 0 ? (
              <PanelBody>
                <p className="t-muted max-w-[62ch]">
                  No corridors yet. Run <code>npm run db:seed</code>, or draft
                  one with <code>scripts/draft-corridor.mts</code>.
                </p>
              </PanelBody>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corridor</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Last checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const badge = STATE_BADGE[row.reviewState];
                    const fresh = freshnessLabel(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Link
                            href={`/ops/corridors/${row.id}`}
                            className="font-semibold text-brand-text hover:underline"
                          >
                            {countryName(row.nationalityIso)} →{" "}
                            {countryName(row.destinationIso)}
                          </Link>
                          <span className="t-muted block">{row.visaName}</span>
                        </TableCell>
                        <TableCell className="capitalize">{row.purpose}</TableCell>
                        <TableCell className="num">v{row.version}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            {/* Live is a separate fact from approved: a
                                superseded version stays approved for the
                                record and stops being served. */}
                            {row.isLive && <Badge variant="brand">Live</Badge>}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "num",
                            row.requirementCount === 0 && "text-danger-ink"
                          )}
                        >
                          {row.requirementCount}
                        </TableCell>
                        <TableCell className={fresh.tone}>{fresh.text}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Panel>
        </Shell>
      </div>
    </div>
  );
}
