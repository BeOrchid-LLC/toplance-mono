import { MRZ_FILLER, MRZ_WIDTH } from "@/lib/domain/corridors";

/**
 * The band itself. Two layers in one grid cell, clipped to exact
 * complements: a field of `<` fillers retreating to the right while the
 * resolved code advances from the left. The code resolving out of the
 * fillers is the whole effect, and doing it in CSS keeps it identical on
 * the server and after hydration — a JS typewriter would have to paint
 * the finished string for a frame first to avoid a mismatch.
 *
 * Keyed on the code so changing a corridor re-runs the resolve.
 *
 * Hidden from assistive tech on purpose. `TPL<NGA<<GBR<<WORK` read aloud
 * is noise; the guideline's rule is that the same fact must be stated in
 * words beside every band, because that is the only version a screen
 * reader ever gets.
 *
 * The code layer is two spans, not one. Together they are still exactly
 * 44 columns, so both layers stay aligned and the clip animation is
 * unchanged — but only the payload carries brand, and the fillers behind
 * it fall back to a dimmed grey that runs out rather than stopping.
 *
 * Lives here rather than beside the landing page's corridor context
 * because the product screens draw one too, from a corridor row instead
 * of a select. It takes a finished code and holds no state, so it costs
 * a server component nothing to render.
 */
export function MrzBand({ code }: { code: string }) {
  const pad = MRZ_FILLER.slice(0, Math.max(0, MRZ_WIDTH - code.length));

  return (
    <div aria-hidden className="mrz grid">
      <span key={`f${code}`} className="mrz-filler col-start-1 row-start-1">
        {MRZ_FILLER}
      </span>
      <span key={`c${code}`} className="mrz-code col-start-1 row-start-1">
        <span className="text-brand-text">{code}</span>
        <span className="mrz-pad">{pad}</span>
      </span>
    </div>
  );
}
