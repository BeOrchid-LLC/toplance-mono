import "server-only";

import { count, desc, eq, gte, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsEvents,
  applications,
  corridors,
  documents,
  invitations,
  organisations,
  profiles,
} from "@/lib/db/schema";
import { listInvoices } from "@/lib/data/payments";
import { requestedRoutes } from "@/lib/data/corridor-demand";
import type { RequestedRoute } from "@/lib/domain/corridor-demand";
import {
  dashboardTotals,
  funnelOf,
  operationsOf,
  rate,
  rollupClients,
  stalledAtChecklist,
  topCounts,
  type ClientRow,
  type FunnelStage,
  type OperationsKpis,
  type TopCount,
} from "@/lib/domain/kpis";
import {
  revenueByCycle,
  summarise,
  type Invoice,
  type PaymentSummary,
  type RevenuePoint,
} from "@/lib/domain/payments";

/**
 * Everything the director's dashboard shows, in one pass.
 *
 * The arithmetic lives in `@/lib/domain/kpis` and
 * `@/lib/domain/payments` — pure and tested without a database. This
 * file is the wiring: it fetches the rows and feeds each figure the
 * column it claims to be about.
 *
 * Deliberately a handful of wide reads rather than a dozen aggregate
 * queries. The applications table is the small one here (one row per
 * traveller, by a schema constraint), so pulling it in full and counting
 * in TypeScript costs less than the round trips would, and it keeps the
 * counting somewhere that can be unit tested. The two places that would
 * not scale that way — documents and analytics events — are aggregated
 * in SQL instead.
 */

const DAY = 86_400_000;

/** How far back the demand and usage panels look. */
export const USAGE_WINDOW_DAYS = 30;

export type DocumentKpis = {
  total: number;
  verified: number;
  flagged: number;
  /** Uploads the AI pre-check sent back, before a reviewer saw them. */
  precheckPending: number;
  flagRate: number | null;
  /** Which checklist items get flagged most — the actionable one. */
  mostFlagged: TopCount[];
};

export type DemandKpis = {
  destinations: TopCount[];
  purposes: TopCount[];
  nationalities: TopCount[];
  /**
   * The busiest routes travellers asked for that no live corridor
   * answers — the panel's rows, capped for display.
   *
   * The only figures on this screen that are not about work the platform
   * has done: they are about work it has not. All-time rather than the
   * 30-day window the events panel uses; see `requestedRoutes`.
   */
  requestedRoutes: RequestedRoute[];
  /** Every such route, which is what the counter beside them reads. */
  unbuiltRoutes: number;
  sponsored: number;
  direct: number;
  /** Approved travellers whose visa expires in the next 90 days. */
  expiringSoon: number;
  /** Analytics events in the last `USAGE_WINDOW_DAYS`, busiest first. */
  events: TopCount[];
};

export type DashboardData = {
  now: Date;
  totals: {
    clients: number;
    seatsPurchased: number;
    /**
     * Every application on the platform, whatever its status — drafts
     * included (decision D10, 2026-09-17, pending the client's
     * confirmation). See `dashboardTotals`.
     */
    applicationsProcessed: number;
    /** Approved applications — not traveller accounts. */
    travellers: number;
    /** Applications waiting on a reviewer — `REVIEW_STATUSES`. */
    openCases: number;
  };
  clients: ClientRow[];
  funnel: FunnelStage[];
  stalled: number;
  operations: OperationsKpis;
  documents: DocumentKpis;
  demand: DemandKpis;
  invoices: Invoice[];
  payments: PaymentSummary;
  revenue: RevenuePoint[];
};

