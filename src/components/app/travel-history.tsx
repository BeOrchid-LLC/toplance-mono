"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addTravelRecord, removeTravelRecord } from "@/app/(app)/actions";
import { TripList, type Trip } from "@/components/shared/trip-list";

/**
 * The traveller's past trips, editable in place on the profile. Rows
 * are the traveller's own words — free text, like the intake — because
 * a trip can be to anywhere, for anything.
 *
 * The rows themselves are `TripList`, shared with the reviewer's case
 * file so the two readings of one trip cannot drift. What stays here is
 * the half a reviewer must not have: adding and removing.
 */
export type { Trip };

const inputClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

export function TravelHistory({ trips }: { trips: Trip[] }) {
  const [adding, setAdding] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const save = (formData: FormData) =>
    startTransition(async () => {
      const result = await addTravelRecord(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Trip added to your history");
      formRef.current?.reset();
      setAdding(false);
    });

  const remove = (trip: Trip) =>
    startTransition(async () => {
      const result = await removeTravelRecord(trip.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${trip.country} removed`);
    });

  return (
    <div>
      <TripList
        trips={trips}
        empty="No past trips recorded. Visa forms ask about them — adding yours here saves digging through old passports at the desk."
        action={(trip) => (
          <button
            type="button"
            aria-label={`Remove the trip to ${trip.country}`}
            onClick={() => remove(trip)}
            disabled={pending}
            className="-my-2 -me-2 grid size-[var(--row-h)] shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      />

      {adding ? (
        <form ref={formRef} action={save} className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="trip_country">Country you traveled to</Label>
            <input
              id="trip_country"
              name="country"
              required
              autoFocus
              placeholder="Ghana"
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trip_purpose">What the trip was for</Label>
            <input
              id="trip_purpose"
              name="purpose"
              placeholder="Family visit, work, study…"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="trip_from">From</Label>
              <input
                id="trip_from"
                name="started_on"
                type="date"
                className={inputClass}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trip_to">To</Label>
              <input
                id="trip_to"
                name="ended_on"
                type="date"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save trip"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="neutral"
              onClick={() => setAdding(false)}
              disabled={pending}
            >
              <X /> Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="neutral"
          size="sm"
          className="mt-5"
          onClick={() => setAdding(true)}
        >
          <Plus /> Add a past trip
        </Button>
      )}
    </div>
  );
}
