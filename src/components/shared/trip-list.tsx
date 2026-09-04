import * as React from "react";

/**
 * A traveller's declared past trips, rendered the same way wherever they
 * are read.
 *
 * Two surfaces show these now — the traveller's own profile, where they
 * are editable, and the reviewer's case file, where they are not — and
 * the reviewer is checking them against a passport. Two copies of this
 * markup would let the two drift, and the failure that causes is not a
 * cosmetic one: a date range shown one way on one screen and another way
 * on the other is exactly the discrepancy a reviewer is looking for.
 *
 * No `"use client"`. Nothing here holds state or an event handler; the
 * one interactive element is passed in by the caller, so the traveller's
 * client component can hand it a delete button and the reviewer's server
 * component can hand it nothing.
 */
export type Trip = {
  id: string;
  country: string;
  purpose: string | null;
  startedOn: string | null;
  endedOn: string | null;
};

/** "Jun 2024 – Aug 2024", or one end of it, or nothing — never invented. */
export function tripDates(trip: Trip): string | null {
  const label = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  if (trip.startedOn && trip.endedOn) {
    return `${label(trip.startedOn)} – ${label(trip.endedOn)}`;
  }
  if (trip.startedOn) return label(trip.startedOn);
  if (trip.endedOn) return `until ${label(trip.endedOn)}`;
  return null;
}

export function TripList({
  trips,
  empty,
  action,
}: {
  trips: Trip[];
  /** What an empty history says — it differs by who is reading it. */
  empty: React.ReactNode;
  /** Rendered at the end of each row, when the reader may act on it. */
  action?: (trip: Trip) => React.ReactNode;
}) {
  if (trips.length === 0) return <p className="t-muted">{empty}</p>;

  return (
    <ul>
      {trips.map((trip) => {
        const dates = tripDates(trip);
        return (
          <li
            key={trip.id}
            className="flex items-center justify-between gap-6 border-b border-border py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="t-title truncate">{trip.country}</p>
              {/* "No details given" rather than an empty line: a trip
                  with nothing but a country is a fact about what the
                  traveller told us, and a reviewer needs to see that it
                  is thin rather than see a gap and wonder. */}
              <p className="t-muted mt-0.5">
                {[trip.purpose, dates].filter(Boolean).join(" · ") ||
                  "No details given"}
              </p>
            </div>
            {action?.(trip)}
          </li>
        );
      })}
    </ul>
  );
}
