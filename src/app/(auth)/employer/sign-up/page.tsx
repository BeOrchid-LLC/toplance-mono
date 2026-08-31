import { Suspense } from "react";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Employer sign-up" };

export default function EmployerSignUpPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  return (
    <div className="mx-auto grid max-w-[1000px] items-center gap-14 lg:grid-cols-[1fr_460px]">
      {/* The claim, in the same words and the same order as the landing
          page's organisations section — someone arriving here clicked that
          section, and finding a different promise would read as a
          different product. */}
      <div className="hidden lg:block">
        <p className="tag">For organisations</p>
        <h2 className="d-lg mt-3 max-w-[18ch]">
          You see progress, never documents
        </h2>
        <p className="t-body-lg mt-5 max-w-[52ch] text-ink-2">
          The organisation console shows completion, status and destination for
          everyone whose seat you sponsor. Passports, bank statements and police
          certificates stay between the traveller and Toplance.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {[
            "Buy seats in advance and invite people by email",
            "One roster with completion and status per person",
            "Nudge someone who has stalled without calling them",
          ].map((x) => (
            <li key={x} className="flex items-start gap-3">
              <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
              <span className="text-[15px] text-ink-2">{x}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* No card wrapper: `AuthForm` brings its own laminate panel, and
          two nested surfaces would put a box inside a box. */}
      <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-lg" />}>
        <AuthForm mode="sign-up" audience="employer" intent={{ intent: "employer" }} />
      </Suspense>
    </div>
  );
}
