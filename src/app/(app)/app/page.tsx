import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Shell } from "@/components/shared/shell";
import { CompletionRing } from "@/components/app/completion-ring";
import { STATUS, VERIFIED_MEANS } from "@/lib/domain/status";
import {
  completionOf,
  getDocuments,
  getIntakeAnswers,
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * A ruled section, not a card. Guideline §6: a screen of bordered boxes
 * is the failure mode, and this screen was four of them under a fifth.
 * The strong rule opens a set; the hairlines inside it separate members.
 */
function Block({
  label,
  action,
  className,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between gap-4 border-t border-border-strong pt-4">
        <h2 className="special-caps">{label}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

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

  const [docs, answers] = await Promise.all([
    getDocuments(application.id),
    getIntakeAnswers(application.id),
  ]);

  const completion = completionOf(docs);
  const status = STATUS[application.status];
  const remaining = completion.total - completion.verified;
  const done = remaining <= 0;

  return (
    <main>
      <Shell className="py-10 md:py-12">
        {/*
          The heading is the next action, not a greeting. It used to read
          "Good afternoon" from a hardcoded string, which was wrong for
          most of the day and told the traveller nothing either way. The
          corridor, the status and the case reference are all on the card
          above this, so the dashboard's own job is the one sentence
          about what happens next.
        */}
        <section className="flex flex-wrap items-center gap-x-10 gap-y-8">
          <CompletionRing pct={completion.pct} />
          <div className="min-w-[280px] max-w-[62ch] flex-1">
            <h1 className="t-h2">
              {done
                ? "Everything is verified"
                : `${remaining} document${remaining === 1 ? "" : "s"} left`}
            </h1>
            <p className="t-body-lg mt-3 text-ink-2">
              {done
                ? "Your file is ready to submit. Nothing else is waiting on you."
                : `${completion.verified} of ${completion.total} verified. Upload the rest and your application goes straight to our team.`}
            </p>
            <p className="special mt-4 text-ink-2">{VERIFIED_MEANS}</p>
            <Button asChild className="mt-6">
              <Link href="/app/documents">
                {done ? (
                  <>
                    Review and submit <ArrowRight />
                  </>
                ) : (
                  <>
                    <Upload /> Upload next document
                  </>
                )}
              </Link>
            </Button>
          </div>
        </section>

        <Block label="Application status" className="mt-16">
          <p className="t-title">{status.label}</p>
          <p className="t-muted mt-2 max-w-[74ch]">{status.blurb}</p>
        </Block>

        {/* Two related sets, ruled apart rather than boxed. The gap does
            the separating on desktop; stacked on a phone each keeps its
            own strong top rule, so the boundary survives the reflow. */}
        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-x-16">
          <Block
            label="Your trip at a glance"
            action={
              <Link
                href="/app/agent"
                className="text-base font-semibold text-brand-text hover:underline"
              >
                Edit
              </Link>
            }
          >
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
                  className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-0"
                >
                  <dt className="t-body text-ink-2">{label}</dt>
                  <dd className="text-right text-base font-semibold">
                    {value ?? <Awaiting />}
                  </dd>
                </div>
              ))}
            </dl>
          </Block>

          <Block label="Your case handler">
            <p className="t-muted max-w-[62ch]">
              You can message a person at any point, not only when we message
              you.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="neutral"
                disabled
                title="Messaging arrives in the next slice"
              >
                <MessageSquare /> Open messages
              </Button>
              <Button asChild variant="tertiary">
                <Link href="/app/agent">
                  <Sparkles /> Ask the agent
                </Link>
              </Button>
            </div>
          </Block>
        </div>
      </Shell>
    </main>
  );
}
