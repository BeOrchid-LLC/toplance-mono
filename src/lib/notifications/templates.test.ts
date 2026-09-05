import { describe, expect, it } from "vitest";

import {
  companionDigestEmail,
  documentFlaggedEmail,
  invitationEmail,
  itineraryReadyEmail,
  messageReceivedEmail,
  statusChangedEmail,
  submissionEmail,
  advisoryChangedEmail,
  visaExpiringEmail,
} from "@/lib/notifications/templates";

const SCRIPT = "<script>alert(1)</script>";

/**
 * Pure functions, no I/O — so these run without a database and without
 * `RESEND_API_KEY`. The one thing that must never happen is a
 * user-authored string reaching the HTML body unescaped: `message`,
 * `reason`, `senderName`, `documentName`, `orgName` and `fullName` all
 * come from a form somewhere.
 */
describe("email templates", () => {
  it("submissionEmail escapes the case reference and carries the link", () => {
    const email = submissionEmail({ caseRef: SCRIPT, url: "https://x.test/ops/cases/1" });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("https://x.test/ops/cases/1");
  });

  it("statusChangedEmail escapes staff-authored message text", () => {
    const email = statusChangedEmail({
      statusLabel: "Under review",
      message: SCRIPT,
      url: "https://x.test/app",
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("Under review");
  });

  it("documentFlaggedEmail escapes the document name and the reason", () => {
    const email = documentFlaggedEmail({
      documentName: SCRIPT,
      reason: SCRIPT,
      url: "https://x.test/app/documents",
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).not.toContain("<script>");
  });

  it("messageReceivedEmail escapes the sender name and truncates the preview", () => {
    const long = "a".repeat(400);
    const email = messageReceivedEmail({
      senderName: SCRIPT,
      preview: long,
      url: "https://x.test/app",
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).not.toContain("<script>");
    expect(email.text.length).toBeLessThan(long.length + 200);
  });

  it("itineraryReadyEmail carries the link", () => {
    const email = itineraryReadyEmail({ url: "https://x.test/app" });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).toContain("https://x.test/app");
  });

  it("visaExpiringEmail names the visa, the date and how long is left", () => {
    const email = visaExpiringEmail({
      visaName: "Skilled Worker visa",
      expiresOn: "2027-03-14",
      daysOut: 30,
      url: "https://x.test/app/companion",
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.subject).toContain("30");
    expect(email.html).toContain("Skilled Worker visa");
    expect(email.html).toContain("14 Mar 2027");
    expect(email.html).toContain("https://x.test/app/companion");
    expect(email.text).toContain("https://x.test/app/companion");
  });

  it("visaExpiringEmail falls back to a plain noun when no corridor named the visa", () => {
    const email = visaExpiringEmail({
      visaName: null,
      expiresOn: "2027-03-14",
      daysOut: 7,
      url: "https://x.test/app/companion",
    });
    expect(email.html.toLowerCase()).toContain("your visa");
    expect(email.html).not.toContain("null");
  });

  it("visaExpiringEmail escapes the visa name", () => {
    const email = visaExpiringEmail({
      visaName: SCRIPT,
      expiresOn: "2027-03-14",
      daysOut: 60,
      url: "https://x.test/app/companion",
    });
    expect(email.html).not.toContain("<script>");
  });

  it("advisoryChangedEmail quotes the source and links to its page", () => {
    const email = advisoryChangedEmail({
      destination: "United Arab Emirates",
      source: "UK FCDO",
      level: null,
      changeNote: "Updated information about regional tensions.",
      url: "https://www.gov.uk/foreign-travel-advice/united-arab-emirates",
    });
    expect(email.subject).toContain("United Arab Emirates");
    expect(email.html).toContain("Updated information about regional tensions.");
    expect(email.html).toContain("UK FCDO");
    expect(email.html).toContain("https://www.gov.uk/foreign-travel-advice/united-arab-emirates");
  });

  it("advisoryChangedEmail falls back to the level when there is no change note", () => {
    const email = advisoryChangedEmail({
      destination: "United Kingdom",
      source: "US State Department",
      level: "Level 2: Exercise Increased Caution",
      changeNote: null,
      url: "https://travel.state.gov/uk.html",
    });
    expect(email.html).toContain("Level 2: Exercise Increased Caution");
    expect(email.html).not.toContain("null");
  });

  it("advisoryChangedEmail escapes third-party advisory text", () => {
    // The note is written by a government website, not by us. It is still
    // third-party text arriving over the network into an HTML body.
    const email = advisoryChangedEmail({
      destination: "Germany",
      source: "UK FCDO",
      level: null,
      changeNote: SCRIPT,
      url: "https://www.gov.uk/foreign-travel-advice/germany",
    });
    expect(email.html).not.toContain("<script>");
  });

  it("invitationEmail contains the invite URL and escapes the org name", () => {
    const email = invitationEmail({
      orgName: SCRIPT,
      inviteUrl: "https://x.test/invite/abc123",
      fullName: SCRIPT,
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("https://x.test/invite/abc123");
    expect(email.text).toContain("https://x.test/invite/abc123");
  });

  it("invitationEmail works without a fullName", () => {
    const email = invitationEmail({
      orgName: "Acme Ltd",
      inviteUrl: "https://x.test/invite/abc123",
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).toContain("https://x.test/invite/abc123");
  });

  it("companionDigestEmail escapes each highlight", () => {
    const email = companionDigestEmail({
      url: "https://x.test/app",
      highlights: [SCRIPT, "Visit the market on Saturdays"],
    });
    expect(email.subject).not.toHaveLength(0);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("Visit the market on Saturdays");
  });
});
