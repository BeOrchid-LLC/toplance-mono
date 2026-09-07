import Link from "next/link";

import { TakeCaseButton } from "@/components/agency/take-case-button";
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
 * The clients this agency is handling — "people" until the console
 * learned to say what they are. A client is somebody whose visa this
 * agency is running; a colleague is on `/agency/team`, and the two
 * were one word for as long as the console showed only one of them.
 *
 * One sheet in the case file: the roster is a single object, so it is
 * one card with ruled rows inside, not a stack of boxes.
 */
export function ClientRoster({
  rows,
  locale,
  label,
  empty,
  className,
  takeableBy,
}: {
  rows: RosterRow[];
  locale: Locale;
  /**
   * What this particular slice of the roster is. The clients page shows
   * the whole of it; a reviewer's dashboard shows the same rows cut two
   * ways — theirs, and the ones nobody has taken — and calling both
   * "Your clients" would be three lists claiming to be the same one.
   */
  label?: string;
  empty?: string;
  className?: string;
  /**
   * The viewer's own id, when these are cases they may take but not yet
   * open. Rows stop being links — the case screen would refuse them —
   * and carry a button that claims the case instead.
   */
  takeableBy?: string;
}) {
  const used = rows.length;

  return (
    <Panel className={className}>
      <PanelHeader
        label={label ?? AGENCY.yourClientsLabel[locale]}
        aside={
          <Badge variant="brand">
            <span className="num">{used}</span>
            {(used === 1 ? AGENCY.clientWord : AGENCY.clientsWord)[locale]}
          </Badge>
        }
      />

      {rows.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">
            {empty ?? AGENCY.rosterEmpty[locale]}
          </p>
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
            const cells = (
              <>
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

                <div className="flex items-center gap-3 lg:justify-self-end">
                  {r.status && <StatusBadge status={r.status} short />}
                  {takeableBy && (
                    <TakeCaseButton
                      applicationId={r.id}
                      viewerId={takeableBy}
                    />
                  )}
                </div>
              </>
            );

            const layout =
              "grid gap-x-8 gap-y-3 border-b border-border px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center";

            return (
              // The whole row opens the case — unless it is one nobody
              // has taken, which a reviewer may claim but not read. A
              // link there would be a link to a refusal, so the row
              // carries the one action that is theirs instead.
              <li key={r.id}>
                {takeableBy ? (
                  <div className={layout}>{cells}</div>
                ) : (
                  <Link
                    href={`/agency/clients/${r.id}`}
                    className={`${layout} transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]`}
                  >
                    {cells}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
