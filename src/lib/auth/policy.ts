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

/**
 * `userId` is whatever identifier `applications.traveler_id` holds: the
 * profile id today, the Clerk user id once Phase 2 repoints the key.
 */
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
