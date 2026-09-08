import type { Metadata } from "next";

import { AgencyShell } from "@/components/agency/agency-shell";
import { AvatarUpload } from "@/components/app/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { EditableName, EditablePhone } from "@/components/app/profile-fields";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { signedDocumentUrl } from "@/lib/storage/documents";
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
 * No language row and no digest: those belong to surfaces this console
 * does not have. What is here is what a colleague and a client see, plus
 * the number a case can reach them on.
 */
export default async function AgencyProfilePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  // The stored phone is E.164; the inline editor wants national digits
  // with the dial code supplied by the country picker — the same split
  // the traveller's profile makes.
  const countryIso = profile.countryIso ?? "ng";
  const dial = countryBy(countryIso).dial.replace("+", "");
  const phoneDigits = profile.phone
    ? profile.phone.replace(/^\+/, "").replace(new RegExp(`^${dial}`), "")
    : "";

  // Signed per render, ten minutes at a time: avatars live in the same
  // private bucket as the documents, and a photo of a person is not
  // public just because it is small.
  const avatarUrl = profile.avatarPath
    ? await signedDocumentUrl(profile.avatarPath)
    : null;

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="overview"
      title={AGENCY.profileTitle[locale]}
      lead={AGENCY.profileBody[locale]}
      // A sheet of one person's own details, not a table: it reads at
      // one width whatever the viewport does, so it sits in the middle
      // of the console rather than pinned to the rail's edge.
      centred
    >
      <Panel>
        {/* Not the traveller's "Personal and travel details": an
            agent has no trip, and borrowing that heading described
            the wrong person on their own page. */}
        <PanelHeader label={AGENCY.profileDetailsLabel[locale]} />
        <PanelBody className="pt-6">
          {/* The photo and the name it belongs to, above the fields
              that spell them out. An agent's face is the one thing on
              this page a client actually recognises them by — the bar
              showed initials until they upload one. */}
          <div className="flex items-start gap-5 sm:gap-7">
            <AvatarUpload
              fullName={profile.fullName}
              avatarUrl={avatarUrl}
            />
            {/* Where they work and what they are there, beside the
                photo rather than as a fourth labelled field: it is
                the one fact on this page they cannot change, and it
                identifies them the way a colleague would. */}
            <div className="min-w-0 flex-1">
              <p className="d-sm truncate">
                {profile.fullName || profile.email}
              </p>
              {membership && (
                // The rank as a badge rather than the tail of a muted
                // sentence, asked for on 8 September. It was already on
                // this page and read as part of the agency's name, which
                // is how somebody looks straight past the one line that
                // says what they may do. Same treatment `TeamRoster`
                // gives a colleague's rank, and for the reason recorded
                // there: a member whose rank is not visible is a member
                // whose permissions nobody can explain.
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="t-muted truncate">{membership.name}</span>
                  <Badge variant="neutral">
                    {AGENCY.roleLabel[membership.role][locale]}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 border-t border-border pt-2">
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
            </dl>
          </div>
        </PanelBody>
      </Panel>
    </AgencyShell>
  );
}
