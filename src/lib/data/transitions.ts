import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents, statusEvents } from "@/lib/db/schema";
import {
  STATUS,
  STAFF_TRANSITIONS,
  isTerminalStatus,
  type ApplicationStatus,
} from "@/lib/domain/status";

// The map itself lives in `@/lib/domain/status` — pure and I/O-free, so
// `status-control.tsx` can import it without pulling `db` into the
// browser bundle. Re-exported here so this module stays the one thing
// its own docstring calls it: the place both the map and its
// enforcement are read together.
export { STAFF_TRANSITIONS, STAFF_REACHABLE_STATUSES } from "@/lib/domain/status";

export type ChangeStatusResult =
  | { ok: true; from: ApplicationStatus; travelerId: string }
  | { error: string };

/**
 * The staff decision transition, as one transaction with the
 * application row locked for its duration.
 *
 * Same reasoning as `submitApplicationTx`: reading the status, checking
 * the documents and writing the new status as separate statements looks
 * correct and is not — between the check and the write, a second
 * reviewer's "Start review" can land underneath the first, or a
 * double-click can write two events into a traveller's timeline for one
 * decision. `for("update")` makes the loser wait here rather than race;
 * when it resumes it reads the mover's status and refuses at the first
 * guard.
 *
 * Lives outside the server action so it can be tested under real
 * concurrency, and so it can be called from `after()` on approval
 * without dragging a Clerk session into a background callback. **It
 * decides nothing about access.** Its only caller guards first.
 *
 * It also decides nothing about notifying anyone: `changeCaseStatus` in
 * `@/app/ops/actions.ts` calls `notify` once this returns `ok`, after
 * the transaction has committed.
 */
export async function changeStatusTx(
  applicationId: string,
  to: ApplicationStatus,
  message: string,
  actorId: string
): Promise<ChangeStatusResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: applications.status, travelerId: applications.travelerId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for("update")
      .limit(1);

    if (!current) return { error: "That application does not exist." };

    if (!STAFF_TRANSITIONS[current.status].includes(to)) {
      return {
        error: `Cannot move a case from "${STATUS[current.status].label}" to "${STATUS[to].label}".`,
      };
    }

    // Every status change carries a message to the traveller — see the
    // docstring on `statusEvents` in schema.ts.
    const text = message.trim();
    if (!text) {
      return { error: "Write a message to the traveler — every status change carries one." };
    }
    if (text.length > 2000) {
      return { error: "That message is over 2,000 characters — split it up." };
    }

    if (to === "approved") {
      // A post-submission flag can un-verify a document after the
      // traveller's own submit already passed this same check. Approving
      // over a flagged (or otherwise re-opened) required document would
      // break the promise the checklist makes, so this re-runs it here
      // rather than trusting the state submission left behind.
      // Rejection makes no such promise, so it has no gate.
      //
      // `for("update")` locks these rows too, not just the application's —
      // `reviewDocumentTx` locks the same document row it updates, so a
      // reviewer's flag landing between this count and the commit above
      // waits here instead of slipping through underneath it.
      const docs = await tx
        .select({ state: documents.state, isRequired: documents.isRequired })
        .from(documents)
        .where(eq(documents.applicationId, applicationId))
        .for("update");

      const required = docs.filter((d) => d.isRequired);
      const outstanding = required.filter((d) => d.state !== "verified").length;

      if (outstanding > 0) {
        return {
          error: `${outstanding} required document${outstanding === 1 ? "" : "s"} not verified — request additional documents instead.`,
        };
      }
    }

    await tx
      .update(applications)
      .set({
        status: to,
        // Only a decision closes the case; `additional_documents` still
        // has a future.
        ...(isTerminalStatus(to) ? { decidedAt: new Date() } : {}),
      })
      .where(eq(applications.id, applicationId));

    await tx.insert(statusEvents).values({
      applicationId,
      fromStatus: current.status,
      toStatus: to,
      message: text,
      actorId,
    });

    return { ok: true, from: current.status, travelerId: current.travelerId };
  });
}
