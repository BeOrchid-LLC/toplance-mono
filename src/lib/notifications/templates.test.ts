import { describe, expect, it } from "vitest";

import {
  companionDigestEmail,
  documentFlaggedEmail,
  invitationEmail,
  itineraryReadyEmail,
  messageReceivedEmail,
  statusChangedEmail,
  submissionEmail,
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
