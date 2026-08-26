import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, profiles } from "@/lib/db/schema";
import { getCorridorFor } from "@/lib/data/applications";
import { refreshLocalTipsIfStale } from "@/lib/ai/companion-tips";
import { arrivalChecklist } from "@/lib/domain/companion";
import { appUrl, notify } from "@/lib/notifications/notify";

/**
 * The weekly post-arrival digest: one email per approved traveller who
 * has not turned it off, pointing them back at `/app/companion`.
 *
 * *Scheduling this route is deploy-time config, not this file's job.*
 * Nothing here decides when it runs — a Vercel Cron entry in
 * `vercel.json` (or an external scheduler hitting this URL with `curl`
 * on a timer) is what actually triggers a Tuesday-morning request.
 * Whichever it is, it must send the `Authorization` header this route
 * checks below.
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

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Approved, and not opted out. `notificationPrefs` defaults to `{}`,
  // so a traveller who has never touched the setting has no
  // `companionDigest` key at all — `IS DISTINCT FROM 'off'` reads that
  // missing key as the documented default (weekly), the same read
  // `EditableDigest` and the profile page give it, rather than `!= 'off'`
  // which SQL would silently evaluate to NULL (and so exclude) for a
  // key that was never set.
  const recipients = await db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.travelerId))
    .where(
      and(
        eq(applications.status, "approved"),
        sql`(${profiles.notificationPrefs}->>'companionDigest') is distinct from 'off'`
      )
    );

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

  return Response.json({ checked, notified });
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
