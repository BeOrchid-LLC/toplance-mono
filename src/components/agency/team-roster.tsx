import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import type { OrgMemberRow } from "@/lib/data/organisations";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The colleagues inside this agency, oldest first — so the owner who
 * created it heads the list.
 *
 * Their rank is a badge rather than a column heading, for the same
 * reason the bar names your own role: `owner` and `reviewer` are the
 * whole of §1's authority model here, and a member whose rank is not
 * visible is a member whose permissions nobody can explain.
 *
 * No progress, no cases, no documents. A colleague is not somebody this
 * console tracks — they are somebody it is run by — and a completion
 * score beside their name would say the opposite.
 */
export function TeamRoster({
  members,
  locale,
}: {
  members: OrgMemberRow[];
  locale: Locale;
}) {
  return (
    <Panel>
      <PanelHeader
        label={AGENCY.yourTeamLabel[locale]}
        aside={
          <Badge variant="brand">
            <span className="num">{members.length}</span>
            {
              (members.length === 1 ? AGENCY.memberWord : AGENCY.membersWord)[
                locale
              ]
            }
          </Badge>
        }
      />

      {members.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{AGENCY.teamEmpty[locale]}</p>
        </PanelBody>
      ) : (
        <ul>
          {members.map((member) => (
            <li
              key={member.userId}
              className="grid gap-x-8 gap-y-3 border-b border-border px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <p className="t-title truncate" title={member.email}>
                  {member.fullName || member.email}
                </p>
                {member.fullName && (
                  <p className="special mt-1 truncate">{member.email}</p>
                )}
              </div>

              <div className="min-w-0">
                <p className="special truncate">
                  {fill(AGENCY.joinedOn[locale], {
                    date: formatDay(member.joinedAt),
                  })}
                </p>
              </div>

              <div className="lg:justify-self-end">
                <Badge variant="neutral">
                  {AGENCY.roleLabel[member.role][locale]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
