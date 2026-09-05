/**
 * Government travel advisories for a traveller's destination.
 *
 * The rule this module is built around: **we never restate an advisory
 * in our own words.** Every sentence a traveller reads here was written
 * by the issuing government and is shown quoted, attributed and linked
 * back to its source. That is not a stylistic preference — it is the
 * same constraint `buildItineraryPrompt` and `renewalGuidance` work
 * under. A paraphrased safety advisory is a claim about somebody's
 * safety that nobody at this company is qualified to make, and an AI
 * paraphrase of one would be worse still.
 *
 * Two sources, because neither covers the job alone (both verified live
 * on 2026-09-05):
 *
 * - **UK FCDO** (`gov.uk/api/content/foreign-travel-advice/<slug>`)
 *   publishes a human-written note saying what changed and when the
 *   advice materially moved. That note is the single most useful thing
 *   an alert can carry. It publishes nothing about the United Kingdom,
 *   because governments do not advise on themselves — and `gb` is the
 *   largest corridor here.
 * - **US State Department** (`travel.state.gov/_res/rss/TAsTWs.xml`)
 *   publishes a numbered level for every country including the UK, which
 *   is what fills that hole.
 *
 * They are kept as separate advisories rather than merged into one. A
 * merged record would print a State Department level next to an FCDO
 * change note and imply one government said both.
 *
 * Pure mappers and predicates only — the fetching lives in
 * `./fetch-advisories`, so all of this is testable without a network.
 */

import { DESTINATION_ISO } from "@/lib/domain/corridors";

export type AdvisorySource = "UK FCDO" | "US State Department";

export type Advisory = {
  source: AdvisorySource;
  /** e.g. "Level 2: Exercise Increased Caution". Null when the source publishes none. */
  level: string | null;
  /** The source's own description of what changed, verbatim. Null when it published none. */
  changeNote: string | null;
  /** When the source last materially changed this advice, as it reported it. */
  updatedAt: string;
  /** The public page this came from, for the traveller to read in full. */
  url: string;
};

/** ISO → the curated destination name, the reverse of `DESTINATION_ISO`. */
const NAME_BY_ISO = Object.fromEntries(
  Object.entries(DESTINATION_ISO).map(([name, iso]) => [iso, name])
);

/**
 * Destinations whose FCDO slug is not simply their curated name.
 *
 * `gb` is null on purpose: FCDO publishes no advice about the UK, so
 * asking for one would 404 on every run.
 *
 * The other three are places where gov.uk's slug and this product's
 * curated name genuinely disagree. Every one of the fifty destinations in
 * `DESTINATION_ISO` was checked against the content API on 2026-09-05,
 * and these are the only four that do not resolve from the name alone —
 * "Czechia" and "United Arab Emirates" both work as derived, so they are
 * deliberately *not* listed here.
 *
 * `us` is the entry that mattered most. A derived "united-states" 404s,
 * and the State Department feed carries no row for the United States
 * either — a government does not advise on itself, which is the same hole
 * `gb` has from the other side. Left underived, a US-bound traveller (a
 * live corridor on the marketing board) saw an empty advisory panel and
 * was never alerted to anything.
 */
const FCDO_SLUG_OVERRIDES: Record<string, string | null> = {
  gb: null,
  us: "usa",
  tr: "turkey",
  ci: "cote-d-ivoire",
};

/**
 * The `gov.uk` slug for a destination, or null when there is no page to ask for.
 *
 * Derived from the curated name where the two agree, so most destinations
 * added to `DESTINATION_ISO` are covered without a matching edit here;
 * `FCDO_SLUG_OVERRIDES` carries the ones where they do not.
 *
 * A derived slug that turns out not to exist simply 404s and the fetch
 * layer returns null — a missing advisory, never a wrong one. That is a
 * safe failure but a silent one, which is why the override list was
 * checked against the live API rather than reasoned about: nothing in
 * this product would have reported the four that were missing.
 */
