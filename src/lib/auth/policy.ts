/**
 * Every access decision in Toplance, as pure functions.
 *
 * These rules were the row-level security policies in the initial
 * migration. Moving off Supabase means the database no longer enforces
 * them, so they live here instead — deliberately free of I/O, so the
 * rules can be read, reviewed and tested on their own.
 *
 * Nothing in this file may import a client, a session or a framework.
 */

export type AppRole = "traveler" | "org_member" | "staff";
export type StaffRole = "reviewer" | "owner";

/** `userId` is what `applications.traveler_id` holds: the Clerk user id. */
export type Actor = {
  userId: string;
  role: AppRole;
  staffRole: StaffRole | null;
  orgIds: readonly string[];
};

export type ApplicationRef = {
  id: string;
  travelerId: string;
  orgId: string | null;
};

export type Permission = (actor: Actor, app: ApplicationRef) => boolean;

export function isStaff(actor: Actor): boolean {
  return actor.role === "staff";
}

/** Owners are the only staff who may edit reference data. */
export function isOwner(actor: Actor): boolean {
  return isStaff(actor) && actor.staffRole === "owner";
}

export function ownsApplication(actor: Actor, app: ApplicationRef): boolean {
  return app.travelerId === actor.userId;
}

export function sponsorsApplication(actor: Actor, app: ApplicationRef): boolean {
  return app.orgId !== null && actor.orgIds.includes(app.orgId);
}

export const canReadApplication: Permission = (actor, app) =>
  ownsApplication(actor, app) || sponsorsApplication(actor, app) || isStaff(actor);

/** An employer pays for a seat; it does not fill in the form. */
export const canWriteApplication: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

/**
 * The privacy boundary. An organisation sees progress, never a
 * passport. There is deliberately no sponsorship branch here, and
 * adding one would break the promise made in the employer console.
 */
export const canReadDocuments: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

export const canWriteDocuments: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

export const canReadIntakeAnswers: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

/** Staff read the intake conversation; they never answer it. */
export const canWriteIntakeAnswers: Permission = (actor, app) =>
  ownsApplication(actor, app);

export const canReadStatusEvents: Permission = canReadApplication;

export function canWriteCorridors(actor: Actor): boolean {
  return isOwner(actor);
}

export function canReadAuditLog(actor: Actor): boolean {
  return isStaff(actor);
}

/* ============================================================
 * AUDIT: every policy from supabase/migrations/20260821120000_init.sql
 *
 * That migration is deleted; read it at commit 8ef588e if you need the
 * original text. Each policy below names what enforces it now.
 *
 * profiles
 *   read own profile ............ getProfile() selects on the Clerk id
 *   update own profile .......... completeProfile() writes on the same
 *   staff read all profiles ..... ops queue joins profiles behind isStaff
 *
 * organisations / org_members
 *   members read their org ...... employer page joins via own membership
 *   members read org roster ..... getActor() reads only own memberships
 *   staff read orgs ............. no surface reads organisations as staff
 *
 * corridors / corridor_requirements
 *   signed-in read .............. every caller sits behind a session:
 *                                 the pages redirect without one, and
 *                                 buildChecklist runs only from the
 *                                 guarded answerQuestion
 *   owners write ................ canWriteCorridors, UNUSED — reference
 *                                 data is written by `npm run db:seed`,
 *                                 which runs as the database owner
 *
 * applications
 *   travellers read own ......... getOrCreateApplication filters on the
 *                                 caller's own id
 *   travellers create own ....... same function; it can only insert a
 *                                 row naming the caller
 *   travellers update own draft . requireApplicationAccess +
 *                                 canWriteApplication / canWriteIntakeAnswers
 *   org members read sponsored .. employer page filters the progress
 *                                 view by the actor's orgIds
 *   staff read all .............. ops queue behind isStaff(actor)
 *   staff update ................ canWriteApplication covers staff; NO
 *                                 SURFACE YET (see gaps)
 *
 * intake_answers
 *   travellers manage own ....... answerQuestion, canWriteIntakeAnswers
 *   staff read .................. canReadIntakeAnswers; no surface yet
 *
 * documents — the privacy boundary
 *   travellers manage own ....... uploadDocument / removeDocument /
 *                                 documentUrl, all guarded
 *   staff read / review ......... canRead/canWriteDocuments cover staff;
 *                                 no surface yet
 *   org members ................. deliberately absent, then and now.
 *                                 canReadDocuments has no sponsorship
 *                                 branch and guards.test.ts fails if one
 *                                 is added
 *
 * status_events
 *   participants read ........... canReadStatusEvents; no surface yet
 *   staff write ................. DELIBERATE DIVERGENCE. submitApplication
 *                                 writes the submission event as the
 *                                 system, with a null actor. Under RLS
 *                                 that insert was silently rejected and
 *                                 the error never read, so submitted
 *                                 cases carried no event at all
 *
 * audit_log
 *   staff read .................. canReadAuditLog; nothing reads or
 *                                 writes the audit log yet
 *
 * GAPS — features whose policies had no code to protect, and still have
 * none. Listed because RLS used to be the backstop for exactly this: a
 * forgotten check now fails open, so whoever builds these must add the
 * guard in the same change.
 *
 *   invitations ................. "org admins manage invitations". The
 *                                 Invite button is disabled. Needs an
 *                                 org-scoped guard before it is enabled
 *   messages .................... "participants read/write messages".
 *                                 Messaging is not built; there is no
 *                                 canRead/canWriteMessages here yet
 *   itineraries ................. "travellers read own itinerary",
 *                                 "staff read itineraries". Not built
 * ============================================================ */
