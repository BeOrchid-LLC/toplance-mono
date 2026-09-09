import "server-only";

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, corridorRequirements, corridors } from "@/lib/db/schema";
import type { TravelPurpose } from "@/lib/visa/types";

/**
 * The rule sets behind an agency's own checklists, read-only.
 *
 * The client asked on 7 September for the "rules setting" screen back,
 * and the 8 September review found the engine had never been lost — it
 * is `/ops/corridors`. But that console is BeOrchid's, and the reason
 * the case screens were taken out of it in the v1.3 tenancy work is the
 * sentence every agency's terms carry: nobody at BeOrchid opens their
 * clients' documents. Handing a director an ops account to read a fee
 * table would trade that guarantee for a lookup. So the lookup is here,
 * inside the console the agency already owns, over the versions their
 * own cases were built from.
 *
 * Three things this module is deliberately not:
 *
 * - **Not the whole corridor library.** An agency sees the versions its
 *   applications actually snapshot. A Lagos agency has no business
 *   reading BeOrchid's draft coverage for a corridor it has never
 *   filed on, and a list of 99 routes would bury the four they use.
 * - **Not writable.** Corridors are central reference data, versioned
 *   and immutable once published, snapshotted per application so a
 *   mid-flight change cannot invalidate somebody's checklist. An agency
 *   editing a published corridor would edit it for every other agency
 *   on it. The case-level override the client actually wants is specced
 *   separately — `docs/superpowers/specs/2026-09-09-case-level-rule-override.md`.
 * - **Not a review queue.** Draft and rejected versions are BeOrchid's
 *   workings. What reaches here is what built a real checklist, which
 *   in practice means the version that was live when each case opened.
 *
 * Like every other module under `src/lib/data`, this decides no access:
 * callers pass an `orgId` they have already established the reader
 * belongs to.
 */

export type AgencyRuleSetRow = {
  id: string;
  nationalityIso: string;
  destinationIso: string;
  purpose: TravelPurpose;
  visaName: string;
  version: number;
  /** Whether this version is still the one new cases are built from. */
  isLive: boolean;
  lastVerifiedAt: Date | null;
  effectiveFrom: string;
  governmentFeeMinor: number | null;
  governmentFeeCurrency: string | null;
  processingWeeksMin: number | null;
  processingWeeksMax: number | null;
  requirementCount: number;
  /** This agency's cases built from this version. Never zero here. */
  caseCount: number;
};

export type AgencyRuleSetDetail = AgencyRuleSetRow & {
  sourceName: string | null;
  sourceUrl: string | null;
  requirements: {
    id: string;
    docKey: string;
    name: string;
    description: string | null;
    category: string;
    isRequired: boolean;
    sortOrder: number;
    sourceUrl: string | null;
    /** Raw `jsonb`; the screen parses it with `parseAppliesWhen`. */
    appliesWhen: unknown;
  }[];
};

/**
 * Every corridor version this agency's cases were built from, busiest
 * first.
 *
 * Ordered by case count rather than by route name: a director opening
 * this screen is checking the rules behind the work they are actually
 * doing, and the corridor with forty cases on it is the one whose fee
 * change matters. Ties fall back to the route so the order is stable
 * between renders.
 */
