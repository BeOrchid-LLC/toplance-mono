import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { AUTH_PAGE_TITLES } from "@/lib/i18n/auth-pages";
import { getLocale } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AUTH_PAGE_TITLES.signIn[locale] };
}

export default function SignInPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  // The one door. It used to name two others beneath it — an
  // organisation sign-in and an operations sign-in — which asked a
  // visitor to classify themselves before they had typed anything, and
  // then sent them to a form identical to this one. The classification
  // never decided access: roles live in `profiles`, and `/go` reads them
  // after the session exists. Everybody signs in here and lands in their
  // own console.
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Suspense fallback={<Skeleton className="h-[360px] w-full" />}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}
