import { cn } from "@/lib/utils";

/**
 * A passport with an approval stamp across it — the picture on the
 * traveller's dashboard once their visa is granted.
 *
 * Asked for on the 2026-09-10 call: "getting your visa approved is
 * something to celebrate… let's make it more exciting", with "it doesn't
 * even have to be animated" said in the same breath. So it is still, and
 * that is the right call beyond the client's say-so: nothing on this
 * screen moves, and the one plate that did would be the one a
 * reduced-motion reader could not stop.
 *
 * Inline, and painted only from tokens, for the reason `Wordmark` gives:
 * a literal hue is a copy nobody repaints. `--brand` is the passport
 * cover, `--success` the stamp, `--brand-accent` the sparks — the amber
 * that `globals.css` keeps for decoration, which is exactly this. It
 * never uses `--way`: the button beside it is the screen's one wayfinding
 * object, and a second would make both mean less.
 */
export function VisaApprovedArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 120"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-28 w-auto", className)}
    >
      {/* Passport, tilted a touch so it reads as a thing in a hand. */}
      <g transform="rotate(-8 60 64)">
        <rect x="26" y="14" width="68" height="94" rx="7" fill="var(--brand)" />
        <rect
          x="32"
          y="20"
          width="56"
          height="82"
          rx="4"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        {/* Globe emblem */}
        <circle cx="60" cy="50" r="13" stroke="white" strokeWidth="2.5" />
        <ellipse cx="60" cy="50" rx="5.5" ry="13" stroke="white" strokeWidth="2" />
        <path d="M47 50h26" stroke="white" strokeWidth="2" />
        <rect x="44" y="76" width="32" height="4" rx="2" fill="white" fillOpacity="0.8" />
        <rect x="49" y="85" width="22" height="3.5" rx="1.75" fill="white" fillOpacity="0.5" />
      </g>

      {/* The stamp: a ring and a tick, overlapping the cover's corner the
          way a real one lands off-centre. */}
      <g transform="rotate(12 100 78)">
        {/* The disc that lifts the stamp off the cover. Half of it hangs
            past the passport's edge onto the plate, so it is painted the
            plate's own sheet — the success tint the dashboard gives an
            approved `Panel` — and not `--surface`, which would draw a pale
            half-moon there. Change one, change the other. */}
        <circle
          cx="100"
          cy="78"
          r="24"
          style={{ fill: "color-mix(in srgb, var(--success) 7%, var(--surface))" }}
        />
        <circle cx="100" cy="78" r="21" stroke="var(--success)" strokeWidth="3.5" />
        <circle
          cx="100"
          cy="78"
          r="15.5"
          stroke="var(--success)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d="M91 78.5l6 6 12-13"
          stroke="var(--success)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Sparks */}
      <path
        d="M116 16l2.6 7.4L126 26l-7.4 2.6L116 36l-2.6-7.4L106 26l7.4-2.6z"
        fill="var(--brand-accent)"
      />
      <path
        d="M14 30l1.7 4.3L20 36l-4.3 1.7L14 42l-1.7-4.3L8 36l4.3-1.7z"
        fill="var(--brand-accent)"
      />
      <circle cx="130" cy="48" r="3" fill="var(--brand-2)" />
      <circle cx="12" cy="92" r="2.5" fill="var(--brand-2)" />
    </svg>
  );
}
