import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { CompletionRing } from "@/components/app/completion-ring";
import { STATUS, VERIFIED_MEANS } from "@/lib/domain/status";
import {
  completionOf,
  getCorridorFor,
  getDocuments,
  getIntakeAnswers,
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  const application = await getOrCreateApplication();
  if (!profile || !application) redirect("/sign-in?next=/app");

  // Intake first — there is nothing meaningful to show before it.
  if (!application.intake_complete) redirect("/app/agent");

  const [docs, answers, corridor] = await Promise.all([
    getDocuments(application.id),
    getIntakeAnswers(application.id),
    getCorridorFor(application.id),
  ]);

  const completion = completionOf(docs);
  const firstName = profile.full_name.split(" ")[0] || "there";
  const status = STATUS[application.status];
  const remaining = completion.total - completion.verified;

  return (
    <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="t-h2">Good afternoon, {firstName}</h1>
          <p className="t-muted mt-2">
            {answers.destination ?? "Destination not set"}
            {corridor ? ` · ${corridor.visa_name}` : ""}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <section className="mt-6 rounded-md border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-8">
          <CompletionRing pct={completion.pct} />
          <div className="min-w-[280px] flex-1">
            <h2 className="t-h3">
              {completion.verified} of {completion.total} documents verified
            </h2>
            <p className="t-muted mt-2">
              {remaining > 0
                ? `${remaining} item${remaining === 1 ? "" : "s"} left. Upload them and your application goes straight to our team.`
                : "Everything is verified. Your file is ready to submit."}
            </p>
            <p className="special mt-3">{VERIFIED_MEANS.toUpperCase()}</p>
            <Button asChild className="mt-4">
              <Link href="/app/documents">
                {remaining > 0 ? (
                  <>
                    <Upload /> Upload next document
                  </>
                ) : (
                  <>
                    Review and submit <ArrowRight />
                  </>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="t-title">Application status</h2>
          </div>
          <div className="p-6">
            <p className="t-title">{status.label}</p>
            <p className="t-muted mt-2">{status.blurb}</p>
            <p className="special mt-4">CASE {application.case_ref.toUpperCase()}</p>
          </div>
        </section>

        <section className="rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="t-title">Your trip at a glance</h2>
            <Link
              href="/app/agent"
              className="text-base font-semibold text-brand-text hover:underline"
            >
              Edit
            </Link>
          </div>
          <dl className="p-6">
            {[
              ["Destination", answers.destination],
              ["Purpose", answers.purpose],
              ["Target dates", answers.dates],
              ["Budget", answers.budget],
              ["Travel party", answers.companions],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0"
              >
                <dt className="t-body text-ink-2">{label}</dt>
                <dd className="text-right text-base font-semibold">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="t-title">Your case handler</h2>
          </div>
          <div className="p-6">
            <p className="t-muted">
              You can message a person at any point, not only when we message you.
            </p>
            <Button
              variant="neutral"
              size="block"
              className="mt-4"
              disabled
              title="Messaging arrives in the next slice"
            >
              <MessageSquare /> Open messages
            </Button>
            <Button asChild variant="tertiary" size="block" className="mt-3">
              <Link href="/app/agent">
                <Sparkles /> Ask the agent
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
