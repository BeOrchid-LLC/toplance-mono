import { ERROR_PAGE } from "@/lib/i18n/errors";
import { getLocale } from "@/lib/i18n/server";

/**
 * The agency console's skeleton — the same table plate `/ops` waits
 * behind, because the case desk and the roster are the same shape.
 *
 * `async` only to read the route segment for the announced label; there
 * is no query here, and there must not be, or the fallback would wait on
 * exactly the thing it exists to cover.
 */
export default async function AgencyLoading() {
  const locale = await getLocale();
  return (
    <div className="px-4 py-8 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-[280px] rounded-md bg-surface-2" />
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="h-[60px] border-b border-border bg-surface-2" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[var(--row-h)] border-b border-border last:border-b-0" />
        ))}
      </div>
      <span className="sr-only">{ERROR_PAGE.loading[locale]}</span>
    </div>
  );
}
