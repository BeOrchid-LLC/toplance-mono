import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The whole Toplance schema.
 *
 * Table and column names match the previous Supabase schema on purpose:
 * the BeOrchid conventions call for `core`/`toplance` schemas and some
 * corrected spellings, but AGENTS.md reserves that move for platform
 * work planned with the team. This file is the only place the names
 * appear, so adopting them later is an edit and a regenerated migration.
 *
 * The one forced change: `profiles.id` is the Clerk user id, a text
 * primary key, and every reference to a person is text too.
 *
 * The row-level security policies that used to live beside these tables
 * are now `src/lib/auth/policy.ts`. A plain Postgres connection enforces
 * nothing, so that module is the only thing standing between a
 * traveller and someone else's passport.
 */

export const appRole = pgEnum("app_role", ["traveler", "org_member", "staff"]);
export const staffRole = pgEnum("staff_role", ["reviewer", "owner"]);
/**
 * The two roles inside an agency. `hr_admin` arrived with the employer
 * console and described nobody in a travel agency; the v1.3 correction
 * replaced it with `reviewer`, who is the person that actually reads a
 * traveller's documents and decides their case.
 *
 * Same two words as `staff_role`, deliberately, but a different type and
 * a different side of the boundary: an agency reviewer reviews cases, a
 * platform reviewer reads corridor drafts and cannot publish them.
 */
export const orgRoleEnum = pgEnum("org_role", ["reviewer", "owner"]);

/**
 * Locked status model. Colour mapping lives in the design system:
 * submitted → info · under_review → warning · approved → success
 * rejected → danger · additional_docs → neutral · collecting → brand
 */
export const applicationStatus = pgEnum("application_status", [
  "draft",
  "collecting_documents",
  "submitted",
  "under_review",
  "additional_documents",
  "approved",
  "rejected",
]);

/**
 * Why a document was sent back, as a class rather than a sentence.
 *
 * Decision 5 of 6 September removed BeOrchid's every path to a
 * traveller's documents, which made the flag reason the whole of what
 * support outside the agency can debug from — and that reason is free
 * text, usually written by a model. Prose cannot be aggregated, compared
 * across cases, or trusted to mean the same thing twice.
 *
 * The class is for whoever is debugging; the sentence beside it is for
 * the traveller, and stays. `other` exists so nothing is forced into a
 * wrong bucket, and a rising `other` count is itself the signal that
 * this list needs another entry.
 */
export const flagReason = pgEnum("flag_reason", [
  /** Blurry, dark, cropped, glare — the file is fine, the capture is not. */
  "unreadable",
  /** In date terms, not usable. */
  "expired",
  /** They uploaded something else. */
  "wrong_document",
  /** The right document, missing pages or fields. */
  "incomplete",
  /** Details do not match what they told us — usually the name. */
  "mismatch",
  "other",
]);

export const documentState = pgEnum("document_state", [
  "not_started",
  "uploaded",
  "checking",
  "verified",
  "flagged",
  "failed",
]);

/**
 * Where a corridor version sits in the review it must pass before a
 * traveller can be shown it.
 *
 * An enum rather than the plan's `text`, because every other closed set
 * in this file is one and the ops screens switch on the value. The
 * lifecycle itself is carried by columns that already existed —
 * `version` and `is_live` — so this records *why* a version is dark,
 * not whether it is.
 */
export const corridorReviewState = pgEnum("corridor_review_state", [
  "pending",
  "approved",
  "rejected",
]);

export const travelPurpose = pgEnum("travel_purpose", [
  "tourism",
  "work",
  "study",
  "medical",
  "relocation",
  /**
   * Meetings, trade, conferences — a distinct visa category almost
   * everywhere, not a flavour of tourism.
   *
   * Appended rather than inserted in purpose order, because Postgres
   * `ADD VALUE` appends and a reordered enum would be a rewrite rather
   * than an additive migration. Enum position carries no meaning here;
   * the order the intake agent offers purposes in is `PURPOSES` in
   * `@/lib/domain/corridors`.
   *
   * Added because the sources say it is first-class: India lists
   * e-Business among its e-Visa categories, and the EU Visa Code's
   * Annex II puts business trips *first*, ahead of study and tourism.
   * It also fits this product better than tourism does — a traveller
   * here is sponsored by an organisation, and an employee flying out
   * for meetings is nearer Toplance's customer than a holidaymaker.
   */
  "business",
]);

