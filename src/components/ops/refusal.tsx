import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel, PanelBody } from "@/components/shared/panel";

/**
 * The honest refusal both ops screens showed inline before
 * `requireStaffConsole` existed — moved here verbatim so a queue page
 * and a case page cannot drift on what a non-staff visitor is told.
 */
export function StaffAccessRefused() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-[440px] text-center">
        <h1 className="t-h2">This console is for Toplance staff</h1>
        <p className="t-muted mt-3">
          Your account does not have operations access. If that is wrong, ask
          a Director to set your role — it cannot be granted from this screen.
        </p>
      </div>
    </div>
  );
}

/**
 * Staff, but not staff who can be trusted with a passport scan yet — no
 * authenticator app is enrolled, so Clerk has only ever asked this
 * session for one factor. `accountsUrl` is this instance's own Account
 * Portal, decoded from the publishable key rather than hardcoded, and
 * may be an empty string in a checkout with no key configured — the
 * button is left out rather than pointed at a broken link.
 */
export function StaffEnrollmentRequired({ accountsUrl }: { accountsUrl: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <Panel className="max-w-[480px]">
        <PanelBody className="text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink">
            <ShieldAlert className="size-5" />
          </span>
          <h1 className="t-h2 mt-4">Add an authenticator app to continue</h1>
          <p className="t-muted mt-3">
            This console holds passport scans, so every Toplance operations
            account needs a second sign-in factor on top of the emailed code.
            Add an authenticator app — and, if you want a fallback, backup
            codes — from your account&apos;s security settings, then sign in
            again.
          </p>
          {accountsUrl && (
            <Button asChild className="mt-6" variant="primary">
              <a href={`${accountsUrl}/user`} target="_blank" rel="noreferrer">
                Open account security settings
              </a>
            </Button>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
