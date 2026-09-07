import { describe, expect, it } from "vitest";

import {
  type Actor,
  type ApplicationRef,
  canManageInvitations,
  canReadApplication,
  canReadAuditLog,
  canReadCaseNotes,
  canReadCompanion,
  canReadDocuments,
  canReadIntakeAnswers,
  canReadItinerary,
  canReadMessages,
  canAssignCase,
  canReadStatusEvents,
  canWriteApplication,
  canWriteCaseNotes,
  canWriteCorridors,
  canWriteDocuments,
  canWriteIntakeAnswers,
  canWriteMessages,
  canWriteVisaExpiry,
  handlesCase,
  isAgencyDirectorFor,
  isAgencyFor,
  isOrgMemberOf,
  isOwner,
  isStaff,
  ownsApplication,
} from "@/lib/auth/policy";

const ORG = "org-1";
const OTHER_ORG = "org-2";

const traveller: Actor = {
  userId: "user-traveller",
  role: "traveler",
  staffRole: null,
  orgIds: [],
  orgs: [],
};

const otherTraveller: Actor = {
  userId: "user-other",
  role: "traveler",
  staffRole: null,
  orgIds: [],
  orgs: [],
};

/** The tenant. Reviews documents, decides the case, talks to the traveller. */
const agencyReviewer: Actor = {
  userId: "user-agency",
  role: "org_member",
  staffRole: null,
  orgIds: [ORG],
  orgs: [{ orgId: ORG, role: "reviewer" }],
};

/** A second pair of hands at the same agency. */
const otherReviewer: Actor = { ...agencyReviewer, userId: "user-colleague" };

/** The person who created the agency. Not narrowed by who holds a case. */
const agencyDirector: Actor = {
  ...agencyReviewer,
  userId: "user-director",
  orgs: [{ orgId: ORG, role: "owner" }],
};

/** A different tenant. Sees nothing of ORG's travellers. */
const otherAgency: Actor = {
  ...agencyReviewer,
  userId: "user-rival",
  orgIds: [OTHER_ORG],
  orgs: [{ orgId: OTHER_ORG, role: "owner" }],
};

/**
 * BeOrchid. Provisions tenants, curates routes, reads the audit log —
 * and reaches no traveller's case at all.
 */
const platformStaff: Actor = {
  userId: "user-staff",
  role: "staff",
  staffRole: "reviewer",
  orgIds: [],
  orgs: [],
};

const platformOwner: Actor = { ...platformStaff, userId: "user-owner", staffRole: "owner" };

/** A case belonging to ORG's traveller — the only shape that exists once
 *  `applications.org_id` is `not null`. */
/**
 * A case belonging to ORG's traveller, handed to `agencyReviewer`.
 *
 * Assigned rather than unheld, because since 2026-09-07 an unheld case
 * is nobody's but the director's — so "the agency" in the boundary
 * tests below has to be the colleague who was actually given the
 * client, which is what the product means by it.
 */
const tenantCase: ApplicationRef = {
  id: "app-1",
  travelerId: "user-traveller",
  orgId: ORG,
  assigneeId: agencyReviewer.userId,
};

/** The same case, named for what the assignment tests are about. */
const claimedCase: ApplicationRef = tenantCase;

/** One nobody has taken yet. */
const unheldCase: ApplicationRef = { ...tenantCase, id: "app-3", assigneeId: null };

/**
 * A case with no agency. Unreachable in the new model and slated for
 * deletion, but the type still admits one, so the policies must say what
 * happens: nobody but its own traveller.
 */
const unassignedCase: ApplicationRef = {
  id: "app-2",
  travelerId: "user-traveller",
  orgId: null,
  assigneeId: null,
};

describe("role predicates", () => {
  it("recognises platform staff", () => {
    expect(isStaff(platformStaff)).toBe(true);
    expect(isStaff(platformOwner)).toBe(true);
    expect(isStaff(traveller)).toBe(false);
    expect(isStaff(agencyReviewer)).toBe(false);
  });

  it("recognises platform owners, who are a subset of staff", () => {
    expect(isOwner(platformOwner)).toBe(true);
    expect(isOwner(platformStaff)).toBe(false);
    expect(isOwner(traveller)).toBe(false);
  });

  it("does not treat a non-staff actor claiming a staff role as staff", () => {
    const forged: Actor = { ...traveller, staffRole: "owner" };
    expect(isStaff(forged)).toBe(false);
    expect(isOwner(forged)).toBe(false);
  });
});

