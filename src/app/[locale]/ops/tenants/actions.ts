"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  provisionTenantTx,
  setMemberRole,
  setTenantBilling,
  setTenantSuspension,
  type TenantError,
} from "@/lib/data/tenants";
import { setDemoRequestStatus } from "@/lib/data/demo-requests";
import { demoRequestStatus } from "@/lib/db/schema";
import { isUuid } from "@/lib/domain/uuid";
import { appUrl } from "@/lib/notifications/notify";
import { sendEmail } from "@/lib/notifications/email";
import { invitationEmail } from "@/lib/notifications/templates";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_ACTIONS } from "@/lib/i18n/ops-actions";

/**
 * Tenant management, which is the other half of what the platform
 * console does.
 *
 * Every action opens with `requireStaffAction()` — staff plus a second
 * factor, in the shape an action can return. These are POST endpoints
 * with public ids, reachable without ever rendering the page whose
 * button posts to them, so the page gate is not their gate.
 *
 * None of them is owner-gated, and that is a decision rather than an
 * omission. `approveCorridor` is owner-only because an approved corridor
 * changes what every traveller on a route is told to bring. A tenant
 * write changes one customer's account, is fully audited, and is
 * reversible — making it owner-only would put one person in the way of
 * provisioning a customer who signed today.
 *
 * Nothing here reaches a traveller's case. The data module these call
 * into selects `count(*)` from `applications` and never a row.
 *
 * Every id these read arrives as a raw form string and reaches a `uuid`
 * column, so each is checked with `isUuid` before it gets near Postgres.
 * Postgres rejects a malformed uuid before any row logic runs, so
 * without that check a blank or hand-edited field throws out of the
 * action rather than returning a code — and the client's `run()`
 * (`tenant-controls.tsx`) rejects inside `startTransition` with no
 * toast, which is a button that silently does nothing. The detail page
 * guards its URL segment with the same helper for the same reason. A
 * malformed id is answered as a missing one: the two are the same
 * sentence to an operator, and telling them apart would say which uuids
 * exist to someone guessing.
 */

/**
 * Every `TenantError` the data layer can hand back, mapped to the
 * `OPS_ACTIONS` key that holds its sentence — in one place, keyed by the
 * whole union. `src/lib/data/tenants.ts` returns a code rather than
 * English precisely so this file is the only place that turns one into
 * a sentence: no action below forwards a data-layer return value
 * as-is. A `Record<TenantError, …>` rather than a `switch` with a
 * default, so an eleventh code added there without a matching entry
 * here is a compile error, not a silent fallthrough to a generic
 * message on a screen that ships in ten languages.
 */
const TENANT_ERROR_KEY: Record<TenantError, keyof typeof OPS_ACTIONS> = {
  agency_name_required: "agencyNameRequired",
  agency_name_too_long: "agencyNameTooLong",
  owner_email_invalid: "ownerEmailInvalid",
  seats_invalid: "seatsInvalid",
  billing_email_invalid: "billingEmailInvalid",
  demo_request_not_found: "demoRequestNotFound",
  demo_request_already_converted: "demoRequestAlreadyConverted",
  tenant_not_found: "tenantNotFound",
  not_a_member: "notAMember",
  last_owner: "lastOwner",
};

/** One `TenantError` code, resolved to a sentence at the caller's locale. */
async function tenantError(code: TenantError): Promise<{ error: string }> {
  return { error: OPS_ACTIONS[TENANT_ERROR_KEY[code]][await getActionLocale()] };
}

/** Both tenant screens, after any write. */
function revalidateTenants() {
  revalidatePath("/[locale]/ops", "layout");
}

export async function provisionTenant(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const demoRequestId = field("demo_request_id").trim();
  if (demoRequestId && !isUuid(demoRequestId)) {
    return tenantError("demo_request_not_found");
  }

  const seatsRaw = field("seats").trim();
  const result = await provisionTenantTx(
    {
      name: field("name"),
      domain: field("domain") || undefined,
      seatsPurchased: seatsRaw ? Number(seatsRaw) : 0,
      billingContact: field("billing_contact") || undefined,
      ownerEmail: field("owner_email"),
      ownerName: field("owner_name") || undefined,
      demoRequestId: demoRequestId || undefined,
    },
    actor.userId
  );

  if ("error" in result) return tenantError(result.error);

  /**
   * After the commit, never inside it. An invitation email sent from
   * within the transaction would put a live link in somebody's inbox
   * pointing at an agency a rollback then removed.
   *
   * A failure here does not un-create the agency — `sendEmail` returns
   * `false` rather than throwing, exactly so a dead provider cannot cost
   * somebody the account they just paid for. But it is reported. With no
   * `RESEND_API_KEY`, or a 403 from Resend, the invitation never left and
   * the link below is the only copy that will ever exist; telling the
   * operator "Agency provisioned" and nothing else is how `email.ts`'s
   * own header records the invitation sheet coming to report "sent" for
   * letters that were never sent.
   */
  const inviteUrl = appUrl(`/invite/${result.inviteToken}`);
  const emailSent = await sendEmail({
    to: field("owner_email").trim().toLowerCase(),
    ...invitationEmail({
      orgName: field("name").trim(),
      inviteUrl,
      fullName: field("owner_name").trim() || undefined,
    }),
  });

  await track(
    "toplance.tenant_provisioned",
    { orgId: result.orgId, fromDemoRequest: Boolean(demoRequestId) },
    actor.userId
  );
  await audit(actor.userId, "tenant.provisioned", "organisation", result.orgId, {
    name: field("name").trim(),
    emailSent,
  });

  /**
   * The one write here that does NOT revalidate, and that is the whole
   * fix rather than an oversight.
   *
   * A revalidating Server Action does not merely mark a cache stale — it
   * ships a fresh RSC payload in its own response, and the client
   * commits that payload in the same transition as the `setInviteUrl`
   * below it. When this was called from a demo-request row,
   * `DemoRequestQueue` renders `<ProvisionTenant>` from a ternary on
   * `convertedOrgId`, which this transaction has just populated: the row
   * re-rendered as a `<Link>`, the dialog unmounted, and the invitation
   * URL — the only copy, since the roster never selects `token` and
   * nothing in the product can resend or revoke — was destroyed before
   * it ever painted. `provision-tenant.tsx` already defers its own
   * `router.refresh()` to dialog close for this reason; deferring the
   * client half while the server half re-rendered anyway is what made
   * two earlier attempts look like they had missed.
   *
   * Nothing is lost by leaving it out. Both tenant screens are
   * `dynamic = "force-dynamic"`, so they hold no route cache to
   * invalidate, and the refresh on dialog close re-reads them.
   */
  return { ok: true as const, orgId: result.orgId, inviteUrl, emailSent };
}

