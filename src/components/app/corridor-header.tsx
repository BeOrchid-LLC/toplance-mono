import { MrzBand } from "@/components/shared/mrz-band";
import { StatusBadge } from "@/components/shared/status-badge";
import { corridorMrz, countryFromIso2 } from "@/lib/domain/corridors";
import type { ApplicationStatus } from "@/lib/domain/status";
import type { Corridor } from "@/lib/db/schema";
import { getLocale } from "@/lib/i18n/server";
import { CORRIDOR_HEADER } from "@/lib/i18n/corridor-header";

/**
 * The `(app)` signature moment: the corridor a traveller is actually on,
 * carried the same way the landing page carries the one they were
 * choosing. The laminate is honest here for the same reason it is on the
 * sign-up form — the sheet is over the record being built, not over a
 * dashboard widget.
 *
 * One per screen and at the top, per guideline §4. It is rendered by
 * `(app)/layout.tsx`, which means no page underneath it may add a second
 * one, and `backdrop-filter` stays at one element per route.
 *
 * The mark is only drawn when the corridor row resolves to two countries
 * this build knows. A corridor whose codes we cannot read still gets the
 * card — the visa name and the case reference are real — it just gets no
 * MRZ, because a band is a claim about where someone is going and there
 * is nothing here that would let us invent one (guideline §7, and the
 * handover is explicit that the fallback is no mark rather than a
 * placeholder one).
 */
export async function CorridorHeader({
  caseRef,
  status,
  corridor,
}: {
  caseRef: string;
  status: ApplicationStatus;
  corridor: Corridor;
}) {
  const locale = await getLocale();
  const from = countryFromIso2(corridor.nationalityIso);
  const to = countryFromIso2(corridor.destinationIso);
  const code = corridorMrz(
    corridor.nationalityIso,
    corridor.destinationIso,
    corridor.purpose
  );

  return (
    <div className="laminate overflow-hidden rounded-lg">
      {/* Fires once on load. There is no slot to change here, so the
          corridor is the key it would be keyed on anyway. */}
      <span aria-hidden className="laminate-sheen" />

      <div className="relative z-[1]">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {/* "Route", not "corridor". A traveller runs several trips
                through this product over time, so the word that reads as
                one of many is the right one on their own screen; the
                record underneath is still a corridor everywhere else. */}
            <p className="tag">{CORRIDOR_HEADER.route[locale]}</p>
            {/* Archivo crossing into a product screen, which §2 allows
                only inside a signature moment. It stops at this card —
                everything below is back on the `.t-*` scale. */}
            <p className="d-sm mt-1.5 text-ink">
              {from?.name ?? corridor.nationalityIso.toUpperCase()}
              <span className="text-ink-3"> → </span>
              {to?.name ?? corridor.destinationIso.toUpperCase()}
            </p>
            <p className="t-muted mt-1">
              {corridor.visaName}
              <span className="text-ink-3"> · </span>
              <span className="capitalize">{corridor.purpose}</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <StatusBadge status={status} />
            <span className="num text-[13px] font-semibold text-ink-2">
              {CORRIDOR_HEADER.casePrefix[locale]} {caseRef.toUpperCase()}
            </span>
          </div>
        </div>

        {code && (
          <div className="border-t border-border px-5 py-3 sm:px-6">
            <MrzBand code={code} />
            {/* The band is aria-hidden, so this line is the only reading
                of the code assistive tech gets. */}
            <p className="num mt-2.5 text-[13px] font-semibold text-ink-2">
              {from?.iso3} → {to?.iso3} · {corridor.purpose.toUpperCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