describe("tenancy", () => {
  it("matches the traveller who owns the application", () => {
    expect(ownsApplication(traveller, tenantCase)).toBe(true);
    expect(ownsApplication(otherTraveller, tenantCase)).toBe(false);
  });

  it("matches the agency the application belongs to", () => {
    expect(isAgencyFor(agencyReviewer, tenantCase)).toBe(true);
  });

  it("does not match a different agency", () => {
    expect(isAgencyFor(otherAgency, tenantCase)).toBe(false);
  });

  it("does not match a case that has no agency", () => {
    expect(isAgencyFor(agencyReviewer, unassignedCase)).toBe(false);
  });

  it("is never satisfied by platform staff", () => {
    expect(isAgencyFor(platformStaff, tenantCase)).toBe(false);
    expect(isAgencyFor(platformOwner, tenantCase)).toBe(false);
  });

  it("does not let a traveller forge an agency membership", () => {
    const forged: Actor = {
      ...otherTraveller,
      orgIds: [ORG],
      orgs: [{ orgId: ORG, role: "owner" }],
    };
    expect(isAgencyFor(forged, tenantCase)).toBe(false);
    expect(handlesCase(forged, tenantCase)).toBe(false);
    expect(isAgencyDirectorFor(forged, tenantCase)).toBe(false);
  });
});

/**
 * Assignment is a permission, not a label.
 *
 * The rule the console is built on: an unclaimed case is the agency's,
 * a claimed one is the assignee's and the director's. These tests are
 * the reason the rule can be changed later with any confidence — the
 * failure mode being guarded against is silent over-granting, which no
 * screen would ever show you.
 */
describe("assignment as a permission", () => {
  it("keeps an unheld case shut to everyone but the director", () => {
    // The 2026-09-07 correction. A reviewer reaches a client by being
    // given the client — working at the agency is not enough.
    expect(handlesCase(agencyReviewer, unheldCase)).toBe(false);
    expect(handlesCase(otherReviewer, unheldCase)).toBe(false);
    expect(handlesCase(agencyDirector, unheldCase)).toBe(true);
  });

  it("still lets any colleague take an unheld case", () => {
    // Taking is a write to `assignee_id`, not a read of the file. This
    // is the whole of how a reviewer gets work without the director.
    expect(canAssignCase(agencyReviewer, unheldCase)).toBe(true);
    expect(canAssignCase(otherReviewer, unheldCase)).toBe(true);
  });

  it("refuses a colleague the case they have not been given", () => {
    // Taking is not reading: the same actor who may claim this case
    // cannot open a document on it until the claim has landed.
    expect(canReadDocuments(agencyReviewer, unheldCase)).toBe(false);
    expect(canWriteMessages(agencyReviewer, unheldCase)).toBe(false);
  });

  it("lets a colleague hand back their own case, and nobody else's", () => {
    expect(canAssignCase(agencyReviewer, claimedCase)).toBe(true);
    expect(canAssignCase(otherReviewer, claimedCase)).toBe(false);
    expect(canAssignCase(agencyDirector, claimedCase)).toBe(true);
  });

  it("never lets a rival agency take a case", () => {
    expect(canAssignCase(otherAgency, unheldCase)).toBe(false);
    expect(canAssignCase(platformStaff, unheldCase)).toBe(false);
  });

  it("keeps a claimed case to the colleague holding it", () => {
    expect(handlesCase(agencyReviewer, claimedCase)).toBe(true);
    expect(handlesCase(otherReviewer, claimedCase)).toBe(false);
  });

  it("never narrows the director out of their own agency's case", () => {
    expect(handlesCase(agencyDirector, claimedCase)).toBe(true);
    expect(isAgencyDirectorFor(agencyDirector, claimedCase)).toBe(true);
    expect(isAgencyDirectorFor(agencyReviewer, claimedCase)).toBe(false);
  });

  it("does not let a rival agency's director in on rank alone", () => {
    // `otherAgency` is an owner — of somewhere else. Rank is read for
    // the case's own agency or not at all.
    expect(isAgencyDirectorFor(otherAgency, unheldCase)).toBe(false);
    expect(handlesCase(otherAgency, unheldCase)).toBe(false);
    expect(handlesCase(otherAgency, claimedCase)).toBe(false);
  });

  it("gives the director the unheld case the reviewer cannot open", () => {
    expect(canReadDocuments(agencyDirector, unheldCase)).toBe(true);
    expect(canReadDocuments(agencyReviewer, unheldCase)).toBe(false);
  });

  it("gives platform staff nothing either way", () => {
    expect(handlesCase(platformStaff, tenantCase)).toBe(false);
    expect(handlesCase(platformOwner, claimedCase)).toBe(false);
  });

  it("carries the narrowing into every case-content policy", () => {
    // The point of the rule: a colleague who is not on this case cannot
    // read the documents, the thread, or the notes about them.
    expect(canReadDocuments(otherReviewer, claimedCase)).toBe(false);
    expect(canWriteDocuments(otherReviewer, claimedCase)).toBe(false);
    expect(canReadMessages(otherReviewer, claimedCase)).toBe(false);
    expect(canWriteMessages(otherReviewer, claimedCase)).toBe(false);
    expect(canReadCaseNotes(otherReviewer, claimedCase)).toBe(false);
    expect(canWriteCaseNotes(otherReviewer, claimedCase)).toBe(false);
    expect(canWriteApplication(otherReviewer, claimedCase)).toBe(false);
  });

  it("never narrows the traveller out of their own case", () => {
    // Assignment moves between colleagues. It says nothing about the
    // person whose passport it is.
    expect(canReadDocuments(traveller, claimedCase)).toBe(true);
    expect(canWriteDocuments(traveller, claimedCase)).toBe(true);
    expect(canWriteMessages(traveller, claimedCase)).toBe(true);
  });
});

