import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/shared/setup-notice";
import { homeFor } from "@/lib/auth/routes";
import { getActor } from "@/lib/data/applications";
import { hasDatabaseEnv } from "@/lib/db/client";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

/**
 * The role dispatcher. Roles live in Postgres, so neither the proxy nor
 * the static marketing page can answer "where does this person belong" —
 * this page can, and it is the only place that does. The generic auth
 * doors, the landing page's signed-in chrome and anything else that
 * holds a session but not a role sends people here; nobody ever sees it.
 */
export default async function GoPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const actor = await getActor();
  // The proxy already walks signed-out visitors to sign-in; this is the
  // belt to that brace, for a session whose profile row could not load.
  if (!actor) redirect("/sign-in?next=/go");

  redirect(homeFor(actor.role));
}
