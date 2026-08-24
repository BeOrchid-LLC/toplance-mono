"use client";

import * as React from "react";

import {
  CORRIDORS_LIVE,
  CORRIDORS_SOON,
  ORIGINS,
  iso3,
  type Purpose,
} from "@/lib/domain/corridors";

export type CorridorStatus = "live" | "soon";

type Corridor = {
  origin: string;
  destination: string;
  purpose: Purpose;
};

type CorridorValue = Corridor & {
  status: CorridorStatus;
  code: string;
  mrz: string;
  set: (patch: Partial<Corridor>) => void;
};

const CorridorContext = React.createContext<CorridorValue | null>(null);

/** A passport's machine-readable zone is 44 characters wide. So is this. */
const MRZ_WIDTH = 44;

export const MRZ_FILLER = "<".repeat(MRZ_WIDTH);

/**
 * The payload alone, unpadded. It used to come back padded to 44, which
 * meant the fillers travelled inside the same string as the code and were
 * painted in the same brand colour — 26 characters of nothing, in the
 * loudest ink on the page. Padding is now the band's business, not the
 * corridor's, so the two can be coloured apart.
 */
function mrz(origin: string, destination: string, purpose: string) {
  const body = `TPL<${iso3(origin)}<<${iso3(destination)}<<${purpose.toUpperCase()}`;
  return body.slice(0, MRZ_WIDTH);
}

/**
 * One corridor, chosen once, read in three places: the hero bar, the
 * departure board and the closing call to action. Lifting it means the
 * board is not a separate list of countries you have to re-scan — it is
 * the same choice, seen from further away.
 *
 * Deliberately not in the URL or storage. The page is `force-static` and
 * cached at the edge; a corridor in the query string would fragment that
 * cache for a preference that lasts one scroll.
 */
export function CorridorProvider({ children }: { children: React.ReactNode }) {
  const [corridor, setCorridor] = React.useState<Corridor>({
    origin: ORIGINS[0].name,
    destination: CORRIDORS_LIVE[0].name,
    purpose: "Work",
  });

  const set = React.useCallback(
    (patch: Partial<Corridor>) => setCorridor((prev) => ({ ...prev, ...patch })),
    []
  );

  const value = React.useMemo<CorridorValue>(() => {
    const soon = CORRIDORS_SOON.some((c) => c.name === corridor.destination);
    return {
      ...corridor,
      status: soon ? "soon" : "live",
      code: `${iso3(corridor.origin)} → ${iso3(corridor.destination)} · ${corridor.purpose.toUpperCase()}`,
      mrz: mrz(corridor.origin, corridor.destination, corridor.purpose),
      set,
    };
  }, [corridor, set]);

  return (
    <CorridorContext.Provider value={value}>{children}</CorridorContext.Provider>
  );
}

export function useCorridor() {
  const value = React.useContext(CorridorContext);
  if (!value) {
    throw new Error("useCorridor must be rendered inside <CorridorProvider>");
  }
  return value;
}

/**
 * The band itself. Two layers in one grid cell, clipped to exact
 * complements: a field of `<` fillers retreating to the right while the
 * resolved code advances from the left. The code resolving out of the
 * fillers is the whole effect, and doing it in CSS keeps it identical on
 * the server and after hydration — a JS typewriter would have to paint
 * the finished string for a frame first to avoid a mismatch.
 *
 * Keyed on the code so changing a slot re-runs the resolve.
 *
 * Hidden from assistive tech on purpose. `TPL<NGA<<GBR<<WORK` read aloud
 * is noise; the same fact is stated in words directly beneath it.
 *
 * The code layer is two spans, not one. Together they are still exactly
 * 44 columns, so both layers stay aligned and the clip animation is
 * unchanged — but only the payload carries brand, and the fillers behind
 * it fall back to a dimmed grey that runs out rather than stopping.
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
