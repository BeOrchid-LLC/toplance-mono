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

async function fetchStateDept(destinationIso: string): Promise<Advisory | null> {
  // Checked before the request, not after: the feed is about a megabyte
  // of XML, and a destination with no curated name can never match a row
  // in it. Downloading it to find that out is a round trip for an answer
  // already known.
  if (!destinationNameFor(destinationIso)) return null;

  const body = await getText(STATE_DEPT_URL);
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
 */
export async function fetchAdvisories(destinationIso: string): Promise<Advisory[]> {
  const [fcdo, stateDept] = await Promise.all([
    fetchFcdo(destinationIso),
    fetchStateDept(destinationIso),
  ]);

  return [fcdo, stateDept].filter((a): a is Advisory => a !== null);
}
