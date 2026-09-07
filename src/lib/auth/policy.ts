/**
 * Every access decision in Toplance, as pure functions.
 *
 * These rules were the row-level security policies in the initial
 * migration. Moving off Supabase means the database no longer enforces
 * them, so they live here instead — deliberately free of I/O, so the
 * rules can be read, reviewed and tested on their own.
 *
 * Nothing in this file may import a client, a session or a framework.
 *
 * ── The tenancy, as of the v1.3 correction ──────────────────────────
 *
 * Toplance is one platform hosting many agencies. An agency is a tenant:
 * it invites its own travellers, reviews their documents, and decides
 * their applications. BeOrchid provisions and suspends agencies, curates
 * route requirement data, and reads the audit log — and reaches no
 * traveller's case at all.
 *
 * This file used to say the opposite. `isStaff` was the reviewer branch
 * on all six document-side read policies and there was no agency branch
 * anywhere; the boundary ran between the organisation and the documents
 * rather than between the platform and the tenant. Both halves are
 * inverted here, which is why the change is large and why the tests
 * inverted with it.
 *
 * `isStaff` now appears in exactly two places, both of them
 * platform-side: the audit log, and corridor curation. If you find
 * yourself adding a third to reach a traveller's case, that is the
 * boundary this correction exists to draw, and the answer is no.
 */

export type AppRole = "traveler" | "org_member" | "staff";
export type StaffRole = "reviewer" | "owner";

/** The two ranks inside an agency — `org_role` in the schema. */
export type OrgRole = "reviewer" | "owner";

/** One agency membership: which agency, and the rank held inside it. */
export type OrgMembership = { orgId: string; role: OrgRole };

/** `userId` is what `applications.traveler_id` holds: the Clerk user id. */
export type Actor = {
  userId: string;
  role: AppRole;
  staffRole: StaffRole | null;
  /**
   * Exactly `orgs.map((o) => o.orgId)`. Both are written by `getActor`
   * from one query and cannot disagree; the ids alone are what most
   * callers want — roster reads, the invitation guard — and making them
   * map over memberships at every call site would be noise.
   */
  orgIds: readonly string[];
  /**
   * The same memberships with the rank attached.
   *
   * This file used to hold the ids alone, with a note that widening
   * `Actor` for one caller would put a query on the path of every access
   * decision. The rank arrives free: `liveMembershipsFor` already reads
   * `org_members` to answer `orgIds`, and the role is another column on
   * the row it is already fetching. Nothing new runs.
   */
  orgs: readonly OrgMembership[];
};

export type ApplicationRef = {
  id: string;
  travelerId: string;
  /**
   * The agency the case belongs to. Nullable only until the backfill
   * makes the column `not null` — see the note on `isAgencyFor`.
   */
  orgId: string | null;
  /**
   * The colleague inside that agency who is handling it, or `null` while
   * it is still in the pool. It is a permission input, not a label —
   * see `handlesCase`.
   */
  assigneeId: string | null;
};

export type Permission = (actor: Actor, app: ApplicationRef) => boolean;

/** BeOrchid's own people. Platform-side only — see the header. */
export function isStaff(actor: Actor): boolean {
  return actor.role === "staff";
}

/** Platform owners are the only staff who may edit reference data. */
export function isOwner(actor: Actor): boolean {
  return isStaff(actor) && actor.staffRole === "owner";
}

export function ownsApplication(actor: Actor, app: ApplicationRef): boolean {
  return app.travelerId === actor.userId;
}

/**
 * Whether this actor works for the agency that holds this case.
 *
 * The membership check is `role === "org_member"` as well as the id
 * match, so a traveller who somehow carries an `orgIds` entry does not
 * inherit a reviewer's reach — the same forgery guard `isStaff` has.
 *
 * A case with a null `org_id` matches nobody. That is the safe
 * direction and it is also the correct one: under this tenancy a
 * traveller with no agency has no reviewer, so the record is
 * unservable rather than merely unbilled. Those rows are being deleted;
 * this branch is what holds until they are.
 */
export function isAgencyFor(actor: Actor, app: ApplicationRef): boolean {
  return (
    actor.role === "org_member" && app.orgId !== null && actor.orgIds.includes(app.orgId)
  );
}

/** The rank this actor holds inside one agency, or `null` if not a member. */
function rankIn(actor: Actor, orgId: string | null): OrgRole | null {
  if (actor.role !== "org_member" || orgId === null) return null;
  return actor.orgs.find((o) => o.orgId === orgId)?.role ?? null;
}

