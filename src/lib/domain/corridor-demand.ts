/**
 * Which routes travellers ask for and nobody has built, as pure
 * functions.
 *
 * `corridorGap` already tells a traveller on an unserved route that
 * "your request has been counted towards it — routes are prioritised by
 * real demand, not guesswork", and `toplance.corridor_requested` is what
 * counts it. Until this module nothing read that count, so the sentence
 * was true about the recording and false about the prioritising. This is
 * the other half of it.
 *
 * No I/O, for the reason `@/lib/domain/kpis` gives: a figure somebody
 * reads off a screen and repeats in a meeting deserves a test, and a
 * test that needs a seeded Postgres is a test that gets skipped.
 */

import {
  DESTINATION_ISO,
  NATIONALITY_ISO,
  PURPOSE_ISO,
  countryFromIso2,
} from "@/lib/domain/corridors";

/** One `analytics_events` group, as the SQL rollup hands it over. */
export type RequestedEvent = {
  /** Raw `jsonb`, so `unknown` until `parseRoute` has had a look. */
  props: unknown;
  count: number;
};

export type RequestedRoute = {
  /** `routeKey` of the three parts — what live coverage is matched on. */
  key: string;
  /**
   * An ISO-3166 alpha-2 code when the answer mapped to one, and the
   * traveller's own word when it did not. The screen renders both the
   * same way, through `countryFromIso2(x)?.name ?? x`.
   */
  nationality: string;
  destination: string;
  /** A `travel_purpose` value when it mapped, else what was typed. */
  purpose: string;
  count: number;
};

/**
 * One route, as one string.
 *
 * Both sides of the comparison build their key with this — the requests
 * here and the live corridors in `@/lib/data/corridor-demand`. Two
 * hand-rolled joins would be one refactor away from disagreeing about
 * case or separator, and the failure is silent and total: every route
 * would look unbuilt, and the panel would spend a reviewer's week
 * curating corridors that already serve travellers.
 *
 * Separated rather than concatenated, so `g` + `hca` cannot collide with
 * `gh` + `ca`.
 */
export function routeKey(
  nationality: string,
  destination: string,
  purpose: string
): string {
  return [nationality, destination, purpose]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}

/**
 * The value for one leg of the route, preferring the code.
 *
 * `intake.ts` emits this event from two branches and they record
 * different things. A triple that mapped to codes but resolved to no
 * rule set records `nationalityIso` / `destinationIso`; an answer no
 * chip matched records the traveller's own words under `nationality` /
 * `destination`. Both are the same corridor being asked for, so both
 * have to come out of here as the same value.
 *
 * An unmappable word is kept as written rather than dropped. "Senegal"
 * is exactly the demand this panel exists to surface — a country the
 * product does not model yet — and discarding it would hide the routes
 * we know least about behind the ones we already half-serve.
 */
function leg(
  code: unknown,
  typed: unknown,
  names: Record<string, string>
): string | null {
  if (typeof code === "string" && code.trim()) return code.trim();

  if (typeof typed === "string" && typed.trim()) {
    const answer = typed.trim();
    return names[answer] ?? answer;
  }

  return null;
}

/** A props bag as a route, or `null` when it names no route at all. */
function parseRoute(props: unknown): Omit<RequestedRoute, "count"> | null {
  if (typeof props !== "object" || props === null) return null;

  const bag = props as Record<string, unknown>;

  const nationality = leg(bag.nationalityIso, bag.nationality, NATIONALITY_ISO);
  const destination = leg(bag.destinationIso, bag.destination, DESTINATION_ISO);
  const purpose = leg(bag.purpose, bag.purpose, PURPOSE_ISO);

  if (!nationality || !destination || !purpose) return null;

  return {
    key: routeKey(nationality, destination, purpose),
    nationality,
    destination,
    purpose,
  };
}

/**
 * The routes most asked for that nobody serves, most asked-for first.
 *
 * `liveKeys` is passed in rather than read here, which is what keeps
 * this file free of I/O — but it is also the load-bearing argument. A
 * corridor approved last week is not a gap any more, and a list that
 * still ranked it top would send a reviewer to build something that
 * already works.
 *
 * Ties break on the key, for the reason `topCounts` gives: Postgres is
 * free to return groups in any order, and a list that reshuffles between
 * two reloads reads as a page somebody changed.
 */
export function rankRequestedRoutes(
  rows: readonly RequestedEvent[],
  liveKeys: ReadonlySet<string>,
  limit: number
): RequestedRoute[] {
  const routes = new Map<string, RequestedRoute>();

  const asked = rows
    .map((row) => ({ route: parseRoute(row.props), count: row.count }))
    .filter(
      (row): row is { route: Omit<RequestedRoute, "count">; count: number } =>
        row.route !== null
    )
    // Grouped in a stable order, so which spelling of an unmapped answer
    // reaches the screen does not depend on the order Postgres replied
    // in.
    .sort(
      (a, b) =>
        a.route.key.localeCompare(b.route.key) ||
        a.route.nationality.localeCompare(b.route.nationality)
    );

  for (const { route, count } of asked) {
    if (liveKeys.has(route.key)) continue;

    const seen = routes.get(route.key);
    if (seen) seen.count += count;
    else routes.set(route.key, { ...route, count });
  }

  return [...routes.values()]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * One leg of a route as a person should read it.
 *
 * Three cases, and the middle one is the reason this is a function
 * rather than a `countryFromIso2` call at the screen. A mapped code
 * becomes the name the rest of the console uses. An answer nothing
 * mapped is a traveller's own word for their country, and it is printed
 * as they wrote it — `key.toUpperCase()`, which the dashboard's demand
 * lists use, would shout "SENEGAL" back at the reader and read as a
 * formatting fault rather than as the coverage gap it is. Anything else
 * short enough to be a code is upper-cased, because that is what it is.
 */
function name(part: string): string {
  const known = countryFromIso2(part);
  if (known) return known.name;
  return part.length <= 3 ? part.toUpperCase() : part;
}

/** A route's two ends and its purpose, ready to render. */
export function routeName(route: RequestedRoute): {
  from: string;
  to: string;
  purpose: string;
} {
  return {
    from: name(route.nationality),
    to: name(route.destination),
    purpose: route.purpose,
  };
}