describe("application access", () => {
  it("lets the traveller read and write their own", () => {
    expect(canReadApplication(traveller, tenantCase)).toBe(true);
    expect(canWriteApplication(traveller, tenantCase)).toBe(true);
  });

  it("lets the agency read and decide its own traveller's case", () => {
    expect(canReadApplication(agencyReviewer, tenantCase)).toBe(true);
    expect(canWriteApplication(agencyReviewer, tenantCase)).toBe(true);
  });

  it("denies another traveller entirely", () => {
    expect(canReadApplication(otherTraveller, tenantCase)).toBe(false);
    expect(canWriteApplication(otherTraveller, tenantCase)).toBe(false);
  });

  it("denies a different agency entirely", () => {
    expect(canReadApplication(otherAgency, tenantCase)).toBe(false);
    expect(canWriteApplication(otherAgency, tenantCase)).toBe(false);
  });

  it("denies platform staff — BeOrchid has no case surface", () => {
    expect(canReadApplication(platformStaff, tenantCase)).toBe(false);
    expect(canWriteApplication(platformStaff, tenantCase)).toBe(false);
    expect(canReadApplication(platformOwner, tenantCase)).toBe(false);
  });
});

/**
 * The privacy boundary, inverted from where it used to sit. The agency
 * is the reviewer; BeOrchid is the landlord and reaches nothing.
 */
describe("the document privacy boundary", () => {
  it("lets the traveller read and write their own documents", () => {
    expect(canReadDocuments(traveller, tenantCase)).toBe(true);
    expect(canWriteDocuments(traveller, tenantCase)).toBe(true);
  });

  it("lets the agency read and review its traveller's documents", () => {
    expect(canReadDocuments(agencyReviewer, tenantCase)).toBe(true);
    expect(canWriteDocuments(agencyReviewer, tenantCase)).toBe(true);
  });

  // The product claim: no one at BeOrchid can open your clients'
  // documents. Not narrowed to an audited exception — removed.
  it("never lets platform staff read documents", () => {
    expect(canReadDocuments(platformStaff, tenantCase)).toBe(false);
    expect(canReadDocuments(platformOwner, tenantCase)).toBe(false);
  });

  it("never lets platform staff write documents", () => {
    expect(canWriteDocuments(platformStaff, tenantCase)).toBe(false);
    expect(canWriteDocuments(platformOwner, tenantCase)).toBe(false);
  });

  it("never lets a different agency reach them", () => {
    expect(canReadDocuments(otherAgency, tenantCase)).toBe(false);
    expect(canWriteDocuments(otherAgency, tenantCase)).toBe(false);
  });

  it("denies documents to an unrelated traveller", () => {
    expect(canReadDocuments(otherTraveller, tenantCase)).toBe(false);
    expect(canWriteDocuments(otherTraveller, tenantCase)).toBe(false);
  });

  it("leaves a case with no agency readable only by its traveller", () => {
    expect(canReadDocuments(traveller, unassignedCase)).toBe(true);
    expect(canReadDocuments(agencyReviewer, unassignedCase)).toBe(false);
    expect(canReadDocuments(platformStaff, unassignedCase)).toBe(false);
  });
});

