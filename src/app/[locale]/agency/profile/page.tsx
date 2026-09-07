import type { Metadata } from "next";

import { AgencyBar } from "@/components/agency/agency-bar";
import { ConsoleBand } from "@/components/agency/console-band";
import { EditableName, EditablePhone } from "@/components/app/profile-fields";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryBy } from "@/lib/domain/countries";
import { AGENCY } from "@/lib/i18n/agency";
import { PROFILE } from "@/lib/i18n/profile";
import { getLocale } from "@/lib/i18n/server";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.profileTitle[locale] };
}

/** One read-only fact, in the same anatomy the traveller's profile uses. */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-3">
      <dt className="special-caps">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold">{value}</dd>
    </div>
  );
}

/**
 * The agency account's own profile.
 *
 * Everyone in this product had one of these except the people running
 * it: `updateProfile` has always accepted a name and a phone from any
 * signed-in actor, and only travellers had a screen to use it from. A
 * reviewer could be messaged by a client and shown to them under
 * whatever name the sign-up form happened to capture, with no way to
 * correct it.
 *
 * Name and phone are editable; the email is not. Identity is Clerk's —
 * `profiles.email` is a copy of what Clerk holds — so an input here
 * would either lie to the person typing in it or silently disagree with
 * the address they actually sign in with.
 *
 * No avatar, no language row, no digest: those belong to surfaces this
 * console does not have. What is here is what a colleague and a client
 * see, plus the number a case can reach them on.
 */
export default async function AgencyProfilePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, membership } = await requireAgencyConsole();

  // The stored phone is E.164; the inline editor wants national digits
  // with the dial code supplied by the country picker — the same split
  // the traveller's profile makes.
  const countryIso = profile.countryIso ?? "ng";
  const dial = countryBy(countryIso).dial.replace("+", "");
  const phoneDigits = profile.phone
    ? profile.phone.replace(/^\+/, "").replace(new RegExp(`^${dial}`), "")
    : "";

  return (
    <div className="min-h-dvh bg-bg">
      <AgencyBar profile={profile} membership={membership} locale={locale} />

      <ConsoleBand title={AGENCY.profileTitle[locale]}>
        <p className="t-muted mt-2 max-w-[68ch]">{AGENCY.profileBody[locale]}</p>
      </ConsoleBand>

      <main>
        <Shell className="py-12">
          <Panel className="max-w-[720px]">
            {/* Not the traveller's "Personal and travel details": an
                agent has no trip, and borrowing that heading described
                the wrong person on their own page. */}
            <PanelHeader label={AGENCY.profileDetailsLabel[locale]} />
            <PanelBody className="pt-2">
              {/* One grid rather than two fixed half-columns, so the
                  sheet reads in rows and collapses to a single column
                  without re-ordering — the traveller's profile again. */}
              <dl className="grid gap-x-10 sm:grid-cols-2">
                <EditableName fullName={profile.fullName} />
                <DetailField
                  label={PROFILE.emailLabel[locale]}
                  value={profile.email}
                />
                <EditablePhone countryIso={countryIso} digits={phoneDigits} />
                {/* Where they work and what they are there — the fact
                    their clients and colleagues actually identify them
                    by, and the only one on this page they cannot
                    change. */}
                {membership && (
                  <DetailField
                    label={AGENCY.profileOrgLabel[locale]}
                    value={`${membership.name} · ${AGENCY.roleLabel[membership.role][locale]}`}
                  />
                )}
              </dl>
            </PanelBody>
          </Panel>
        </Shell>
      </main>
    </div>
  );
}
