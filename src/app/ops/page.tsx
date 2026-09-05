import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { opsNav } from "@/components/ops/ops-nav";
import { StatusBadge } from "@/components/shared/status-badge";
import { Shell } from "@/components/shared/shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import { applications, corridors, profiles } from "@/lib/db/schema";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { cn } from "@/lib/utils";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Case queue" };

const assignee = alias(profiles, "assignee");

/** Days since a case landed, used for the overdue signal. */
function ageInDays(at: Date | null) {
  if (!at) return 0;
  return Math.floor((Date.now() - at.getTime()) / 86_400_000);
}

export default async function OpsQueuePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  // Staff-only, and now the only thing making that so — RLS used to
  // return an empty table to everyone else. It also gates on a second
  // factor: this console holds passport scans, so "staff" alone is not
  // enough. See `requireStaffConsole` for the three-way decision.
  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [rows, notifications, unreadCount] = await Promise.all([
    db
      .select({
        id: applications.id,
        caseRef: applications.caseRef,
        status: applications.status,
        assigneeId: applications.assigneeId,
        assigneeName: assignee.fullName,
        createdAt: applications.createdAt,
        travelerName: profiles.fullName,
        travelerCountryIso: profiles.countryIso,
        visaName: corridors.visaName,
        destinationIso: corridors.destinationIso,
      })
      .from(applications)
      .innerJoin(profiles, eq(profiles.id, applications.travelerId))
      .leftJoin(corridors, eq(corridors.id, applications.corridorId))
      .leftJoin(assignee, eq(assignee.id, applications.assigneeId))
      .where(
        inArray(applications.status, [
          "collecting_documents",
          "submitted",
          "under_review",
          "additional_documents",
        ])
      )
      .orderBy(asc(applications.createdAt)),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const counters = [
    {
      label: "Open cases",
      value: rows.length,
      sub: "in the pipeline",
      tone: "text-ink",
    },
    {
      label: "Awaiting review",
      value: rows.filter((r) => r.status === "submitted").length,
      sub: "at 100% completion",
      tone: "text-info-ink",
    },
    {
      label: "Unassigned",
      value: rows.filter((r) => !r.assigneeId).length,
      sub: "no owner yet",
      tone: "text-warning-ink",
    },
    {
      label: "Overdue",
      value: rows.filter((r) => ageInDays(r.createdAt) > 5).length,
      sub: "more than 5 days in queue",
      tone: "text-danger-ink",
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
          <h1 className="t-h2">Case queue</h1>
          <p className="t-muted mt-2 max-w-[62ch]">
            Every application a person still has to act on, oldest first.
          </p>

          {/*
            The queue header is this console's signature moment (§4), and
            the four counters are what it should carry: they are the state
            of the queue, which is the subject of the screen. As four
            bordered boxes they were four objects; under one sheet they
            are one instrument panel.

            The data face is used for the figures because §1 keeps it for
            anything machine-shaped, and §2 permits it here — inside the
            signature moment and nowhere below it.
          */}
          <div className="laminate mt-8 overflow-hidden rounded-lg">
            <span aria-hidden className="laminate-sheen" />
            <dl className="relative z-[1] grid sm:grid-cols-2 lg:grid-cols-4">
              {counters.map((c, i) => (
                <div
                  key={c.label}
                  className={cn(
                    "border-border px-5 py-5",
                    "border-b sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0",
                    i < counters.length - 1 && "lg:border-e",
                    i % 2 === 0 && "sm:border-e"
                  )}
                >
                  <dt className="tag">{c.label}</dt>
                  <dd className={cn("num mt-2 text-[32px] font-semibold leading-none", c.tone)}>
                    {c.value}
                  </dd>
                  <dd className="t-muted mt-2">{c.sub}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Shell>
      </div>

      <main>
        <Shell className="py-12">
          <Panel>
            <PanelHeader
              label="Sorted by age, oldest first"
              aside={
                <Badge variant="brand">
                  <span className="num">{rows.length}</span>
                  {rows.length === 1 ? "case" : "cases"}
                </Badge>
              }
            />

          {rows.length === 0 ? (
            <PanelBody>
              <p className="t-muted max-w-[62ch]">
                Nothing in the queue. Cases appear here once a traveler
                finishes intake.
              </p>
            </PanelBody>
          ) : (
            /*
              A table, deviating from §6's preference for ruled rows — the
              guideline asks for the reason in a comment, and this is it.

              A reviewer works this screen one column at a time: scan Age
              for what is late, scan Owner for what nobody has, then read
              across. Column alignment is the whole affordance, and ruled
              rows destroy it — the same fact lands at a different
              horizontal position on every row. That is the one case §6
              carves out, and it does not generalise: the employer roster
              next door is read one person at a time, so it *is* ruled
              rows.

              Wrapped in its own scroller so the page body never scrolls
              sideways at 390px. Staff are on desktop, but the quality
              floor is not conditional.
            */
            <div className="overflow-x-auto px-2 pb-2">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[26%]">Applicant</TableHead>
                    <TableHead className="w-[22%]">Destination</TableHead>
                    <TableHead className="w-[20%]">Status</TableHead>
                    <TableHead className="w-[20%]">Owner</TableHead>
                    <TableHead className="w-[12%]">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const age = ageInDays(r.createdAt);
                    const destination = countryFromIso2(r.destinationIso);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link
                            href={`/ops/cases/${r.id}`}
                            className="group block"
                          >
                            <span className="t-title block truncate group-hover:underline">
                              {r.travelerName || "Unnamed"}
                            </span>
                            <span className="special">
                              {r.travelerCountryIso.toUpperCase()} · {r.caseRef}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="t-body block truncate">
                            {destination?.name ??
                              r.destinationIso?.toUpperCase() ??
                              "Route not set"}
                          </span>
                          <span
                            className="special truncate"
                            title={r.visaName ?? undefined}
                          >
                            {r.visaName ?? "Route not set"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} short />
                        </TableCell>
                        <TableCell>
                          {r.assigneeId ? (
                            <span className="t-body block truncate">
                              {r.assigneeName ?? "Former staff"}
                            </span>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {/* The icon changes with the tone, so the
                              signal survives greyscale and colour
                              blindness — §8's rule that colour never
                              carries a state on its own. */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 font-semibold",
                              age > 5
                                ? "text-danger-ink"
                                : age > 3
                                  ? "text-warning-ink"
                                  : "text-success-ink"
                            )}
                            title={`${age} days in the queue`}
                          >
                            {age > 5 ? (
                              <AlertTriangle className="size-4" aria-hidden />
                            ) : age > 3 ? (
                              <Clock className="size-4" aria-hidden />
                            ) : (
                              <CheckCircle2 className="size-4" aria-hidden />
                            )}
                            {age}d
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </Panel>
        </Shell>
      </main>
    </div>
  );
}
