import "server-only";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { getActor, getProfile, type Profile } from "@/lib/data/applications";
import { isStaff } from "@/lib/auth/policy";
import type { Actor } from "@/lib/auth/policy";
import { buildAccountsBaseUrl } from "@clerk/shared/buildAccountsBaseUrl";

/**
 * The three outcomes a staff-only screen can be in, once identity is
 * known. Kept pure and Clerk-free so it is unit-testable without a
 * network call — `requireStaffConsole` below is the only thing that
 * knows how to ask Clerk for the two facts this needs.
 */
export type StaffGateDecision = "ok" | "refuse" | "enroll";

export function decideStaffGate(input: {
  isStaff: boolean;
  twoFactorEnabled: boolean;
}): StaffGateDecision {
  if (!input.isStaff) return "refuse";
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
 * The one door into either ops screen. Row-level security does not
 * exist here (see `guards.ts`), so this check is the only thing
 * standing between an unauthorised or under-verified session and a
 * page full of passport scans.
 *
 * `redirect()` throws, so an unauthenticated visitor never reaches the
 * decision below — both ops pages sent that case to the same place
 * (`/ops/sign-in?next=/ops`) before this existed, so folding it in here
 * loses nothing.
 */
export async function requireStaffConsole(): Promise<StaffGateResult> {
  const [profile, actor] = await Promise.all([getProfile(), getActor()]);
  // `/go` rather than the ops door, for the reason on `GoPage`: the
  // proxy bounces a signed-in visitor off every auth page, so a session
  // with no profile row would ricochet between the two.
  if (!profile || !actor) redirect("/go");

  if (!isStaff(actor)) return { decision: "refuse" };

  // Backend `currentUser()`, not the session claims — `twoFactorEnabled`
  // reflects whether an authenticator app or backup codes are actually
  // enrolled, which nothing in the session token carries.
  const user = await currentUser();

  const decision = decideStaffGate({
    isStaff: true,
    twoFactorEnabled: staffTwoFactorSkipped() || (user?.twoFactorEnabled ?? false),
  });

  if (decision === "enroll") return { decision: "enroll", accountsUrl: accountsBaseUrl() };
  return { decision: "ok", profile, actor };
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
