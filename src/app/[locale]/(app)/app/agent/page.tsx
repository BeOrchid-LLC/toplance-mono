import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IntakeAgent } from "@/components/app/intake-agent";
import {
  getIntakeAnswers,
  getApplication,
  getProfile,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import { aiEnabled } from "@/lib/ai/models";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getLocale } from "@/lib/i18n/server";
import { INTAKE_UI } from "@/lib/i18n/intake-ui";

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
  if (!profile || !application) redirect("/go");

  const answers = await getIntakeAnswers(application.id);

  // Decided on the server: the key is server-only, and the client needs
  // to know which of the two agents it is rendering before it renders.
  return (
    <IntakeAgent
      applicationId={application.id}
      initialAnswers={answers}
      fullName={profile.fullName}
      aiEnabled={aiEnabled()}
    />
  );
}
