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
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getProfile } from "@/lib/data/applications";
import { cn } from "@/lib/utils";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Case queue" };

/** Days since a case landed, used for the overdue signal. */
function ageInDays(iso: string | null) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function OpsQueuePage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/ops/sign-in?next=/ops");

  // Staff-only. RLS would return nothing anyway, but failing here gives
  // an honest screen instead of a mysteriously empty table.
  if (profile.role !== "staff") {
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

  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("applications")
    .select("*, profiles!applications_traveler_id_fkey(full_name, country_iso), corridors(visa_name, destination_iso)")
    .in("status", ["collecting_documents", "submitted", "under_review", "additional_documents"])
    .order("created_at", { ascending: true });

  const rows = cases ?? [];
  const awaiting = rows.filter((r) => r.status === "submitted").length;
  const unassigned = rows.filter((r) => !r.assignee_id).length;
  const overdue = rows.filter((r) => ageInDays(r.created_at) > 5).length;

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={[{ href: "/ops", label: "Case queue" }]}
        active="/ops"
        name={profile.full_name}
        email={profile.email}
        subtitle={`Toplance operations · ${profile.staff_role ?? "reviewer"}`}
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
                  const age = ageInDays(r.created_at);
                  const traveler = r.profiles as { full_name: string; country_iso: string } | null;
                  const corridor = r.corridors as { visa_name: string; destination_iso: string } | null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="t-title block truncate">
                          {traveler?.full_name ?? "Unnamed"}
                        </span>
                        <span className="special">
                          {(traveler?.country_iso ?? "").toUpperCase()} · {r.case_ref}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="t-title block">
                          {(corridor?.destination_iso ?? "—").toUpperCase()}
                        </span>
                        <span className="special truncate" title={corridor?.visa_name}>
                          {corridor?.visa_name ?? "Corridor not set"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} short />
                      </TableCell>
                      <TableCell>
                        {r.assignee_id ? (
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
