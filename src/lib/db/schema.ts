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

export const travelPurpose = pgEnum("travel_purpose", [
  "tourism",
  "work",
  "study",
  "medical",
  "relocation",
]);

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
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
    locale: text().notNull().default("en"),
    role: appRole().notNull().default("traveler"),
    staffRole: staffRole(),
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
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_traveler_idx").on(t.travelerId),
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
    state: documentState().notNull().default("not_started"),
    storagePath: text(),
    reason: text(),
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

export const itineraries = pgTable("itineraries", {
  id: uuid().primaryKey().defaultRandom(),
  applicationId: uuid()
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "cascade" }),
  payload: jsonb().notNull().default({}),
  generatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

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

export type Profile = typeof profiles.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Corridor = typeof corridors.$inferSelect;
