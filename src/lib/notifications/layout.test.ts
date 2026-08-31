import { describe, expect, it } from "vitest";

import { renderEmail } from "@/lib/notifications/layout";

const SCRIPT = "<script>alert(1)</script>";
const CTA = { href: "https://x.test/invite/abc123", label: "Open your invitation" };

/**
 * The shell every template renders through. Two things matter here and
 * the rest is decoration: nothing user-authored may reach the HTML
 * unescaped, and the plain-text alternative must carry the same message
 * and the same link as the HTML — they are generated together so they
 * cannot drift.
 */
describe("renderEmail", () => {
  it("escapes a heading", () => {
    const email = renderEmail({ heading: SCRIPT, paragraphs: ["Hello"], cta: CTA });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("escapes a paragraph", () => {
    const email = renderEmail({ heading: "Hi", paragraphs: [SCRIPT], cta: CTA });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("escapes a list item", () => {
    const email = renderEmail({ heading: "Hi", list: [SCRIPT], cta: CTA });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("<li");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("escapes the call-to-action label", () => {
    const email = renderEmail({
      heading: "Hi",
      cta: { href: "https://x.test/go", label: SCRIPT },
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain(SCRIPT);
  });

  it("carries the call-to-action link in the HTML and the plain text", () => {
    const email = renderEmail({ heading: "Hi", paragraphs: ["Hello"], cta: CTA });
    expect(email.html).toContain(CTA.href);
    expect(email.text).toContain(CTA.href);
  });

  it("shows the link as readable text as well as a button", () => {
    const email = renderEmail({ heading: "Hi", cta: CTA });
    const occurrences = email.html.split(CTA.href).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("produces plain text with no markup in it", () => {
    const email = renderEmail({
      heading: "Your application is ready",
      paragraphs: ["We looked it over."],
      list: ["One", "Two"],
      cta: CTA,
    });
    expect(email.text).not.toContain("<");
    expect(email.text).not.toContain("&amp;");
    expect(email.text).toContain("Your application is ready");
    expect(email.text).toContain("We looked it over.");
    expect(email.text).toContain("One");
  });

  it("leaves an ampersand readable in plain text but encoded in HTML", () => {
    const email = renderEmail({ heading: "Ben & Jerry", cta: CTA });
    expect(email.text).toContain("Ben & Jerry");
    expect(email.html).toContain("Ben &amp; Jerry");
  });

  it("is a complete HTML document, so the head can carry client hints", () => {
    const email = renderEmail({ heading: "Hi", cta: CTA });
    expect(email.html.trimStart().toLowerCase()).toMatch(/^<!doctype html>/);
    expect(email.html).toContain("</html>");
    expect(email.html).toContain('charset="utf-8"');
  });

  it("puts a hidden preheader in front of the body for the inbox snippet", () => {
    const email = renderEmail({
      heading: "Hi",
      paragraphs: ["The snippet the inbox should show."],
      cta: CTA,
    });
    const preheader = email.html.indexOf("The snippet the inbox should show.");
    const heading = email.html.indexOf("<h1");
    expect(preheader).toBeGreaterThan(-1);
    expect(preheader).toBeLessThan(heading);
    expect(email.html).toContain("display:none");
  });

  it("carries the Toplance wordmark and a sender footer", () => {
    const email = renderEmail({ heading: "Hi", cta: CTA });
    expect(email.html).toContain("Toplance");
    expect(email.html).toContain("BeOrchid");
  });

  it("renders no list markup when there is no list", () => {
    const email = renderEmail({ heading: "Hi", paragraphs: ["Hello"], cta: CTA });
    expect(email.html).toContain("Hello");
    expect(email.html).not.toContain("<ul");
  });
});
