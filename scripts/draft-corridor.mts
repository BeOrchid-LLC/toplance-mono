import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { openai } from "@ai-sdk/openai";
import { Output, generateText } from "ai";
import { Pool } from "pg";

import { travelPurpose } from "../src/lib/db/schema.ts";

import { CORRIDOR_DRAFT_MODEL } from "../src/lib/ai/models.ts";
import {
  buildDraftPrompt,
  draftSchema,
  normaliseDraft,
} from "../src/lib/ai/corridor-draft.ts";

/**
 * Draft one corridor from its published sources — milestone 04.
 *
 * Writes a **pending version**, never a live one. `curatedProvider`
 * serves `is_live = true` at the highest version, so a row written here
 * is invisible to travellers by construction: there is no flag to
 * forget and no gate to bypass. It becomes real only when a `staffRole`
 * of `owner` approves it at `/ops/corridors/[id]`.
 *
 * Deliberately a CLI and not a route. Drafting is an operator sitting
 * with two browser tabs open, checking that the pages they passed in are
 * the pages they meant; that is not a request/response shape, and making
 * it one would invite it to be run unattended.
 *
 *   node --env-file-if-exists=.env.local --experimental-strip-types \
 *     scripts/draft-corridor.mts \
 *     --nationality ng --destination gb --purpose work \
 *     --source https://www.gov.uk/skilled-worker-visa \
 *     --source https://visa.vfsglobal.com/nga/en/gbr/
 *
 * Uses `pg` directly rather than the app's Drizzle client, the same way
 * `seed.mts` and `sql-objects.mts` do: `@/lib/db/client` is
 * `server-only`, and Node resolves neither that condition nor the `@/`
 * alias.
 */

const { values } = parseArgs({
  options: {
    nationality: { type: "string" },
    destination: { type: "string" },
    purpose: { type: "string" },
    source: { type: "string", multiple: true },
    /**
     * A source this process cannot fetch, supplied as a local file whose
     * FIRST LINE is the source URL and whose remainder is the page text.
     *
     * Needed because reachability and publication quality are unrelated.
     * Tanzania's official eVisa guidelines score ten distinct document
     * nouns — better than most sources that produced good corridors — and
     * `fetch` cannot open the host at all from some networks, while a
     * browser loads it fine. Without this the only options were to drop
     * such destinations or to let the drafting script drive a browser,
     * and the second is a great deal of machinery for a paste.
     *
     * Provenance is unchanged: the URL on the first line is what every
     * requirement cites, so a reviewer still clicks through to the
     * government's own page. What the operator supplies is a transcript
     * of it, and the file's first line is the claim about where that
     * transcript came from.
     */
    "source-text": { type: "string", multiple: true },
    "visa-name": { type: "string" },
    "source-name": { type: "string" },
  },
});

const nationality = values.nationality?.toLowerCase();
const destination = values.destination?.toLowerCase();
const purpose = values.purpose?.toLowerCase();
const sources = values.source ?? [];
const sourceTexts = values["source-text"] ?? [];

/**
 * Read from the schema, not restated here.
 *
 * This was a hardcoded array and it silently went stale the moment
 * `business` was added to the enum — the script refused a purpose the
 * database accepts. A second copy of a closed set is a second thing to
 * remember, and nobody does.
 */
const PURPOSES = travelPurpose.enumValues;

if (
  !nationality ||
  !destination ||
  !purpose ||
  sources.length + sourceTexts.length === 0
) {
  console.error(
    "Usage: draft-corridor.mts --nationality ng --destination gb " +
      "--purpose work --source <url> [--source <url>]"
  );
  process.exit(1);
}

// A widening cast: `purpose` is whatever was typed on the command
// line, and the point of this check is to find out whether it is one
// of the enum's values.
if (!(PURPOSES as readonly string[]).includes(purpose)) {
  console.error(`--purpose must be one of: ${PURPOSES.join(", ")}`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local.");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set — drafting needs a model.");
}

