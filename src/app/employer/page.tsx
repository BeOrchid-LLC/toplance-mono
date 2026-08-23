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
import { desc, eq, inArray } from "drizzle-orm";

import { db, hasDatabaseEnv } from "@/lib/db/client";
import {
  orgApplicationProgress,
  orgMembers,
  organisations,
} from "@/lib/db/schema";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getActor, getProfile } from "@/lib/data/applications";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Organisation console" };

export default async function EmployerConsolePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  if (!profile || !actor) redirect("/employer/sign-in?next=/employer");

  const [membership] = await db
    .select({
      role: orgMembers.role,
      name: organisations.name,
      seatsPurchased: organisations.seatsPurchased,
    })
    .from(orgMembers)
    .innerJoin(organisations, eq(organisations.id, orgMembers.orgId))
    .where(eq(orgMembers.userId, profile.id))
    .limit(1);

  /**
   * Read through the progress view, never the applications table
   * directly. The view carries no column that could reveal a document,
   * so this console cannot leak one even by accident.
   *
   * The `where` is not a convenience. RLS used to scope this view to the
   * caller's own organisation; with RLS gone, an unfiltered select
   * returns every sponsored traveller on the platform. An empty
   * `orgIds` therefore has to return early rather than fall through to a
   * query with no restriction.
   */
  const rows = actor.orgIds.length
    ? await db
        .select()
        .from(orgApplicationProgress)
        .where(inArray(orgApplicationProgress.orgId, [...actor.orgIds]))
        .orderBy(desc(orgApplicationProgress.completionPct))
    : [];

  const org = membership ?? undefined;
  const used = rows.length;
  const seats = org?.seatsPurchased ?? 0;

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={[{ href: "/employer", label: "People" }]}
        active="/employer"
        name={profile.fullName}
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
                      <span className="t-title block truncate" title={r.fullName ?? ""}>
                        {r.fullName}
                      </span>
                      <span className="special">{r.caseRef}</span>
                    </TableCell>
                    <TableCell>
                      <span className="t-title block">
                        {(r.destinationIso ?? "—").toUpperCase()}
                      </span>
                      <span className="special truncate" title={r.visaName ?? ""}>
                        {r.visaName ?? "Corridor not set"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-3">
                        <Progress value={r.completionPct ?? 0} className="flex-1" />
                        <span className="w-12 shrink-0 text-right font-semibold">
                          {r.completionPct ?? 0}%
                        </span>
                      </span>
                      <span className="special">
                        {r.documentsVerified ?? 0} of {r.documentsTotal ?? 0} verified
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
