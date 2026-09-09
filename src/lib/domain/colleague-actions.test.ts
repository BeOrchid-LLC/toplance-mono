import { describe, expect, it } from "vitest";

import {
  colleagueActs,
  refuseColleagueAct,
  type ColleagueSubject,
} from "@/lib/domain/colleague-actions";

const SUSPENDED = new Date("2026-09-09T09:00:00Z");

function colleague(
  id: string,
  staffRole: ColleagueSubject["staffRole"],
  suspendedAt: Date | null = null
): ColleagueSubject {
  return { id, staffRole, suspendedAt };
}

const director = colleague("dir_1", "owner");
const otherDirector = colleague("dir_2", "owner");
const reviewer = colleague("rev_1", "reviewer");

/** The actor is always a director — the screen is owner-only. */
const ACTOR = "dir_actor";
const actorRow = colleague(ACTOR, "owner");

function refuse(
  act: Parameters<typeof refuseColleagueAct>[0]["act"],
  subjectId: string,
  colleagues: ColleagueSubject[]
) {
  return refuseColleagueAct({ act, actorId: ACTOR, subjectId, colleagues });
}

describe("refuseColleagueAct", () => {
  it("allows the ordinary case — a director acting on a colleague", () => {
    const roster = [actorRow, reviewer];
    expect(refuse("remove", "rev_1", roster)).toBeNull();
    expect(refuse("suspend", "rev_1", roster)).toBeNull();
    expect(refuse("reset_two_factor", "rev_1", roster)).toBeNull();
  });

  it("refuses every act on yourself, the second factor included", () => {
    const roster = [actorRow, reviewer];
    for (const act of ["remove", "suspend", "reset_two_factor", "restore"] as const) {
      expect(refuse(act, ACTOR, roster)).toBe("self");
    }
  });

  it("refuses an id that is not on the roster the decision was taken against", () => {
    expect(refuse("remove", "ghost", [actorRow, reviewer])).toBe("unknown_colleague");
  });

  describe("the last director", () => {
    it("cannot be removed or suspended", () => {
      // The actor is the only other owner, and is about to stop being
      // one — so `director` is the last one standing.
      const roster = [colleague(ACTOR, "reviewer"), director, reviewer];
      expect(refuse("remove", "dir_1", roster)).toBe("last_director");
      expect(refuse("suspend", "dir_1", roster)).toBe("last_director");
    });

    it("can still have their second factor reset", () => {
      // They enrol a new device themselves and are back in. Nothing
      // here needs a second director to undo it.
      const roster = [colleague(ACTOR, "reviewer"), director];
      expect(refuse("reset_two_factor", "dir_1", roster)).toBeNull();
    });

    it("is decided on directors who can actually sign in", () => {
      // A suspended owner is an owner row and nothing else: they can
      // administer nothing, so they cannot be the survivor that lets
      // the last working director be suspended.
      const roster = [
        colleague(ACTOR, "reviewer"),
        director,
        colleague("dir_asleep", "owner", SUSPENDED),
      ];
      expect(refuse("suspend", "dir_1", roster)).toBe("last_director");
    });

    it("does not stand in the way while another live director remains", () => {
      const roster = [colleague(ACTOR, "reviewer"), director, otherDirector];
      expect(refuse("remove", "dir_1", roster)).toBeNull();
      expect(refuse("suspend", "dir_1", roster)).toBeNull();
    });

    it("never blocks a reviewer, however few directors there are", () => {
      const roster = [colleague(ACTOR, "reviewer"), reviewer];
      expect(refuse("remove", "rev_1", roster)).toBeNull();
    });
  });

  describe("suspension state", () => {
    it("refuses a second suspension, and a restore of a live account", () => {
      const asleep = colleague("rev_2", "reviewer", SUSPENDED);
      const roster = [actorRow, reviewer, asleep];
      expect(refuse("suspend", "rev_2", roster)).toBe("already_suspended");
      expect(refuse("restore", "rev_1", roster)).toBe("not_suspended");
    });

    it("lets a suspended colleague be removed without restoring them first", () => {
      // Restoring in order to remove would re-open the console to
      // somebody for the length of two clicks.
      const asleep = colleague("rev_2", "reviewer", SUSPENDED);
      expect(refuse("remove", "rev_2", [actorRow, asleep])).toBeNull();
    });

    it("lets a suspended colleague be restored", () => {
      const asleep = colleague("rev_2", "reviewer", SUSPENDED);
      expect(refuse("restore", "rev_2", [actorRow, asleep])).toBeNull();
    });
  });
});

describe("colleagueActs", () => {
  it("offers suspend on a live account and restore on a suspended one", () => {
    expect(colleagueActs(reviewer)).toContain("suspend");
    expect(colleagueActs(reviewer)).not.toContain("restore");

    const asleep = colleague("rev_2", "reviewer", SUSPENDED);
    expect(colleagueActs(asleep)).toContain("restore");
    expect(colleagueActs(asleep)).not.toContain("suspend");
  });

  it("puts the act that ends an account last, away from the other two", () => {
    expect(colleagueActs(reviewer).at(-1)).toBe("remove");
  });
});
