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
  canReadStatusEvents,
  canWriteApplication,
  canWriteCaseNotes,
  canWriteCorridors,
  canWriteDocuments,
  canWriteIntakeAnswers,
  canWriteMessages,
  canWriteVisaExpiry,
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
};

const otherTraveller: Actor = {
  userId: "user-other",
  role: "traveler",
  staffRole: null,
  orgIds: [],
};

/** The tenant. Reviews documents, decides the case, talks to the traveller. */
const agencyReviewer: Actor = {
  userId: "user-agency",
  role: "org_member",
  staffRole: null,
  orgIds: [ORG],
};

/** A different tenant. Sees nothing of ORG's travellers. */
const otherAgency: Actor = { ...agencyReviewer, userId: "user-rival", orgIds: [OTHER_ORG] };

/**
 * BeOrchid. Provisions tenants, curates routes, reads the audit log —
 * and reaches no traveller's case at all.
 */
const platformStaff: Actor = {
  userId: "user-staff",
  role: "staff",
  staffRole: "reviewer",
  orgIds: [],
};

const platformOwner: Actor = { ...platformStaff, userId: "user-owner", staffRole: "owner" };

/** A case belonging to ORG's traveller — the only shape that exists once
 *  `applications.org_id` is `not null`. */
const tenantCase: ApplicationRef = {
  id: "app-1",
  travelerId: "user-traveller",
  orgId: ORG,
};

/**
 * A case with no agency. Unreachable in the new model and slated for
 * deletion, but the type still admits one, so the policies must say what
 * happens: nobody but its own traveller.
 */
const unassignedCase: ApplicationRef = {
  id: "app-2",
  travelerId: "user-traveller",
  orgId: null,
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
    const forged: Actor = { ...otherTraveller, orgIds: [ORG] };
    expect(isAgencyFor(forged, tenantCase)).toBe(false);
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
