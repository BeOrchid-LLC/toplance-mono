import { redirect } from "next/navigation";

import { Panel, PanelBody } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { homeFor } from "@/lib/auth/routes";
import { getActor } from "@/lib/data/applications";
import { hasDatabaseEnv } from "@/lib/db/client";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

/**
 * The role dispatcher. Roles live in Postgres, so neither the proxy nor
 * the static marketing page can answer "where does this person belong" —
 * this page can, and it is the only place that does. The generic auth
 * doors, the landing page's signed-in chrome and anything else that
 * holds a session but not a role sends people here.
 *
 * It is also where sessions with no profile row come to rest, which is
 * why the no-actor branch renders instead of redirecting. That state is
 * reachable by design since travellers became invite-only: Clerk will
 * create an account for anyone, and `completeProfile` then refuses to
 * make it a traveller without a live invitation. Sending those people to
 * `/sign-in` looked tidier and was a trap — the proxy walks a signed-in
 * visitor straight back off the auth pages, so the two bounced at each
 * other until the browser gave up with ERR_TOO_MANY_REDIRECTS. Every
 * console that cannot find a profile now redirects here, and here the
 * chain stops.
 */
export default async function GoPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const actor = await getActor();
  if (actor) redirect(homeFor(actor.role));

  return (
    <main className="relative isolate grid min-h-dvh place-items-center px-6 py-14">
      <div
        aria-hidden
        className="security-paper pointer-events-none absolute inset-0 -z-10"
      />
      <Shell className="max-w-[560px]">
        <Panel>
          <PanelBody>
            <p className="tag">Account</p>
            <h1 className="t-h2 mt-3 max-w-[24ch]">
              This sign-in has no Toplance account
            </h1>
            <p className="t-muted mt-3 max-w-[48ch]">
              You are signed in, but nothing here belongs to this address.
              Toplance accounts are created from an invitation — open the link
              the organisation sponsoring you sent, or sign out and try the
              address they invited.
            </p>
            <SignOutLink>Sign out</SignOutLink>
          </PanelBody>
        </Panel>
      </Shell>
    </main>
  );
}
