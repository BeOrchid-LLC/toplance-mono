import type { Metadata } from "next";

import { AgencyShell } from "@/components/agency/agency-shell";
import { RuleSetsTable } from "@/components/agency/rule-sets-table";
import { Panel, PanelBody } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { agencyRuleSets } from "@/lib/data/agency-rule-sets";
import {
  RULE_SET_SORTS,
  ruleSetMatches,
  ruleSetMatchesPurpose,
  ruleSetSortKey,
} from "@/lib/domain/rule-set-table";
import { readDir, readPageSize, readSort, resolvePage, sortRows } from "@/lib/domain/sorting";
import { getLocale } from "@/lib/i18n/server";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { AGENCY_RULE_SETS } from "@/lib/i18n/agency-rule-sets";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

/**
 * The rules behind this agency's checklists.
 *
 * Every rank, not only a director. The client's 7 September ask was for
 * a director's "rule sets" screen, but the person who needs it is
 * whoever is on the phone to a traveller asking why they have been
 * asked for a bank statement — and that is a handler. Nothing here is
 * writable, so there is no permission to gate: it is the same reference
 * data their client's checklist was already built from, read back in
 * one place instead of inferred from six case screens.
 *
 * `/ops/corridors` is the platform's version of this, and stays the
 * only place a corridor is edited. See `agency-rule-sets.ts` for why
 * this is a second read rather than an ops account for the director.
 */

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY_RULE_SETS.heading[locale] };
}

export default async function AgencyRuleSetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    purpose?: string;
    sort?: string;
    dir?: string;
    page?: string;
    size?: string;
  }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  const rows = orgId ? await agencyRuleSets(orgId) : [];

  const params = await searchParams;
  const { q, purpose } = params;
  const search = q ?? "";
  const sort = readSort(params.sort, RULE_SET_SORTS, "cases");
  // Busiest first by default, which is descending — the route with
  // forty cases on it is the one whose fee change matters, and it
  // should not need a click to reach the top.
  const dir = readDir(params.dir, params.sort ? "asc" : "desc");

  const filtered = Boolean(search.trim() || purpose);

  const visible = rows.filter(
    (r) => ruleSetMatchesPurpose(r, purpose ?? "") && ruleSetMatches(r, search)
  );

  const sorted = sortRows(visible, (r) => ruleSetSortKey(r, sort), dir);

  // Allow-listed, so `?size=1000000` cannot ask this page to render
  // every row it holds.
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);

  const purposes = [...new Set(rows.map((r) => r.purpose))].sort();

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="rule-sets"
      title={AGENCY_RULE_SETS.heading[locale]}
      lead={AGENCY_RULE_SETS.intro[locale]}
    >
      {/* Above the table, not under it. "Why is there no edit button"
          is the first question this screen raises, and an answer below
          a pager is an answer nobody reaches. */}
      <Panel>
        <PanelBody>
          <p className="t-muted max-w-[74ch]">
            {AGENCY_RULE_SETS.readOnlyNotice[locale]}
          </p>
        </PanelBody>
      </Panel>

      <RuleSetsTable
        rows={sorted.slice(start, end)}
        locale={locale}
        sort={sort}
        dir={dir}
        params={params}
        purposes={purposes}
        total={sorted.length}
        unfilteredTotal={rows.length}
        filteredLabel={
          filtered
            ? ADMIN_CONSOLE.showingTemplate[locale]
                .replace("{shown}", String(visible.length))
                .replace("{total}", String(rows.length))
            : undefined
        }
        pagination={{ page, pageCount, size }}
      />
    </AgencyShell>
  );
}
