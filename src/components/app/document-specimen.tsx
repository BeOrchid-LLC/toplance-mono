import type { Specimen, SpecimenShape } from "@/lib/domain/specimens";

/**
 * The drawn example beside a requirement.
 *
 * A description says "both machine-readable lines visible, uncropped".
 * Someone photographing a passport on a kitchen table at night still cuts
 * the bottom off, because the sentence has to be held in mind while
 * framing the shot. A drawing with the lines marked is understood in one
 * look, and — since the labels sit in a numbered legend rather than
 * inside the boxes — it stays legible at a phone's width.
 *
 * Deliberately not a photograph of a real document. There is no scan of
 * anybody's passport in this repository and there must never be one; a
 * redacted real document is not a substitute, because redaction fails and
 * the failure would be somebody's identity page.
 *
 * Purely presentational — no state, no effects. It is pulled into the
 * client bundle by `DocumentRow`, which is why only the one specimen a
 * row needs is passed in rather than the whole table.
 */

/**
 * Frame proportions in the drawing's own units. Real ratios rather than
 * round numbers, so a passport spread reads as a passport spread and a
 * photograph reads as 35×45mm.
 */
const FRAME: Record<SpecimenShape, { w: number; h: number }> = {
  page: { w: 100, h: 141 },
  card: { w: 125, h: 88 },
  photo: { w: 70, h: 90 },
};

export function DocumentSpecimen({
  specimen,
  caption,
  pitfallLabel,
}: {
  specimen: Specimen;
  /** "A drawing, not a real document…" — localised by the caller. */
  caption: string;
  /** "Most often sent back because:" — localised by the caller. */
  pitfallLabel: string;
}) {
  const frame = FRAME[specimen.shape];

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
      <svg
        viewBox={`0 0 ${frame.w} ${frame.h}`}
        role="img"
        aria-label={`Example ${specimen.docKey.replace(/_/g, " ")}: ${specimen.callouts
          .map((c) => c.label)
          .join("; ")}`}
        className="h-auto w-full max-w-[168px] shrink-0 text-ink-2"
      >
        {/* The sheet. Filled from the current text colour at low opacity
            so it reads on both the light ground and the dark one without
            naming a colour that only works on one. */}
        <rect
          x="0.5"
          y="0.5"
          width={frame.w - 1}
          height={frame.h - 1}
          rx="2"
          fill="currentColor"
          fillOpacity="0.05"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1"
        />

        {specimen.callouts.map((c, i) => {
          const x = (c.x / 100) * frame.w;
          const y = (c.y / 100) * frame.h;
          const w = (c.w / 100) * frame.w;
          const h = (c.h / 100) * frame.h;

          return (
            <g key={`${specimen.docKey}-${i}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="1.5"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.75"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              {/* The number badge sits on the box's top-left corner and
                  is the only link between drawing and legend. Outlined
                  rather than filled: a filled badge needs the page's
                  ground colour for its digit, and the ground is painted
                  by the theme rather than by this file. */}
              <circle
                cx={x}
                cy={y}
                r="5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fontWeight="600"
                fill="currentColor"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex min-w-0 flex-col gap-2">
        <ol className="flex list-none flex-col gap-1 p-0">
          {specimen.callouts.map((c, i) => (
            <li
              key={`${specimen.docKey}-legend-${i}`}
              className="t-muted flex gap-2"
            >
              <span className="tabular-nums text-ink-2">{i + 1}.</span>
              <span>{c.label}</span>
            </li>
          ))}
        </ol>

        <p className="t-muted">
          <span className="text-ink-2">{pitfallLabel}</span> {specimen.pitfall}
        </p>

        <p className="t-muted italic">{caption}</p>
      </div>
    </div>
  );
}
