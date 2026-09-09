import { describe, expect, it } from "vitest";

import { staffInviteRank } from "./staff-invite-rank";

/**
 * Deliberately not database-gated.
 *
 * `invitations.test.ts` proves the same rule end to end and is skipped
 * without a `DATABASE_URL`, which CI does not have — so on its own it
 * lets a revert of this rule pass every check. These four lines are
 * what actually run in CI.
 */
describe("staffInviteRank", () => {
  it("makes the first person into an empty agency its director", () => {
    expect(staffInviteRank(0)).toBe("owner");
  });

  it("makes everyone after them a reviewer", () => {
    expect(staffInviteRank(1)).toBe("reviewer");
    expect(staffInviteRank(2)).toBe("reviewer");
    expect(staffInviteRank(37)).toBe("reviewer");
  });
});