describe("intake answers", () => {
  it("lets the traveller manage their own answers", () => {
    expect(canReadIntakeAnswers(traveller, tenantCase)).toBe(true);
    expect(canWriteIntakeAnswers(traveller, tenantCase)).toBe(true);
  });

  it("lets the agency read answers but never author them", () => {
    expect(canReadIntakeAnswers(agencyReviewer, tenantCase)).toBe(true);
    expect(canWriteIntakeAnswers(agencyReviewer, tenantCase)).toBe(false);
  });

  it("hides answers from platform staff", () => {
    expect(canReadIntakeAnswers(platformStaff, tenantCase)).toBe(false);
    expect(canWriteIntakeAnswers(platformStaff, tenantCase)).toBe(false);
  });

  it("hides answers from a different agency", () => {
    expect(canReadIntakeAnswers(otherAgency, tenantCase)).toBe(false);
  });
});

describe("status events", () => {
  it("is readable by the traveller and their agency", () => {
    expect(canReadStatusEvents(traveller, tenantCase)).toBe(true);
    expect(canReadStatusEvents(agencyReviewer, tenantCase)).toBe(true);
  });

  it("is hidden from platform staff and unrelated parties", () => {
    expect(canReadStatusEvents(platformStaff, tenantCase)).toBe(false);
    expect(canReadStatusEvents(otherAgency, tenantCase)).toBe(false);
    expect(canReadStatusEvents(otherTraveller, tenantCase)).toBe(false);
  });
});

describe("case notes", () => {
  it("lets the agency write notes and the traveller read them", () => {
    expect(canWriteCaseNotes(agencyReviewer, tenantCase)).toBe(true);
    expect(canReadCaseNotes(agencyReviewer, tenantCase)).toBe(true);
    expect(canReadCaseNotes(traveller, tenantCase)).toBe(true);
  });

  it("never lets the traveller author a note on their own case", () => {
    expect(canWriteCaseNotes(traveller, tenantCase)).toBe(false);
  });

  it("hides notes from platform staff entirely", () => {
    expect(canReadCaseNotes(platformStaff, tenantCase)).toBe(false);
    expect(canWriteCaseNotes(platformStaff, tenantCase)).toBe(false);
  });

  it("hides notes from a different agency entirely", () => {
    expect(canReadCaseNotes(otherAgency, tenantCase)).toBe(false);
    expect(canWriteCaseNotes(otherAgency, tenantCase)).toBe(false);
  });

  it("denies notes to an unrelated traveller", () => {
    expect(canReadCaseNotes(otherTraveller, tenantCase)).toBe(false);
  });
});

describe("itineraries", () => {
  it("is readable by the traveller who owns it and by their agency", () => {
    expect(canReadItinerary(traveller, tenantCase)).toBe(true);
    expect(canReadItinerary(agencyReviewer, tenantCase)).toBe(true);
  });

  it("is hidden from platform staff, other agencies and other travellers", () => {
    expect(canReadItinerary(platformStaff, tenantCase)).toBe(false);
    expect(canReadItinerary(otherAgency, tenantCase)).toBe(false);
    expect(canReadItinerary(otherTraveller, tenantCase)).toBe(false);
  });
});

describe("companion", () => {
  it("is readable by the traveller who owns it and by their agency", () => {
    expect(canReadCompanion(traveller, tenantCase)).toBe(true);
    expect(canReadCompanion(agencyReviewer, tenantCase)).toBe(true);
  });

  it("is hidden from platform staff, other agencies and other travellers", () => {
    expect(canReadCompanion(platformStaff, tenantCase)).toBe(false);
    expect(canReadCompanion(otherAgency, tenantCase)).toBe(false);
    expect(canReadCompanion(otherTraveller, tenantCase)).toBe(false);
  });
});

describe("visa expiry", () => {
  it("is writable only by the traveller whose visa it is", () => {
    expect(canWriteVisaExpiry(traveller, tenantCase)).toBe(true);
  });

  // Deliberately narrower than every other write on a case. Letting
  // somebody else type a date into a person's legal status is the
  // invented-expiry problem `renewalGuidance` exists to refuse.
  it("is not writable by the agency, however much of the case it runs", () => {
    expect(canWriteVisaExpiry(agencyReviewer, tenantCase)).toBe(false);
  });

  it("is not writable by platform staff or an unrelated traveller", () => {
    expect(canWriteVisaExpiry(platformStaff, tenantCase)).toBe(false);
    expect(canWriteVisaExpiry(otherTraveller, tenantCase)).toBe(false);
  });
});

