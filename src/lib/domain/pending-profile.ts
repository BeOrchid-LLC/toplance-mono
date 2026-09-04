import { countryBy, toE164 } from "@/lib/domain/countries";
import { isLocale, type Locale } from "@/lib/i18n/locales";

/**
 * The sign-up answers that have to survive the crossing into a session.
 *
 * Everything after Clerk's `finalize()` is a POST from a page the proxy
 * is already walking the newly signed-in visitor off, so a server action
 * fired there can be — and routinely is — cancelled before it lands.
 * `completeProfile` is that action. It is retried twice and still loses,
 * which is why `provisionInvitedProfile` carries the note that "phone
 * and country are not recoverable here": by the time anything
 * server-side notices the account, the typed answers are gone with the
 * page.
 *
 * The name never had this problem, because `signUp.create` hands it to
 * Clerk *before* the session exists. These fields now ride the same
 * rail. `unsafeMetadata` is the only part of a Clerk user a signed-out
 * sign-up attempt may write, and it is durable the moment the account
 * is created.
 *
 * What may travel this way is bounded on purpose. It is client-written
 * data, so it may only ever be something the traveller was going to be
 * asked for anyway and could have edited afterwards from `/app/profile`.
 * Roles are the counter-example and stay in Postgres — `getActor` is
 * explicit that they are never read from Clerk metadata — and the
 * organisation name is a name, not a permission: `createOrganisationTx`
 * still decides whether this account may own one.
 */
export type PendingProfile = {
  /** E.164, or null when no usable phone was given. */
  phone: string | null;
  /** A country this product knows, or null. */
  countryIso: string | null;
  locale: Locale | null;
  orgName: string | null;
};

export const EMPTY_PENDING_PROFILE: PendingProfile = {
  phone: null,
  countryIso: null,
  locale: null,
  orgName: null,
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Reads what the sign-up form put on the Clerk user, validating every
 * field rather than trusting it. A value this cannot make sense of
 * becomes `null` and the profile goes without it, which is exactly the
 * state these writes were already in before this existed — so a
 * malformed or hand-edited metadata blob can make the outcome no worse
 * than the bug it replaces.
 */
export function readPendingProfile(metadata: unknown): PendingProfile {
  if (!metadata || typeof metadata !== "object") return EMPTY_PENDING_PROFILE;
  const raw = metadata as Record<string, unknown>;

  const localeValue = str(raw.locale);
  const isoValue = str(raw.countryIso)?.toLowerCase() ?? null;

  // A country this product does not list has no dial code, so it cannot
  // produce an E.164 number either — both fall away together rather than
  // writing a country we cannot render beside a number we cannot dial.
  const countryIso =
    isoValue && countryBy(isoValue).iso.toLowerCase() === isoValue ? isoValue : null;

  const digits = str(raw.phone)?.replace(/\D/g, "") ?? null;

  return {
    phone: countryIso && digits ? toE164(countryIso, digits) : null,
    countryIso,
    locale: localeValue && isLocale(localeValue) ? localeValue : null,
    orgName: str(raw.orgName),
  };
}

/**
 * The subset that belongs on a `profiles` row, with the nulls dropped so
 * this can be spread into an insert without overwriting a column that
 * already holds something better.
 */
export function profileColumnsFrom(
  pending: PendingProfile
): Partial<{ phone: string; countryIso: string; locale: Locale }> {
  return {
    ...(pending.phone ? { phone: pending.phone } : {}),
    ...(pending.countryIso ? { countryIso: pending.countryIso } : {}),
    ...(pending.locale ? { locale: pending.locale } : {}),
  };
}