/**
 * What an invitation attaches when it is accepted.
 *
 * Two of these are an agency's to send. A `client` invite attaches an
 * application — somebody whose visa the agency is handling. A `staff`
 * invite attaches a membership — a colleague who will review those
 * applications.
 *
 * The third is BeOrchid's own, and attaches neither: `platform_staff`
 * makes the accepting account platform staff, at the rank the sender
 * chose. It is the only invitation in the product with no organisation
 * behind it, which is why `org_id` is nullable and why
 * `platform_invite_has_no_org` exists to say what the FK no longer can.
 *
 * A discriminator rather than a second table: one token format, one
 * accept page, one expiry policy and one revoke button already exist,
 * and a second table would duplicate all four to carry one column.
 */
export const invitationKind = pgEnum("invitation_kind", [
  "client",
  "staff",
  "platform_staff",
]);

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

/**
 * How far a demo enquiry has been carried. `converted` is the only value
 * that means something happened in the product rather than in somebody's
 * calendar — it is written by `provisionTenantTx`, in the same
 * transaction as the agency it names.
 */
export const demoRequestStatus = pgEnum("demo_request_status", [
  "new",
  "contacted",
  "scheduled",
  "converted",
  "declined",
]);

/**
 * The two things anybody buys.
 *
 * `agency_subscription` opens an agency's console for a period;
 * `client_application` pays for one traveller's application. They are
 * separate charges to separate payers and never substitute for each
 * other — an agency's subscription does not sponsor its clients, and a
 * client's fee does not keep the console open.
 */
export const paymentKind = pgEnum("payment_kind", [
  "agency_subscription",
  "client_application",
]);

/**
 * Where one payment got to.
 *
 * `pending` is the window between asking the provider for a checkout and
 * hearing back. The mock provider closes it immediately; a real one
 * closes it on a webhook, which is why the state exists at all rather
 * than rows only ever being written `paid`.
 */
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed"]);

export const notificationKind = pgEnum("notification_kind", [
  "application_submitted", // → staff: a file reached 100% and was submitted
  "status_changed", // → traveller
  "document_flagged", // → traveller
  "message_received", // → the other side of the thread
  "itinerary_ready", // → traveller
  "companion_digest", // → traveller: weekly post-arrival digest
  /**
   * → traveller: the corridor they are mid-application on was revised,
   * and their checklist changed with it. Sent only when a document was
   * actually added or dropped — a reworded description is not worth an
   * email, and a corridor revision that changes no row of theirs is not
   * news to them.
   */
  "checklist_changed",
  /**
   * → traveller: their visa is approaching the expiry date they gave us.
   * Sent at most three times per application (see `EXPIRY_THRESHOLDS`),
   * and never after the date has passed. The `daysOut` in the payload is
   * which notice it was, and reading those back is how the cron knows
   * not to repeat one.
   */
  "visa_expiring",
  /**
   * → traveller: a government travel advisory for their destination
   * changed. The payload carries the issuing source's own words and a
   * link to its page — this product never restates an advisory, so the
   * notification has nothing of ours in it beyond the framing.
   */
  "advisory_changed",
  /**
   * → the colleague handling the case: one document has arrived and is
   * waiting on a verdict.
   *
   * In-app only. `templateFor` has no branch for it and `notify` skips
   * the email when there is none — a checklist is nine documents, and
   * nine emails for one traveller's afternoon is how a reviewer learns
   * to ignore the address the rest of these arrive at.
   *
   * Sent to the assignee alone, never fanned out: an unheld case is
   * nobody's inbox, and `checklist_complete` still tells the whole
   * agency when one fills up.
   */
  "document_uploaded",

  /**
   * → staff: a traveller's required checklist reached 100% collected.
   * The brief asks for this separately from submission, and the two are
   * genuinely different moments — somebody can upload everything and
   * never press Submit, and until this existed nobody found out.
   */
  "checklist_complete",
]);

/**
 * One row per person, keyed on the Clerk user id.
 *
 * English is official in Nigeria but a second language for many, so the
 * whole traveller surface localises to Hausa, Yoruba and Igbo.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: text().primaryKey(),
    fullName: text().notNull().default(""),
    email: text().notNull(),
    phone: text(),
    countryIso: text().notNull().default("ng"),
    /**
     * Storage key of the profile photo — MinIO locally, Cloudflare R2 in
     * staging and production, the same bucket as documents. A key rather
     * than a URL: the bucket is private, so every render signs a fresh
     * short-lived link.
     */
    avatarPath: text(),
    locale: text().notNull().default("en"),
    role: appRole().notNull().default("traveler"),
    staffRole: staffRole(),
    /** Per-person notification switches, e.g. `{ "companionDigest": "weekly" | "off" }`. */
    notificationPrefs: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * Kept in step with `LOCALES` in `@/lib/i18n/locales`, by hand,
     * because a check constraint cannot read TypeScript. It listed four
     * codes while the menu offered ten, so a traveller selecting French,
     * Portuguese, Swahili, Arabic, Twi or isiZulu failed the write —
     * six of the ten languages could not be saved at all.
     *
     * Still a closed list rather than no constraint: a language nobody
     * has translated must not reach this column, or a page renders blank
     * where a string should be. Adding a language means adding it here
     * too, and `schema.test.ts` fails if the two drift apart.
     */
    check(
      "locale_supported",
      sql`${t.locale} in ('en', 'ha', 'yo', 'ig', 'fr', 'pt', 'sw', 'ar', 'tw', 'zu')`
    ),
    check(
      "staff_role_only_for_staff",
      sql`${t.staffRole} is null or ${t.role} = 'staff'`
    ),
  ]
);

