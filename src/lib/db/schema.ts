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
export const orgRoleEnum = pgEnum("org_role", ["hr_admin", "owner"]);

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

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

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
    check("locale_supported", sql`${t.locale} in ('en', 'ha', 'yo', 'ig')`),
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
  currency: text().notNull().default("USD"),
  bands: jsonb().notNull(),
  effectiveFrom: timestamp({ withTimezone: true }).notNull().defaultNow(),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: orgRoleEnum().notNull().default("hr_admin"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })]
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    email: text().notNull(),
    fullName: text().notNull().default(""),
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
  (t) => [index("invitations_org_idx").on(t.orgId, t.status)]
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
    orgId: uuid().references(() => organisations.id, { onDelete: "set null" }),
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
    value: text().notNull(),
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
    reason: text(),
    /**
     * Structured result of the AI pre-check that runs after upload; the
     * traveller-facing sentence goes in `reason`, this column keeps the
     * full verdict for the ops screen. AI never writes `verified`.
     */
    precheck: jsonb(),
    attempts: integer().notNull().default(0),
    isRequired: boolean().notNull().default(true),
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
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.readAt, t.createdAt),
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
