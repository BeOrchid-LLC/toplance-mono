import { getCorridorFor } from "@/lib/data/applications";
import { countDueForDigest, travellersDueForDigest } from "@/lib/data/digest";
import { travellersDueForExpiryReminder } from "@/lib/data/expiry";
import { refreshLocalTipsIfStale } from "@/lib/ai/companion-tips";
import { arrivalChecklist } from "@/lib/domain/companion";
import { appUrl, notify } from "@/lib/notifications/notify";
import { track } from "@/lib/analytics/track";

/**
 * How many recipients one invocation processes. Each one is a
 * potentially serial round trip — a stale-tips check, maybe an OpenAI
 * call inside `refreshLocalTipsIfStale`, then an email — inside a single
 * HTTP handler with a function timeout. Unbounded, that loop's cost and
 * latency both grow with the approved-traveller count; this caps both.
 *
 * The query below orders the eligible list oldest-cache-first (nulls —
 * never generated at all — sort ahead of everything), so the travellers
 * most overdue for a refresh are the ones a capped run actually reaches.
 * At more than `CRON_BATCH_LIMIT` eligible travellers, a full sweep
 * spans more than one weekly run — acceptable for a weekly digest,
 * where a traveller catching it a week later than another is a mild
 * ordering effect, not a broken promise. Revisit only if the eligible
 * count regularly exceeds a handful of runs' worth.
 */
const CRON_BATCH_LIMIT = 25;

/**
 * The post-arrival digest: one email per approved traveller who is due
 * one, pointing them back at `/app/companion`.
 *
 * *Scheduling this route is deploy-time config, not this file's job.*
 * Nothing here decides when it runs — this repo deploys as a container
 * (see `Dockerfile`), so the trigger is a Coolify scheduled task, or any
 * scheduler hitting this URL on a timer. Whichever it is, it must send
 * the `Authorization` header this route checks below.
 *
 * But the schedule is only a *poll*, not the cadence. Each traveller
 * chooses daily, weekly or monthly (brief item 16), and the query below
 * sends only to those whose last digest is older than their own
 * interval. Point a scheduler at this daily and every frequency is
 * honoured; point it hourly by mistake and nobody is spammed. The one
 * part of this system that cannot be tested — external config — is
 * therefore also the part that cannot get the cadence wrong.
 *
 * `CRON_SECRET` is the only guard — this route is reachable with no
 * Clerk session at all (it is a server calling a server, not a browser),
 * so it is listed in `src/proxy.ts`'s public matcher rather than
 * redirected to sign-in. The bearer secret is what stands between "the
 * scheduler" and "anyone who finds the URL", which is why a request with
 * no secret configured at all is refused outright (503) rather than
 * treated as open.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  // A plain string comparison, not a timing-safe one — the same
  // convention the rest of this codebase uses wherever a bearer value is
  // checked (there is no other precedent for `crypto.timingSafeEqual`
  // here); a constant-time compare would be the stricter choice for a
  // secret this route is the sole guard for, but is left as a possible
  // future hardening rather than introduced ad hoc in this one route.
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Who is owed one, and how many in total. Both live in
  // `@/lib/data/digest` because the cadence is SQL a database test can
  // reach, and this handler is not.
  const eligibleCount = await countDueForDigest();
  const recipients = await travellersDueForDigest(CRON_BATCH_LIMIT);

  let checked = 0;
  let notified = 0;

  for (const { applicationId, travelerId } of recipients) {
    checked += 1;

    try {
      // Not a person — the digest is triggered by the scheduler, not a
      // signed-in traveller viewing their own page, so there is nobody
      // to credit a regeneration to.
      const tips = await refreshLocalTipsIfStale(applicationId, null);

      const highlights = tips
        ? summaryLines(tips.markdown)
        : await checklistHighlights(applicationId);

      if (highlights.length === 0) continue;

      await notify(
        travelerId,
        "companion_digest",
        { url: appUrl("/app/companion"), highlights },
        applicationId
      );
      notified += 1;
    } catch (error) {
      console.error(
        `[cron/companion] could not send the digest for application ${applicationId}`,
        error
      );
    }
  }

  const expiry = await remindExpiringVisas();

  // `eligible` is the true population size (a cheap COUNT, no per-row
  // work); `skipped` is what this run's cap left for a later run to
  // pick up — both cheap to report, and what makes a shrinking or
  // growing backlog visible without querying the database by hand.
  return Response.json({
    checked,
    notified,
    eligible: eligibleCount,
    skipped: Math.max(0, eligibleCount - checked),
    expiryReminded: expiry.reminded,
  });
}

/**
 * The second sweep: warn travellers whose visa is running out.
 *
 * It rides this route rather than getting one of its own because a new
 * route means new deploy-time scheduler config, and that config is the
 * single part of this system no test can reach. One URL on a timer stays
 * one URL on a timer.
 *
 * Sharing the handler is all it shares. Who is due is decided by
 * `travellersDueForExpiryReminder`, which deliberately ignores the
 * digest preference: `companionDigest: "off"` silences weekly
 * orientation mail, never a warning that someone's leave to remain is
 * ending. A failure on one traveller is logged and stepped over, the
 * same as the digest loop above — one bad row must not cost everybody
 * else their notice.
 */
async function remindExpiringVisas(): Promise<{ reminded: number }> {
  let reminded = 0;

  const due = await travellersDueForExpiryReminder(CRON_BATCH_LIMIT);

  for (const row of due) {
    try {
      await notify(
        row.travelerId,
        "visa_expiring",
        {
          visaName: row.visaName,
          expiresOn: row.expiresOn,
          daysOut: row.daysOut,
          url: appUrl("/app/companion"),
        },
        row.applicationId
      );

      // Tracked after the notify, not before: the notification row is
      // what stops the next run repeating this notice, so an event
      // claiming a reminder the traveller never got would be a lie the
      // dedupe then makes permanent.
      await track(
        "toplance.expiry_reminder_sent",
        { applicationId: row.applicationId, daysOut: row.daysOut },
        null
      );
      reminded += 1;
    } catch (error) {
      console.error(
        `[cron/companion] could not send the expiry reminder for application ${row.applicationId}`,
        error
      );
    }
  }

  return { reminded };
}

/** The checklist's own item titles, when there are no AI tips to summarise instead. */
async function checklistHighlights(applicationId: string): Promise<string[]> {
  const corridor = await getCorridorFor(applicationId);
  if (!corridor) return [];
  return arrivalChecklist(corridor.destinationIso, corridor.purpose)
    .slice(0, 3)
    .map((item) => item.title);
}

/**
 * The first few non-empty lines of a markdown block, stripped of the
 * bullet and heading marks that would otherwise show up literally in a
 * plain-text email — a light digest, not the whole page.
 */
function summaryLines(markdown: string, max = 3): string[] {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^[#>*-]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max);
}