export const organisations = pgTable(
  "organisations",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    domain: text(),
    seatsPurchased: integer().notNull().default(0),
    billingContact: text(),
    /**
     * When BeOrchid suspended this agency, or null while it is live.
     *
     * Suspension is how an agency is removed — the row is never deleted,
     * so every application, document and message stays intact and the
     * decision is reversible on the day they pay. What it takes away is
     * the agency's reach: `liveOrgIdsFor` drops a suspended membership
     * before it ever reaches `Actor.orgIds`, so every policy that asks
     * `isAgencyFor` answers no at once.
     *
     * The traveller keeps their own case throughout. `ownsApplication`
     * never consults the agency, which is deliberate: a billing dispute
     * must not lock somebody out of their own passport scan nine days
     * before an interview.
     */
    suspendedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("seats_not_negative", sql`${t.seatsPurchased} >= 0`)]
);

/**
 * What a business is charged, as data rather than as a constant.
 *
 * Peace's pricing document asks for "all rates and thresholds as
 * configurable settings, not hard-coded numbers", because the rates are
 * provisional until supplier costs land. A row here is edited without a
 * deploy, and `effective_from` means a cycle that has already closed can
 * still be re-derived at the rates that applied when it ran — which is
 * the difference between a bill you can explain and one you can only
 * assert.
 *
 * `bands` is the layered fee, as `[{ upTo, rateMinor }]` with a single
 * open-ended top band carrying `upTo: null`. Shape and arithmetic live
 * in `@/lib/domain/pricing`; this table only stores them.
 *
 * Amounts are in minor units. `300_00` is three hundred dollars.
 */
