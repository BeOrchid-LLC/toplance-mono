import { Suspense } from "react";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { AUTH_PAGE_TITLES, OPS_DOOR_PANEL } from "@/lib/i18n/auth-pages";
import { getLocale } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AUTH_PAGE_TITLES.opsSignIn[locale] };
}

export default async function OpsSignInPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  return (
    <div className="mx-auto grid max-w-[1000px] items-center gap-14 lg:grid-cols-[1fr_460px]">
      {/* Stated as conditions of access rather than as features. This is
          the one door where the reader is being told what is recorded
          about them, not sold anything. */}
      <div className="hidden lg:block">
        <p className="tag">{OPS_DOOR_PANEL.tag[locale]}</p>
        <h2 className="d-lg mt-3 max-w-[16ch]">{OPS_DOOR_PANEL.heading[locale]}</h2>
        <p className="t-body-lg mt-5 max-w-[52ch] text-ink-2">
          {OPS_DOOR_PANEL.body[locale]}
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {OPS_DOOR_PANEL.bullets.map((x) => (
            <li key={x.en} className="flex items-start gap-3">
              <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
              <span className="text-[15px] text-ink-2">{x[locale]}</span>
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
