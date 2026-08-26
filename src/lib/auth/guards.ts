import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import { getActor } from "@/lib/data/applications";
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth/errors";
import type { Actor, ApplicationRef, Permission } from "@/lib/auth/policy";

/**
 * The one door into the data layer.
 *
 * Row-level security used to make an unguarded query return nothing, so
 * a forgotten ownership check failed closed. A plain Postgres connection
 * returns every row it is asked for, so the check is no longer a second
 * line of defence — it is the only one, and every read and write of
 * someone's application passes through here first.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

/**
 * Guards throw, because a return value can be ignored and this one must
 * not be. Server actions answer the UI with `{ error }` objects, so each
 * one catches at its own boundary and translates — anything that is not
 * an access failure keeps propagating, because a database outage
 * reported as "you do not have access" would send people to support with
 * the wrong problem.
 */
export function toActionError(error: unknown): string | null {
  if (error instanceof ForbiddenError) return "You do not have access to that.";
  if (error instanceof UnauthenticatedError) {
    return "Your session has expired. Sign in again.";
  }
  return null;
}

/**
 * Load an application and decide access in one step, so a caller cannot
 * hold a row it has not been cleared for. A missing application and a
 * forbidden one raise the same error: telling them apart would confirm
 * that someone else's case reference exists.
 */
export async function requireApplicationAccess(
  applicationId: string,
  permission: Permission
): Promise<{ actor: Actor; application: ApplicationRef }> {
  const actor = await requireActor();

  const [row] = await db
    .select({
      id: applications.id,
      travelerId: applications.travelerId,
      orgId: applications.orgId,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row) throw new ForbiddenError();
  if (!permission(actor, row)) throw new ForbiddenError();

  return { actor, application: row };
}
