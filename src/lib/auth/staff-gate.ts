import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { getActor, getProfile, type Profile } from "@/lib/data/applications";
import { isStaff } from "@/lib/auth/policy";
import type { Actor, StaffRole } from "@/lib/auth/policy";
import { buildAccountsBaseUrl } from "@clerk/shared/buildAccountsBaseUrl";

/**
 * The three outcomes a staff-only screen can be in, once identity is
 * known. Kept pure and Clerk-free so it is unit-testable without a
 * network call — `requireStaffConsole` below is the only thing that
 * knows how to ask Clerk for the two facts this needs.
 */
export type StaffGateDecision = "ok" | "refuse" | "refuse-role" | "enroll";

/**
 * `refuse` and `refuse-role` are both a closed door, kept apart so the
 * screen can say which one it is. Telling a reviewer "this console is
 * for Toplance staff" when they *are* staff reads as a bug in their
 * account rather than the boundary it actually is.
 */
export function decideStaffGate(input: {
  isStaff: boolean;
  twoFactorEnabled: boolean;
  staffRole?: StaffRole | null;
  /** Set by screens only some staff may open, e.g. the director's dashboard. */
  requireRole?: StaffRole;
}): StaffGateDecision {
  if (!input.isStaff) return "refuse";

  // Before the second factor, deliberately. Enrolling an authenticator
  // app would not get a reviewer into an owner-only screen, so asking
  // them to go and do it first is a walk to a door that stays shut.
  if (input.requireRole && input.staffRole !== input.requireRole) {
    return "refuse-role";
  }

  if (!input.twoFactorEnabled) return "enroll";
  return "ok";
}

/**
 * Decodes the Frontend API host out of the publishable key so the
 * enrollment blocker can link to *this* Clerk instance's Account
 * Portal without a hardcoded domain. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
 * is `pk_(test|live)_<base64(frontendApi + "$")>`.
 */
function accountsBaseUrl(): string {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  // "pk_test_<base64>" / "pk_live_<base64>" — slice rather than a plain
  // split, since the base64 payload can itself contain "_".
  const encoded = key.split("_").slice(2).join("_");
  if (!encoded) return "";
  const frontendApi = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  return buildAccountsBaseUrl(frontendApi);
}

/**
 * Test seam only: e2e needs staff fixtures it can sign in as without
 * walking a real authenticator-app enrollment. Off by default, and it
 * widens nothing else either gate checks — a non-staff account is still
 * refused, and the account still needs a real Clerk session to get this
 * far. Never set outside the e2e webServer's own environment.
 *
 * Inert in a production build whatever the environment says, so a
 * variable that leaks into a deployed environment cannot stand the
 * second factor down. The e2e suite runs `next dev`, so `NODE_ENV` is
 * `development` there and the seam still works.
 */
function staffTwoFactorSkipped(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.E2E_SKIP_STAFF_2FA === "1";
}

export type StaffGateResult =
  | { decision: "ok"; profile: Profile; actor: Actor }
  | { decision: "refuse" }
  | { decision: "enroll"; accountsUrl: string };

/**
 * What a screen that named a required role can get back.
 *
 * Kept apart from `StaffGateResult` rather than folded into it, because
 * only a caller that asked for a role can be refused for one. Folded
 * together, every ops screen would have to handle a `refuse-role` it can
 * never receive just to narrow the union — five unreachable refusals
 * rendering copy nobody will ever read. The overloads below hand each
 * caller exactly the outcomes its own call can produce.
 */
export type StaffRoleGateResult =
  | StaffGateResult
  | { decision: "refuse-role"; requiredRole: StaffRole };

