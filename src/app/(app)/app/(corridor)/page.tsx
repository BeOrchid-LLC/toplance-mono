import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { CompletionRing } from "@/components/app/completion-ring";
import { STATUS, VERIFIED_MEANS } from "@/lib/domain/status";
import {
  completionOf,
  getDocuments,
  getIntakeAnswers,
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";
import { unreadCountFor } from "@/lib/data/messages";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * An answer nobody has given yet. The same dashed rule the landing page
 * uses for a figure nobody has earned — §7 forbids inventing the number,
 * and an em dash reads as a value rather than as an absence.
 */
function Awaiting() {
  return (
    <span
      aria-label="Not answered yet"
      className="inline-block w-[64px] border-b-2 border-dashed border-border-strong align-middle"
    />
  );
}

export default async function DashboardPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  const application = await getOrCreateApplication();
  if (!profile || !application) redirect("/sign-in?next=/app");

  // Intake first — there is nothing meaningful to show before it.
  if (!application.intakeComplete) redirect("/app/agent");

  const [docs, answers, unreadMessages] = await Promise.all([
    getDocuments(application.id),
    getIntakeAnswers(application.id),
    unreadCountFor(application.id, "traveler"),
  ]);

  const completion = completionOf(docs);
  const status = STATUS[application.status];
  // Three moments, in order: uploads outstanding, everything uploaded
  // but still being checked, everything verified. Only the first leaves
  // the traveller something to do.
  const toUpload = completion.total - completion.collected;
  const done = completion.total > 0 && completion.verified >= completion.total;
  const allUploaded = toUpload <= 0;

  return (
    <main>
      <Shell className="py-8 md:py-10">
        {/*
          The lead card is the next action, not a greeting. The corridor,
          the status and the case reference are all on the laminate above
          this, so the dashboard's own job is the one sentence about what
          happens next.
        */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Panel>
            <PanelBody className="flex h-full flex-wrap items-center gap-x-10 gap-y-8 py-8 sm:px-8 sm:py-10">
              <CompletionRing pct={completion.pct} />
              <div className="min-w-[260px] max-w-[58ch] flex-1">
                <h1 className="t-h2">
                  {done
                    ? "Everything is verified"
                    : allUploaded
                      ? "Everything is uploaded"
                      : `${toUpload} document${toUpload === 1 ? "" : "s"} to upload`}
                </h1>
                <p className="t-body-lg mt-3 text-ink-2">
                  {done
                    ? "Your file is ready to submit. Nothing else is waiting on you."
                    : allUploaded
                      ? `${completion.verified} of ${completion.total} verified. The rest are being checked — nothing is waiting on you.`
                      : `${completion.collected} of ${completion.total} uploaded. Upload the rest and your application goes straight to our team.`}
                </p>
                <p className="special mt-4 text-ink-2">{VERIFIED_MEANS}</p>
                <Button asChild className="mt-6">
                  <Link href="/app/documents">
                    {done ? (
                      <>
                        Review and submit <ArrowRight />
                      </>
                    ) : allUploaded ? (
                      <>
                        See your documents <ArrowRight />
                      </>
                    ) : (
                      <>
                        <Upload /> Upload next document
                      </>
                    )}
                  </Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>

          {/* Status and handler share a sheet: both answer "who has my
              file", and side by side with the ring they fill the column
              without inventing a third fact to pad it. */}
          <Panel>
            <PanelHeader label="Application status" />
            <PanelBody>
              <StatusBadge status={application.status} />
              <p className="t-muted mt-3">{status.blurb}</p>
            </PanelBody>
            <PanelHeader label="Your case handler" className="border-t" />
            <PanelBody>
              <p className="t-muted">
                You can message a person at any point, not only when we
                message you.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="neutral" size="sm">
                  <Link href="/app/messages">
                    <MessageSquare /> Open messages
                    {unreadMessages > 0 && (
                      <Badge variant="brand">
                        <span className="num">{unreadMessages}</span>
                      </Badge>
                    )}
                  </Link>
                </Button>
                <Button asChild variant="tertiary" size="sm">
                  <Link href="/app/agent">
                    <Sparkles /> Ask the agent
                  </Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              label="Your trip at a glance"
              aside={
                <Link
                  href="/app/agent"
                  className="text-base font-semibold text-brand-text hover:underline"
                >
                  Edit
                </Link>
              }
            />
            <PanelBody className="pt-2">
              <dl>
                {(
                  [
                    ["Destination", answers.destination],
                    ["Purpose", answers.purpose],
                    ["Target dates", answers.dates],
                    ["Budget", answers.budget],
                    ["Travel party", answers.companions],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-0 last:pb-0"
                  >
                    <dt className="t-body text-ink-2">{label}</dt>
                    <dd className="text-end text-base font-semibold">
                      {value ?? <Awaiting />}
                    </dd>
                  </div>
                ))}
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              label="Traveler profile"
              aside={
                <Badge variant="brand">
                  <Sparkles /> Collected by the agent
                </Badge>
              }
            />
            <PanelBody>
              <p className="t-muted">
                Everything the agent knows about you and this trip in one
                place — who is traveling, what to plan around, and the
                requirement your answers matched.
              </p>
              <Button asChild variant="neutral" size="sm" className="mt-4">
                <Link href="/app/profile">
                  Open profile <ArrowRight />
                </Link>
              </Button>
            </PanelBody>
          </Panel>
        </div>
      </Shell>
    </main>
  );
}
