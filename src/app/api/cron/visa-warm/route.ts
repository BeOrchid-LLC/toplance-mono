import { NATIONALITY_ISO } from "@/lib/domain/corridors";
import { fetchPassport, nextPassportToWarm } from "@/lib/visa/visalist";

/**
 * Milestone 03 — the warming job.
 *
 * Populates VisaList's cache ahead of demand, so that a traveller's page
 * view never spends a metered request. That is the non-functional
 * requirement the PRD states outright, and the reason this route exists
 * rather than letting the provider fetch on first sight.
 *
 * **One passport per invocation, deliberately.** The Basic tier meters
 * one request an hour, and the endpoint is keyed on the passport rather
 * than the corridor — a single call returns every destination that
 * passport can reach. So the whole product's tourism entry rules are
 * five calls, and pointing an hourly scheduler at this route stays
 * inside the tier by construction rather than by a rate limiter someone
 * has to keep correct.
 *
 * The plan budgeted eight hours for this and worried about the rate
 * limit stalling coverage. Neither turned out to be the shape of the
 * problem: it is one call per passport, not one per corridor, which is
 * only knowable by having made the call.
 *
 * *Scheduling is deploy-time config, not this file's job* — the repo
 * deploys as a container, so the trigger is a Coolify scheduled task or
 * any scheduler hitting this URL on a timer with the `Authorization`
 * header checked below. Hourly is the intended cadence; slower simply
 * warms more slowly, and faster is refused by the vendor rather than by
 * us.
 *
 * ## The caveat worth knowing
 *
 * The cache is module state, so each server instance warms its own and a
 * restart empties it — the same design (and the same limitation) as
 * `travelbuddy.ts`. On one container that is exactly right. On several,
 * each warms independently and the request count multiplies by the
 * instance count, which is the point at which this should move to a
 * table. Recorded here rather than solved, because a shared cache is a
 * schema change and this deploys as a single container today.
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

  if (!process.env.VISALIST_API_KEY) {
    // Not an error. The provider degrades to silence without a key and
    // so does its warming — same stance as `aiEnabled()`.
    return Response.json({ warmed: null, reason: "no VISALIST_API_KEY set" });
  }

  // The passports the product actually serves, which is what the intake
  // agent will accept as an answer.
  const nationalities = Object.values(NATIONALITY_ISO);
  const iso = nextPassportToWarm(nationalities);

  if (!iso) {
    return Response.json({
      warmed: null,
      reason: "every passport already holds a live answer",
      passports: nationalities.length,
    });
  }

  const response = await fetchPassport(iso, { force: true });

  return Response.json({
    warmed: iso,
    destinations: response?.visaRequirements.length ?? 0,
    // Null means the call failed or stood down; the provider has already
    // logged why and cached the failure, so the next run moves on rather
    // than retrying this passport immediately.
    ok: response !== null,
    passports: nationalities.length,
  });
}
