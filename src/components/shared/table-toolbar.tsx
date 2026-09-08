"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToolbarFilter = {
  /** The query-string key this control owns. */
  param: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Search and filters for a console table, held in the URL.
 *
 * The URL rather than component state, for three reasons that all matter
 * on this screen: a filtered queue is a link a reviewer can send to
 * whoever should be working it, the back button undoes a filter the way
 * everybody already expects, and the filtering itself stays on the
 * server — the page re-queries, so a 400-row queue never ships 400 rows
 * to the browser to hide 380 of them.
 *
 * The KPI cards and the side rail write the same parameters, so
 * "Unassigned" in the rail and a click on the Unassigned card land on the
 * identical URL rather than on two views that happen to look alike.
 */
export function TableToolbar({
  placeholder = "Search…",
  filters = [],
  className,
}: {
  placeholder?: string;
  filters?: ToolbarFilter[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // The field follows the URL when the URL changes underneath it — a
  // back button, or a rail link that clears the search. Without this the
  // input keeps showing a term that is no longer filtering anything.
  const lastUrlQuery = useRef(urlQuery);
  useEffect(() => {
    if (lastUrlQuery.current !== urlQuery) {
      lastUrlQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  function write(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Typing rewrites the URL, so it is debounced — one navigation per
  // pause, not one per keystroke.
  useEffect(() => {
    if (query === urlQuery) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query) next.set("q", query);
      else next.delete("q");
      lastUrlQuery.current = query;
      write(next);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setFilter(param: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    write(next);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface ps-9 pe-3 text-base text-ink placeholder:text-ink-3"
        />
      </div>

      {filters.map((f) => (
        <div key={f.param} className="relative">
          {/* Native select behind a styled face, per guideline §10: on a
              phone this opens the system picker, which is faster and
              already in the reader's own language. */}
          <select
            value={params.get(f.param) ?? ""}
            onChange={(e) => setFilter(f.param, e.target.value)}
            aria-label={f.label}
            className="h-9 appearance-none rounded-[var(--radius-sm)] border border-border-strong bg-surface ps-3 pe-8 text-base font-semibold text-ink"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}