describe("messages", () => {
  it("lets the traveller read and write their own thread", () => {
    expect(canReadMessages(traveller, tenantCase)).toBe(true);
    expect(canWriteMessages(traveller, tenantCase)).toBe(true);
  });

  it("lets the agency read and write its traveller's thread", () => {
    expect(canReadMessages(agencyReviewer, tenantCase)).toBe(true);
    expect(canWriteMessages(agencyReviewer, tenantCase)).toBe(true);
  });

  it("keeps platform staff out of the conversation entirely", () => {
    expect(canReadMessages(platformStaff, tenantCase)).toBe(false);
    expect(canWriteMessages(platformStaff, tenantCase)).toBe(false);
  });

  it("keeps a different agency out of the conversation entirely", () => {
    expect(canReadMessages(otherAgency, tenantCase)).toBe(false);
    expect(canWriteMessages(otherAgency, tenantCase)).toBe(false);
  });

  it("denies an unrelated traveller both ways", () => {
    expect(canReadMessages(otherTraveller, tenantCase)).toBe(false);
    expect(canWriteMessages(otherTraveller, tenantCase)).toBe(false);
  });

  it("does not let a forged staff role read or write someone else's thread", () => {
    const forged: Actor = { ...otherTraveller, staffRole: "owner" };
    expect(canReadMessages(forged, tenantCase)).toBe(false);
    expect(canWriteMessages(forged, tenantCase)).toBe(false);
  });

  /**
   * The thread waits for a handler. Both sides wait together: a
   * traveller writing into a case nobody holds is the same silence as
   * an agency writing into one, only from the other end.
   */
  it("lets nobody write while the case is unheld", () => {
    expect(canWriteMessages(traveller, unheldCase)).toBe(false);
    expect(canWriteMessages(agencyReviewer, unheldCase)).toBe(false);
    expect(canWriteMessages(agencyDirector, unheldCase)).toBe(false);
  });

  /**
   * Reading is not gated on a handler: the thread is the record, and
   * messages written before this rule existed stay readable.
   *
   * "Readable" is still `handlesCase`, though, which since 2026-09-07
   * no longer opens an unclaimed case to the whole agency — so on an
   * unheld case that means the traveller and the director, and not a
   * reviewer who has not been given the client.
   */
  it("still lets the traveller and the director read an unheld thread", () => {
    expect(canReadMessages(traveller, unheldCase)).toBe(true);
    expect(canReadMessages(agencyDirector, unheldCase)).toBe(true);
    expect(canReadMessages(agencyReviewer, unheldCase)).toBe(false);
  });

  it("opens writing to both sides the moment somebody takes the case", () => {
    expect(canWriteMessages(traveller, claimedCase)).toBe(true);
    expect(canWriteMessages(agencyReviewer, claimedCase)).toBe(true);
  });
});

/**
 * What is left on the platform side: route curation and the audit log.
 * These are the only policies where `isStaff` still appears.
 */
describe("reference data and audit", () => {
  it("lets only platform owners write corridors", () => {
    expect(canWriteCorridors(platformOwner)).toBe(true);
    expect(canWriteCorridors(platformStaff)).toBe(false);
    expect(canWriteCorridors(agencyReviewer)).toBe(false);
    expect(canWriteCorridors(traveller)).toBe(false);
  });

  it("lets only platform staff read the audit log", () => {
    expect(canReadAuditLog(platformStaff)).toBe(true);
    expect(canReadAuditLog(platformOwner)).toBe(true);
    expect(canReadAuditLog(agencyReviewer)).toBe(false);
    expect(canReadAuditLog(traveller)).toBe(false);
  });
});

describe("invitations", () => {
  it("lets an agency member manage invitations for their own agency", () => {
    expect(isOrgMemberOf(agencyReviewer, ORG)).toBe(true);
    expect(canManageInvitations(agencyReviewer, ORG)).toBe(true);
  });

  it("denies an agency member managing another agency's invitations", () => {
    expect(isOrgMemberOf(agencyReviewer, OTHER_ORG)).toBe(false);
    expect(canManageInvitations(agencyReviewer, OTHER_ORG)).toBe(false);
  });

  it("denies a traveller and platform staff, org-scoped or not", () => {
    expect(canManageInvitations(traveller, ORG)).toBe(false);
    expect(canManageInvitations(platformStaff, ORG)).toBe(false);
    expect(canManageInvitations(platformOwner, ORG)).toBe(false);
  });

  it("does not let a forged org_member role manage an org it does not belong to", () => {
    const forged: Actor = { ...traveller, role: "org_member" };
    expect(canManageInvitations(forged, ORG)).toBe(false);
  });
});
