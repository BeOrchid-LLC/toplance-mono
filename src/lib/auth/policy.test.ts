import { describe, expect, it } from "vitest";

import {
  type Actor,
  type ApplicationRef,
  canReadApplication,
  canReadAuditLog,
  canReadCaseNotes,
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
  isOwner,
  isStaff,
  ownsApplication,
  sponsorsApplication,
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

const hrAdmin: Actor = {
  userId: "user-hr",
  role: "org_member",
  staffRole: null,
  orgIds: [ORG],
};

const reviewer: Actor = {
  userId: "user-reviewer",
  role: "staff",
  staffRole: "reviewer",
  orgIds: [],
};

const owner: Actor = {
  userId: "user-owner",
  role: "staff",
  staffRole: "owner",
  orgIds: [],
};

/** A sponsored application: belongs to `traveller`, paid for by ORG. */
const sponsored: ApplicationRef = {
  id: "app-1",
  travelerId: "user-traveller",
  orgId: ORG,
};

/** The same traveller, applying privately. */
const selfFunded: ApplicationRef = {
  id: "app-2",
  travelerId: "user-traveller",
  orgId: null,
};

describe("role predicates", () => {
  it("recognises staff", () => {
    expect(isStaff(reviewer)).toBe(true);
    expect(isStaff(owner)).toBe(true);
    expect(isStaff(traveller)).toBe(false);
    expect(isStaff(hrAdmin)).toBe(false);
  });

  it("recognises owners, who are a subset of staff", () => {
    expect(isOwner(owner)).toBe(true);
    expect(isOwner(reviewer)).toBe(false);
    expect(isOwner(traveller)).toBe(false);
  });

  it("does not treat a non-staff actor claiming a staff role as staff", () => {
    const forged: Actor = { ...traveller, staffRole: "owner" };
    expect(isStaff(forged)).toBe(false);
    expect(isOwner(forged)).toBe(false);
  });
});

describe("ownership and sponsorship", () => {
  it("matches the traveller who owns the application", () => {
    expect(ownsApplication(traveller, sponsored)).toBe(true);
    expect(ownsApplication(otherTraveller, sponsored)).toBe(false);
  });

  it("matches an org the application is sponsored by", () => {
    expect(sponsorsApplication(hrAdmin, sponsored)).toBe(true);
  });

  it("does not match an org member from a different org", () => {
    const otherOrg: Actor = { ...hrAdmin, orgIds: [OTHER_ORG] };
    expect(sponsorsApplication(otherOrg, sponsored)).toBe(false);
  });

  it("never sponsors an application with no org", () => {
    expect(sponsorsApplication(hrAdmin, selfFunded)).toBe(false);
  });
});

describe("application access", () => {
  it("lets the traveller read and write their own", () => {
    expect(canReadApplication(traveller, sponsored)).toBe(true);
    expect(canWriteApplication(traveller, sponsored)).toBe(true);
  });

  it("denies another traveller entirely", () => {
    expect(canReadApplication(otherTraveller, sponsored)).toBe(false);
    expect(canWriteApplication(otherTraveller, sponsored)).toBe(false);
  });

  it("lets a sponsoring org read but never write", () => {
    expect(canReadApplication(hrAdmin, sponsored)).toBe(true);
    expect(canWriteApplication(hrAdmin, sponsored)).toBe(false);
  });

  it("lets staff read and write any application", () => {
    expect(canReadApplication(reviewer, sponsored)).toBe(true);
    expect(canWriteApplication(reviewer, sponsored)).toBe(true);
    expect(canReadApplication(reviewer, selfFunded)).toBe(true);
  });
});

describe("the document privacy boundary", () => {
  it("lets the traveller read and write their own documents", () => {
    expect(canReadDocuments(traveller, sponsored)).toBe(true);
    expect(canWriteDocuments(traveller, sponsored)).toBe(true);
  });

  it("lets staff read and review documents", () => {
    expect(canReadDocuments(reviewer, sponsored)).toBe(true);
    expect(canWriteDocuments(reviewer, sponsored)).toBe(true);
  });

  // The promise made on the marketing site and in the employer console:
  // an organisation sees progress, never a passport. Sponsoring the
  // application does not soften it.
  it("never lets a sponsoring org read documents", () => {
    expect(canReadDocuments(hrAdmin, sponsored)).toBe(false);
  });

  it("never lets a sponsoring org write documents", () => {
    expect(canWriteDocuments(hrAdmin, sponsored)).toBe(false);
  });

  it("denies documents to an unrelated traveller", () => {
    expect(canReadDocuments(otherTraveller, sponsored)).toBe(false);
    expect(canWriteDocuments(otherTraveller, sponsored)).toBe(false);
  });
});

describe("intake answers", () => {
  it("lets the traveller manage their own answers", () => {
    expect(canReadIntakeAnswers(traveller, sponsored)).toBe(true);
    expect(canWriteIntakeAnswers(traveller, sponsored)).toBe(true);
  });

  it("lets staff read answers but not author them", () => {
    expect(canReadIntakeAnswers(reviewer, sponsored)).toBe(true);
    expect(canWriteIntakeAnswers(reviewer, sponsored)).toBe(false);
  });

  it("hides answers from a sponsoring org", () => {
    expect(canReadIntakeAnswers(hrAdmin, sponsored)).toBe(false);
    expect(canWriteIntakeAnswers(hrAdmin, sponsored)).toBe(false);
  });
});

describe("status events", () => {
  it("is readable by traveller, sponsoring org and staff", () => {
    expect(canReadStatusEvents(traveller, sponsored)).toBe(true);
    expect(canReadStatusEvents(hrAdmin, sponsored)).toBe(true);
    expect(canReadStatusEvents(reviewer, sponsored)).toBe(true);
  });

  it("is hidden from an unrelated traveller", () => {
    expect(canReadStatusEvents(otherTraveller, sponsored)).toBe(false);
  });
});

describe("case notes", () => {
  it("lets staff write notes and the traveller read them", () => {
    expect(canWriteCaseNotes(reviewer, sponsored)).toBe(true);
    expect(canReadCaseNotes(traveller, sponsored)).toBe(true);
    expect(canReadCaseNotes(reviewer, sponsored)).toBe(true);
  });

  it("never lets the traveller author a note on their own case", () => {
    expect(canWriteCaseNotes(traveller, sponsored)).toBe(false);
    expect(canWriteCaseNotes(traveller, selfFunded)).toBe(false);
  });

  // Notes discuss documents, so they sit behind the same privacy
  // boundary: an organisation sees progress, never the review desk.
  it("hides notes from a sponsoring org entirely", () => {
    expect(canReadCaseNotes(hrAdmin, sponsored)).toBe(false);
    expect(canWriteCaseNotes(hrAdmin, sponsored)).toBe(false);
  });

  it("denies notes to an unrelated traveller", () => {
    expect(canReadCaseNotes(otherTraveller, sponsored)).toBe(false);
  });
});

describe("itineraries", () => {
  it("is readable by the traveller who owns it and by staff", () => {
    expect(canReadItinerary(traveller, sponsored)).toBe(true);
    expect(canReadItinerary(reviewer, sponsored)).toBe(true);
  });

  it("is hidden from a sponsoring org and unrelated travellers", () => {
    expect(canReadItinerary(hrAdmin, sponsored)).toBe(false);
    expect(canReadItinerary(otherTraveller, sponsored)).toBe(false);
  });
});

describe("messages", () => {
  it("lets the traveller read and write their own thread", () => {
    expect(canReadMessages(traveller, sponsored)).toBe(true);
    expect(canWriteMessages(traveller, sponsored)).toBe(true);
  });

  it("lets staff read and write any thread", () => {
    expect(canReadMessages(reviewer, sponsored)).toBe(true);
    expect(canWriteMessages(reviewer, sponsored)).toBe(true);
    expect(canReadMessages(reviewer, selfFunded)).toBe(true);
    expect(canWriteMessages(reviewer, selfFunded)).toBe(true);
  });

  // Same privacy boundary as case notes: an organisation funds the
  // application, it does not join the conversation.
  it("hides the thread from a sponsoring org entirely", () => {
    expect(canReadMessages(hrAdmin, sponsored)).toBe(false);
    expect(canWriteMessages(hrAdmin, sponsored)).toBe(false);
  });

  it("denies an unrelated traveller both ways", () => {
    expect(canReadMessages(otherTraveller, sponsored)).toBe(false);
    expect(canWriteMessages(otherTraveller, sponsored)).toBe(false);
  });

  it("does not let a forged staff role read or write someone else's thread", () => {
    const forged: Actor = { ...otherTraveller, staffRole: "owner" };
    expect(canReadMessages(forged, sponsored)).toBe(false);
    expect(canWriteMessages(forged, sponsored)).toBe(false);
  });
});

describe("reference data and audit", () => {
  it("lets only owners write corridors", () => {
    expect(canWriteCorridors(owner)).toBe(true);
    expect(canWriteCorridors(reviewer)).toBe(false);
    expect(canWriteCorridors(traveller)).toBe(false);
  });

  it("lets only staff read the audit log", () => {
    expect(canReadAuditLog(reviewer)).toBe(true);
    expect(canReadAuditLog(owner)).toBe(true);
    expect(canReadAuditLog(hrAdmin)).toBe(false);
    expect(canReadAuditLog(traveller)).toBe(false);
  });
});
