"use client";

import { Button } from "@/components/ui/button";

/**
 * A route group's error boundary.
 *
 * There were none anywhere in the product until now, so a DB or Clerk
 * fault dropped an operator mid-case onto Next's unstyled default — a
 * page from a different product, with no brand, no locale and no way
 * back. This is deliberately plain: it renders when something has
 * already gone wrong, so it depends on as little as possible.
 *
 * English only, like the rest of `/ops`, so it reads no dictionary.
 *
 * `reset()` re-renders the segment. It is offered first because most of
 * what lands here is transient — a dropped connection, a cold pool.
 */
export default function OpsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-16">
      <h1 className="t-h2">That screen did not load</h1>
      <p className="t-muted measure mt-3">
        Something went wrong on our side. Nothing you were working on has been
        lost.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" asChild>
          {/* A real `<a>`, not `<Link />`, and the lint rule is silenced
              rather than obeyed. `<Link />` navigates on the client,
              which keeps the React tree that just threw — including
              whatever state put it here — and can land straight back on
              this boundary. A document navigation is the point: it
              rebuilds everything from the server. The three translated
              boundaries do the same and only escape the rule because
              their href is a template literal it cannot resolve. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/ops">Back to the console</a>
        </Button>
      </div>
      {error.digest && (
        <p className="special mt-8">
          Reference <span className="num">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
