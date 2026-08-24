import { Suspense } from "react";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Operations sign-in" };

export default function OpsSignInPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  return (
    <div className="mx-auto grid max-w-[1000px] items-center gap-14 lg:grid-cols-[1fr_460px]">
      {/* Stated as conditions of access rather than as features. This is
          the one door where the reader is being told what is recorded
          about them, not sold anything. */}
      <div className="hidden lg:block">
        <p className="tag">Staff entrance</p>
        <h2 className="d-lg mt-3 max-w-[16ch]">Staff access only</h2>
        <p className="t-body-lg mt-5 max-w-[52ch] text-ink-2">
          This console holds identity documents for every applicant. Sessions
          are logged and every document view is recorded against your account.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {[
            "A one-time code is emailed on every sign-in",
            "Sessions expire after 30 minutes idle",
            "Full audit trail on document access",
          ].map((x) => (
            <li key={x} className="flex items-start gap-3">
              <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
              <span className="text-[15px] text-ink-2">{x}</span>
            </li>
          ))}
        </ul>
      </div>

      <Suspense fallback={<Skeleton className="h-[340px] w-full rounded-lg" />}>
        <AuthForm mode="sign-in" audience="operations" />
      </Suspense>
    </div>
  );
}
