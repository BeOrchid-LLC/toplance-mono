/**
 * Who a director may act on, from the colleagues table.
 *
 * Its own module, and pure, because the same three questions get asked
 * twice: once by `colleagues-table.tsx`, to decide which buttons a row
 * even offers, and once by `@/app/[locale]/ops/staff/actions.ts`, which
 * is a POST endpoint with a public id and cannot trust the first answer.
 * A rule written in both places is a rule that eventually disagrees with
 * itself — and the disagreement that matters here is a button that
 * looks live and an action that refuses, or worse, the reverse.
 *
 * Codes rather than sentences, for the reason `TenantError` gives: this
 * product ships in ten languages and a domain module is not the
 * dictionary. `OPS_STAFF.colleagueRefusal` holds the sentences, keyed on
 * the whole union, so a code added here without copy is a compile error.
 */

import type { StaffRole } from "@/lib/auth/policy";

/** The four acts the actions column offers. */
export type ColleagueAct = "remove" | "suspend" | "restore" | "reset_two_factor";

export type ColleagueRefusal =
  /** You cannot do this to yourself — see the note on each act below. */
  | "self"
  /** The last director who can still open the console. */
  | "last_director"
  /** Not on the roster this decision was taken against. */
  | "unknown_colleague"
  | "already_suspended"
  | "not_suspended";

/** The three columns of a colleague row any of these rules reads. */
export type ColleagueSubject = {
  id: string;
  staffRole: StaffRole | null;
  suspendedAt: Date | null;
};

/**
 * A director who can still open the console today: an owner whose
 * account is live.
 *
 * A suspended owner is deliberately not counted. The invariant worth
 * protecting is not "an owner row exists" but "somebody can still
 * administer the platform", and a suspended director can do nothing at
 * all — counting them is how the last working director gets suspended
 * on the strength of a colleague who cannot sign in.
 */
function liveDirectors(colleagues: ColleagueSubject[]): ColleagueSubject[] {
  return colleagues.filter((c) => c.staffRole === "owner" && c.suspendedAt === null);
}

/**
 * Why one act on one colleague is refused, or `null` if it is allowed.
 *
 * `colleagues` is the whole staff roster, the subject included — the
 * last-director question is about the entire owner set and cannot be
 * answered from the row being changed. The action layer reads that set
 * back under a lock before it commits; this function is what decides,
 * and what the buttons are drawn from.
 */
export function refuseColleagueAct(input: {
  act: ColleagueAct;
  actorId: string;
  subjectId: string;
  colleagues: ColleagueSubject[];
}): ColleagueRefusal | null {
  const { act, actorId, subjectId, colleagues } = input;

  const subject = colleagues.find((c) => c.id === subjectId);
  if (!subject) return "unknown_colleague";

  /**
   * Every act, yourself included the harmless-looking one.
   *
   * Remove and suspend are obvious: they close the console you are
   * standing in, mid-click. Resetting your own second factor is refused
   * for a less obvious reason — it works, and that is the problem. It
   * signs you out on the spot and sends you to enrol a new device,
   * which is a thing you can already do for yourself from Clerk's own
   * account settings, without a button that sits in a row of two
   * genuinely destructive ones. Restoring yourself is unreachable: a
   * suspended account never gets this screen.
   */
  if (actorId === subjectId) return "self";

  if (act === "suspend" && subject.suspendedAt) return "already_suspended";
  if (act === "restore" && !subject.suspendedAt) return "not_suspended";

  /**
   * Removal and suspension both end a director's access, so both ask
   * whether anybody is left. Resetting a second factor deliberately does
   * not: the person can enrol a new device themselves and be back in,
   * so it needs no second director to undo — unlike a suspension, which
   * only somebody else can lift.
   *
   * A suspended colleague can still be removed without being restored
   * first. Requiring the restore would mean re-opening the console to
   * somebody in order to close it for good, which is a worse minute
   * than the one it tidies.
   */
  if (act === "remove" || act === "suspend") {
    const others = liveDirectors(colleagues).filter((c) => c.id !== subjectId);
    if (subject.staffRole === "owner" && others.length === 0) return "last_director";
  }

  return null;
}

/** The acts a row should offer at all, in the order they are drawn. */
export function colleagueActs(subject: ColleagueSubject): ColleagueAct[] {
  return [
    "reset_two_factor",
    subject.suspendedAt ? "restore" : "suspend",
    "remove",
  ];
}
