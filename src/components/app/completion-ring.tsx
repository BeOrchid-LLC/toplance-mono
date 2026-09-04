/**
 * The completion score, drawn as a ring. It is the spine of the whole
 * product — the same number drives the traveller's next action, the
 * reviewer's queue order and the employer's roster — so it gets a
 * deliberate piece of the layout rather than a bar in a corner.
 *
 * A solid `--brand` arc, not a gradient. The gradient needed an SVG
 * `<defs>` with a fixed id, which silently collides the moment two rings
 * share a page — and §1 is that this product does not decorate. The arc
 * carries the figure; the sweep across it was carrying nothing.
 *
 * The label says "collected" because that is what `completionOf`
 * counts: a document uploaded and either awaiting or past review. It
 * used to say "verified", which described a stricter number the ring
 * has never drawn — submission gates on that one separately.
 */
export function CompletionRing({
  pct,
  size = 140,
}: {
  pct: number;
  size?: number;
}) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% of required documents collected`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-[var(--dur-ring)] ease-[var(--ease-out)]"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        {/* On the scale, not a one-off size. `t-h3`, not `t-h2`: at 32px
            a three-digit figure spans most of the 96px opening inside a
            120px ring and crowds the arc it sits in. The ring is the
            thing being read, and the figure has to sit in it. */}
        <span className="t-h3 leading-none">{pct}%</span>
        {/* "collected", matching the `aria-label` and the number the ring
            actually draws. It read "complete" while the label announced
            "collected" — so a sighted traveller and a screen-reader user
            were told two different things about one figure, and the
            sighted one was told the stronger of the two. 100% collected
            is true the moment the last required file is uploaded; 100%
            complete is not, because review has not happened yet. */}
        <span className="special-caps mt-1.5">collected</span>
      </span>
    </div>
  );
}