export const billingRateCards = pgTable("billing_rate_cards", {
  id: uuid().primaryKey().defaultRandom(),
  baseFeeMinor: integer().notNull(),
  /**
   * What one client pays for one application, flat.
   *
   * Here rather than in code for the same reason as every other figure
   * on this table: the rates are provisional, and a row is edited
   * without a deploy. Defaults to 0, which is what every card written
   * before the paywall means — the client paid nothing, the agency
   * sponsored them.
   */
  clientFeeMinor: integer().notNull().default(0),
  currency: text().notNull().default("USD"),
  bands: jsonb().notNull(),
  effectiveFrom: timestamp({ withTimezone: true }).notNull().defaultNow(),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every transaction, and the only record that anybody paid for anything.
 *
 * Entitlement is *derived* from this table — `hasActiveSubscription` and
 * `isApplicationPaid` both read it — rather than denormalised onto
 * `organisations` or `applications`. A status column in two places is a
 * status column that disagrees with itself the first time a payment
 * lands and the second write does not.
 *
 * `provider` and `provider_ref` are populated from the first commit,
 * while the only provider is the mock. That is the point: adopting
 * Stripe is a second implementation behind `PaymentProvider` and a
 * different string in this column, not a migration.
 *
 * Nothing here is ever deleted or edited after it settles. A payment is
 * a fact somebody may later dispute, and `rate_card_id` records which
 * rates priced it so a charge can be re-derived rather than merely
 * asserted.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: paymentKind().notNull(),
    status: paymentStatus().notNull().default("pending"),
    amountMinor: integer().notNull(),
    currency: text().notNull().default("USD"),
    /** Set on a subscription, null on a client payment. */
    orgId: uuid().references(() => organisations.id, { onDelete: "cascade" }),
    /** Set on a client payment, null on a subscription. */
    applicationId: uuid().references(() => applications.id, { onDelete: "cascade" }),
    /**
     * Whoever pressed the button. `set null` rather than a cascade: the
     * payment outlives the account, because the money did.
     */
    payerId: text().references(() => profiles.id, { onDelete: "set null" }),
    /** Which rates priced this — see the note above on re-deriving. */
    rateCardId: uuid().references(() => billingRateCards.id, { onDelete: "set null" }),
    provider: text().notNull().default("mock"),
    providerRef: text(),
    /** A half-open period, set on subscriptions only. */
    periodStart: timestamp({ withTimezone: true }),
    periodEnd: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    /**
     * The nullable `org_id` and `application_id` cost the invariant that
     * a payment names something; this restores it. A subscription names
     * an agency and no application, a client payment names an
     * application and no agency, and there is no third shape.
     */
    check(
      "payment_shape_matches_kind",
      sql`(${t.kind} = 'agency_subscription' and ${t.orgId} is not null and ${t.applicationId} is null)
       or (${t.kind} = 'client_application' and ${t.applicationId} is not null and ${t.orgId} is null)`
    ),
    /**
     * Both of these are read on every gated request — the agency's on
     * every console page, the client's on every `/app` page. A missing
     * index on a read this hot has already cost this suite 450 seconds
     * once, on `applications.corridor_id`.
     */
    index("payments_org_idx").on(t.orgId, t.status),
    index("payments_application_idx").on(t.applicationId, t.status),
  ]
);

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: orgRoleEnum().notNull().default("reviewer"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })]
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    /**
     * The agency this invitation belongs to, and `null` on a
     * `platform_staff` invitation — BeOrchid is not a tenant and has no
     * row here. See `platform_invite_has_no_org` below.
     */
    orgId: uuid().references(() => organisations.id, { onDelete: "cascade" }),
    email: text().notNull(),
    fullName: text().notNull().default(""),
    kind: invitationKind().notNull().default("client"),
    /**
     * The BeOrchid rank this invitation grants, on a `platform_staff`
     * invitation and null on every other kind.
     *
     * Written by the owner who sends it, never chosen by the person
     * accepting. That is the whole containment on an invitation that can
     * mint an owner: the decision stays with somebody who already is
     * one, and the accepting account only ever gets what the row says.
     */
    staffRank: staffRole(),
    jobTitle: text(),
    destinationIso: text(),
    purpose: travelPurpose(),
    status: invitationStatus().notNull().default("pending"),
    token: text()
      .notNull()
      .unique()
      .default(sql`encode(gen_random_bytes(24), 'hex')`),
    invitedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    acceptedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    acceptedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 days'`),
  },
  (t) => [
    index("invitations_org_idx").on(t.orgId, t.status),
    /**
     * The nullable `org_id` costs the invariant that an invitation
     * belongs to a tenant. This restores it as a statement about the
     * three columns together: a platform invitation has no agency and a
     * rank, every other kind has an agency and no rank.
     */
    check(
      "platform_invite_has_no_org",
      sql`(${t.kind} = 'platform_staff' and ${t.orgId} is null and ${t.staffRank} is not null)
       or (${t.kind} <> 'platform_staff' and ${t.orgId} is not null and ${t.staffRank} is null)`
    ),
    /**
     * The ops roster's read. `invitations_org_idx` cannot serve it —
     * every platform row has a null `org_id`, and that index is led by
     * the column they are all null in.
     */
    index("invitations_platform_idx").on(t.status).where(sql`${t.orgId} is null`),
  ]
);

/**
 * A corridor is one nationality → one destination → one purpose. Rule
 * sets are versioned: when a mission changes what it wants, everyone on
 * that corridor sees the change with its effective date.
 */
export const corridors = pgTable(
  "corridors",
  {
    id: uuid().primaryKey().defaultRandom(),
    nationalityIso: text().notNull(),
    destinationIso: text().notNull(),
    purpose: travelPurpose().notNull(),
    visaName: text().notNull(),
    version: integer().notNull().default(1),
    effectiveFrom: date().notNull().default(sql`current_date`),
    sourceName: text(),
    sourceUrl: text(),
    /**
     * The official application form for this route, and what it is
     * called — "Form VAF1A", "DS-160", "IMM 1294".
     *
     * A link to the issuing authority's own copy, deliberately not a
     * file of ours. Mirroring a government PDF means serving whichever
     * version we last downloaded, and somebody submitting a superseded
     * form is refused for a reason nobody can see from the paperwork.
     * The freshness discipline is the same as `sourceUrl`'s: a person
     * reads it against the source and stamps `lastVerifiedAt`.
     *
     * Null where the route has no downloadable form — plenty are filled
     * in entirely online, and saying nothing is better than inventing a
     * link.
     */
    formName: text(),
    formUrl: text(),
    processingWeeksMin: integer(),
    processingWeeksMax: integer(),
    governmentFeeMinor: bigint({ mode: "number" }),
    governmentFeeCurrency: text().default("NGN"),
    isLive: boolean().notNull().default(true),
    /**
     * When a human last read this corridor against its source and said
     * it still holds.
     *
     * Deliberately not `effective_from`, which is when the *mission's*
     * rule took effect — a different fact, and the one that let a wrong
     * UK fee sit unnoticed for months because the corridor looked dated
     * rather than unchecked. Null means nobody has ever verified it.
     */
    lastVerifiedAt: timestamp({ withTimezone: true }),
    reviewState: corridorReviewState().notNull().default("approved"),
    approvedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    approvedAt: timestamp({ withTimezone: true }),
    /** Why an owner sent a draft back. Set only on `rejected`. */
    rejectReason: text(),
    /**
     * Digest of the source pages this version was read from, so the
     * re-check job can tell "the page moved" from "the page is the
     * same" without paying a model call for every corridor every week.
     */
    sourceHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("corridors_corridor_version_key").on(
      t.nationalityIso,
      t.destinationIso,
      t.purpose,
      t.version
    ),
  ]
);

