import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IntakeAgent } from "@/components/app/intake-agent";
import {
  getDocuments,
  getIntakeAnswers,
  getApplication,
  getProfile,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import { aiEnabled } from "@/lib/ai/models";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getLocale } from "@/lib/i18n/server";
import { INTAKE_UI } from "@/lib/i18n/intake-ui";
import { withLocalePrefix } from "@/lib/i18n/paths";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: INTAKE_UI.pageTitle[locale] };
}

export default async function AgentPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  const application = await getApplication();
  if (!profile || !application) redirect(withLocalePrefix("/go", await getLocale()));

  const answers = await getIntakeAnswers(application.id);
  // Where the completion bar sends them. Two of the three ways intake can
  // finish build no checklist at all, and the upload screen has nothing
  // to show those travellers — see `intakeNextStep`. Re-read on the
  // `router.refresh()` the agent fires the moment it finishes; that
  // refresh races the bar's first paint, which the prop's own comment
  // in `intake-agent.tsx` explains.
  const hasChecklist = (await getDocuments(application.id)).length > 0;

  // Decided on the server: the key is server-only, and the client needs
  // to know which of the two agents it is rendering before it renders.
  return (
    <IntakeAgent
      applicationId={application.id}
      initialAnswers={answers}
      fullName={profile.fullName}
      aiEnabled={aiEnabled()}
      hasChecklist={hasChecklist}
    />
  );
}
