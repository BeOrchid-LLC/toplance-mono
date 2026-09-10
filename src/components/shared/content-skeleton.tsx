import { ERROR_PAGE } from "@/lib/i18n/errors";
import type { Locale } from "@/lib/i18n/locales";

/**
 * What a console page shows while its own queries run.
 *
 * These replace the `loading.tsx` files that used to sit at `/agency` and
 * `/ops`. Those had no layout above them — the rail is rendered by
 * `AgencyShell` / `AdminShell` *inside each page* — so a route-level
 * fallback suspended the whole page subtree and took the rail down with
 * it. What a director actually saw was the console vanishing to a bare
 * plate on an empty ground, then coming back. The traveller surface never
 * had the bug, because `(app)/layout.tsx` owns its `AppBar` and its
 * `loading.tsx` only ever replaced what sits below it.
 *
 * So these are rendered as a `<Suspense>` fallback *inside* the shell
 * instead, where the rail, the bar and the page title are already
 * painted around them. That is also why neither carries padding or a
 * title placeholder: `AdminShell`'s `<main>` supplies the first and the
 * page's own `title` prop the second, and both land with the rail rather
 * than waiting on the query this is covering.
 *
 * Synchronous, and deliberately. The files these replace were `async` to
 * read the locale for the announced label, which meant the fallback had
 * its own await to finish before it could paint — a fallback that has to
 * wait is not covering anything. The locale is a prop now, taken from the
 * page, which has resolved it before this renders.
 *
 * No animation. A pulse on a block this large is motion for its own sake,
 * and the one thing a reader cannot look away from while waiting.
 */

/**
 * The console's shape: a plate with a header band and six rows.
 *
 * Six because that is what a roster, a case desk and a tenant table all
 * settle into above the fold — the number is the point, since a
 * fallback that is shorter than the page jumps when the rows arrive.
 */
export function TableSkeleton({ locale }: { locale?: Locale }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="h-[60px] border-b border-border bg-surface-2" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[var(--row-h)] border-b border-border last:border-b-0" />
        ))}
      </div>
      <span className="sr-only">{locale ? ERROR_PAGE.loading[locale] : "Loading"}</span>
    </div>
  );
}

/**
 * The reading shape: two stacked plates with a few lines in each.
 *
 * For the screens that are prose and document rows rather than a table —
 * a table skeleton would settle into something those pages never become.
 * `(app)/loading.tsx` makes the same argument for the traveller.
 */
export function ProseSkeleton({ locale }: { locale?: Locale }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-sm)]"
        >
          <div className="h-5 w-[180px] rounded-md bg-surface-2" />
          <div className="mt-4 h-4 w-full rounded-md bg-surface-2" />
          <div className="mt-2 h-4 w-[70%] rounded-md bg-surface-2" />
        </div>
      ))}
      <span className="sr-only">{locale ? ERROR_PAGE.loading[locale] : "Loading"}</span>
    </div>
  );
}
