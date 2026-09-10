import { redirect } from "next/navigation";

import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { withLocalePrefix } from "@/lib/i18n/paths";
import { getLocale } from "@/lib/i18n/server";

// Reads a session to decide where to send the visitor, so it is never
// prerendered.
export const dynamic = "force-dynamic";

/**
 * The platform console's landing page.
 *
 * This was the case queue: every application in the product, with a
 * reviewer's claim button beside each one. The v1.3 tenancy moved review
 * into the agency, so the queue has no reader — and the screen behind it
 * loaded documents directly rather than through
 * `requireApplicationAccess`, which made it the gap in the boundary
 * rather than merely a page nobody should open.
 *
 * A redirect rather than a deletion because `/ops` is bookmarked and
 * printed in the corridor approval runbook.
 *
 * Where it lands is the rank's question, not the URL's. The client asked
 * on 2026-09-08 for the dashboard to be the console's front door, and it
 * is director-only — so sending everybody there would land every
 * reviewer on `OwnerAccessRefused`, which is a worse first screen than
 * the one they had. A reviewer keeps route curation, which is what
 * `/ops` has meant for them all along and what the dashboard's own
 * refusal offers as the way back.
 *
 * The gate runs here rather than being assumed: a visitor who is not
 * staff at all is sent to `/ops/corridors`, which renders the honest
 * refusal — the same screen they reached before this page read anything.
 */
export default async function OpsHome() {
  const gate = await requireStaffConsole();

  if (gate.decision === "ok" && isOwner(gate.actor)) redirect(withLocalePrefix("/ops/dashboard", await getLocale()));

  redirect(withLocalePrefix("/ops/corridors", await getLocale()));
}
