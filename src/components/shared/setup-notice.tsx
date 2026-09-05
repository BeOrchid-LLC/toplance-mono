import Link from "next/link";
import { Database, Terminal } from "lucide-react";

import { SETUP_NOTICE } from "@/lib/i18n/setup-notice";
import { getLocale } from "@/lib/i18n/server";

/**
 * Shown on any route that needs a database before one is configured.
 * A first-run developer should get instructions, not a stack trace.
 */
export async function SetupNotice() {
  const locale = await getLocale();
  const steps = [
    "npm run db:up",
    "cp .env.local.example .env.local",
    "npm run db:migrate",
    "npm run db:seed",
    "npm run db:bucket",
  ].map((cmd, i) => ({ cmd, note: SETUP_NOTICE.steps[i][locale] }));

  return (
    <main className="mx-auto max-w-[720px] px-6 py-16">
      <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink">
        <Database className="size-5" />
      </span>
      <h1 className="t-h2 mt-4">{SETUP_NOTICE.title[locale]}</h1>
      <p className="t-body-lg mt-3 text-ink-2">{SETUP_NOTICE.intro[locale]}</p>

      <ol className="mt-6 flex flex-col gap-4">
        {steps.map((step, i) => (
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
        {SETUP_NOTICE.fullDetail[locale]} <code className="font-mono">README.md</code>.{" "}
        <Link href="/" className="font-semibold text-brand-text hover:underline">
          {SETUP_NOTICE.backHome[locale]}
        </Link>
        , {SETUP_NOTICE.worksWithoutThis[locale]}
      </p>
    </main>
  );
}
