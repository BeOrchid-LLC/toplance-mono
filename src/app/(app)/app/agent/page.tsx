import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IntakeAgent } from "@/components/app/intake-agent";
import {
  getIntakeAnswers,
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Intake agent" };

export default async function AgentPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  const application = await getOrCreateApplication();
  if (!profile || !application) redirect("/sign-in?next=/app/agent");

  const answers = await getIntakeAnswers(application.id);
  const firstName = profile.fullName.split(" ")[0] ?? "";

  return (
    <IntakeAgent
      applicationId={application.id}
      initialAnswers={answers}
      firstName={firstName}
    />
  );
}
