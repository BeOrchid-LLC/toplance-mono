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

      {/* Ruled rows, not cards. Two bordered boxes under a bordered panel
          made three nested outlines saying nothing; a rule separates these
          for free and keeps the panel above as the only surface on the
          screen. */}
      <div className="mt-10">
        <p className="tag">Not a traveller?</p>
        <div className="mt-4 border-t border-border-strong">
          {ENTRIES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="group flex min-h-[76px] items-center gap-4 border-b border-border py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]"
            >
              <e.icon
                className="size-5 shrink-0 text-brand-text"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="d-sm block">{e.title}</span>
                <span className="t-muted mt-0.5 block text-[15px]">{e.body}</span>
              </span>
              <ArrowRight
                className="size-5 shrink-0 text-brand-text transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
