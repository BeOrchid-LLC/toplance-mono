import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { MessageComposer } from "@/components/app/message-composer";
import { MessageThread } from "@/components/app/message-thread";
import { getOrCreateApplication, getProfile } from "@/lib/data/applications";
import { listMessages, markThreadRead } from "@/lib/data/messages";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Messages" };

/**
 * The traveller's side of the thread — outside the `(corridor)` route
 * group for the same reason `/app/profile` is: this is a conversation,
 * not a step in the application journey, so it does not open with the
 * corridor laminate.
 */
export default async function MessagesPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  const application = await getOrCreateApplication();
  if (!profile || !application) redirect("/sign-in?next=/app/messages");

  // Pre-intake there is no case to message anyone about yet.
  if (!application.intakeComplete) redirect("/app/agent");

  const thread = await listMessages(application.id);

  // Marking the thread read is a write, not something the page's own
  // response should wait on — moved off the render path, same idiom as
  // the notifications bell.
  after(() => markThreadRead(application.id, "traveler"));

  return (
    <main>
      <Shell className="py-8 md:py-10">
        <Panel>
          <PanelHeader label="Messages" />
          <PanelBody>
            <MessageThread messages={thread} />
            <div className="mt-5 border-t border-border pt-5">
              <MessageComposer applicationId={application.id} />
            </div>
          </PanelBody>
        </Panel>
      </Shell>
    </main>
  );
}