/**
 * The one door into either ops screen. Row-level security does not
 * exist here (see `guards.ts`), so this check is the only thing
 * standing between an unauthorised or under-verified session and a
 * page full of passport scans.
 *
 * `redirect()` throws, so an unauthenticated visitor never reaches the
 * decision below — both ops pages sent that case to the same place
 * (`/ops/sign-in?next=/ops`) before this existed, so folding it in here
 * loses nothing.
 *
 * Wrapped in React `cache()`. A page and its `generateMetadata` are two
 * separate invocations Next makes for one request, and a gated
 * `generateMetadata` (`/ops/tenants/[id]`) therefore paid for a second
 * profile read, a second membership read and a second Clerk
 * `currentUser()` round trip on every request. Nothing here writes, and
 * the answer cannot change inside one request, so memoising it is only
 * a cost fix — the gate still runs, in full, once. React's `cache` is a
 * no-op with no request dispatcher bound, so nothing outside a request
 * (tests included) sees a memo at all.
 *
 * `requireRole` is a bare `StaffRole` rather than an options object for
 * that memo's sake: `cache()` keys on the arguments it is handed, and a
 * fresh `{ requireRole }` literal is a new key on every call — an object
 * would quietly hand every role-gated screen back the second round trip
 * the memo exists to remove.
 */
const staffGate = cache(async function staffGate(
  requireRole?: StaffRole
): Promise<StaffRoleGateResult> {
  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  // `/go` rather than the ops door, for the reason on `GoPage`: the
  // proxy bounces a signed-in visitor off every auth page, so a session
  // with no profile row would ricochet between the two.
  if (!profile || !actor) redirect("/go");

  if (!isStaff(actor)) return { decision: "refuse" };

  // Role first, so a reviewer opening an owner-only screen is never sent
  // off to enrol an authenticator app that would not let them in. It
  // also saves the Clerk round-trip below on a request that cannot
  // succeed.
  if (requireRole && actor.staffRole !== requireRole) {
    return { decision: "refuse-role", requiredRole: requireRole };
  }

  // Backend `currentUser()`, not the session claims — `twoFactorEnabled`
  // reflects whether an authenticator app or backup codes are actually
  // enrolled, which nothing in the session token carries.
  const user = await currentUser();

  const decision = decideStaffGate({
    isStaff: true,
    twoFactorEnabled: staffTwoFactorSkipped() || (user?.twoFactorEnabled ?? false),
    staffRole: actor.staffRole,
    requireRole,
  });

  if (decision === "refuse-role") {
    // Unreachable — the early return above catches it — but the union
    // has the case, and narrowing it here beats casting below.
    return { decision: "refuse-role", requiredRole: requireRole! };
  }
  if (decision === "enroll") return { decision: "enroll", accountsUrl: accountsBaseUrl() };
  return { decision: "ok", profile, actor };
});

/**
 * The gate itself — `staffGate` above, with the return type narrowed to
 * what this particular call can produce. A screen that named no role
 * cannot be refused for one, and does not have to say what it would do
 * if it were.
 */
export function requireStaffConsole(): Promise<StaffGateResult>;
export function requireStaffConsole(
  requireRole: StaffRole
): Promise<StaffRoleGateResult>;
export function requireStaffConsole(requireRole?: StaffRole) {
  return staffGate(requireRole);
}

export type StaffActionResult = { actor: Actor } | { error: string };

const NOT_STAFF = "You do not have access to that.";
const NEEDS_SECOND_FACTOR =
  "Turn on two-step verification on your Toplance account before you can act on a case.";

/**
 * The same gate as `requireStaffConsole`, for the writes rather than the
 * screens.
 *
 * A server action is a POST endpoint with a public id, not a private
 * function of the page that renders its button — so gating the ops
 * screens on a second factor while gating their actions on `isStaff`
 * alone leaves every staff write (and every signed passport-scan URL)
 * reachable from a session that never enrolled one. This closes that:
 * same three-way decision, same seam, phrased as an `{ error }` the
 * actions already know how to surface.
 *
 * Pass `known` when the caller has already resolved the actor, so a
 * gate never costs a second round of profile and membership queries.
 */
export async function requireStaffAction(
  known?: Actor | null
): Promise<StaffActionResult> {
  const actor = known ?? (await getActor());
  if (!actor) return { error: NOT_STAFF };

  // Only asked of staff: a traveller is refused on the role alone, and
  // has no reason to cost a Clerk backend call.
  const user = isStaff(actor) ? await currentUser() : null;

  const decision = decideStaffGate({
    isStaff: isStaff(actor),
    twoFactorEnabled: staffTwoFactorSkipped() || (user?.twoFactorEnabled ?? false),
  });

  if (decision === "refuse") return { error: NOT_STAFF };
  if (decision === "enroll") return { error: NEEDS_SECOND_FACTOR };
  return { actor };
}
