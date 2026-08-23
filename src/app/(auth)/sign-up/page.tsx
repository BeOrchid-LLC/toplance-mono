import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Shield } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Create your account" };

const ENTRIES = [
  {
    href: "/employer/sign-in",
    icon: Briefcase,
    title: "Employer sign-in",
    body: "Sponsor seats, invite your people and track their progress",
  },
  {
    href: "/ops/sign-in",
    icon: Shield,
    title: "Toplance operations sign-in",
    body: "Staff only — review cases, verify documents and set decisions",
  },
];

export default function SignUpPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
        <AuthForm mode="sign-up" />
      </Suspense>

      <div className="mt-8 border-t border-border pt-6">
        <p className="special-caps">Not a traveller?</p>
        <div className="mt-3 flex flex-col gap-3">
          {ENTRIES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="flex min-h-[72px] items-center gap-4 rounded-md border border-border bg-surface p-4 transition-colors hover:border-brand hover:bg-[color-mix(in_srgb,var(--brand)_5%,var(--surface))]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text">
                <e.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-title block">{e.title}</span>
                <span className="t-muted block">{e.body}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-brand-text" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
