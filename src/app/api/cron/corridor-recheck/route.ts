import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { recheckCorridors } from "@/lib/data/drift";

/**
 * Milestone 09 — the drift re-check.
 *
 * Re-reads every live corridor's source page and raises a pending
 * version for each one that moved, so an owner re-reads and re-approves.
 * The decision itself lives in `@/lib/data/drift`; this route is the
 * scheduler's door and the place the two trails get written.
 *
 * Both trails, because they answer different questions.
 * `toplance.corridor_drift_detected` is the product signal — how often
 * do missions actually change their paperwork, which is what decides
 * whether a 90-day staleness window is right. The `audit_log` entry is
 * the compliance one: this is a write to reference data with no human
 * behind it, and it should be as attributable as an owner's approval,
 * with a null actor saying plainly that the system did it.
 *
 * Daily is the intended cadence. Nothing breaks at a slower one — a
 * corridor simply ages, and the traveller's screen already says how
 * long it has been since anyone checked.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await recheckCorridors();

  for (const drift of result.drifted) {
    await track("toplance.corridor_drift_detected", {
      corridorId: drift.corridorId,
      draftId: drift.draftId,
      sourceUrl: drift.sourceUrl,
    });
    // Null actor: nobody did this. That is the honest record for a
    // machine-raised revision, and the ops screen can tell it apart from
    // an owner's own draft.
    await audit(null, "corridor.drift_detected", "corridor", drift.corridorId, {
      draftId: drift.draftId,
      sourceUrl: drift.sourceUrl,
    });
  }

  return Response.json({
    checked: result.checked,
    drifted: result.drifted.length,
    baselined: result.baselined,
    failed: result.failed.length,
  });
}
