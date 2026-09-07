import { Shell } from "@/components/shared/shell";

/**
 * The band every organisation console page opens with: the ruled
 * security paper, the page's own heading, whatever facts belong under
 * it, and one action on the right.
 *
 * The paper is not decoration here — it is the ground the laminate on
 * the dashboard refracts. Without something under a `backdrop-filter`
 * there is nothing to bend, and the effect costs a frame to draw
 * nothing.
 *
 * Shared because the three pages are one console: a roster on its own
 * route that opened on a bare white page would read as a different
 * product from the dashboard it was reached from.
 */
export function ConsoleBand({
  title,
  action,
  children,
}: {
  title: string;
  /** The one primary action for this page — the invite dialog, so far. */
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px]"
      />

      <Shell className="pt-10">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="t-h2">{title}</h1>
            {children}
          </div>
          {action}
        </div>
      </Shell>
    </div>
  );
}
