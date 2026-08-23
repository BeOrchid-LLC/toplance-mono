import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { AppBar } from "@/components/app/app-bar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { asc, eq, inArray } from "drizzle-orm";

import { db, hasDatabaseEnv } from "@/lib/db/client";
import { applications, corridors, profiles } from "@/lib/db/schema";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getActor, getProfile } from "@/lib/data/applications";
import { isStaff } from "@/lib/auth/policy";
import { cn } from "@/lib/utils";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Case queue" };

/** Days since a case landed, used for the overdue signal. */
function ageInDays(at: Date | null) {
  if (!at) return 0;
  return Math.floor((Date.now() - at.getTime()) / 86_400_000);
}

export default async function OpsQueuePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  if (!profile || !actor) redirect("/ops/sign-in?next=/ops");

  // Staff-only, and now the only thing making it so. RLS used to return
  // an empty table to everyone else; this check is what stands in its
  // place, and it also gives an honest screen rather than a mysteriously
  // empty one.
  if (!isStaff(actor)) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-[440px] text-center">
          <h1 className="t-h2">This console is for Toplance staff</h1>
          <p className="t-muted mt-3">
            Your account does not have operations access. If that is wrong, ask a
            Director to set your role — it cannot be granted from this screen.
          </p>
        </div>
      </div>
    );
  }

  const rows = await db
    .select({
      id: applications.id,
      caseRef: applications.caseRef,
      status: applications.status,
      assigneeId: applications.assigneeId,
      createdAt: applications.createdAt,
      travelerName: profiles.fullName,
      travelerCountryIso: profiles.countryIso,
      visaName: corridors.visaName,
      destinationIso: corridors.destinationIso,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .leftJoin(corridors, eq(corridors.id, applications.corridorId))
    .where(
      inArray(applications.status, [
        "collecting_documents",
        "submitted",
        "under_review",
        "additional_documents",
      ])
    )
    .orderBy(asc(applications.createdAt));

  const awaiting = rows.filter((r) => r.status === "submitted").length;
  const unassigned = rows.filter((r) => !r.assigneeId).length;
  const overdue = rows.filter((r) => ageInDays(r.createdAt) > 5).length;

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={[{ href: "/ops", label: "Case queue" }]}
        active="/ops"
        name={profile.fullName}
        email={profile.email}
        subtitle={`Toplance operations · ${actor.staffRole ?? "reviewer"}`}
      />

      <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
        <h1 className="t-h2">Case queue</h1>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Open cases", value: rows.length, sub: "in the pipeline", tone: "" },
            { label: "Awaiting review", value: awaiting, sub: "at 100% completion", tone: "text-info-ink" },
            { label: "Unassigned", value: unassigned, sub: "no owner yet", tone: "text-warning-ink" },
            { label: "Overdue", value: overdue, sub: "more than 5 days in queue", tone: "text-danger-ink" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-surface p-5">
              <p className="special-caps">{s.label}</p>
              <p className={cn("t-h2 mt-2", s.tone)}>{s.value}</p>
              <p className="t-muted mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-md border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="t-title">Sorted by age, oldest first</h2>
          </div>

          {rows.length === 0 ? (
            <p className="t-muted p-6">
              Nothing in the queue. Cases appear here once a traveller finishes
              intake.
            </p>
          ) : (
            <Table>
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
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="t-title block truncate">
                          {r.travelerName || "Unnamed"}
                        </span>
                        <span className="special">
                          {r.travelerCountryIso.toUpperCase()} · {r.caseRef}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="t-title block">
                          {(r.destinationIso ?? "—").toUpperCase()}
                        </span>
                        <span className="special truncate" title={r.visaName ?? undefined}>
                          {r.visaName ?? "Corridor not set"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} short />
                      </TableCell>
                      <TableCell>
                        {r.assigneeId ? (
                          <Badge variant="neutral">Assigned</Badge>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
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
                            <AlertTriangle className="size-4" />
                          ) : age > 3 ? (
                            <Clock className="size-4" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          {age}d
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
