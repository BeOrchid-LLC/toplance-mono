import "server-only";

import {
  destinationNameFor,
  fcdoSlugFor,
  stateDeptAdvisoryFor,
  toFcdoAdvisory,
  type Advisory,
} from "@/lib/safety/advisories";

/**
 * Reading the two advisory sources over the network.
 *
 * Split from `./advisories` so every mapping rule stays testable without
 * a network, and this file holds only the part that can fail for reasons
 * nobody controls.
 *
 * Nothing here throws, and nothing here needs a key — both sources are
 * open government endpoints. A source that is down, slow, or answering
 * with a maintenance page contributes nothing and the other still
 * counts; both failing yields an empty list. This feeds a side panel on
 * a page whose real content is the arrival checklist, and a government
 * website having a bad afternoon must never be why a traveller cannot
 * read it.
 */

const FCDO_URL = "https://www.gov.uk/api/content/foreign-travel-advice";
const STATE_DEPT_URL = "https://travel.state.gov/_res/rss/TAsTWs.xml";

/**
 * How long to wait on a source before giving up on it.
 *
 * The State Department feed is around a megabyte of XML and both calls
 * sit inside a cron handler with a function timeout, so an unbounded
 * wait is how one slow government server stalls a whole batch.
 */
const TIMEOUT_MS = 8_000;

/**
 * One invocation's memo of the shared State Department feed.
 *
 * The feed is a single ~1 MB document covering every country, so it is
 * the same bytes for every traveller in a sweep — but `fetchAdvisories`
 * is called once per traveller, and without this each call re-downloaded
 * and re-scanned the whole thing. At the cron's batch limit that is ~25
 * MB and twenty-five full-document regex passes inside one function
 * timeout.
 *
 * Next's fetch cache does not cover it: `getText` passes an
 * `AbortSignal`, and this runs inside a route handler. The memo holds the
 * *promise*, so travellers processed concurrently share one request
 * rather than racing to start their own.
 *
 * Deliberately per-invocation and passed in, not module-level. A
 * long-lived process must not serve a day-old advisory feed because a
 * previous request happened to warm a global.
 */
export type AdvisoryFetch = { stateDeptFeed?: Promise<string | null> };

/** A fresh memo for one sweep or one page render. */
export function newAdvisoryFetch(): AdvisoryFetch {
  return {};
}

async function getText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // These are public pages that change a few times a month; letting
      // the platform serve a cached copy is both cheaper and kinder to
      // the source than fetching a megabyte of XML per traveller.
      next: { revalidate: 3_600 },
    });
    if (!response.ok) {
      console.error(`[safety] ${url} answered ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error(`[safety] could not reach ${url}`, error);
    return null;
  }
}

async function fetchFcdo(destinationIso: string): Promise<Advisory | null> {
  const slug = fcdoSlugFor(destinationIso);
  // No slug means no page to ask for — the UK, or a destination this
  // product does not curate. Not an error, and not a request worth making.
  if (!slug) return null;

  const body = await getText(`${FCDO_URL}/${slug}`);
  if (!body) return null;

  try {
    return toFcdoAdvisory(JSON.parse(body));
  } catch {
    // A maintenance page where JSON was expected. The mapper never sees it.
    console.error(`[safety] FCDO returned unreadable content for ${slug}`);
    return null;
  }
}

async function fetchStateDept(
  destinationIso: string,
  memo: AdvisoryFetch
): Promise<Advisory | null> {
  // Checked before the request, not after: the feed is about a megabyte
  // of XML, and a destination with no curated name can never match a row
  // in it. Downloading it to find that out is a round trip for an answer
  // already known.
  if (!destinationNameFor(destinationIso)) return null;

  memo.stateDeptFeed ??= getText(STATE_DEPT_URL);
  const body = await memo.stateDeptFeed;
  if (!body) return null;
  return stateDeptAdvisoryFor(body, destinationIso);
}

/**
 * Every advisory currently published about one destination.
 *
 * The two sources are fetched concurrently and kept as separate entries,
 * never merged: a State Department level printed beside an FCDO change
 * note would read as one government having said both.
 *
 * Order is stable — FCDO first when present — so a cached payload does
 * not appear to have changed just because two promises resolved in a
 * different order.
 *
 * `memo` carries the shared State Department feed across the travellers
 * of one sweep; omit it and each call fetches its own, which is the right
 * default for a single page render.
 */
export async function fetchAdvisories(
  destinationIso: string,
  memo: AdvisoryFetch = newAdvisoryFetch()
): Promise<Advisory[]> {
  const [fcdo, stateDept] = await Promise.all([
    fetchFcdo(destinationIso),
    fetchStateDept(destinationIso, memo),
  ]);

  return [fcdo, stateDept].filter((a): a is Advisory => a !== null);
}
