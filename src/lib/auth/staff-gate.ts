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
  if (!profile || !actor) redirect("/ops/sign-in?next=/ops");

  if (!isStaff(actor)) return { decision: "refuse" };

  // Backend `currentUser()`, not the session claims — `twoFactorEnabled`
  // reflects whether an authenticator app or backup codes are actually
  // enrolled, which nothing in the session token carries.
  const user = await currentUser();

  // Test seam only: e2e needs staff fixtures it can sign in as without
  // walking a real authenticator-app enrollment. Off by default, and it
  // widens nothing else this gate checks — a non-staff account is still
  // refused, and this account still needs a real Clerk session to get
  // this far. Never set outside the e2e webServer's own environment.
  const skipForE2e = process.env.E2E_SKIP_STAFF_2FA === "1";

  const decision = decideStaffGate({
    isStaff: true,
    twoFactorEnabled: skipForE2e || (user?.twoFactorEnabled ?? false),
  });

  if (decision === "enroll") return { decision: "enroll", accountsUrl: accountsBaseUrl() };
  return { decision: "ok", profile, actor };
}