/**
 * The director of the agency this case belongs to.
 *
 * Named for the person rather than the column: `owner` in `org_role` is
 * whoever created the agency or was promoted to run it, and inside a
 * case they are the one member whose reach is not narrowed by who is
 * handling it. Distinct from `isOwner`, which is a BeOrchid rank and
 * reaches no case at all.
 */
export function isAgencyDirectorFor(actor: Actor, app: ApplicationRef): boolean {
  return rankIn(actor, app.orgId) === "owner";
}

/**
 * The agency's reach into one case, which is the *handler's* reach.
 *
 * An unclaimed case is open to the whole agency — somebody has to be
 * able to look before they can pick it up, and a queue nobody may read
 * is not a queue. The moment it is assigned it narrows to the assignee
 * and the director: a reviewer holds no standing claim on a colleague's
 * client, and "everyone in the agency, forever" is the arrangement that
 * makes a data-protection answer impossible to write down.
 *
 * Assignment is therefore a permission, not a label. `claimCase` and
 * `releaseCase` move it, and every document, message and note policy
 * below is decided by this function.
 */
export function handlesCase(actor: Actor, app: ApplicationRef): boolean {
  if (!isAgencyFor(actor, app)) return false;
  if (isAgencyDirectorFor(actor, app)) return true;
  return app.assigneeId === null || app.assigneeId === actor.userId;
}

/** The traveller whose case it is, or the colleague at their agency handling it. */
const participant: Permission = (actor, app) =>
  ownsApplication(actor, app) || handlesCase(actor, app);

export const canReadApplication: Permission = participant;

/** The agency decides the case; the traveller fills in their own form. */
export const canWriteApplication: Permission = participant;

/**
 * The privacy boundary.
 *
 * It runs between the platform and the tenant, not between the tenant
 * and its own travellers: the agency reviews these documents because
 * reviewing them is the job it was hired for. There is deliberately no
 * staff branch, and adding one would break the claim the product makes
 * in every agency's client terms — that no one at BeOrchid can open
 * their clients' documents.
 *
 * Inside the tenant there is a second, narrower line: `handlesCase`.
 * The agency reviews the case it was hired for, but not every colleague
 * reviews every case — once one is assigned, it is the assignee's and
 * the director's.
 */
export const canReadDocuments: Permission = participant;

export const canWriteDocuments: Permission = participant;

/**
 * A verdict on a document — the agency's, and only the agency's.
 *
 * `canWriteDocuments` is not this. The traveller holds that one too,
 * because uploading is a write, and a traveller signing off their own
 * passport is precisely what a review boundary exists to refuse. The
 * old code guarded verdicts with `isStaff` for the same reason; this is
 * that guard, re-aimed at the tenant who now does the reviewing.
 */
export const canReviewDocuments: Permission = (actor, app) => handlesCase(actor, app);

/**
 * Moving a case through `STAFF_TRANSITIONS` — approve, refuse, ask for
 * more. Same argument as `canReviewDocuments`: `canWriteApplication`
 * includes the traveller, who must not approve their own application.
 */
export const canDecideCase: Permission = (actor, app) => handlesCase(actor, app);

/**
 * Handing a case to a colleague, taking it, or putting it back.
 *
 * `handlesCase` is already the right shape: an unclaimed case is any
 * member's to take, a claimed one is the assignee's and the director's
 * to move. Nobody else in the agency can quietly reassign a colleague's
 * client away from them.
 */
export const canAssignCase: Permission = (actor, app) => handlesCase(actor, app);

export const canReadIntakeAnswers: Permission = participant;

/** The agency reads the intake conversation; it never answers it. */
export const canWriteIntakeAnswers: Permission = (actor, app) =>
  ownsApplication(actor, app);

export const canReadStatusEvents: Permission = participant;

/**
 * Case notes are the agency's running commentary on a case, shown
 * read-only to the traveller. They discuss documents, so they sit
 * behind the same boundary the documents do.
 */
export const canReadCaseNotes: Permission = participant;

/** Only the agency writes notes; a traveller never annotates their own case. */
export const canWriteCaseNotes: Permission = (actor, app) => handlesCase(actor, app);

export const canReadItinerary: Permission = participant;

/**
 * The post-arrival companion. Part of what the agency sells, so the
 * agency can see it; explicitly named in the correction as something no
 * BeOrchid screen renders.
 */
export const canReadCompanion: Permission = participant;

