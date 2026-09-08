import { redirect } from "next/navigation";

import { requireStaffAction } from "@/lib/auth/staff-gate";
import { signedRequirementUrl } from "@/lib/data/kyb";
import { isUuid } from "@/lib/domain/uuid";

/**
 * One filed KYB document, opened.
 *
 * A route handler rather than a server action so the checklist can be a
 * plain `<a href target="_blank">`. A server action returning the URL
 * would have to be followed by `window.open`, which arrives after an
 * await and is exactly the shape browsers block as an unrequested
 * popup — the operator would click a link and nothing would happen.
 *
 * It redirects to the ten-minute signed URL rather than streaming the
 * bytes: the object store is the thing that should serve them, and the
 * short window is documented on `signedDocumentUrl`. What matters is
 * that the guard runs first — the bucket is private, and the signature
 * is only ever minted for a caller this gate has already accepted.
 *
 * `requireStaffAction` rather than `requireStaffConsole`, because this
 * is not a page: the console gate redirects to a sign-in screen, which
 * is the wrong answer to a fetch for a PDF.
 */

// A session decides the answer, so nothing here may be cached.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; docKey: string }> }
) {
  const gate = await requireStaffAction();
  if ("error" in gate) return Response.json({ error: gate.error }, { status: 403 });

  const { orgId, docKey } = await params;
  // Answered as "no such document" rather than as a bad request: the two
  // are one sentence to the caller, and separating them would tell
  // somebody guessing which agency uuids exist.
  if (!isUuid(orgId)) return new Response(null, { status: 404 });

  const url = await signedRequirementUrl(orgId, decodeURIComponent(docKey));
  if (!url) return new Response(null, { status: 404 });

  redirect(url);
}
