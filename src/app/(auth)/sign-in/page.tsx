import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { OtherDoors, SIGN_IN_DOORS } from "@/components/auth/other-doors";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  // Wrapped to the panel's own measure so the doors below line up with
  // it rather than with the page.
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Suspense fallback={<Skeleton className="h-[360px] w-full" />}>
        <AuthForm mode="sign-in" />
      </Suspense>
      <OtherDoors heading="Not a traveller?" entries={SIGN_IN_DOORS} />
    </div>
  );
}
