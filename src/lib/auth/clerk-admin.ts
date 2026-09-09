import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

/**
 * The one place this product reaches Clerk's Backend API.
 *
 * Everything else here talks to Clerk through a session — `auth()`,
 * `currentUser()`, the middleware — which is Clerk answering questions
 * about the person holding the request. This module is the other
 * direction: a director acting on somebody else's account, with the
 * instance secret rather than a session.
 *
 * Behind one seam deliberately. A `clerkClient()` call scattered across
 * server actions is an integration nobody can fake in a test and nobody
 * can find when the API changes; keeping it here means the action layer
 * depends on a two-case result type instead of on Clerk.
 *
 * Nothing in here throws. A dead Clerk, a revoked secret key or an id
 * that no longer exists all come back as `{ error }`, because the
 * callers are server actions whose contract is a code the button can
 * turn into a sentence — and an exception out of an action reaches the
 * client as a rejected transition with no toast at all, which is a
 * button that silently does nothing.
 */

export type ClerkAdminResult = { ok: true } | { error: "clerk_unavailable" };

/**
 * Drop every second factor on an account and end the sessions it is
 * already holding.
 *
 * Both halves, because the reason to reset somebody's 2FA is usually
 * that the device is gone or is somebody else's — and dropping the
 * factors alone would leave whoever has the phone signed in until the
 * session expired on its own. `decideStaffGate` refuses the console to
 * an account with nothing enrolled, so the next thing they see is the
 * enrolment screen.
 *
 * The order matters. Factors first: if the revoke fails halfway, the
 * account is still one that cannot get back in without enrolling, which
 * is the safe end of the failure. Revoking first and then failing to
 * drop the factors would sign somebody out and leave the compromised
 * authenticator working.
 *
 * A session that will not revoke is reported rather than swallowed. The
 * director asked for the console to close on somebody; telling them it
 * did when a tab is still live is the failure this whole act exists to
 * prevent.
 */
export async function resetTwoFactor(userId: string): Promise<ClerkAdminResult> {
  try {
    const clerk = await clerkClient();

    await clerk.users.disableUserMFA(userId);

    const { data: sessions } = await clerk.sessions.getSessionList({
      userId,
      status: "active",
    });
    await Promise.all(sessions.map((session) => clerk.sessions.revokeSession(session.id)));

    return { ok: true };
  } catch (error) {
    console.error(`[clerk-admin] could not reset the second factor on ${userId}`, error);
    return { error: "clerk_unavailable" };
  }
}
