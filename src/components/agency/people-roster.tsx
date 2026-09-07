import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { countryFromIso2 } from "@/lib/domain/corridors";
import type { ApplicationStatus } from "@/lib/domain/status";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";

/**
 * One person on the roster, as `org_application_progress` returns them.
 *
 * Named structurally rather than inferred from the view, so the shape
 * this component may render is written down: there is no document
 * column here, and there is no column that could carry one. That is the
 * privacy promise the laminate makes, expressed as a type.
 */
export type RosterRow = {
  id: string;
  caseRef: string;
  fullName: string;
  status: ApplicationStatus;
  destinationIso: string | null;
  visaName: string | null;
  documentsTotal: number | null;
  documentsVerified: number | null;
  completionPct: number | null;
};

/**
 * The people this organisation is responsible for.
 *
 * One sheet in the case file: the roster is a single object — the people
 * this organisation sponsors — so it is one card with ruled rows inside,
 * not a stack of boxes.
 */
export function PeopleRoster({
  rows,
  locale,
}: {
  rows: RosterRow[];
  locale: Locale;
}) {
  const used = rows.length;

  return (
    <Panel>
      <PanelHeader
        label={AGENCY.yourPeopleLabel[locale]}
        aside={
          <Badge variant="brand">
            <span className="num">{used}</span>
            {(used === 1 ? AGENCY.personWord : AGENCY.peopleWord)[locale]}
          </Badge>
        }
      />

      {rows.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{AGENCY.rosterEmpty[locale]}</p>
        </PanelBody>
      ) : (
        /*
          Ruled rows, not a table. Four columns with a progress bar in
          one of them has no honest 390px form — it either scrolls
          sideways or collapses into unlabelled fragments — and §6
          prefers rules anyway. Each person is one row that reflows.
        */
        <ul>
          {rows.map((r) => {
            const destination = countryFromIso2(r.destinationIso);
            const pct = r.completionPct ?? 0;
            return (
              <li
                key={r.id}
                className="grid gap-x-8 gap-y-3 border-b border-border px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="t-title truncate" title={r.fullName ?? ""}>
                    {r.fullName}
                  </p>
                  <p className="special mt-1">{r.caseRef}</p>
                </div>

                <div className="min-w-0">
                  <p className="t-body truncate">
                    {destination?.name ??
                      r.destinationIso?.toUpperCase() ??
                      AGENCY.routeNotSet[locale]}
                  </p>
                  <p className="special mt-1 truncate" title={r.visaName ?? ""}>
                    {r.visaName ?? AGENCY.routeNotSet[locale]}
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Progress value={pct} className="flex-1" />
                    <span className="w-12 shrink-0 text-end text-base font-semibold">
                      {pct}%
                    </span>
                  </div>
                  <p className="special mt-1">
                    {fill(AGENCY.documentsVerified[locale], {
                      verified: r.documentsVerified ?? 0,
                      total: r.documentsTotal ?? 0,
                    })}
                  </p>
                </div>

                <div className="lg:justify-self-end">
                  {r.status && <StatusBadge status={r.status} short />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
