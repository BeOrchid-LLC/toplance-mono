import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { MessageComposer } from "@/components/app/message-composer";
import { MessageThread } from "@/components/app/message-thread";
import { getApplication, getProfile } from "@/lib/data/applications";
import { markNotificationsRead } from "@/lib/notifications/notify";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";
import { withLocalePrefix } from "@/lib/i18n/paths";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: MESSAGES.title[locale] };
}

/**
 * The traveller's side of the thread — outside the `(corridor)` route
 * group for the same reason `/app/profile` is: this is a conversation,
 * not a step in the application journey, so it does not open with the
 * corridor header.
 */
export default async function MessagesPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const profile = await getProfile();
  const application = await getApplication();
  if (!profile || !application) redirect(withLocalePrefix("/go", await getLocale()));

  // Pre-intake there is no case to message anyone about yet.
  if (!application.intakeComplete) redirect(withLocalePrefix("/app/agent", await getLocale()));

  const thread = await listMessages(application.id);

  // Marking the thread read is a write, not something the page's own
  // response should wait on — moved off the render path, same idiom as
  // the notifications bell.
  after(() => markThreadRead(application.id, "traveler"));

  // And the notifications that announced those messages. This page is
  // the only thing that marks them now: they left the bell so the
  // Messages badge could own them, which means opening the bell no
  // longer clears them and opening the thread must. It is also what
  // cancels the buffered email — `markNotificationsRead` nulls
  // `emailDueAt` in the same statement — so a traveller who reads the
  // thread inside the buffer is never emailed about it.
  after(() => markNotificationsRead(profile.id, ["message_received"]));

  return (
    <main id="main">
      <Shell className="py-8 md:py-10">
        <Panel>
          <PanelHeader label={MESSAGES.panelLabel[locale]} />
          <PanelBody>
            <MessageThread messages={thread} />
            {/* The composer never waits. A traveller can write from the
                moment intake is done — `canWriteMessages` stopped
                requiring a handler — so an unclaimed case gets the
                notice *above* the box rather than instead of it: it
                sets the expectation about how fast a reply comes,
                which is a different job from refusing the message. */}
            <div className="mt-5 border-t border-border pt-5">
              {!application.assigneeId && (
                <p className="t-muted mb-4 max-w-[74ch]">
                  {MESSAGES.unclaimedNotice[locale]}
                </p>
              )}
              <MessageComposer applicationId={application.id} />
            </div>
          </PanelBody>
        </Panel>
      </Shell>
    </main>
  );
}
