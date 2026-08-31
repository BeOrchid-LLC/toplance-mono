import { Panel, PanelBody } from "@/components/shared/panel";

/**
 * The wording `acceptInvitationTx` returns for a dead token — one source
 * of truth for the sentence rather than copies that could drift.
 * `invalid` (a token matching nothing) has no error string to borrow,
 * since that path never reaches the transaction.
 */
export const DEAD_END_MESSAGE: Record<
  "invalid" | "revoked" | "accepted" | "expired",
  string
> = {
  invalid: "This invitation link is not valid.",
  revoked: "This invitation has been revoked.",
  accepted: "This invitation has already been accepted.",
  expired: "This invitation has expired.",
};

/**
 * A closed door that explains itself. Two surfaces need one now: the
 * accept page, where the token is dead, and `/sign-up`, which since
 * travellers became invite-only (2026-08-31) is a door with no handle on
 * the outside.
 *
 * `children` is the way onward — a sign-in link, a link back to the
 * site. Deliberately not defaulted: the two callers are ushering people
 * somewhere genuinely different, and a shared default would be wrong on
 * one of them without anyone noticing.
 */
export function InvitationDeadEnd({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <Panel>
      <PanelBody>
        <p className="tag">Invitation</p>
        <h1 className="t-h2 mt-3 max-w-[24ch]">{title}</h1>
        <p className="t-muted mt-3 max-w-[48ch]">{body}</p>
        {children}
      </PanelBody>
    </Panel>
  );
}
