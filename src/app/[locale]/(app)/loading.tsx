import { ERROR_PAGE } from "@/lib/i18n/errors";
import { getLocale } from "@/lib/i18n/server";

/**
 * The traveller's skeleton, and deliberately not the console's.
 *
 * These screens are plates of prose and document rows, never a table, so
 * a six-row grid would settle into something the page never becomes. Two
 * stacked plates under a heading is what `/app` actually renders.
 */
export default async function AppLoading() {
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-[240px] rounded-md bg-surface-2" />
      {[0, 1].map((i) => (
        <div
          key={i}
          className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-sm)]"
        >
          <div className="h-5 w-[180px] rounded-md bg-surface-2" />
          <div className="mt-4 h-4 w-full rounded-md bg-surface-2" />
          <div className="mt-2 h-4 w-[70%] rounded-md bg-surface-2" />
        </div>
      ))}
      <span className="sr-only">{ERROR_PAGE.loading[locale]}</span>
    </div>
  );
}
