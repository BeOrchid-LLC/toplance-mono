import Link from "next/link";

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{AGENCY.tableHead.colleague[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.joined[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.rank[locale]}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.userId}>
                <TableCell>
                  {/* The name opens their page, where the rank can be
                      changed and what they are carrying is listed. The
                      address goes inside the link for the reason the
                      case reference does on the clients table: it is
                      how a colleague is identified when two people
                      share a name. */}
                  <Link
                    href={`/agency/team/${member.userId}`}
                    className="group/member block"
                    title={member.email}
                  >
                    <span className="block truncate font-semibold text-brand-text group-hover/member:underline">
                      {member.fullName || member.email}
                    </span>
                    {member.fullName && (
                      <span className="special block truncate">{member.email}</span>
                    )}
                  </Link>
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
