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

  const seatsRaw = field("seats").trim();
  const result = await provisionTenantTx(
    {
      name: field("name"),
      domain: field("domain") || undefined,
      seatsPurchased: seatsRaw ? Number(seatsRaw) : 0,
      billingContact: field("billing_contact") || undefined,
      ownerEmail: field("owner_email"),
      ownerName: field("owner_name") || undefined,
      demoRequestId: field("demo_request_id") || undefined,
    },
    actor.userId
  );

  if ("error" in result) return tenantError(result.error);

  /**
   * After the commit, never inside it. An invitation email sent from
   * within the transaction would put a live link in somebody's inbox
   * pointing at an agency a rollback then removed.
   *
   * Not awaited into the result: `sendEmail` failing does not un-create
   * the agency, and the token is on screen for the operator to copy —
   * the same stance `notify` takes after a corridor approval.
   */
  const inviteUrl = appUrl(`/invite/${result.inviteToken}`);
  await sendEmail({
    to: field("owner_email").trim().toLowerCase(),
    ...invitationEmail({
      orgName: field("name").trim(),
      inviteUrl,
      fullName: field("owner_name").trim() || undefined,
    }),
  });

  await track(
    "toplance.tenant_provisioned",
    { orgId: result.orgId, fromDemoRequest: Boolean(field("demo_request_id")) },
    actor.userId
  );
  await audit(actor.userId, "tenant.provisioned", "organisation", result.orgId, {
    name: field("name").trim(),
  });

  revalidateTenants();
  return { ok: true as const, orgId: result.orgId, inviteUrl };
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
  const seats = Number(String(formData.get("seats") ?? "").trim());
  const billingContact = String(formData.get("billing_contact") ?? "").trim() || null;

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

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
  const role = formData.get("role") === "owner" ? "owner" : "reviewer";

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

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
   * `setDemoRequestStatus`'s own error ("we could not find that demo
   * request") is discarded rather than forwarded — this module already
   * maps every failure it surfaces through `OPS_ACTIONS` at the caller's
   * locale, and `demo-requests.ts` returns bare English prose. It never
   * reaches a user: the same `demoRequestNotFound` key this reads is the
   * one Task 5 wrote.
   */
  const result = await setDemoRequestStatus(requestId, status);
  if ("error" in result) {
    return { error: OPS_ACTIONS.demoRequestNotFound[locale] };
  }

  await track("toplance.demo_request_status_changed", { status }, actor.userId);
  await audit(actor.userId, "demo_request.status_changed", "demo_request", requestId, {
    status,
  });

  revalidateTenants();
  return { ok: true as const };
}
