import type { Metadata } from "next";

import { StaffSuspended } from "@/components/ops/refusal";

export const metadata: Metadata = { title: "Account suspended" };

/**
 * Where `requireStaffConsole` sends a suspended colleague.
 *
 * A redirect target rather than a fifth case in `StaffGateDecision`.
 * Fourteen ops screens branch on that union, and a suspension is the
 * same answer on every one of them — so the gate throws a `redirect()`
 * here, the way it already does for a session with no profile, and none
 * of the fourteen needed an edit.
 *
 * Deliberately ungated. It is the door a closed account is sent to, so
 * gating it would bounce that account between this page and the gate
 * that sent it here. It says nothing a suspended person does not
 * already know about themselves.
 */
export default function OpsSuspendedPage() {
  return <StaffSuspended />;
}
