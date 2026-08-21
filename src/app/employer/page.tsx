import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, Shield } from "lucide-react";

import { AppBar } from "@/components/app/app-bar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Organisation console" };

export default async function EmployerConsolePage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/employer/sign-in?next=/employer");

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, organisations(name, seats_purchased)")
    .eq("user_id", profile.id)
    .maybeSingle();

  /**
   * Read through the progress view, never the applications table
   * directly. The view carries no column that could reveal a document,
   * so this console cannot leak one even by accident.
   */
  const { data: roster } = await supabase
    .from("org_application_progress")
    .select("*")
    .order("completion_pct", { ascending: false });

  const org = membership?.organisations as
    | { name: string; seats_purchased: number }
    | undefined;
  const rows = roster ?? [];
  const used = rows.length;
  const seats = org?.seats_purchased ?? 0;

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={[{ href: "/employer", label: "People" }]}
        active="/employer"
        name={profile.full_name}
        email={profile.email}
        subtitle={org ? `${org.name} · HR` : "Organisation console"}
      />

      <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="t-h2">{org?.name ?? "Your organisation"}</h1>
            <p className="t-muted mt-2">
              {used} of {seats} seats in use
            </p>
          </div>
          <Button disabled title="Invitations arrive in the next slice">
            <Mail /> Invite someone
          </Button>
        </div>

        {seats > 0 && (
          <Progress value={(used / seats) * 100} className="mt-4 max-w-[320px]" />
        )}

        <div className="mt-6 flex items-start gap-3 rounded-md border border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand)_7%,var(--mix))] p-5">
          <Shield className="mt-0.5 size-6 shrink-0 text-brand-text" />
          <div>
            <p className="t-title">You see progress, never documents</p>
            <p className="t-muted mt-1 text-[16px]">
              Passports, bank statements and police certificates stay between the
              traveller and Toplance. You see the completion score, the status and
              whether someone is stuck.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="t-title">Your people</h2>
            <p className="t-muted mt-1 text-[16px]">
              Everyone your organisation has sponsored a seat for
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="t-muted p-6">
              Nobody yet. Once you invite someone and they finish intake, they appear
              here with a live completion score.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Person</TableHead>
                  <TableHead className="w-[20%]">Destination</TableHead>
                  <TableHead className="w-[24%]">Completion</TableHead>
                  <TableHead className="w-[28%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="t-title block truncate" title={r.full_name ?? ""}>
                        {r.full_name}
                      </span>
                      <span className="special">{r.case_ref}</span>
                    </TableCell>
                    <TableCell>
                      <span className="t-title block">
                        {(r.destination_iso ?? "—").toUpperCase()}
                      </span>
                      <span className="special truncate" title={r.visa_name ?? ""}>
                        {r.visa_name ?? "Corridor not set"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-3">
                        <Progress value={r.completion_pct ?? 0} className="flex-1" />
                        <span className="w-12 shrink-0 text-right font-semibold">
                          {r.completion_pct ?? 0}%
                        </span>
                      </span>
                      <span className="special">
                        {r.documents_verified ?? 0} of {r.documents_total ?? 0} verified
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.status && <StatusBadge status={r.status} short />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