export async function agencyRuleSets(orgId: string): Promise<AgencyRuleSetRow[]> {
  const used = await db
    .select({
      corridorId: applications.corridorId,
      caseCount: count(),
    })
    .from(applications)
    .where(
      and(
        eq(applications.orgId, orgId),
        // `corridor_id` is `set null` on delete and null on a case that
        // never resolved a route. Neither is a rule set to show.
        sql`${applications.corridorId} is not null`
      )
    )
    .groupBy(applications.corridorId);

  const ids = used
    .map((u) => u.corridorId)
    .filter((id): id is string => id !== null);

  if (ids.length === 0) return [];

  const cases = new Map(used.map((u) => [u.corridorId, u.caseCount]));

  const rows = await db
    .select({
      id: corridors.id,
      nationalityIso: corridors.nationalityIso,
      destinationIso: corridors.destinationIso,
      purpose: corridors.purpose,
      visaName: corridors.visaName,
      version: corridors.version,
      isLive: corridors.isLive,
      lastVerifiedAt: corridors.lastVerifiedAt,
      effectiveFrom: corridors.effectiveFrom,
      governmentFeeMinor: corridors.governmentFeeMinor,
      governmentFeeCurrency: corridors.governmentFeeCurrency,
      processingWeeksMin: corridors.processingWeeksMin,
      processingWeeksMax: corridors.processingWeeksMax,
    })
    .from(corridors)
    .where(inArray(corridors.id, ids));

  const counts = await db
    .select({ corridorId: corridorRequirements.corridorId, total: count() })
    .from(corridorRequirements)
    .where(inArray(corridorRequirements.corridorId, ids))
    .groupBy(corridorRequirements.corridorId);

  const perCorridor = new Map(counts.map((c) => [c.corridorId, c.total]));

  return rows
    .map((r) => ({
      ...r,
      requirementCount: perCorridor.get(r.id) ?? 0,
      caseCount: cases.get(r.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.caseCount - a.caseCount ||
        `${a.nationalityIso}${a.destinationIso}${a.purpose}`.localeCompare(
          `${b.nationalityIso}${b.destinationIso}${b.purpose}`
        )
    );
}

/**
 * One rule set with its requirements — but only if this agency has a
 * case on it.
 *
 * The ownership test is the `exists` below rather than a check in the
 * page, and it returns `null` rather than throwing, so a director who
 * pastes a colleague's URL from another agency gets the same "no such
 * page" a made-up uuid gets. Telling the two apart would confirm that a
 * corridor exists and that somebody else is filing on it.
 */
export async function agencyRuleSet(
  orgId: string,
  corridorId: string
): Promise<AgencyRuleSetDetail | null> {
  const [row] = await db
    .select({
      id: corridors.id,
      nationalityIso: corridors.nationalityIso,
      destinationIso: corridors.destinationIso,
      purpose: corridors.purpose,
      visaName: corridors.visaName,
      version: corridors.version,
      isLive: corridors.isLive,
      lastVerifiedAt: corridors.lastVerifiedAt,
      effectiveFrom: corridors.effectiveFrom,
      governmentFeeMinor: corridors.governmentFeeMinor,
      governmentFeeCurrency: corridors.governmentFeeCurrency,
      processingWeeksMin: corridors.processingWeeksMin,
      processingWeeksMax: corridors.processingWeeksMax,
      sourceName: corridors.sourceName,
      sourceUrl: corridors.sourceUrl,
    })
    .from(corridors)
    .where(
      and(
        eq(corridors.id, corridorId),
        sql`exists (
          select 1 from ${applications}
          where ${applications.corridorId} = ${corridors.id}
            and ${applications.orgId} = ${orgId}
        )`
      )
    )
    .limit(1);

  if (!row) return null;

  // A second query rather than a correlated subquery in the select
  // list. One number, read once, and the alternative was raw SQL
  // interpolating the outer table — which is the kind of thing that
  // silently returns zero rather than failing when it is wrong.
  const [cases] = await db
    .select({ total: count() })
    .from(applications)
    .where(
      and(eq(applications.corridorId, corridorId), eq(applications.orgId, orgId))
    );

  const requirements = await db
    .select({
      id: corridorRequirements.id,
      docKey: corridorRequirements.docKey,
      name: corridorRequirements.name,
      description: corridorRequirements.description,
      category: corridorRequirements.category,
      isRequired: corridorRequirements.isRequired,
      sortOrder: corridorRequirements.sortOrder,
      sourceUrl: corridorRequirements.sourceUrl,
      appliesWhen: corridorRequirements.appliesWhen,
    })
    .from(corridorRequirements)
    .where(eq(corridorRequirements.corridorId, corridorId))
    .orderBy(asc(corridorRequirements.sortOrder));

  return {
    ...row,
    caseCount: cases?.total ?? 0,
    requirementCount: requirements.length,
    requirements,
  };
}