export const corridorRequirements = pgTable(
  "corridor_requirements",
  {
    id: uuid().primaryKey().defaultRandom(),
    corridorId: uuid()
      .notNull()
      .references(() => corridors.id, { onDelete: "cascade" }),
    docKey: text().notNull(),
    name: text().notNull(),
    description: text(),
    category: text().notNull().default("identity"),
    isRequired: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    /**
     * The page this one requirement was read from, which is not always
     * the corridor's own source: a checklist comes from the visa centre
     * while the fee comes from the mission. A drafted requirement that
     * arrives without one is dropped rather than guessed.
     */
    sourceUrl: text(),
    /**
     * When this document applies, as clauses against the traveller's own
     * intake answers — `[{ answer: "companions", in: ["Partner"] }]`
     * reads "only if they said they are bringing a partner". Every
     * clause must match; an empty array is not a condition and is
     * rejected by `parseAppliesWhen`.
     *
     * Null means "no rule has been written for this one yet", which is
     * the state every conditional requirement starts in and is *not* the
     * same as "always applies". The distinction is the whole point: a
     * document with a rule can be stated or omitted with confidence,
     * while one without a rule can only be offered with a hedge — and
     * the hedge is what the 01/09 review asked us to get rid of, one
     * corridor at a time rather than by deleting it.
     *
     * Only meaningful on a row with `is_required = false`; a required
     * document applies to everyone by definition.
     */
    appliesWhen: jsonb(),
  },
  (t) => [unique("corridor_requirements_doc_key").on(t.corridorId, t.docKey)]
);

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    /**
     * The reference a traveller reads out on the phone. Display only —
     * nothing looks an application up by it, and access is decided on
     * the uuid by `@/lib/auth/guards`.
     *
     * Drawn from a sequence rather than `random()`. The previous
     * definition picked one of nine thousand values for a unique
     * column, which is a coin flip on a collision by the hundred and
     * twelfth application and a hard insert failure when it lands.
     */
    caseRef: text()
      .notNull()
      .unique()
      .default(sql`'TPL-' || lpad(nextval('case_ref_seq')::text, 6, '0')`),
    travelerId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /**
     * The agency the case belongs to. Mandatory: a traveller with no
     * agency has no reviewer, so the record is unservable rather than
     * merely unbilled.
     *
     * `restrict`, not `cascade` or `set null`. Removing an agency means
     * suspending it — a cascade would let a billing decision destroy a
     * live visa case, and a `set null` would recreate the orphan this
     * column exists to forbid.
     */
    orgId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    corridorId: uuid().references(() => corridors.id, { onDelete: "set null" }),
    status: applicationStatus().notNull().default("draft"),
    assigneeId: text().references(() => profiles.id, { onDelete: "set null" }),
    intakeComplete: boolean().notNull().default(false),
    submittedAt: timestamp({ withTimezone: true }),
    decidedAt: timestamp({ withTimezone: true }),
    slaDueAt: timestamp({ withTimezone: true }),
    /**
     * When the traveller's visa runs out, as they read it off their own
     * document after approval. Drives the renewal card and the expiry
     * reminders in `@/lib/domain/expiry`.
     *
     * `date`, not `timestamp`: this is a date printed on a document, with
     * no time and no zone, and storing an instant would invent both.
     *
     * Traveller-supplied and never derived. A corridor carries no
     * validity duration, so the only alternative would be calculating an
     * expiry from the approval date — a guess about somebody's legal
     * status, which is exactly what `renewalGuidance` refuses to make.
     * Null is the normal state: nobody is required to tell us.
     */
    visaExpiresOn: date(),
    /**
     * The instant this application first became billable — every
     * required document uploaded, which is the moment Peace's pricing
     * document calls "the application reaches done".
     *
     * Stamped once and never cleared, which is the entire reason it is a
     * column rather than something derived. Completion is not monotonic:
     * a reviewer flagging a document after the checklist was full drops
     * it back below 100%, and re-uploading fills it again. Read as live
     * state, that is a second sale of the same application; recorded as
     * an event, it is one. `markBillableIfComplete` sets it under
     * `where billable_at is null`, so concurrent document writes cannot
     * race a business into being charged twice.
     *
     * Null on an application with no `org_id` — a traveller who came
     * directly belongs to no business, so nobody is billed for them.
     */
    billableAt: timestamp({ withTimezone: true }),
    /**
     * The instant every required document had been collected — the
     * brief's "score reaches 100%", which items 9 and 11 want the review
     * desk told about.
     *
     * A column for the same reason `billable_at` is one, and set the
     * same way: completion is not monotonic, so read as live state a
     * flag-and-re-upload cycle is a second arrival at 100% and would be
     * a second email about one traveller. `markChecklistCompleteIfDone`
     * stamps it under `where checklist_complete_at is null`, so
     * concurrent uploads finishing together cannot race out two.
     *
     * Unlike `billable_at` it is stamped whether or not an organisation
     * sponsors the application: there is nobody to charge for a
     * traveller who came on their own, but there is still somebody to
     * review them.
     *
     * It is not the submission. A traveller can be at 100% collected and
     * never press Submit — that person is precisely who this exists to
     * make visible.
     */
    checklistCompleteAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * One application per traveller — the invariant every surface
     * already assumes. The layout and each page under it resolve "the
     * traveller's application" independently and concurrently, and
     * without this a first visit could create two, splitting the
     * intake's writes from the requirements screen's reads. Supporting
     * a second application later (history, a new trip) is schema work
     * anyway; until then the race must lose loudly.
     */
    unique("applications_traveler_key").on(t.travelerId),
    index("applications_org_idx").on(t.orgId),
    index("applications_status_idx").on(t.status, t.slaDueAt),
    /**
     * Not for a read — for the delete on the other end of the foreign
     * key. `corridor_id` is `on delete set null`, so without an index
     * Postgres scans the whole of `applications` for every corridor
     * deleted, and takes row locks while it does. That is how a fixture
     * tearing down one corridor timed out unrelated suites inserting
     * applications in parallel, which reads as a flaky test rather than
     * a missing index.
     *
     * It earns its keep on reads too: the advisory sweep joins
     * `applications` to `corridors` on it every night.
     */
    index("applications_corridor_idx").on(t.corridorId),
    /**
     * Same argument, different column. `assignee_id` points at
     * `profiles`, so removing a staff account scanned this table as
     * well — and the ops queue filters by assignee to answer "my cases".
     */
    index("applications_assignee_idx").on(t.assigneeId),
  ]
);

