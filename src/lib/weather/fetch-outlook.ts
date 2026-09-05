import "server-only";

import { capitalFor, toOutlook, type Outlook } from "@/lib/weather/outlook";

/**
 * Reading the week's forecast from Open-Meteo.
 *
 * Open, keyless and free for this use, so there is no `aiEnabled`-style
 * switch to degrade on — only the network. Nothing here throws: this
 * feeds one small panel on a page whose real content is the arrival
 * checklist, and a forecast service having a bad afternoon must never be
 * why a traveller cannot read it.
 *
 * There is deliberately no database cache. Unlike the advisories, this
 * has no change detection and nothing to compare against a previous
 * reading, so a stored copy would buy nothing a plain revalidating fetch
 * does not — and one fewer `companion_updates` kind is one fewer thing
 * to keep in step.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Long enough that a page refresh is free, short enough that the week stays current. */
const REVALIDATE_SECONDS = 3 * 60 * 60;

const TIMEOUT_MS = 6_000;

/**
 * The coming week where the traveller has landed, or null when there is
 * nothing honest to show — no curated capital for the destination, or a
 * source that did not answer usefully.
 */
export async function fetchOutlook(
  destinationIso: string
): Promise<{ city: string; outlook: Outlook } | null> {
  const capital = capitalFor(destinationIso);
  // No curated capital means no request. Guessing a location from the
  // country would put a Northwest Territories forecast in front of
  // somebody in Toronto.
  if (!capital) return null;

  const url =
    `${FORECAST_URL}?latitude=${capital.latitude}&longitude=${capital.longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      console.error(`[weather] forecast answered ${response.status} for ${capital.city}`);
      return null;
    }

    const outlook = toOutlook(await response.json());
    return outlook ? { city: capital.city, outlook } : null;
  } catch (error) {
    // Includes a maintenance page where JSON was expected — `json()`
    // throws on it, and the mapper never sees it.
    console.error(`[weather] could not read the forecast for ${capital.city}`, error);
    return null;
  }
}
