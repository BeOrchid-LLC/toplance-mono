import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Shield } from "lucide-react";

import { AcceptInvitationForm } from "@/components/invite/accept-invitation-form";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { DEAD_END_MESSAGE, InvitationDeadEnd } from "@/components/invite/dead-end";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { Panel, PanelBody } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getProfile } from "@/lib/data/applications";
import {
  getInvitationPreview,
  pendingInvitationEmail,
  provisionInvitedProfile,
  type InvitationPreview,
} from "@/lib/data/invitations";
import { countryFromIso2, PURPOSE_ISO } from "@/lib/domain/corridors";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Accept invitation" };

function purposeLabel(purpose: string): string {
  return Object.entries(PURPOSE_ISO).find(([, iso]) => iso === purpose)?.[0] ?? purpose;
}

/**
 * The chrome an unauthenticated visitor can land on: no `AppBar` (it
 * needs a name and email this visitor may not have yet), just the mark
 * and the two switches every entry surface carries.
 */
function InviteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[var(--bar-h)] items-center gap-4 border-b border-border px-[max(16px,calc((100%-1140px)/2))]">
        <Wordmark className="[&_.wordmark-label]:max-md:hidden" />
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch variant="icon" />
          <LocaleMenu size="sm" />
        </div>
      </header>
      <main className="relative isolate flex-1 px-6 py-14 md:py-20">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-0 -z-10"
        />
        <Shell className="max-w-[560px]">{children}</Shell>
      </main>
    </div>
  );
}

/** The facts every signed-in-or-not visitor with a live invitation sees. */
function InvitationSummary({ preview }: { preview: InvitationPreview }) {
  const destination = countryFromIso2(preview.destinationIso);
  const destinationLabel = destination?.name ?? preview.destinationIso?.toUpperCase();
  const parts = [destinationLabel, preview.purpose && purposeLabel(preview.purpose)].filter(
    (part): part is string => Boolean(part)
  );
  return (
    <>
      <p className="tag">Invitation</p>
      <h1 className="t-h2 mt-3 max-w-[22ch]">
        {preview.orgName} is sponsoring your visa application
      </h1>
      {parts.length > 0 && (
        <p className="t-body-lg mt-3 text-ink-2">{parts.join(" · ")}</p>
      )}
      <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-surface-2 px-4 py-4">
        <Shield className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
        <p className="t-muted">
          {preview.orgName} sees your progress, never your documents.
          Passports, bank statements and police certificates stay between
          you and Toplance.
        </p>
      </div>
    </>
  );
}

/**
 * Signed in, but not as the person this invitation names.
 *
 * The state this page used to render as if nobody were signed in at all,
 * which made both of the anonymous buttons dead: the proxy walks a
 * signed-in visitor off `/sign-up?token=` and `/sign-in?next=` straight
 * back to this page, so each one returned them to the screen they had
 * just clicked from, with nothing said. Signing out is the only move
 * that changes anything, and it lands back here — signed out, on a live
 * invitation, in front of the door that now works.
 *
 * The signed-in address is named; the invited one never is. This page
 * has no session requirement, so whoever holds the link can read it, and
 * the invited address is the one fact on the invitation that belongs to
 * somebody who may not be the reader.
 */
function WrongAccount({ email, token }: { email: string | null; token: string }) {
  return (
    <InvitationDeadEnd
      title="This invitation is for a different account"
      body={
        email
          ? `You are signed in as ${email}, and this invitation was sent to another address. Sign out and open the link again with the address the organisation invited.`
          : "You are signed in with an account this invitation was not sent to. Sign out and open the link again with the address the organisation invited."
      }
    >
      <SignOutLink redirectUrl={`/invite/${token}`}>
        Sign out and use another address
      </SignOutLink>
    </InvitationDeadEnd>
  );
}

/**
 * The one case where holding a session but no profile row is recoverable
 * rather than a dead end: this visitor is standing on the invitation
 * that entitles them to one.
 *
 * It happens because `completeProfile` is a write from the sign-up page,
 * and Clerk activating the new session navigates that page away
 * mid-request. Without this, a traveller who blinked at the wrong moment
 * arrives at their own invitation and is offered "Set up your account" —
 * a door they have already walked through and which will not let them
 * through twice.
 */
