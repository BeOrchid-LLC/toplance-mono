import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrgMemberRow } from "@/lib/data/organisations";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The colleagues inside this agency, oldest first — so the director who
 * created it heads the list.
 *
 * A table since the client's 7 September review, which asked for the
 * same treatment the clients roster got. No sortable headers, though:
 * the order is the argument. Oldest first puts the person who founded
 * the agency at the top, and a column that reorders away from that is
 * offering to lose the one thing the sequence says.
 *
 * Their rank is a badge rather than bare text, for the same reason the
 * rail names your own role: `owner` and `reviewer` are the whole of §1's
 * authority model here, and a member whose rank is not visible is a
 * member whose permissions nobody can explain.
 *
 * No progress, no cases, no documents. A colleague is not somebody this
 * console tracks — they are somebody it is run by — and a completion
 * score beside their name would say the opposite.
 */
export function TeamRoster({
  members,
  locale,
  action,
}: {
  members: OrgMemberRow[];
  locale: Locale;
  /**
   * The invite trigger, on the same row as the count it changes.
   *
   * Moved off the console bar at the client's request on 8 September,
   * and the request is the right one: the bar is chrome shared by every
   * agency screen, so a button there reads as "this console can invite"
   * rather than "this list is the one you are adding to". Beside the
   * member count it is unmistakably about these people — and it sits
   * directly above the sentence that says "Invite a colleague and they
   * appear here once they accept", which until now named an action the
   * reader had to go looking for at the top of the window.
   *
   * Passed in rather than built here because it is a client component
   * and this is not, and because who may invite is the page's question
   * to answer — a reviewer gets no button, and gets no `redirect` from
   * this component either.
   */
  action?: React.ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader
        label={AGENCY.yourTeamLabel[locale]}
        aside={
          // The badge stays the rightmost thing when it is alone. With an
          // action beside it the count leads, because the count is the
          // fact about the panel and the button is what you do about it —
          // reading "0 members · Invite" in that order is the sentence
          // the empty state is making.
          <div className="flex items-center gap-3">
            <Badge variant="brand">
              <span className="num">{members.length}</span>
              {
                (members.length === 1 ? AGENCY.memberWord : AGENCY.membersWord)[
                  locale
                ]
              }
            </Badge>
            {action}
          </div>
        }
      />

      {members.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{AGENCY.teamEmpty[locale]}</p>
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-end">{ADMIN_CONSOLE.ordinalHeading[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.colleague[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.joined[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.rank[locale]}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, i) => (
              <TableRow key={member.userId}>
                <TableCell className="num t-muted text-end">{i + 1}</TableCell>
                <TableCell>
                  {/* The ceiling the truncates inside need: on a block
                      wrapper, not the cell, because Firefox ignores
                      `max-width` on a `td` — see `DataColumn.ceiling`. */}
                  <div className="max-w-[280px]">
                    <span
                      className="block truncate font-semibold"
                      title={member.email}
                    >
                      {member.fullName || member.email}
                    </span>
                    {member.fullName && (
                      <span className="special block truncate">{member.email}</span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="t-muted">
                  {fill(AGENCY.joinedOn[locale], {
                    date: formatDay(member.joinedAt),
                  })}
                </TableCell>

                <TableCell>
                  <Badge variant="neutral">
                    {AGENCY.roleLabel[member.role][locale]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
