import { describe, expect, it } from "vitest";

import { staffSortKey } from "@/lib/domain/invitation-table";
import { INVITATION_STATUS_COPY } from "@/lib/i18n/status";
import type { ListedInvitation } from "@/lib/data/invitations";

/**
 * What the platform-staff roster orders its rows by.
 *
 * Pure, so no database. The claim worth pinning is the one the column
 * exists to keep: **a table sorts on the words that are on the screen.**
 *
 * That claim used to be met by sorting on a hardcoded English label,
 * back when the badge rendered one. #71 localised the badge and split
 * `INVITATION_STATUS` into `INVITATION_STATUS_VARIANT` and
 * `INVITATION_STATUS_COPY`; #74 was written against the old single
 * record and merged without a build, so this module imported a name that
 * no longer existed and nothing here compiled at all. This file is what
 * would have caught that.
 */
describe("staffSortKey", () => {
  const invite = (over: Partial<ListedInvitation> = {}) =>
    ({
      id: "inv_1",
      email: "someone@test.invalid",
      fullName: "Amara Okonkwo",
      status: "pending",
      staffRank: "reviewer",
      createdAt: new Date("2026-08-01T00:00:00Z"),
      ...over,
    }) as ListedInvitation;

  it("sorts status on the word the badge actually shows", () => {
    // Not a status code, and not a hardcoded English string — the very
    // value `InvitationStatusBadge` renders for this row. If these two
    // ever diverge the column orders rows by words nobody can see.
    expect(staffSortKey(invite({ status: "accepted" }), "status", "en")).toBe(
      INVITATION_STATUS_COPY.accepted.label.en
    );
    expect(staffSortKey(invite({ status: "accepted" }), "status", "en")).toBe(
      "Accepted"
    );
  });

  it("sorts status in the reader's own language", () => {
    // The reason a locale is threaded this far down. A French reader
    // seeing "Acceptée" must get rows ordered by "Acceptée", not by the
    // English the table used to be stuck with.
    expect(staffSortKey(invite({ status: "accepted" }), "status", "fr")).toBe(
      "Acceptée"
    );
    expect(staffSortKey(invite({ status: "pending" }), "status", "fr")).toBe(
      "En attente"
    );
  });

  it("orders every status by its translated word, not by enum order", () => {
    // In English "Accepted" precedes "Pending"; in French "Acceptée"
    // still precedes "En attente" — but the assertion that matters is
    // that the ordering is computed from the translation rather than
    // from the enum, which no single-locale test can show.
    const statuses = ["pending", "accepted", "expired", "revoked"] as const;
    for (const locale of ["en", "fr", "sw"] as const) {
      const keys = statuses.map((status) =>
        staffSortKey(invite({ status }), "status", locale)
      );
      expect(keys).toEqual(
        statuses.map((s) => INVITATION_STATUS_COPY[s].label[locale])
      );
    }
  });

  it("falls back from a missing name to the address, as the cell does", () => {
    // Empty string, not null: `invitations.full_name` is
    // `notNull().default("")`, so an invitation sent without a name
    // carries "" — which is the case the `||` in `staffSortKey` is for.
    expect(staffSortKey(invite({ fullName: "" }), "person", "en")).toBe(
      "someone@test.invalid"
    );
    expect(staffSortKey(invite(), "person", "en")).toBe("Amara Okonkwo");
  });

  it("sorts a rankless invitation to null rather than to a word", () => {
    expect(staffSortKey(invite({ staffRank: null }), "rank", "en")).toBeNull();
  });

  it("sorts the invited column on the timestamp itself", () => {
    const createdAt = new Date("2026-08-01T00:00:00Z");
    expect(staffSortKey(invite({ createdAt }), "invited", "en")).toBe(createdAt);
  });
});
