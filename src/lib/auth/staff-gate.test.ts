import { describe, expect, it } from "vitest";

import { decideStaffGate } from "@/lib/auth/staff-gate";

/**
 * The pure decision `requireStaffConsole` is built around: given who
 * someone is and whether Clerk says they have a second factor enrolled,
 * which of the three screens do they see. No Clerk network call, no
 * database — plain objects in, one of three strings out.
 */
describe("decideStaffGate", () => {
  it("refuses a non-staff account, whatever its 2FA state", () => {
    expect(decideStaffGate({ isStaff: false, twoFactorEnabled: false })).toBe(
      "refuse"
    );
    expect(decideStaffGate({ isStaff: false, twoFactorEnabled: true })).toBe(
      "refuse"
    );
  });

  it("blocks a staff account with no second factor enrolled", () => {
    expect(decideStaffGate({ isStaff: true, twoFactorEnabled: false })).toBe(
      "enroll"
    );
  });

  it("lets a staff account with a second factor through", () => {
    expect(decideStaffGate({ isStaff: true, twoFactorEnabled: true })).toBe(
      "ok"
    );
  });
});
