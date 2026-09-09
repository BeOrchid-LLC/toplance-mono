/**
 * What the console shows while a page's queries run.
 *
 * 41 of 46 routes are `force-dynamic`, so every console screen blocks on
 * its slowest query before painting anything. This is the plate the page
 * will fill — same geometry, same rhythm — so the layout does not jump
 * when the real rows arrive.
 *
 * No animation. A pulse on a block this large is motion for its own sake
 * and the one thing a reader cannot look away from while waiting.
 *
 * English only, like the rest of `/ops`.
 */
export default function OpsLoading() {
  return (
    <div className="px-4 py-8 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-[280px] rounded-md bg-surface-2" />
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="h-[60px] border-b border-border bg-surface-2" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[var(--row-h)] border-b border-border last:border-b-0" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
