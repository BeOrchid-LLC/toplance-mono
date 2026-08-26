import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, orgMembers, organisations, profiles } from "@/lib/db/schema";

export type CreateOrganisationResult = { ok: true; orgId: string } | { error: string };

const NAME_MAX = 160;

/**
 * A new employer's first act: name an organisation and become its
 * owner, in one transaction — the idiom of `submitApplicationTx`. The
 * profile row is locked for the duration, so a double-click (or two
 * tabs) cannot create two organisations or flip the role twice; a
 * second attempt blocks here, then reads the membership the first one
 * just wrote and refuses.
 *
 * Decides nothing about who is signed in. Its caller, `createOrganisation`
 * in `@/app/employer/actions.ts`, resolves `userId` from the session.
 */
export async function createOrganisationTx(
  userId: string,
  name: string
): Promise<CreateOrganisationResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Your organisation needs a name." };
  if (trimmed.length > NAME_MAX) return { error: "That name is too long." };

  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update")
      .limit(1);

    if (!profile) return { error: "We could not find your account." };

    const [existingMembership] = await tx
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId))
      .limit(1);

    if (existingMembership) {
      return { error: "You already belong to an organisation." };
    }

    if (profile.role === "staff") {
      return { error: "Staff accounts cannot create an organisation." };
    }

    if (profile.role === "traveler") {
      // A traveller mid-case must not silently become an employer — the
      // two roles read someone else's documents from opposite sides of
      // the privacy boundary.
      const [existingApplication] = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.travelerId, userId))
        .limit(1);

      if (existingApplication) {
        return {
          error:
            "This account is a traveller account — use a different email for your organisation.",
        };
      }
    }

    const [org] = await tx
      .insert(organisations)
      .values({ name: trimmed })
      .returning({ id: organisations.id });

    await tx.insert(orgMembers).values({ orgId: org.id, userId, role: "owner" });

    // Flip ONLY traveler → org_member, keyed on this session's userId.
    // An account that reaches here with any other role (org_member with
    // no membership row, somehow) is left alone — this is a signup step,
    // not a general role editor.
    await tx
      .update(profiles)
      .set({ role: "org_member", updatedAt: new Date() })
      .where(and(eq(profiles.id, userId), eq(profiles.role, "traveler")));

    return { ok: true, orgId: org.id };
  });
}