/**
 * The intake conversation, one row per answered topic. Answers stay
 * editable: re-answering supersedes and rebuilds the checklist.
 */
export const intakeAnswers = pgTable(
  "intake_answers",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    questionKey: text().notNull(),
    /** What the traveller actually said. This is what a reviewer reads. */
    value: text().notNull(),
    /**
     * `value` reduced to a canonical chip value by `normaliseAnswer`, or
     * null when it could not be.
     *
     * Conditional requirement rules match this, never `value`. Free text
     * is allowed on every question, so matching the raw answer meant a
     * traveller who wrote "my wife and our son" instead of tapping
     * *Partner and children* matched no rule and was resolved as a
     * certain no — the marriage certificate left their checklist and the
     * engine recorded that as certain rather than unknown.
     *
     * Null is a real and useful state: the rule cannot be evaluated for
     * this traveller, so the requirement stays hedged rather than being
     * hidden. Both columns are kept because they answer different
     * questions — what somebody said, and what the engine may act on.
     */
    code: text(),
    answeredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("intake_answers_question_key").on(t.applicationId, t.questionKey)]
);

/**
 * The privacy boundary in data form. Nothing an organisation can reach
 * exposes a row of this table — see `canReadDocuments` in
 * `src/lib/auth/policy.ts`, which is now the only thing enforcing it.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    docKey: text().notNull(),
    name: text().notNull(),
    /**
     * The guidance shown under the document's name on the upload
     * screen, copied from the rule set that asked for it.
     *
     * Copied rather than joined. The screen used to read this through
     * `applications.corridor_id`, which is null for any rule set with
     * no row of ours behind it — an API provider, or an application a
     * re-seed detached — and the traveller silently lost every line of
     * guidance. A checklist row must carry its own instructions.
     */
    description: text(),
    state: documentState().notNull().default("not_started"),
    storagePath: text(),
    /** The sentence the traveller reads. */
    reason: text(),
    /** The same refusal as a class, for whoever has to debug it later. */
    reasonCode: flagReason(),
    /**
     * Structured result of the AI pre-check that runs after upload; the
     * traveller-facing sentence goes in `reason`, this column keeps the
     * full verdict for the ops screen. AI never writes `verified`.
     */
    precheck: jsonb(),
    attempts: integer().notNull().default(0),
    isRequired: boolean().notNull().default(true),
    /**
     * Why this requirement is still a maybe, in the words the traveller
     * was asked — "Who is coming with you? — Partner or Partner and
     * children".
     *
     * Set only on a requirement whose rule exists but could not be
     * evaluated for this traveller, which is the one unresolved state
     * they can actually do something about. A requirement nobody has
     * written a rule for never reaches a checklist at all: that is
     * BeOrchid's unfinished curation and is raised on the agency side
     * instead. Null on everything decided.
     */
    condition: text(),
    sortOrder: integer().notNull().default(0),
    checkedAt: timestamp({ withTimezone: true }),
    verifiedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("documents_doc_key").on(t.applicationId, t.docKey),
    index("documents_application_idx").on(t.applicationId, t.state),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    senderId: text().references(() => profiles.id, { onDelete: "set null" }),
    senderRole: appRole().notNull(),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp({ withTimezone: true }),
  },
  (t) => [index("messages_application_idx").on(t.applicationId, t.createdAt)]
);