export function fcdoSlugFor(destinationIso: string): string | null {
  const iso = destinationIso.toLowerCase();
  if (iso in FCDO_SLUG_OVERRIDES) return FCDO_SLUG_OVERRIDES[iso];

  const name = NAME_BY_ISO[iso];
  if (!name) return null;

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The curated display name for a destination, or null when this product
 * does not carry one.
 *
 * Exported so the fetch layer can decide whether a destination is worth
 * a request at all — the State Department feed is about a megabyte, and
 * pulling it to look up a country we have no name for is a round trip
 * whose answer is already known.
 */
export function destinationNameFor(destinationIso: string): string | null {
  return NAME_BY_ISO[destinationIso.toLowerCase()] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Map a `gov.uk` content API response into an advisory.
 *
 * Reads `public_updated_at`, not `updated_at`: the first moves when the
 * advice itself changed, the second moves when anyone edited the page.
 * Alerting on the second would mail every traveller in the corridor
 * about a corrected apostrophe.
 *
 * Returns null rather than a half-built record for anything that is not
 * recognisably this response — no timestamp means no advisory, because
 * change detection has nothing to compare and an alert has nothing to
 * date.
 */
export function toFcdoAdvisory(payload: unknown): Advisory | null {
  const root = asRecord(payload);
  if (!root) return null;

  const updatedAt = root.public_updated_at;
  const basePath = root.base_path;
  if (typeof updatedAt !== "string" || typeof basePath !== "string") return null;

  const details = asRecord(root.details);
  const rawNote = details?.change_description;
  const changeNote =
    typeof rawNote === "string" && rawNote.trim() ? rawNote.trim() : null;

  return {
    source: "UK FCDO",
    // FCDO publishes no numbered level. Deriving one from `alert_status`
    // would attribute a judgement to them they never made.
    level: null,
    changeNote,
    updatedAt,
    url: `https://www.gov.uk${basePath}`,
  };
}

/**
 * Parse a feed `pubDate`, which arrives as a bare day — "Thu, 08 May
 * 2025" — with no time and no zone.
 *
 * `new Date()` reads a zoneless string as *local* midnight, so on any
 * machine east of Greenwich the advisory's date comes back a day early
 * (and a day late to the west). Left alone that would put the wrong date
 * on the panel and, worse, make change detection compare timestamps that
 * drift with wherever the container happens to run.
 *
 * The " GMT" suffix is added only when there is no time in the string at
 * all: a `pubDate` that does carry a time carries its own zone with it,
 * and appending to that would corrupt a value that was already correct.
 */
function parseFeedDate(pubDate: string): Date {
  const hasTime = /\d:\d/.test(pubDate);
  return new Date(hasTime ? pubDate : `${pubDate} GMT`);
}

function tag(block: string, name: string): string | null {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  if (!match) return null;
  return match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/**
 * Read the State Department advisory feed into one row per country.
 *
 * Titles read "<Country> - Level N: <label>", so the split is on the
 * level marker rather than the first hyphen — "Guinea-Bissau" would
 * otherwise lose half its name.
 *
 * A feed it cannot read yields an empty list rather than an exception:
 * this is a nice-to-have panel on a page whose real content is the
 * arrival checklist, and it must never be the reason that page fails.
 */
export function parseStateDeptFeed(
  xml: string
): { country: string; advisory: Advisory }[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const rows: { country: string; advisory: Advisory }[] = [];

  for (const item of items) {
    const title = tag(item, "title");
    const link = tag(item, "link");
    const pubDate = tag(item, "pubDate");
    if (!title || !link || !pubDate) continue;

    const split = title.indexOf(" - Level ");
    if (split === -1) continue;

    const country = title.slice(0, split).trim();
    const level = title.slice(split + 3).trim();

    const parsed = parseFeedDate(pubDate);
    if (Number.isNaN(parsed.getTime())) continue;

    rows.push({
      country,
      advisory: {
        source: "US State Department",
        level,
        // The feed's description is marketing-shaped HTML about the whole
        // advisory rather than a note about what changed, so it is not
        // quoted as one. The level and the link are the honest parts.
        changeNote: null,
        updatedAt: parsed.toISOString(),
        url: link,
      },
    });
  }

  return rows;
}

/**
 * The State Department advisory for one destination, matched on the
 * curated destination name.
 *
 * Matching on a name is imperfect — the feed says "Turkey" where the
 * curated table says "Türkiye" — and a miss simply means no advisory for
 * that destination. That is the right failure: an unmatched name shows
 * nothing rather than showing another country's advisory.
 */
export function stateDeptAdvisoryFor(
  xml: string,
  destinationIso: string
): Advisory | null {
  const name = NAME_BY_ISO[destinationIso.toLowerCase()];
  if (!name) return null;

  const row = parseStateDeptFeed(xml).find(
    (r) => r.country.toLowerCase() === name.toLowerCase()
  );

  return row?.advisory ?? null;
}

/**
 * Whether an advisory has moved since we last recorded it.
 *
 * A first sighting is never a change. Without that rule, deploying this
 * would mail every approved traveller an "alert" about advice that has
 * sat unchanged for a year — the first read is a baseline, and the
 * traveller sees it on the page rather than in their inbox.
 *
 * A timestamp going backwards is not news either: a source republishing
 * an older revision has told the traveller nothing new.
 */
export function advisoryChanged(
  previous: { updatedAt: string } | null,
  next: { updatedAt: string }
): boolean {
  if (!previous) return false;

  const before = Date.parse(previous.updatedAt);
  const after = Date.parse(next.updatedAt);
  if (Number.isNaN(before) || Number.isNaN(after)) return false;

  return after > before;
}
