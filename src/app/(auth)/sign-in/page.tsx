import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  return (
    <Suspense fallback={<Skeleton className="mx-auto h-[360px] w-full max-w-[560px]" />}>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
