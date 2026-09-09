"use client";

import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ERROR_PAGE } from "@/lib/i18n/errors";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/locales";

/**
 * The boundary for everything under a locale that no nearer boundary\n * caught — the marketing pages, `/go`, `/checkout`, an invitation.
 *
 * The locale comes from `useParams` rather than `getLocale()`: this is a
 * client component, and the segment is the one piece of routing state
 * still reachable when the server render that would have supplied it is
 * the thing that failed.
 *
 * `reset()` re-renders the segment. It is offered first because most of
 * what lands here is transient — a dropped connection, a cold pool.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const raw = useParams()?.locale;
  const param = typeof raw === "string" ? raw : null;
  const locale = isLocale(param) ? param : DEFAULT_LOCALE;

  return (
    <div className="mx-auto max-w-[560px] px-4 py-16">
      <h1 className="t-h2">{ERROR_PAGE.heading[locale]}</h1>
      <p className="t-muted measure mt-3">{ERROR_PAGE.body[locale]}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>{ERROR_PAGE.tryAgain[locale]}</Button>
        <Button variant="secondary" asChild>
          <a href={`/${locale}`}>{ERROR_PAGE.backToStart[locale]}</a>
        </Button>
      </div>
      {error.digest && (
        <p className="special mt-8">
          {ERROR_PAGE.reference[locale]} <span className="num">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
