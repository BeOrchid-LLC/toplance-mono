import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { OtherDoors, SIGN_UP_DOORS } from "@/components/auth/other-doors";
import { DEAD_END_MESSAGE, InvitationDeadEnd } from "@/components/invite/dead-end";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getInvitationPreview } from "@/lib/data/invitations";
import { Skeleton } from "@/components/ui/skeleton";

// Resolves a token against the database, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create your account" };

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

  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-[560px]">
        <InvitationDeadEnd
          title="Toplance accounts are created by invitation"
          body="An organisation sponsors your application and sends you a link. If you are expecting one, ask whoever is arranging your travel — and if you already have an account, sign in instead."
        >
          <Link
            href="/sign-in"
            className="mt-6 inline-block font-semibold text-brand-text hover:underline"
          >
            Sign in
          </Link>
        </InvitationDeadEnd>
        <OtherDoors heading="Here for something else?" entries={SIGN_UP_DOORS} />
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
          body="Ask whoever invited you to send a new one — nothing about your account has changed."
        >
          <Link
            href="/sign-in"
            className="mt-6 inline-block font-semibold text-brand-text hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </InvitationDeadEnd>
        <OtherDoors heading="Here for something else?" entries={SIGN_UP_DOORS} />
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
      <OtherDoors heading="Not a traveler?" entries={SIGN_UP_DOORS} />
    </div>
  );
}
