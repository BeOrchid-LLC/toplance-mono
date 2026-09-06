import { describe, expect, it } from "vitest";

import { documentGuidance } from "@/lib/domain/document-guidance";

/**
 * What a checklist row says underneath the document's name.
 *
 * The row used to render `reason` *or* `description`, never both — a
 * ternary that read as a tidy fallback and was in fact a trapdoor. A
 * flagged document is the one case where the traveller is being asked to
 * do the upload again, and it was the one case where the instructions for
 * doing it were taken away. The rejection told them the file was wrong;
 * nothing left on the row told them what a right one looks like.
 *
 * So the rule these tests pin is that the two strings answer different
 * questions and never compete: the rejection says what happened to the
 * file they sent, the guidance says what the document is. A row can show
 * either, both, or neither.
 */
describe("documentGuidance", () => {
  it("shows the rejection and the guidance together", () => {
    expect(
      documentGuidance({
        reason: "This looks like a payslip, not a bank statement.",
        description: "Three months of statements from any current account.",
      })
    ).toEqual({
      rejection: "This looks like a payslip, not a bank statement.",
      guidance: "Three months of statements from any current account.",
    });
  });

  it("shows guidance alone before anything has been uploaded", () => {
    expect(
      documentGuidance({
        reason: null,
        description: "Valid for the whole period of stay.",
      })
    ).toEqual({
      rejection: null,
      guidance: "Valid for the whole period of stay.",
    });
  });

  it("shows a rejection alone when the requirement carries no description", () => {
    expect(
      documentGuidance({ reason: "The page is too dark to read.", description: null })
    ).toEqual({ rejection: "The page is too dark to read.", guidance: null });
  });

  it("reports nothing to render when the row has neither", () => {
    expect(documentGuidance({ reason: null, description: null })).toEqual({
      rejection: null,
      guidance: null,
    });
  });

  /**
   * `documents.reason` is written by the pre-check and by a reviewer, and
   * `corridor_requirements.description` is curated by hand. Either can
   * arrive as an empty or whitespace-only string rather than null —
   * a cleared textarea submits `""`, not `null`. Treating that as present
   * renders an empty paragraph, which reads as a rendering fault.
   */
  it("treats blank strings as absent", () => {
    expect(documentGuidance({ reason: "   ", description: "\n" })).toEqual({
      rejection: null,
      guidance: null,
    });
  });

  it("trims what it does return", () => {
    expect(
      documentGuidance({ reason: "  Too dark.  ", description: " Bio page. " })
    ).toEqual({ rejection: "Too dark.", guidance: "Bio page." });
  });
});
