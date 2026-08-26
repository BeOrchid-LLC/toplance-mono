import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { ChatMarkdown } from "@/components/app/chat-markdown";
import {
  getCorridorFor,
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";
import { arrivalChecklist, renewalGuidance } from "@/lib/domain/companion";
import { refreshLocalTipsIfStale } from "@/lib/ai/companion-tips";
import { hasDatabaseEnv } from "@/lib/db/client";
import { SetupNotice } from "@/components/shared/setup-notice";
import { track } from "@/lib/analytics/track";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "After you land" };

export default async function CompanionPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  const application = await getOrCreateApplication();
  if (!profile || !application) redirect("/sign-in?next=/app/companion");

  // This page is what "approved" unlocks. Anyone who lands here before
  // that — a stale bookmark, a link shared too early — goes back to the
  // dashboard rather than seeing a checklist built against no corridor.
  if (application.status !== "approved") redirect("/app");

  const corridor = await getCorridorFor(application.id);
  // Approval only happens once a corridor has resolved, so this should
  // never be null in practice — but a checklist and renewal card have no
  // honest content to show without one, so the same redirect applies
  // rather than rendering a page that guesses at a destination.
  if (!corridor) redirect("/app");

  const checklist = arrivalChecklist(corridor.destinationIso, corridor.purpose);
  const renewal = renewalGuidance(corridor, application.decidedAt);

  // Regenerates (or reuses) the cached tips — the same helper the
  // weekly digest cron calls, so the two can never disagree on what
  // "stale" means or how a refresh gets written.
  const tips = await refreshLocalTipsIfStale(application.id, profile.id);

  await track("toplance.companion_viewed", { applicationId: application.id }, profile.id);

  return (
    <main>
      <Shell className="py-8 md:py-10">
        <h1 className="d-lg text-ink">After you land</h1>
        <p className="t-body-lg mt-2 max-w-[62ch] text-ink-2">
          Your approval is the start of a new file, not the end of this one —
          here is what to do in your first weeks, and what to check before
          your visa needs renewing.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            {/* ---- arrival checklist ---- */}
            <Panel>
              <PanelHeader
                label="Arrival checklist"
                aside={
                  <Badge variant="neutral">
                    <ClipboardList className="size-3.5" aria-hidden />{" "}
                    <span className="num">{checklist.length}</span> steps
                  </Badge>
                }
              />
              <PanelBody className="pt-2">
                <ul>
                  {checklist.map((item) => (
                    <li
                      key={item.title}
                      className="border-b border-border py-4 last:border-b-0"
                    >
                      <p className="t-title">{item.title}</p>
                      <p className="t-muted mt-1">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </PanelBody>
            </Panel>

            {/* ---- local tips ---- */}
            <Panel>
              <PanelHeader
                label="Local tips"
                aside={
                  <Badge variant="brand">
                    <Sparkles /> AI
                  </Badge>
                }
              />
              <PanelBody>
                {tips ? (
                  <ChatMarkdown>{tips.markdown}</ChatMarkdown>
                ) : (
                  <p className="t-muted">
                    Nothing generated yet. Your checklist above is ready
                    either way — local tips appear here once they have
                    been put together.
                  </p>
                )}
              </PanelBody>
            </Panel>
          </div>

          <div className="grid gap-6">
            {/* ---- renewal ---- */}
            <Panel>
              <PanelHeader
                label="Renewal"
                aside={
                  <Badge variant="neutral">
                    <CalendarClock className="size-3.5" aria-hidden /> Check
                    ahead
                  </Badge>
                }
              />
              <PanelBody>
                <p className="t-body">{renewal}</p>
              </PanelBody>
            </Panel>

            {/* ---- destination ---- */}
            <Panel>
              <PanelHeader label="Your visa" />
              <PanelBody className="pt-2">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-ink-3" aria-hidden />
                  <p className="t-body font-semibold">{corridor.visaName}</p>
                </div>
                <p className="t-muted mt-2">Approved and on file.</p>
              </PanelBody>
            </Panel>
          </div>
        </div>
      </Shell>
    </main>
  );
}
