import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { corridorRequirements, corridors } from "@/lib/db/schema";
import type {
  CorridorQuery,
  CorridorRuleSet,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * Embassy-sourced rule sets, curated by hand and loaded by
 * `npm run db:seed`. This is the highest-trust provider and is tried
 * first: a figure someone checked against the mission beats a figure an
 * API inferred.
 *
 * Only `is_live` corridors are served, and the highest version wins —
 * rule sets are versioned so that when a mission changes what it wants,
 * everyone on that corridor sees the change with its effective date.
 */
export const curatedProvider: VisaDataProvider = {
  name: "curated",

  async fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> {
    const [corridor] = await db
      .select()
      .from(corridors)
      .where(
        and(
          eq(corridors.nationalityIso, query.nationalityIso),
          eq(corridors.destinationIso, query.destinationIso),
          eq(corridors.purpose, query.purpose),
          eq(corridors.isLive, true)
        )
      )
      .orderBy(desc(corridors.version))
      .limit(1);

    if (!corridor) return null;

    const requirements = await db
      .select()
      .from(corridorRequirements)
      .where(eq(corridorRequirements.corridorId, corridor.id))
      .orderBy(corridorRequirements.sortOrder);

    return {
      corridorId: corridor.id,
      provider: "curated",
      visaName: corridor.visaName,
      version: corridor.version,
      effectiveFrom: corridor.effectiveFrom,
      sourceName: corridor.sourceName,
      sourceUrl: corridor.sourceUrl,
      // Our own curation of public embassy guidance: no licence, and so
      // nothing to credit.
      attribution: null,
      contributions: [],
      processingWeeksMin: corridor.processingWeeksMin,
      processingWeeksMax: corridor.processingWeeksMax,
      governmentFeeMinor: corridor.governmentFeeMinor,
      governmentFeeCurrency: corridor.governmentFeeCurrency,
      requirements: requirements.map((r) => ({
        docKey: r.docKey,
        name: r.name,
        description: r.description,
        category: r.category,
        isRequired: r.isRequired,
        sortOrder: r.sortOrder,
      })),
    };
  },
};
