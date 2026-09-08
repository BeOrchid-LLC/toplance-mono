/**
 * A funnel as a stack of bars: how far a set of applications got, and
 * where they stopped.
 *
 * Extracted from the ops dashboard so the agency console can show the
 * same shape without a second implementation. The arithmetic is not
 * here — `funnelOf` in `@/lib/domain/kpis` computes the counts and the
 * stage-to-stage rate, and this renders whatever it was handed.
 *
 * **Labels come from the caller, not from the stage keys.** The two
 * callers do not speak the same language: `/ops` is BeOrchid's own
 * screen and carries the English `FUNNEL_STAGES[].label`, while the
 * agency console is translated into every locale in `LOCALES`. Resolving
 * a label in here would mean either shipping English into a translated
 * console or pulling the whole `AGENCY` dictionary into a staff page.
 *
 * Widths are measured against the first stage rather than the largest,
 * which is the same thing by construction: `funnelOf` counts each stage
 * as reached-or-passed, so the series cannot widen and a bar cannot
 * overflow its track. Doing it by `Math.max` would hide the day that
 * invariant breaks.
 */

export type FunnelBar = {
  key: string;
  label: string;
  count: number;
  /** This stage as a share of the one before it; `null` on the first. */
  ofPrevious: number | null;
};

/** A share as a whole percentage, or an em dash where there is no rate. */
function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function FunnelBars({
  stages,
  /**
   * How the "x% of previous" note reads, with `{pct}` filled in. The
   * caller passes it already translated; omitting it drops the note,
   * which is what a caller with no phrasing for it should get rather
   * than an English fallback.
   */
  ofPreviousLabel,
}: {
  stages: readonly FunnelBar[];
  ofPreviousLabel?: (share: string) => string;
}) {
  if (stages.length === 0) return null;

  const widest = stages[0].count;

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const share = widest ? stage.count / widest : 0;
        return (
          <div key={stage.key}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="t-body">{stage.label}</span>
              <span className="num text-ink-2">
                {stage.count}
                {stage.ofPrevious !== null && ofPreviousLabel && (
                  <span className="special ms-2 inline">
                    {ofPreviousLabel(pct(stage.ofPrevious))}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
              {/* A stage with anybody in it keeps a visible sliver, so
                  "1 of 400" reads as a bar rather than as nothing. A
                  stage with nobody in it gets no bar at all — a 1% mark
                  under a zero is a mark for a person who is not there. */}
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(share * 100, share > 0 ? 1 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