/**
 * Every status change carries a message to the traveller. Enforced in
 * the service layer and recorded here for the audit trail.
 */
export const statusEvents = pgTable("status_events", {
  id: uuid().primaryKey().defaultRandom(),
  applicationId: uuid()
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  fromStatus: applicationStatus(),
  toStatus: applicationStatus().notNull(),
  message: text(),
  actorId: text().references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Past international trips, one row each — the travel history a visa
 * form asks for. Keyed on the traveller rather than the application:
 * history belongs to the person and outlives any one case, which also
 * keeps it clear of the one-application-per-traveller constraint above.
 *
 * Country and purpose are the traveller's own words, stored verbatim
 * like intake answers — a trip can be to anywhere, for anything, and a
 * dropdown we curate would invent precision the form does not need.
 */
export const travelRecords = pgTable(
  "travel_records",
  {
    id: uuid().primaryKey().defaultRandom(),
    travelerId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    country: text().notNull(),
    purpose: text(),
    startedOn: date(),
    endedOn: date(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("travel_records_traveler_idx").on(t.travelerId, t.startedOn)]
);

/**
 * The review desk's running notes on a case: staff write them, the
 * traveller reads them read-only, sponsors never see them — the same
 * privacy boundary as `documents`, enforced by `canReadCaseNotes`.
 */
export const caseNotes = pgTable(
  "case_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    authorId: text().references(() => profiles.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("case_notes_application_idx").on(t.applicationId, t.createdAt)]
);

export const itineraries = pgTable("itineraries", {
  id: uuid().primaryKey().defaultRandom(),
  applicationId: uuid()
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "cascade" }),
  payload: jsonb().notNull().default({}),
  generatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per person per event — the in-app half of a notification; the
 * email half is sent by the same `notify()` call and recorded nowhere,
 * so this row is the source of truth for the bell, not a delivery log.
 * Invitations are deliberately NOT a kind — the invitee has no profiles
 * row.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    recipientId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: notificationKind().notNull(),
    applicationId: uuid().references(() => applications.id, { onDelete: "cascade" }),
    payload: jsonb().notNull().default({}),
    readAt: timestamp({ withTimezone: true }),
    /**
     * When this notification's email becomes owed, or null for nothing
     * pending — which covers both "already sent" and "never needed one".
     *
     * Most kinds email the moment `notify` runs and are written with
     * null here. Two do not: `document_flagged` and `message_received`
     * both fire while the traveller is plausibly still on the page that
     * caused them, so they are written due in fifteen minutes and the
     * email is sent only if nobody has looked by then. See
     * `emailDueFor`.
     *
     * Marking a notification read nulls this in the same UPDATE, which
     * is what cancels the email — there is no window between "they saw
     * it" and "so do not send", because it is one write. The sweep in
     * `api/cron/notification-emails` nulls it again after sending, so a
     * settled row is never reconsidered and the index below stays small
     * however many notifications accumulate.
     */
    emailDueAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.readAt, t.createdAt),
    index("notifications_email_due_idx").on(t.emailDueAt),
  ]
);

/**
 * Cached AI-generated companion content, regenerated when stale — one
 * row per application per kind.
 */
export const companionUpdates = pgTable(
  "companion_updates",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: text().notNull().default("local_tips"),
    payload: jsonb().notNull().default({}),
    generatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("companion_updates_kind_key").on(t.applicationId, t.kind)]
);

/**
 * One exchange rate, cached.
 *
 * A table rather than module state, for the reason `visa-warm` records
 * and defers: the rate has to be the same figure on every instance, and
 * it has to carry the moment it was fetched. Both matter here because
 * the figure is shown to a traveller beside a government fee — an
 * approximation with no date on it is the same failure as a checklist
 * with no date on it.
 *
 * `rate` is `numeric`, not a float: 1 GBP buys about 2,000 NGN, and
 * binary floating point rounds the last naira of a fee in a way that is
 * visible on the screen. The application does the arithmetic on the
 * string with `Number` only at the point of display.
 *
 * Only inverse-free pairs are stored — the base is whatever the
 * provider quotes against, and `convert` walks through it rather than
 * storing every pair both ways.
 */