async function recoverInvitedProfile(token: string, userId: string) {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Clerk's name, not the invitation's: `signUp.create` sent the
  // traveller's own passport name before the session existed, so it
  // survives the cancelled write that brought us here.
  const provisioned = await provisionInvitedProfile(
    token,
    userId,
    email,
    [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  );
  return provisioned ? await getProfile() : null;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const { token } = await params;
  const preview = await getInvitationPreview(token);

  const deadEnd = (reason: keyof typeof DEAD_END_MESSAGE) => (
    <InviteChrome>
      <InvitationDeadEnd
        title={DEAD_END_MESSAGE[reason]}
        body="Ask whoever invited you to send a new one — nothing about your account has changed."
      >
        <Link
          href="/"
          className="mt-6 inline-block font-semibold text-brand-text hover:underline"
        >
          Back to toplance.com
        </Link>
      </InvitationDeadEnd>
    </InviteChrome>
  );

  if (!preview || preview.status !== "pending") {
    // The `if` above already proved `preview.status` is not "pending"
    // whenever `preview` exists — TypeScript cannot carry that fact
    // through the `??` below, so the cast just names what is already true.
    return deadEnd((preview?.status ?? "invalid") as keyof typeof DEAD_END_MESSAGE);
  }

  // Read, never rendered. `InvitationPreview` deliberately has no email
  // field: this page is public, and the address the employer typed is
  // the one thing on the invitation that identifies a third party.
  const invitedEmail = await pendingInvitationEmail(token);
  // Only reachable if the invitation expired between the two reads.
  if (!invitedEmail) return deadEnd("expired");

  const { userId } = await auth();
  const profile =
    (await getProfile()) ??
    (userId ? await recoverInvitedProfile(token, userId) : null);

  if (!profile) {
    // A session with no profile row got here one way: `completeProfile`
    // refused to write one, and the recovery above refused for the same
    // reason — the address does not match. Anyone whose address does
    // match has a row by now.
    if (userId) {
      const user = await currentUser();
      return (
        <InviteChrome>
          <WrongAccount
            email={user?.emailAddresses[0]?.emailAddress ?? null}
            token={token}
          />
        </InviteChrome>
      );
    }

    const next = `/invite/${token}`;
    // The token, not a return address: `/sign-up` has no other way in
    // since travellers became invite-only, and it derives where to land
    // from the token itself. Sign-in still needs `next`, because a
    // returning traveller's destination is not implied by anything.
    return (
      <InviteChrome>
        <Panel>
          <PanelBody>
            <InvitationSummary preview={preview} />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/sign-up?token=${encodeURIComponent(token)}`}
                className="flex h-[var(--control-h)] flex-1 items-center justify-center rounded-md bg-brand px-[22px] text-base font-semibold text-on-brand hover:bg-[color-mix(in_srgb,var(--brand)_88%,#fff)]"
              >
                Set up your account
              </Link>
              <Link
                href={`/sign-in?next=${encodeURIComponent(next)}`}
                className="flex h-[var(--control-h)] flex-1 items-center justify-center rounded-md border border-brand px-[22px] text-base font-semibold text-brand-text hover:bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]"
              >
                Sign in
              </Link>
            </div>
          </PanelBody>
        </Panel>
      </InviteChrome>
    );
  }

  if (profile.role !== "traveler") {
    return (
      <InviteChrome>
        <Panel>
          <PanelBody>
            <p className="tag">Invitation</p>
            <h1 className="t-h2 mt-3">This invitation is for a traveller account</h1>
            <p className="t-muted mt-3 max-w-[48ch]">
              You are signed in with an organisation or staff account, which
              cannot accept a sponsorship invitation. Open the link in a
              browser signed in as the traveller it was sent to, or sign out
              first.
            </p>
            <SignOutLink redirectUrl={`/invite/${token}`}>
              Sign out and use another address
            </SignOutLink>
          </PanelBody>
        </Panel>
      </InviteChrome>
    );
  }

  // A traveller, but not this invitation's traveller — a second account
  // of their own, or a link forwarded to a colleague who already has
  // one. `acceptInvitationTx` refuses this too; showing the Accept
  // button anyway would be offering a click whose only outcome is an
  // error toast.
  if (profile.email.toLowerCase() !== invitedEmail.toLowerCase()) {
    return (
      <InviteChrome>
        <WrongAccount email={profile.email} token={token} />
      </InviteChrome>
    );
  }

  return (
    <InviteChrome>
      <Panel>
        <PanelBody>
          <InvitationSummary preview={preview} />
          <AcceptInvitationForm token={token} />
        </PanelBody>
      </Panel>
    </InviteChrome>
  );
}