export async function dashboardData(
  options: { now?: Date } = {}
): Promise<DashboardData> {
  const now = options.now ?? new Date();
  const windowStart = new Date(now.getTime() - USAGE_WINDOW_DAYS * DAY);
  const expiryHorizon = new Date(now.getTime() + 90 * DAY);

  const [
    orgRows,
    invitationRows,
    applicationRows,
    documentRows,
    flaggedByKey,
    eventRows,
    invoices,
    askedRoutes,
  ] = await Promise.all([
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        seatsPurchased: organisations.seatsPurchased,
      })
      .from(organisations),

    // `org_id` is nullable since BeOrchid started inviting its own
    // staff, and those rows are excluded here rather than coalesced to
    // some placeholder client: a platform invitation is not a client's
    // activation, and counting one would put a colleague in the invited
    // column of an agency that never asked for them.
    db
      .select({ orgId: invitations.orgId, status: invitations.status })
      .from(invitations)
      .where(isNotNull(invitations.orgId)),

    // One row per traveller by constraint, so the whole table is a small
    // read and every funnel figure below comes out of this one pass.
    db
      .select({
        orgId: applications.orgId,
        status: applications.status,
        intakeComplete: applications.intakeComplete,
        checklistCompleteAt: applications.checklistCompleteAt,
        submittedAt: applications.submittedAt,
        decidedAt: applications.decidedAt,
        firstSubmittedAt: applications.firstSubmittedAt,
        assigneeId: applications.assigneeId,
        visaExpiresOn: applications.visaExpiresOn,
        nationalityIso: profiles.countryIso,
        destinationIso: corridors.destinationIso,
        purpose: corridors.purpose,
      })
      .from(applications)
      .innerJoin(profiles, eq(profiles.id, applications.travelerId))
      .leftJoin(corridors, eq(corridors.id, applications.corridorId)),

    // Documents outnumber applications several times over, so these are
    // counted in SQL rather than pulled across.
    db
      .select({ state: documents.state, n: count() })
      .from(documents)
      .groupBy(documents.state),

    db
      .select({ docKey: documents.docKey, n: count() })
      .from(documents)
      .where(eq(documents.state, "flagged"))
      .groupBy(documents.docKey)
      .orderBy(desc(count()))
      .limit(6),

    db
      .select({ name: analyticsEvents.name, n: count() })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, windowStart))
      .groupBy(analyticsEvents.name)
      .orderBy(desc(count()))
      .limit(8),

    listInvoices({ now }),

    // Its own two reads, joined to nothing here: the request log is
    // keyed on what a traveller typed, not on an application row, so
    // there is no column on the pass above to hang it from.
    requestedRoutes(),
  ]);

  const clients = rollupClients({
    orgs: orgRows,
    // The `is not null` above is what actually excludes platform
    // invitations; this narrows the type Drizzle cannot infer from a
    // `where`. A filter rather than a cast, so a query edited to drop
    // that clause degrades to the same answer instead of putting a
    // `null` org id into the rollup's map.
    invitations: invitationRows.filter(
      (row): row is { orgId: string; status: (typeof row)["status"] } =>
        row.orgId !== null
    ),
    applications: applicationRows,
  });

  const funnel = funnelOf(applicationRows);

  return {
    now,
    totals: {
      clients: orgRows.length,
      seatsPurchased: orgRows.reduce((sum, o) => sum + o.seatsPurchased, 0),
      ...dashboardTotals(applicationRows),
    },
    clients,
    funnel,
    stalled: stalledAtChecklist(applicationRows),
    operations: operationsOf(applicationRows, now),
    documents: documentsOf(documentRows, flaggedByKey),
    demand: {
      ...demandOf(applicationRows, eventRows, expiryHorizon),
      requestedRoutes: askedRoutes.routes,
      unbuiltRoutes: askedRoutes.total,
    },
    invoices,
    payments: summarise(invoices, now),
    revenue: revenueByCycle(invoices),
  };
}

function documentsOf(
  states: readonly { state: string; n: number }[],
  flaggedByKey: readonly { docKey: string; n: number }[]
): DocumentKpis {
  const of = (state: string) => states.find((s) => s.state === state)?.n ?? 0;
  const total = states.reduce((sum, s) => sum + s.n, 0);
  const flagged = of("flagged");

  return {
    total,
    verified: of("verified"),
    flagged,
    precheckPending: of("checking"),
    // Of documents a person actually looked at. Dividing by every row
    // including `not_started` would report a flag rate that falls
    // whenever a new checklist is created.
    flagRate: rate(flagged, flagged + of("verified")),
    mostFlagged: flaggedByKey.map((r) => ({ key: r.docKey, count: r.n })),
  };
}

/** Only the columns the demand panel reads, so it stays testable by hand. */
type DemandRow = {
  orgId: string | null;
  visaExpiresOn: string | null;
  nationalityIso: string;
  destinationIso: string | null;
  purpose: string | null;
};

/*
 * Everything except the requested routes, which come from their own
 * module rather than from these rows — an unserved route leaves no
 * application column behind to count.
 */
function demandOf(
  rows: readonly DemandRow[],
  events: readonly { name: string; n: number }[],
  expiryHorizon: Date
): Omit<DemandKpis, "requestedRoutes" | "unbuiltRoutes"> {
  const horizon = expiryHorizon.toISOString().slice(0, 10);

  return {
    destinations: topCounts(
      rows.map((r) => r.destinationIso),
      6
    ),
    purposes: topCounts(
      rows.map((r) => r.purpose),
      6
    ),
    nationalities: topCounts(
      rows.map((r) => r.nationalityIso),
      6
    ),
    sponsored: rows.filter((r) => r.orgId !== null).length,
    direct: rows.filter((r) => r.orgId === null).length,
    // `visa_expires_on` is a `date`, so string comparison is the right
    // one — no zone is involved and constructing an instant would invent
    // a time the document does not carry.
    expiringSoon: rows.filter(
      (r) => r.visaExpiresOn !== null && r.visaExpiresOn <= horizon
    ).length,
    events: events.map((e) => ({ key: e.name, count: e.n })),
  };
}