export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** ISO 4217, uppercase, e.g. `USD`. */
    base: text().notNull(),
    quote: text().notNull(),
    /** Units of `quote` per one unit of `base`. */
    rate: text().notNull(),
    fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Which provider said so, for the same reason a corridor names its source. */
    source: text().notNull(),
  },
  (t) => [unique("fx_rates_pair").on(t.base, t.quote)]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorId: text().references(() => profiles.id, { onDelete: "set null" }),
    action: text().notNull(),
    subjectType: text().notNull(),
    subjectId: uuid(),
    meta: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_subject_idx").on(t.subjectType, t.subjectId, t.createdAt),
  ]
);

/**
 * Product analytics. Separate from `audit_log`, which answers "who
 * touched this application" for compliance and is read by staff; this
 * answers "how many people asked for a corridor we do not serve" and is
 * read by whoever prioritises the roadmap.
 *
 * Written to Postgres behind `track()` rather than to a vendor, because
 * no analytics vendor has been chosen. Adopting one later is a second
 * implementation behind the same function, not a change at every call
 * site.
 *
 * Plural per the BeOrchid table-naming convention. Do not copy the
 * `audit_log` singular above — AGENTS.md records it as a deviation to be
 * fixed, not a precedent.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    name: text().notNull(),
    userId: text().references(() => profiles.id, { onDelete: "set null" }),
    props: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_events_name_idx").on(t.name, t.createdAt)]
);

/**
 * A "Book a demo" submission from the landing page.
 *
 * The only table written by someone with no session. It referenced
 * nothing and nothing referenced it, and it still creates nobody: a
 * visitor here is a stranger, not yet a `profiles` row or an
 * `organisations` row, and pretending otherwise would mean creating an
 * account for someone who has only asked for a conversation.
 *
 * `preferred_at` and `preferred_tz` are one answer stored twice on
 * purpose. The instant is what sorts and compares; the zone is what
 * lets the notification say "14:00 WAT" instead of a UTC number the
 * reader has to convert in their head. Keeping only the instant loses
 * which hour the visitor actually meant.
 *
 * `status` and `converted_org_id` arrived with the ops surface that
 * changes them (`/ops/tenants`), which is the condition this comment
 * used to set for adding them. `converted_org_id` is the only reference
 * this table has ever held, and it points forward — at what an enquiry
 * became — rather than claiming the stranger who sent it was already
 * somebody here.
 */
export const demoRequests = pgTable("demo_requests", {
  id: uuid().primaryKey().defaultRandom(),
  fullName: text().notNull(),
  email: text().notNull(),
  companyName: text().notNull(),
  jobTitle: text().notNull(),
  preferredAt: timestamp({ withTimezone: true }).notNull(),
  preferredTz: text().notNull(),
  /** Which language the form was read in — what to run the demo in. */
  locale: text().notNull(),
  status: demoRequestStatus().notNull().default("new"),
  /**
   * The agency this enquiry became, when it became one.
   *
   * `set null` rather than `cascade`: an organisation is never deleted
   * in this product, and if one ever were, losing the record that the
   * demo happened is worse than a dangling null.
   */
  convertedOrgId: uuid().references(() => organisations.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Everything an employer is allowed to see about a sponsored
 * application, and nothing more. Created in
 * `src/lib/db/sql-objects.sql`; declared here as `.existing()` so the
 * employer console can query it typed without Drizzle Kit trying to
 * generate a `CREATE VIEW` for it.
 *
 * Column names are written out rather than left to the snake_case
 * mapping, because the SQL file is the definition and this has to match
 * it exactly. Adding a column here that reveals a document would break
 * the promise made on the marketing site and in the console.
 */
export const orgApplicationProgress = pgView("org_application_progress", {
  id: uuid("id").notNull(),
  caseRef: text("case_ref").notNull(),
  orgId: uuid("org_id"),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  status: applicationStatus("status").notNull(),
  destinationIso: text("destination_iso"),
  visaName: text("visa_name"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  documentsTotal: integer("documents_total"),
  documentsVerified: integer("documents_verified"),
  completionPct: integer("completion_pct"),
}).existing();

export type Profile = typeof profiles.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Corridor = typeof corridors.$inferSelect;
export type TravelRecord = typeof travelRecords.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CaseNote = typeof caseNotes.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type CompanionUpdate = typeof companionUpdates.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type DemoRequest = typeof demoRequests.$inferSelect;
export type DemoRequestStatus = (typeof demoRequestStatus.enumValues)[number];

export type FlagReason = (typeof flagReason.enumValues)[number];
