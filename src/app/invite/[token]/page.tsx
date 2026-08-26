import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";

import { AcceptInvitationForm } from "@/components/invite/accept-invitation-form";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { Panel, PanelBody } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getActor } from "@/lib/data/applications";
import { getInvitationPreview, type InvitationPreview } from "@/lib/data/invitations";
import { countryFromIso2, PURPOSE_ISO } from "@/lib/domain/corridors";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Accept invitation" };

/**
 * The same wording `acceptInvitationTx` returns for a dead token — kept
 * as one source of truth for the sentence rather than two copies that
 * could drift. `invalid` (a token matching nothing) has no error string
 * to borrow, since that path never reaches the transaction.
 */
const DEAD_END_MESSAGE: Record<"invalid" | "revoked" | "accepted" | "expired", string> = {
  invalid: "This invitation link is not valid.",
  revoked: "This invitation has been revoked.",
  accepted: "This invitation has already been accepted.",
  expired: "This invitation has expired.",
};

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

function DeadEnd({ reason }: { reason: keyof typeof DEAD_END_MESSAGE }) {
  return (
    <Panel>
      <PanelBody>
        <p className="tag">Invitation</p>
        <h1 className="t-h2 mt-3">{DEAD_END_MESSAGE[reason]}</h1>
        <p className="t-muted mt-3 max-w-[48ch]">
          Ask whoever invited you to send a new one — nothing about your
          account has changed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-semibold text-brand-text hover:underline"
        >
          Back to toplance.com
        </Link>
      </PanelBody>
    </Panel>
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

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const { token } = await params;
  const preview = await getInvitationPreview(token);

  if (!preview || preview.status !== "pending") {
    // The `if` above already proved `preview.status` is not "pending"
    // whenever `preview` exists — TypeScript cannot carry that fact
    // through the `??` below, so the cast just names what is already true.
    const reason = (preview?.status ?? "invalid") as keyof typeof DEAD_END_MESSAGE;
    return (
      <InviteChrome>
        <DeadEnd reason={reason} />
      </InviteChrome>
    );
  }

  const actor = await getActor();

  if (!actor) {
    const next = `/invite/${token}`;
    return (
      <InviteChrome>
        <Panel>
          <PanelBody>
            <InvitationSummary preview={preview} />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/sign-up?next=${encodeURIComponent(next)}`}
                className="flex h-[var(--control-h)] flex-1 items-center justify-center rounded-md bg-brand px-[22px] text-base font-semibold text-on-brand hover:bg-[color-mix(in_srgb,var(--brand)_88%,#fff)]"
              >
                Create an account
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

  if (actor.role !== "traveler") {
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
          </PanelBody>
        </Panel>
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
