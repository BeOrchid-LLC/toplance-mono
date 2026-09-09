import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { InvitationStatusBadge } from "@/components/shared/status-badge";
import {
  ResendInvitationButton,
  RevokeInvitationButton,
  type ResendResult,
  type RevokeResult,
} from "@/components/shared/invitation-actions";
import type { ListedInvitation } from "@/lib/data/invitations";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { AGENCY } from "@/lib/i18n/agency";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** One line of lifecycle per invitation — the dates its status makes true. */
function invitationTimeline(
  invite: {
    status: string;
    createdAt: Date;
    expiresAt: Date;
    acceptedAt: Date | null;
  },
  locale: Locale
): string {
  switch (invite.status) {
    case "pending":
      return fill(AGENCY.timelineInvitedExpires[locale], {
        created: formatDay(invite.createdAt),
        expires: formatDay(invite.expiresAt),
      });
    case "accepted":
      return fill(AGENCY.timelineAccepted[locale], {
        date: formatDay(invite.acceptedAt ?? invite.createdAt),
      });
    case "expired":
      return fill(AGENCY.timelineExpired[locale], {
        date: formatDay(invite.expiresAt),
      });
    default:
      return fill(AGENCY.timelineInvited[locale], {
        date: formatDay(invite.createdAt),
      });
  }
}

/**
 * Emails nobody has answered yet.
 *
 * A sheet of its own wherever it appears, never a section inside the
 * roster above it: an invitation and a member are different objects —
 * one is a person who exists here, the other is an address that might
 * become one.
 *
 * All three kinds of invitation render through this, and the middle
 * column is the only thing that differs, because they differ in exactly
 * one fact worth showing before acceptance: where a client is going,
 * what an agency colleague will be called, and what rank a BeOrchid
 * colleague is being given. Splitting this into three components would
 * duplicate the lifecycle line, the two buttons and the status pill to
 * vary one cell.
 *
 * The two actions arrive as props. This lived under
 * `components/agency/` and imported that console's actions directly,
 * which is what made it unusable from `/ops`.
 *
 * A table since the client's 7 September review. `detailLabel` is what
 * that varying middle column is called, and it comes from the caller
 * because only the caller knows which kind it filtered to. Heading it
 * "Details" would be the unlabelled fragment a table exists to avoid.
 */
export function InvitationRoster({
  invitations,
  locale,
  label,
  empty,
  className,
  resendAction,
  revokeAction,
  detailLabel,
}: {
  invitations: ListedInvitation[];
  locale: Locale;
  /**
   * The panel's own heading.
   *
   * A prop, because this roster is three different lists: an agency's
   * client invitations, the same agency's colleague invitations, and
   * BeOrchid's own staff invitations. It used to hardcode
   * `AGENCY.invitationsLabel`, which on 2026-09-08 became "Client
   * invitations" — correct on one of the three screens and wrong on
   * the other two, where the panel then announced clients above a list
   * of colleagues. `empty` was already a prop for the same reason. That
   * string is back to a bare "Invitations" since 2026-09-09, which
   * happens to read acceptably on all three, but the prop stays: it is
   * the caller who knows whose list this is, and the next rewording of
   * one screen's heading should not reach the other two.
   */
  label: string;
  /** What to say when there are none — a client roster and a team say it differently. */
  empty: string;
  /**
   * The middle column's heading. Defaults to the rank, which is what
   * `/ops/staff` shows; the agency's two callers pass the destination
   * and the job title respectively.
   */
  detailLabel?: string;
  className?: string;
  resendAction: (formData: FormData) => Promise<ResendResult>;
  revokeAction: (formData: FormData) => Promise<RevokeResult>;
}) {
  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <Panel className={className}>
      <PanelHeader
        label={label}
        aside={
          <Badge variant="neutral">
            <span className="num">{pending.length}</span>
            {AGENCY.pendingWord[locale]}
          </Badge>
        }
      />

      {invitations.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{empty}</p>
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-end">{ADMIN_CONSOLE.ordinalHeading[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.invitation[locale]}</TableHead>
              <TableHead>{detailLabel ?? AGENCY.tableHead.rank[locale]}</TableHead>
              <TableHead>{AGENCY.tableHead.status[locale]}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invite, i) => {
              const destination = countryFromIso2(invite.destinationIso);
              return (
                <TableRow key={invite.id}>
                  <TableCell className="num t-muted text-end">{i + 1}</TableCell>
                  <TableCell>
                    <span
                      className="block truncate font-semibold"
                      title={invite.email}
                    >
                      {invite.fullName || invite.email}
                    </span>
                    {invite.fullName && (
                      <span className="special block truncate">{invite.email}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="block truncate">
                      {invite.kind === "platform_staff"
                        ? OPS_COMMON.staffRole[invite.staffRank ?? "reviewer"][locale]
                        : invite.kind === "staff"
                          ? invite.jobTitle || AGENCY.jobTitleNotSet[locale]
                          : (destination?.name ??
                            invite.destinationIso?.toUpperCase() ??
                            AGENCY.destinationNotSet[locale])}
                    </span>
                    <span className="special block truncate">
                      {invitationTimeline(invite, locale)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <InvitationStatusBadge status={invite.status} locale={locale} />
                  </TableCell>

                  <TableCell>
                    {invite.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <ResendInvitationButton
                          invitationId={invite.id}
                          email={invite.email}
                          action={resendAction}
                        />
                        <RevokeInvitationButton
                          invitationId={invite.id}
                          email={invite.email}
                          action={revokeAction}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