/**
 * The expiry date printed on the traveller's own visa.
 *
 * Narrower than every other write on a case, and deliberately so: not
 * the agency, not the platform, only the person holding the document.
 * The value is a fact about someone's legal status that nothing here
 * verified, and anyone else typing one in would make it look like a
 * record of ours — the invented-expiry problem `renewalGuidance` was
 * written to refuse. If the agency knows the date, the traveller does
 * too, and it is theirs to enter.
 */
export const canWriteVisaExpiry: Permission = (actor, app) => ownsApplication(actor, app);

/** Traveller and agency, both directions. Nobody else joins the thread. */
export const canReadMessages: Permission = participant;

export const canWriteMessages: Permission = participant;

/** Platform-side: route curation. */
export function canWriteCorridors(actor: Actor): boolean {
  return isOwner(actor);
}

/** Platform-side: the audit log, which is what support debugs from. */
export function canReadAuditLog(actor: Actor): boolean {
  return isStaff(actor);
}

/** Org-scoped, not application-scoped: invitations belong to an agency. */
export function isOrgMemberOf(actor: Actor, orgId: string): boolean {
  return actor.role === "org_member" && actor.orgIds.includes(orgId);
}
export const canManageInvitations = isOrgMemberOf; // platform staff deliberately excluded

/* ============================================================
 * AUDIT: every policy from supabase/migrations/20260821120000_init.sql
 *
 * That migration is deleted; read it at commit 8ef588e if you need the
 * original text. Each policy below names what enforces it now. Rewritten
 * with the v1.3 tenancy — where a line used to say "staff", it now says
 * either "the agency" or "nobody".
 *
 * profiles
 *   read own profile ............ getProfile() selects on the Clerk id
 *   update own profile .......... completeProfile() writes on the same
 *   staff read all profiles ..... GONE. The platform case queue that
 *                                 joined profiles is deleted with it
 *
 * organisations / org_members
 *   members read their org ...... agency console joins via own membership
 *   members read org roster ..... getActor() reads only own memberships
 *   staff read orgs ............. tenant provisioning only — never a
 *                                 join through to a traveller's case
 *
 * invitations
 *   agency members manage ....... canManageInvitations (isOrgMemberOf),
 *                                 enforced by requireOrgAccess in
 *                                 `@/lib/auth/guards`; platform staff
 *                                 deliberately excluded, same as the
 *                                 roster above
 *
 * corridors / corridor_requirements
 *   signed-in read .............. every caller sits behind a session:
 *                                 the pages redirect without one, and
 *                                 buildChecklist runs only from the
 *                                 guarded answerQuestion
 *   owners write ................ canWriteCorridors. Live now that
 *                                 BeOrchid curates rules centrally —
 *                                 the /ops corridor screens are the
 *                                 surface, and they are what remains of
 *                                 the platform console
 *
 * applications
 *   travellers read own ......... getApplication filters on the
 *                                 caller's own id
 *   travellers create own ....... same function; it can only insert a
 *                                 row naming the caller
 *   travellers update own draft . requireApplicationAccess +
 *                                 canWriteApplication / canWriteIntakeAnswers
 *   agency reads and decides .... canReadApplication / canWriteApplication,
 *                                 both scoped by isAgencyFor
 *   staff read all .............. GONE, with the queue that used it
 *
 * intake_answers
 *   travellers manage own ....... answerQuestion, canWriteIntakeAnswers
 *   agency reads ................ canReadIntakeAnswers
 *
 * documents — the privacy boundary
 *   travellers manage own ....... uploadDocument / removeDocument /
 *                                 documentUrl, all guarded
 *   agency reads / reviews ...... canRead/canWriteDocuments
 *   platform staff .............. deliberately absent. No branch, no
 *                                 audited exception, no break-glass;
 *                                 policy.test.ts fails if one is added
 *
 * status_events
 *   participants read ........... canReadStatusEvents
 *   staff write ................. DELIBERATE DIVERGENCE. submitApplication
 *                                 writes the submission event as the
 *                                 system, with a null actor. Under RLS
 *                                 that insert was silently rejected and
 *                                 the error never read, so submitted
 *                                 cases carried no event at all
 *
 * audit_log
 *   staff read .................. canReadAuditLog. This is now the whole
 *                                 of BeOrchid's view of a case, and the
 *                                 only surface support can debug from
 *
 * itineraries ................... canReadItinerary — traveller and agency
 * case_notes .................... canRead/canWriteCaseNotes — the agency
 *                                 writes, the traveller reads
 * messages ...................... canRead/canWriteMessages — traveller and
 *                                 agency both read and write
 * companion_updates ............. canReadCompanion — traveller and agency
 * ============================================================ */
