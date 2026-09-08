"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  setDemoRequestAssignee,
  setDemoRequestStatus,
} from "@/lib/data/demo-requests";
import { demoRequestStatus } from "@/lib/db/schema";
import { isUuid } from "@/lib/domain/uuid";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_ACTIONS } from "@/lib/i18n/ops-actions";

/**
 * The enquiry queue's two writes.
 *
 * `updateDemoRequestStatus` moved here from `../tenants/actions.ts` with
 * the screen it belongs to; the body is unchanged. `assignDemoRequest`
 * is new.
 *
 * Both open with `requireStaffAction()` — staff plus a second factor, in
 * the shape an action can return — and neither is owner-gated. Working
 * this queue is the platform team's shared job: an owner-only gate here
 * would put one person in the way of answering a company that enquired
 * this morning. Every write is audited.
 *
 * Neither reaches a traveller's case. `demo_requests` references nothing
 * about a person; a row here is a stranger who filled in a form.
 */

/**
 * The console's pages are `force-dynamic`, so this is belt and braces
 * rather than the thing that makes the next render current — but the
 * rail badge is built from a count on every one of them, and a stale
 * layout would show a number the page below it contradicts.
 */
function revalidateEnquiries() {
  revalidatePath("/[locale]/ops", "layout");
}

export async function updateDemoRequestStatus(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const raw = String(formData.get("status") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const locale = await getActionLocale();

  if (!isUuid(requestId)) return { error: OPS_ACTIONS.demoRequestNotFound[locale] };

  // Narrowed against the enum's own values rather than cast. The status
  // arrives from a POST body, and a value Postgres has never heard of
  // should be a sentence here, not an error from the driver.
  const status = demoRequestStatus.enumValues.find((v) => v === raw);
  if (!status) return { error: OPS_ACTIONS.chooseADemoStatus[locale] };

  /**
   * `converted` is refused. Its other half is `converted_org_id`, and
   * only `provisionTenantTx` can write both — a request marked converted
   * with nothing to point at is a lie the console would then display.
   *
   * Not `provisionFailed`: nobody here attempted a provision, so a
   * string that reports one failing describes an operation the operator
   * never asked for. `conversionNotAStatus` says why this button is the
   * wrong one and points at the one that isn't.
   */
  if (status === "converted") {
    return { error: OPS_ACTIONS.conversionNotAStatus[locale] };
  }

  /**
   * `setDemoRequestStatus` returns a code, not a sentence, resolved here
   * at the caller's locale the same way `tenantError` resolves a
   * `TenantError`. `already_converted` gets its own sentence — the
   * operator is looking at a row that already became an agency, so
   * telling them it does not exist would be a worse lie than the
   * un-conversion this refusal exists to stop (it would re-arm
   * `provisionTenantTx`'s guard against provisioning the same enquiry
   * twice). Every other code (`not_found`, and `invalid_status`, which
   * `status === "converted"` above already keeps this from ever seeing)
   * reads as "we could not find that demo request".
   */
  const result = await setDemoRequestStatus(requestId, status);
  if ("error" in result) {
    return {
      error:
        result.error === "already_converted"
          ? OPS_ACTIONS.demoRequestAlreadyConverted[locale]
          : OPS_ACTIONS.demoRequestNotFound[locale],
    };
  }

  await track("toplance.demo_request_status_changed", { status }, actor.userId);
  await audit(actor.userId, "demo_request.status_changed", "demo_request", requestId, {
    status,
  });

  revalidateEnquiries();
  return { ok: true as const };
}

/**
 * Put a colleague's name against an enquiry, or take it off.
 *
 * A label, not a lock. Anyone on the platform team may assign, reassign
 * or clear any row, and nothing else on this screen checks who holds it
 * — the queue is worked by whoever is free, and an assignment that
 * blocked a colleague from answering a company would cost more than the
 * confusion it prevents.
 *
 * An empty `assignee_id` clears the row rather than failing: putting an
 * enquiry back in the pool is as ordinary as taking one out of it, and
 * it is how the "Unassign" option in the picker is spelled.
 *
 * The staff check lives in `setDemoRequestAssignee`, not here. The
 * picker only ever offers staff, but this is a POST endpoint with a
 * public id: a hand-made request must not be able to file BeOrchid's
 * sales queue against a traveller.
 */
export async function assignDemoRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const raw = String(formData.get("assignee_id") ?? "").trim();

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const locale = await getActionLocale();

  if (!isUuid(requestId)) return { error: OPS_ACTIONS.demoRequestNotFound[locale] };

  // `profiles.id` is the Clerk user id, a `text` column — so there is no
  // uuid check to make here, only "empty means unassign".
  const assigneeId = raw === "" ? null : raw;

  const result = await setDemoRequestAssignee(requestId, assigneeId);
  if ("error" in result) {
    return {
      error:
        result.error === "already_converted"
          ? OPS_ACTIONS.demoRequestAlreadyConverted[locale]
          : result.error === "not_staff"
            ? OPS_ACTIONS.assigneeNotStaff[locale]
            : OPS_ACTIONS.demoRequestNotFound[locale],
    };
  }

  await track(
    "toplance.demo_request_assigned",
    { assigned: assigneeId !== null },
    actor.userId
  );
  await audit(actor.userId, "demo_request.assigned", "demo_request", requestId, {
    assigneeId,
  });

  revalidateEnquiries();
  return { ok: true as const };
}
