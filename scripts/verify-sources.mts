import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Check which corridor sources can actually be drafted from.
 *
 * The registry beside this script (`src/lib/visa/corridor-sources.json`)
 * is the work-list for reaching 50 destinations × 5 purposes. This tool
 * answers the only question that matters about each row: **if we pointed
 * the drafting script at this URL, would anything usable come back?**
 *
 * Why a separate step rather than finding out during drafting: a model
 * call costs money and forty seconds, an HTTP call costs neither. Every
 * row this marks `unusable` is a draft nobody has to pay for, review, or
 * delete — and the four tourism corridors deleted on 2026-09-02 are what
 * happens without it.
 *
 * The heuristic is deliberately stricter than the obvious one. An
 * earlier version counted mentions of "document" and "passport", which
 * scored a page reading "What documents do I need?" as excellent — it
 * was measuring whether a page *talks about* documents, not whether it
 * *enumerates* them. This counts distinct document nouns, because a real
 * checklist names many different things and an overview page names the
 * same one repeatedly.
 *
 *   npm run sources:verify           # every row that has a URL
 *   npm run sources:verify -- --all  # including unresearched (reports gaps)
 */

const here = dirname(fileURLToPath(import.meta.url));
const REGISTRY = join(here, "..", "src", "lib", "visa", "corridor-sources.json");

type Row = {
  destinationIso: string;
  destinationName: string;
  purpose: string;
  visaType: string;
  status: string;
  sourceUrl: string | null;
  checkedAt?: string;
  evidence?: string;
};

/**
 * Distinct document nouns, not total mentions. A page listing eight
 * different papers is a checklist; a page saying "document" eight times
 * is prose about documents.
 */
const DOCUMENT_NOUNS = [
  "passport", "photograph", "bank statement", "application form", "itinerary",
  "insurance", "accommodation", "employment letter", "birth certificate",
  "marriage certificate", "certificate of sponsorship", "tuberculosis",
  "police certificate", "criminal record", "payslip", "tax", "degree",
  "transcript", "enrolment", "invitation", "proof of funds", "return ticket",
];

function score(text: string): { distinct: number; found: string[] } {
  const found = DOCUMENT_NOUNS.filter((n) => new RegExp(n, "i").test(text));
  return { distinct: found.length, found };
}

async function probe(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ToplanceCorridorResearch/1.0)",
    },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
  });

  const text = (await response.text())
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { status: response.status, chars: text.length, ...score(text) };
}

const rows: Row[] = JSON.parse(readFileSync(REGISTRY, "utf8"));
const all = process.argv.includes("--all");
const todo = rows.filter((r) => r.sourceUrl && (all || r.status !== "unusable"));

console.log(`Probing ${todo.length} of ${rows.length} corridor sources...\n`);

for (let i = 0; i < todo.length; i += 6) {
  await Promise.all(
    todo.slice(i, i + 6).map(async (row) => {
      const label = `${row.destinationIso}/${row.purpose}`.padEnd(14);
      try {
        const r = await probe(row.sourceUrl!);
        /**
         * Six, calibrated against the only source with a known drafting
         * outcome rather than against intuition.
         *
         * `gov.uk/skilled-worker-visa/documents-you-must-provide` scores
         * **7** and produced thirteen clean sourced requirements. An
         * earlier threshold of 8 marked it `thin`, which would have
         * excluded the one page proven to work — so the threshold was
         * wrong, not the page. `standard-visitor` scores 4 and produced
         * eligibility prose, so the boundary sits between them.
         *
         * Every future drafting run is evidence about this number. If a
         * `verified` source yields a thin draft, raise it; if a `thin`
         * one drafts well, lower it.
         */
        const verdict =
          r.status !== 200 ? "unusable"
          : r.chars < 800 ? "unusable"
          : r.distinct >= 6 ? "verified"
          : "thin";

        row.status = verdict;
        row.checkedAt = new Date().toISOString().slice(0, 10);
        row.evidence = `${r.status} · ${r.chars}ch · ${r.distinct} distinct document nouns`;
        console.log(`  ${label} ${verdict.padEnd(9)} ${row.evidence}`);
      } catch (error) {
        row.status = "unusable";
        row.checkedAt = new Date().toISOString().slice(0, 10);
        row.evidence = `unreachable (${error instanceof Error ? error.name : "error"})`;
        console.log(`  ${label} unusable  ${row.evidence}`);
      }
    })
  );
}

writeFileSync(REGISTRY, JSON.stringify(rows, null, 2) + "\n");

const tally = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1;
  return acc;
}, {});

console.log(`\n${rows.length} corridors in the registry:`);
for (const [status, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${status}`);
}
console.log(
  `\nDraftable now: ${tally.verified ?? 0}. ` +
    `Needing a source found: ${(tally.unresearched ?? 0) + (tally.thin ?? 0) + (tally.unusable ?? 0)}.`
);
