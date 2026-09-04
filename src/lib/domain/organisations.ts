/**
 * Facts about an organisation that both sides of the wire need.
 *
 * `createOrganisationTx` enforces this ceiling, and it lives in a
 * `server-only` module — so a form that wanted to stop a name before it
 * was sent had no way to import it, and the number was about to be
 * written down a second time. A second copy of a limit is a limit that
 * will disagree with itself: the form would let a name through and the
 * transaction would refuse it, on the far side of a completed sign-up.
 */
export const ORG_NAME_MAX = 160;
