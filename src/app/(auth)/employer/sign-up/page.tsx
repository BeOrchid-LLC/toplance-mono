import { Suspense } from "react";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { AUTH_PAGE_TITLES, EMPLOYER_DOOR_PANEL } from "@/lib/i18n/auth-pages";
import { getLocale } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AUTH_PAGE_TITLES.employerSignUp[locale] };
}

export default async function EmployerSignUpPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  return (
    <div className="mx-auto grid max-w-[1000px] items-center gap-14 lg:grid-cols-[1fr_460px]">
      {/* The claim, in the same words and the same order as the landing
          page's organisations section — someone arriving here clicked that
          section, and finding a different promise would read as a
          different product. */}
      <div className="hidden lg:block">
        <p className="tag">{EMPLOYER_DOOR_PANEL.tag[locale]}</p>
        <h2 className="d-lg mt-3 max-w-[18ch]">
          {EMPLOYER_DOOR_PANEL.heading[locale]}
        </h2>
        <p className="t-body-lg mt-5 max-w-[52ch] text-ink-2">
          {EMPLOYER_DOOR_PANEL.body[locale]}
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {EMPLOYER_DOOR_PANEL.bullets.map((x) => (
            <li key={x.en} className="flex items-start gap-3">
              <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
              <span className="text-[15px] text-ink-2">{x[locale]}</span>
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
