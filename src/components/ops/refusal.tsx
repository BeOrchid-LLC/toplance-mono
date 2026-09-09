import Link from "next/link";
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
 * Staff, but not a Director.
 *
 * Separate from `StaffAccessRefused` because telling a reviewer "this
 * console is for Toplance staff" when they *are* staff — and work in
 * this console every day — reads as their account being broken rather
 * than as the boundary it is. The screen names the real reason and does
 * not offer a way around it, since there is not one from here.
 */
export function OwnerAccessRefused() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-[440px] text-center">
        <h1 className="t-h2">The dashboard is for Directors</h1>
        <p className="t-muted mt-3">
          This screen carries revenue and client billing, so it is limited to
          accounts with the Director role. Your operations access is
          unaffected — route curation is where it was.
        </p>
        <Button asChild className="mt-6" variant="secondary">
          <Link href="/ops/corridors">Back to routes</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Staff, and a rank, and a second factor — and a director has closed
 * the account anyway.
 *
 * Its own screen rather than `StaffAccessRefused`, for the reason
 * `OwnerAccessRefused` is its own screen: this person works here, and
 * telling them the console is for Toplance staff sends them to ask for
 * something they already have.
 *
 * No way out on the page, because there is not one from here — a
 * suspension is lifted by another director from `/ops/staff`, and a
 * button offering anything else would be a button that does nothing.
 */
export function StaffSuspended() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-[440px] text-center">
        <h1 className="t-h2">Your operations account is suspended</h1>
        <p className="t-muted mt-3">
          Nothing you were working on has moved — the cases assigned to you are
          still yours. A Director can restore your access from the colleagues
          screen.
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
