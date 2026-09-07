import { redirect } from "next/navigation";

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
 */
export default function OpsHome() {
  redirect("/ops/corridors");
}
