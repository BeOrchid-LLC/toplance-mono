import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { OtherDoors, SIGN_UP_DOORS } from "@/components/auth/other-doors";
import { DEAD_END_MESSAGE, InvitationDeadEnd } from "@/components/invite/dead-end";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getInvitationPreview } from "@/lib/data/invitations";
import { AUTH_DOORS_HEADINGS } from "@/lib/i18n/auth-doors";
import { AUTH_PAGE_TITLES, SIGN_UP_PAGE } from "@/lib/i18n/auth-pages";
import { getLocale } from "@/lib/i18n/server";
import { Skeleton } from "@/components/ui/skeleton";

// Resolves a token against the database, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AUTH_PAGE_TITLES.signUp[locale] };
}

/**
 * The traveller door, which since the client's decision of 2026-08-31
 * only opens from the inside: a traveller account exists because an
 * organisation invited that person, so reaching this page at all means
 * holding a live token.
 *
 * The check here is a courtesy, not the enforcement. It exists so a
 * visitor with a dead link is told which kind of dead, instead of
 * filling in a form that `completeProfile` was always going to refuse
 * after their emailed code had been spent. The enforcement is in
 * `completeProfile`, which is the only thing that writes the row.
 *
 * `next` is resolved from the token rather than read from the query
 * string. There is exactly one place an accepted invitation should land,
 * and deriving it here means this door cannot be pointed at anywhere
 * else.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-[560px]">
        <InvitationDeadEnd
          title={SIGN_UP_PAGE.noTokenTitle[locale]}
          body={SIGN_UP_PAGE.noTokenBody[locale]}
        >
          <Link
            href="/sign-in"
            className="mt-6 inline-block font-semibold text-brand-text hover:underline"
          >
            {SIGN_UP_PAGE.signInLink[locale]}
          </Link>
        </InvitationDeadEnd>
        <OtherDoors heading={AUTH_DOORS_HEADINGS.hereForSomethingElse} entries={SIGN_UP_DOORS} />
      </div>
    );
  }

  const preview = await getInvitationPreview(token);

  if (!preview || preview.status !== "pending") {
    // The `if` above already proved `preview.status` is not "pending"
    // whenever `preview` exists — TypeScript cannot carry that fact
    // through the `??` below, so the cast just names what is already true.
    const reason = (preview?.status ?? "invalid") as keyof typeof DEAD_END_MESSAGE;
    return (
      <div className="mx-auto w-full max-w-[560px]">
        <InvitationDeadEnd
          title={DEAD_END_MESSAGE[reason]}
          body={SIGN_UP_PAGE.invalidTokenBody[locale]}
        >
          <Link
            href="/sign-in"
            className="mt-6 inline-block font-semibold text-brand-text hover:underline"
          >
            {SIGN_UP_PAGE.alreadyHaveAccountSignIn[locale]}
          </Link>
        </InvitationDeadEnd>
        <OtherDoors heading={AUTH_DOORS_HEADINGS.hereForSomethingElse} entries={SIGN_UP_DOORS} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
        <AuthForm
          mode="sign-up"
          intent={{ intent: "invited", token }}
          next={`/invite/${token}`}
        />
      </Suspense>
      <OtherDoors heading={AUTH_DOORS_HEADINGS.notATraveler} entries={SIGN_UP_DOORS} />
    </div>
  );
}
