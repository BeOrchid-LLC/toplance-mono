import { cn } from "@/lib/utils";

/** Anything this list can rank: a stable key and a number. */
export type Counted = { key: string; count: number };

/**
 * A ranked list with a bar behind each row.
 *
 * The bar is scaled to the largest row rather than to the total, because
 * the question these panels answer is "which is biggest", not "what
 * share of everything is this".
 *
 * Lifted out of `/ops/dashboard/page.tsx` on 2026-09-10, when the route
 * demand panel needed the same treatment on `/ops/corridors`. `label`
 * takes the whole row rather than its key: a demand list names one
 * country and can work from the key alone, while a route names two ends
 * and a purpose, and reconstructing those by splitting the key apart
 * again would make the key a format two files had to agree on.
 */
export function CountList<T extends Counted>({
  rows,
  empty,
  label,
  className,
}: {
  rows: readonly T[];
  empty: string;
  label: (row: T) => React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) return <p className="t-muted">{empty}</p>;

  const top = rows[0].count;

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-4">
            <span className={cn("t-body truncate", className)}>{label(row)}</span>
            <span className="num font-semibold">{row.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand-2"
              style={{ width: `${(row.count / top) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