/**
 * A source page as text. No HTML parser: tags are stripped crudely and
 * the model reads what is left. A checklist page that only renders its
 * list through client-side JavaScript will come back thin, which is a
 * reason to check the fetched length rather than to add a browser.
 */
async function fetchSource(url: string): Promise<Source> {
  const response = await fetch(url, {
    headers: {
      // A plain tool string gets 403 from several government sites. This
      // is still honest about what we are — it just does not look like a
      // scraper to a WAF.
      "user-agent":
        "Mozilla/5.0 (compatible; ToplanceCorridorDrafting/1.0; ops tooling)",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  /**
   * PDFs are read as PDFs, not scraped as text.
   *
   * This is not an edge case — it is how a large share of governments
   * publish checklists. Canada's study permit list is IMM 5820, a PDF;
   * the HTML page at the same subject is a 2,800-character pointer to
   * it, which a text scraper reads as "no checklist here". Twelve
   * work/study sources were probed on 2026-09-03 and *none* passed as
   * HTML, while the underlying PDF fetched cleanly at 194 KB.
   *
   * The model reads the file directly, the same way `precheck.ts` hands
   * it an uploaded passport scan.
   */
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { url, kind: "pdf", bytes };
  }

  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 400) {
    console.warn(
      `  ! ${url} yielded only ${text.length} characters — check that the ` +
        "checklist is in the HTML and not rendered by script, and whether " +
        "the real list is a linked PDF."
    );
  }

  return { url, kind: "html", text };
}

/** A fetched source: scraped text, or a PDF the model reads directly. */
type Source =
  | { url: string; kind: "html"; text: string }
  | { url: string; kind: "pdf"; bytes: Uint8Array };

const pool = new Pool({ connectionString });

try {
  console.log(
    `Fetching ${sources.length} source(s)` +
      (sourceTexts.length ? `, reading ${sourceTexts.length} transcript(s)` : "") +
      "..."
  );

  const transcripts: Source[] = sourceTexts.map((path) => {
    const raw = readFileSync(path, "utf8");
    const newline = raw.indexOf("\n");
    const url = raw.slice(0, newline).trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(
        `${path}: the first line must be the source URL, got "${url.slice(0, 60)}"`
      );
    }
    return { url, kind: "html", text: raw.slice(newline + 1).replace(/\s+/g, " ").trim() };
  });

  const fetched = [...(await Promise.all(sources.map(fetchSource))), ...transcripts];

  for (const f of fetched) {
    console.log(
      `  ${f.kind === "pdf" ? "PDF" : "HTML"}  ${f.url}` +
        (f.kind === "pdf" ? ` (${Math.round(f.bytes.length / 1024)} KB)` : "")
    );
  }

  // What the re-check job compares against later: if this digest still
  // matches, nothing moved and no model call is needed. A PDF is hashed
  // by its bytes, which is stricter than the text hash used for HTML —
  // a re-typeset PDF reads as changed even when the words did not. That
  // costs a review, which is the safe direction to be wrong in.
  const sourceHash = createHash("sha256")
    .update(
      fetched
        .map((f) => (f.kind === "pdf" ? `${f.url}\n` : `${f.url}\n${f.text}`))
        .join("\n\n")
    )
    .update(Buffer.concat(fetched.filter((f) => f.kind === "pdf").map((f) => Buffer.from(f.bytes))))
    .digest("hex");

  console.log(`Extracting with ${CORRIDOR_DRAFT_MODEL}...`);

  /**
   * Scraped pages go into the prompt as fenced text; PDFs go as files
   * the model opens itself. Mixing both in one message is deliberate —
   * a corridor is often a checklist PDF plus an HTML fee page, and the
   * draft should be built from both at once rather than two passes that
   * disagree.
   */
  const textSources = fetched.filter((f) => f.kind === "html");
  const pdfSources = fetched.filter((f) => f.kind === "pdf");

  const result = await generateText({
    model: openai(CORRIDOR_DRAFT_MODEL),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            text: buildDraftPrompt({
              nationality,
              destination,
              purpose,
              sources: textSources,
              attachments: pdfSources.map((f) => f.url),
            }),
          },
          ...pdfSources.map((f) => ({
            type: "file" as const,
            data: f.bytes,
            mediaType: "application/pdf",
          })),
        ],
      },
    ],
    output: Output.object({ schema: draftSchema }),
  });

  const { draft, dropped, foreignJurisdiction } = normaliseDraft(result.output, {
    nationalityIso: nationality,
    destinationIso: destination,
  });

  for (const d of dropped) {
    console.warn(`  - dropped "${d.name}": ${d.reason}`);
  }

  /**
   * The check that catches a wrong-jurisdiction source. Loud, and it
   * does not stop the draft: the row may be legitimate, and the person
   * reviewing is better placed to tell than a word list.
   */
  if (foreignJurisdiction.length) {
    console.warn(
      `\n  !! ${foreignJurisdiction.length} requirement(s) name a country that is ` +
        `neither ${nationality} nor ${destination}:`
    );
    for (const f of foreignJurisdiction) {
      console.warn(`     [${f.country}] ${f.name}`);
    }
    console.warn(
      "     This usually means the source is another jurisdiction's " +
        "variant of the checklist. Check before approving.\n"
    );
  }

  if (draft.requirements.length === 0) {
    // Failing loudly rather than writing a corridor that can never be
    // approved — `approveCorridorTx` refuses an empty draft anyway.
    throw new Error(
      "Every requirement was dropped. Nothing usable came back from these " +
        "sources; check the URLs before re-running."
    );
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows: existing } = await client.query<{ max: number | null }>(
      `select max(version) as max from corridors
       where nationality_iso = $1 and destination_iso = $2 and purpose = $3`,
      [nationality, destination, purpose]
    );
    const version = (existing[0]?.max ?? 0) + 1;

    const { rows: inserted } = await client.query<{ id: string }>(
      `insert into corridors (
         nationality_iso, destination_iso, purpose, visa_name, version,
         source_name, source_url, processing_weeks_min, processing_weeks_max,
         government_fee_minor, government_fee_currency,
         is_live, review_state, source_hash
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, false, 'pending', $12)
       returning id`,
      [
        nationality,
        destination,
        purpose,
        values["visa-name"] ?? draft.visaName,
        version,
        values["source-name"] ?? new URL(fetched[0].url).hostname,
        fetched[0].url,
        draft.processingWeeksMin,
        draft.processingWeeksMax,
        draft.governmentFeeMinor,
        draft.governmentFeeCurrency,
        sourceHash,
      ]
    );

    const corridorId = inserted[0].id;

    for (const [i, r] of draft.requirements.entries()) {
      await client.query(
        `insert into corridor_requirements
           (corridor_id, doc_key, name, description, category, is_required,
            sort_order, source_url)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          corridorId,
          r.docKey,
          r.name,
          r.description,
          r.category,
          r.isRequired,
          i + 1,
          r.sourceUrl,
        ]
      );
    }

    // Written directly rather than through `track()`, which is
    // `server-only`. Same table, same event name — the union type in
    // `@/lib/analytics/events` is what keeps the two in step.
    await client.query(
      `insert into analytics_events (name, props) values ($1, $2)`,
      [
        "toplance.corridor_drafted",
        JSON.stringify({
          corridorId,
          nationality,
          destination,
          purpose,
          version,
          requirements: draft.requirements.length,
          dropped: dropped.length,
        }),
      ]
    );

    await client.query("commit");

    console.log(
      `\nDrafted v${version} of ${nationality}→${destination}/${purpose} ` +
        `with ${draft.requirements.length} requirements.`
    );
    console.log(`Nothing is live yet. Review it at /ops/corridors/${corridorId}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
