import { refreshFxRates } from "@/lib/fx/rates";

/**
 * The daily exchange-rate refresh.
 *
 * One provider call fills the whole table — every currency is quoted
 * against a single base, so a traveller's page view crosses two cached
 * rows and never spends a metered request. Same shape and the same
 * `CRON_SECRET` guard as the companion digest and the VisaList warmer.
 *
 * *Scheduling is deploy-time config*, like the other jobs here: the repo
 * ships as a container, so the trigger is a Coolify scheduled task (or
 * anything else) hitting this URL with the `Authorization` header below.
 * Daily is the intended cadence, and `RATE_STALE_AFTER_HOURS` is set to
 * two days so that one missed run degrades nothing — the figures simply
 * keep yesterday's date on them until a run succeeds.
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

  const result = await refreshFxRates();

  if (!result) {
    // Not an error, and deliberately a 200: with no key configured, or
    // with the provider refusing, the product shows fees in the
    // mission's own currency and nothing else — which is the state it
    // was in before any of this existed. A scheduler that retries on a
    // 5xx would be retrying something that is not broken.
    return Response.json({
      updated: null,
      reason: process.env.OPEN_EXCHANGE_RATES_APP_ID
        ? "the rates provider did not answer"
        : "no OPEN_EXCHANGE_RATES_APP_ID set",
    });
  }

  return Response.json(result);
}