/**
 * Suspension and restoration are one function with two exported names.
 *
 * They differ only in a boolean and in which event they emit, and a
 * single `setSuspension(formData)` reading its verb from a form field
 * would make "is this button the dangerous one" a question about form
 * data rather than about which function was called.
 */
async function changeSuspension(formData: FormData, suspend: boolean) {
  const orgId = String(formData.get("org_id") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!isUuid(orgId)) return tenantError("tenant_not_found");

  const result = await setTenantSuspension(orgId, suspend);
  if ("error" in result) return tenantError(result.error);

  await track(
    suspend ? "toplance.tenant_suspended" : "toplance.tenant_restored",
    { orgId },
    actor.userId
  );
  await audit(
    actor.userId,
    suspend ? "tenant.suspended" : "tenant.restored",
    "organisation",
    orgId
  );

  revalidateTenants();
  /**
   * The agency's own people are reading a layout that was cached while
   * their tenant was live. Suspension changes what `liveOrgIdsFor`
   * returns, so that cache has to go with it.
   */
  revalidatePath("/[locale]/app", "layout");
  revalidatePath("/[locale]/agency", "layout");
  return { ok: true as const };
}

export async function suspendTenant(formData: FormData) {
  return changeSuspension(formData, true);
}

export async function restoreTenant(formData: FormData) {
  return changeSuspension(formData, false);
}

export async function updateTenantBilling(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const seatsRaw = String(formData.get("seats") ?? "").trim();
  const billingContact = String(formData.get("billing_contact") ?? "").trim() || null;

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!isUuid(orgId)) return tenantError("tenant_not_found");

  /**
   * `Number("")` is `0`, not `NaN` — the seats input has no `required`,
   * so an operator who clears the box would otherwise post a value that
   * reads as a deliberately-typed zero and sails straight through
   * `setTenantBilling`'s `Number.isInteger(seats) && seats >= 0` guard,
   * silently setting a paying agency's seats to zero while the caller
   * is told it saved. Checked for emptiness before `Number()` ever
   * runs, so a `0` the operator actually typed (a non-empty `"0"`)
   * still reaches the data layer unchanged. A non-numeric value
   * ("abc") still becomes `NaN` here exactly as before, which
   * `setTenantBilling`'s existing guard already refuses.
   */
  if (seatsRaw === "") return tenantError("seats_invalid");
  const seats = Number(seatsRaw);

  const result = await setTenantBilling(orgId, seats, billingContact);
  if ("error" in result) return tenantError(result.error);

  await track("toplance.tenant_seats_changed", { orgId, seats }, actor.userId);
  await audit(actor.userId, "tenant.seats_changed", "organisation", orgId, { seats });

  revalidateTenants();
  return { ok: true as const };
}

export async function updateMemberRole(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const rawRole = String(formData.get("role") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  if (!isUuid(orgId)) return tenantError("tenant_not_found");

  /**
   * Narrowed against the two roles rather than `=== "owner" ? … :
   * "reviewer"`, which turned every value that is not exactly `"owner"`
   * — a missing field, a typo, a future caller sending `"Owner"` — into
   * a demotion. The one case where guessing wrong is destructive was the
   * one the fallback picked, and only `setMemberRole`'s `last_owner`
   * guard kept it from emptying an agency of owners. An unrecognised
   * value is now refused the same way `updateDemoRequestStatus` refuses
   * an unrecognised status.
   */
  const role = rawRole === "owner" || rawRole === "reviewer" ? rawRole : null;
  if (!role) return { error: OPS_ACTIONS.chooseARole[await getActionLocale()] };

  const result = await setMemberRole(orgId, userId, role);
  if ("error" in result) return tenantError(result.error);

  await track(
    "toplance.tenant_member_role_changed",
    { orgId, role },
    actor.userId
  );
  await audit(actor.userId, "tenant.member_role_changed", "organisation", orgId, {
    userId,
    role,
  });

  revalidateTenants();
  // Their own console shows a different set of controls now.
  revalidatePath("/[locale]/agency", "layout");
  return { ok: true as const };
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

  revalidateTenants();
  return { ok: true as const };
}
