"use client";

import * as React from "react";

import {
  CORRIDORS_LIVE,
  ORIGINS,
  isCorridorLive,
  iso3,
  mrz,
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
    // The whole triple, because that is what the requirements engine
    // matches on. Testing destination membership alone told a visitor
    // that Canada was live, took them through the intake, and dropped
    // them on "we do not cover Canada yet" — the badge and the engine
    // were answering different questions.
    const live = isCorridorLive(
      corridor.origin,
      corridor.destination,
      corridor.purpose
    );
    return {
      ...corridor,
      status: live ? "live" : "soon",
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
