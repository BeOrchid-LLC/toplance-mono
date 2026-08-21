import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Operations sign-in" };

export default function OpsSignInPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  return (
    <div className="mx-auto grid max-w-[940px] items-center gap-12 lg:grid-cols-[1fr_420px]">
      <div className="hidden lg:block">
        <h2 className="t-h2">Staff access only</h2>
        <p className="t-muted mt-3 measure">
          This console holds identity documents for every applicant. Sessions are
          logged and every document view is recorded against your account.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {[
            "A one-time code is emailed on every sign-in",
            "Sessions expire after 30 minutes idle",
            "Full audit trail on document access",
          ].map((x) => (
            <span key={x} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-ink" />
              <span className="t-body text-ink-2">{x}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <AuthForm mode="sign-in" audience="operations" />
        </Suspense>
      </div>
    </div>
  );
}
