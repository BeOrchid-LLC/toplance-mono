import Link from "next/link";
import { Database, Terminal } from "lucide-react";

/**
 * Shown on any route that needs a database before one is configured.
 * A first-run developer should get instructions, not a stack trace.
 */
export function SetupNotice() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-16">
      <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink">
        <Database className="size-5" />
      </span>
      <h1 className="t-h2 mt-4">The database is not connected yet</h1>
      <p className="t-body-lg mt-3 text-ink-2">
        The public site runs without a database, but this screen needs one. Five
        commands and you are through:
      </p>

      <ol className="mt-6 flex flex-col gap-4">
        {[
          {
            cmd: "npm run db:up",
            note: "Boots Postgres and the object store in Docker.",
          },
          {
            cmd: "cp .env.local.example .env.local",
            note: "Then paste in your two Clerk keys — sign-in needs them.",
          },
          {
            cmd: "npm run db:migrate",
            note: "Applies the schema, the completion function and the triggers.",
          },
          {
            cmd: "npm run db:seed",
            note: "Loads the four corridor rule sets and their requirements.",
          },
          {
            cmd: "npm run db:bucket",
            note: "Creates the private bucket documents are uploaded to.",
          },
        ].map((step, i) => (
          <li key={step.cmd} className="flex gap-4">
            <span className="special mt-3 w-6 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1 rounded-md border border-border bg-surface p-4">
              <code className="flex items-center gap-2 font-mono text-base text-ink">
                <Terminal className="size-4 shrink-0 text-ink-3" />
                {step.cmd}
              </code>
              <p className="t-muted mt-2">{step.note}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="t-muted mt-8">
        Full detail is in <code className="font-mono">README.md</code>.{" "}
        <Link href="/" className="font-semibold text-brand-text hover:underline">
          Back to the home page
        </Link>
        , which works without any of this.
      </p>
    </main>
  );
}
