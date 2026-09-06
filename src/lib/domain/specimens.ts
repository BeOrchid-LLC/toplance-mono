/**
 * What an acceptable version of each document looks like, as coordinates
 * rather than as a scan.
 *
 * The 05/09 review asked for "a tooltip explaining what the document is
 * and what an acceptable version looks like". A description carries the
 * first half. It does not carry the second: a sentence can say "both
 * machine-readable lines visible, uncropped" and a person photographing a
 * passport on a kitchen table at night will still cut the bottom off.
 * A drawn frame with the lines marked on it is understood in one look and
 * in any language.
 *
 * **Keyed on `doc_key`, not on the corridor.** A Nigerian bank statement
 * looks like a Nigerian bank statement whether the visa is Emirati or
 * Canadian. A specimen per route would be one drawing copied ninety-six
 * times, and then maintained ninety-six times, for no gain. A requirement
 * with no entry here renders its description alone — which is where every
 * requirement starts, and is a gap rather than a fault.
 *
 * **Nothing here is a real document, and nothing here may become one.**
 * These are box coordinates that the renderer draws as an outline; there
 * is no scan of anybody's passport in this repository. A redacted real
 * document is not an acceptable substitute — redaction fails, and the
 * failure would be somebody's identity page.
 *
 * Labels are English, the same rule `documents.ts` records for a
 * document's own name, description and reason: this is document-specific
 * copy that arrives with the requirement, not interface chrome.
 */

/** The frame a specimen is drawn in. The renderer owns the aspect ratios. */
export type SpecimenShape =
  /** A portrait sheet — letters, certificates, statements. */
  | "page"
  /** A landscape spread — a passport bio page, an identity card. */
  | "card"
  /** A passport photograph. */
  | "photo";

export type SpecimenCallout = {
  /** Percentages of the frame, so the drawing is resolution-free. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** What has to be visible inside this box. */
  label: string;
};

export type Specimen = {
  docKey: string;
  shape: SpecimenShape;
  callouts: SpecimenCallout[];
  /**
   * The single commonest reason this document comes back, said in one
   * sentence. A specimen without one is a picture with nothing to say —
   * and this line is what saves the round trip the picture is drawn to
   * prevent.
   */
  pitfall: string;
};

export const SPECIMENS: Record<string, Specimen> = {
  passport: {
    docKey: "passport",
    shape: "card",
    callouts: [
      { x: 6, y: 22, w: 24, h: 46, label: "Photograph, not obscured by glare" },
      { x: 34, y: 22, w: 60, h: 34, label: "Name, number and expiry, all readable" },
      { x: 6, y: 78, w: 88, h: 14, label: "Both machine-readable lines, uncropped" },
    ],
    pitfall:
      "The bottom two lines are the ones missions actually read, and they are the ones a hand-held photograph cuts off.",
  },

  passport_photos: {
    docKey: "passport_photos",
    shape: "photo",
    callouts: [
      { x: 26, y: 10, w: 48, h: 64, label: "Head fills 70–80% of the frame" },
      { x: 3, y: 3, w: 94, h: 94, label: "Plain light background, no shadow" },
    ],
    pitfall:
      "A photograph taken against a patterned wall is refused even when everything else about it is right.",
  },

  funds: {
    docKey: "funds",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 10, label: "Bank's name on the statement itself" },
      { x: 8, y: 20, w: 52, h: 8, label: "Account holder, spelled as on your passport" },
      { x: 8, y: 32, w: 84, h: 8, label: "Three unbroken months" },
      { x: 52, y: 84, w: 40, h: 8, label: "Closing balance" },
    ],
    pitfall:
      "A screenshot of a banking app is not a statement. Download the PDF the bank issues, covering three whole months with no gap.",
  },

  cos: {
    docKey: "cos",
    shape: "page",
    callouts: [
      { x: 8, y: 20, w: 60, h: 9, label: "Certificate reference number" },
      { x: 8, y: 34, w: 72, h: 8, label: "Sponsor's name and licence number" },
      { x: 8, y: 48, w: 52, h: 8, label: "Issue date" },
    ],
    pitfall:
      "It expires three months from issue, and the date on it is the one that counts, not the date you upload it.",
  },

  offer_letter: {
    docKey: "offer_letter",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Employer's letterhead" },
      { x: 8, y: 74, w: 44, h: 12, label: "Signature and date" },
      { x: 58, y: 70, w: 34, h: 22, label: "Attestation stamp" },
    ],
    pitfall:
      "An unattested offer is the commonest single rejection on this route — the stamp is part of the document, not paperwork about it.",
  },

  loa: {
    docKey: "loa",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Institution's letterhead" },
      { x: 8, y: 30, w: 56, h: 9, label: "DLI number, visible" },
      { x: 8, y: 44, w: 62, h: 8, label: "Your name as on your passport" },
    ],
    pitfall:
      "The DLI number is often in small print in the footer. If it is not legible in your photograph, the letter is not usable.",
  },

  sponsor_letter: {
    docKey: "sponsor_letter",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Sponsor's letterhead or address" },
      { x: 8, y: 34, w: 72, h: 9, label: "Their relationship to you, stated" },
      { x: 8, y: 74, w: 44, h: 12, label: "Signature and date" },
    ],
    pitfall:
      "A letter that does not say who the sponsor is to you is treated as unsupported, however generous the amount.",
  },

  employment_letter: {
    docKey: "employment_letter",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Employer's letterhead" },
      { x: 8, y: 32, w: 72, h: 12, label: "Role, start date and salary" },
      { x: 8, y: 74, w: 44, h: 12, label: "Signature and date" },
    ],
    pitfall:
      "Dated more than three months ago, it reads as a letter about a job you used to have.",
  },

  police_certificate: {
    docKey: "police_certificate",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Issuing police authority" },
      { x: 8, y: 32, w: 62, h: 8, label: "Your full name" },
      { x: 8, y: 60, w: 50, h: 8, label: "Issue date" },
      { x: 60, y: 68, w: 32, h: 22, label: "Official seal" },
    ],
    pitfall:
      "Most missions will not accept one issued more than six months ago, so this is the document to obtain last rather than first.",
  },

  marriage_certificate: {
    docKey: "marriage_certificate",
    shape: "page",
    callouts: [
      { x: 8, y: 24, w: 84, h: 14, label: "Both names in full" },
      { x: 8, y: 46, w: 50, h: 8, label: "Date of marriage" },
      { x: 58, y: 66, w: 34, h: 24, label: "Registrar's seal and signature" },
    ],
    pitfall:
      "A church or mosque record is not the same document as the civil registry certificate, and only the second one is accepted.",
  },

  birth_certificate: {
    docKey: "birth_certificate",
    shape: "page",
    callouts: [
      { x: 8, y: 24, w: 72, h: 9, label: "Full name and date of birth" },
      { x: 8, y: 40, w: 78, h: 12, label: "Both parents' names" },
      { x: 58, y: 66, w: 34, h: 24, label: "Registrar's seal" },
    ],
    pitfall:
      "An attestation of birth is not a birth certificate. If yours was issued late, upload it anyway and say so in a message.",
  },

  qualifications: {
    docKey: "qualifications",
    shape: "page",
    callouts: [
      { x: 8, y: 8, w: 84, h: 12, label: "Awarding institution" },
      { x: 8, y: 32, w: 78, h: 14, label: "Award and classification" },
      { x: 8, y: 56, w: 45, h: 8, label: "Date conferred" },
      { x: 58, y: 66, w: 34, h: 24, label: "Seal or attestation" },
    ],
    pitfall:
      "The certificate and the transcript are two documents. Upload both as one PDF rather than choosing between them.",
  },

  application_form: {
    docKey: "application_form",
    shape: "page",
    callouts: [
      { x: 6, y: 6, w: 88, h: 46, label: "Every page, in order" },
      { x: 8, y: 72, w: 45, h: 12, label: "Signed and dated by hand" },
    ],
    pitfall:
      "A form filled in on screen but never signed is the commonest incomplete upload. Print it, sign it, then photograph every page.",
  },

  medical: {
    docKey: "medical",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Approved clinic's name" },
      { x: 8, y: 34, w: 78, h: 12, label: "Result, stated plainly" },
      { x: 8, y: 70, w: 52, h: 16, label: "Doctor's signature and stamp" },
    ],
    pitfall:
      "Only clinics on the destination's own approved list count, and a test from any other clinic has to be taken again.",
  },

  tb_test: {
    docKey: "tb_test",
    shape: "page",
    callouts: [
      { x: 8, y: 6, w: 84, h: 12, label: "Clinic approved by the destination" },
      { x: 8, y: 36, w: 70, h: 10, label: "Result" },
      { x: 8, y: 60, w: 50, h: 8, label: "Expiry date" },
    ],
    pitfall:
      "The certificate is usually valid for six months. If your application will still be open past that date, take the test later.",
  },

  english_test: {
    docKey: "english_test",
    shape: "page",
    callouts: [
      { x: 8, y: 20, w: 60, h: 9, label: "Test report form number" },
      { x: 8, y: 36, w: 84, h: 18, label: "Every section score, not the overall band alone" },
      { x: 8, y: 62, w: 50, h: 8, label: "Test date" },
    ],
    pitfall:
      "Missions check each section against its own minimum, so an overall pass with one low section is refused.",
  },

  travel_history: {
    docKey: "travel_history",
    shape: "card",
    callouts: [
      { x: 6, y: 20, w: 88, h: 48, label: "Bio page of each previous passport" },
      { x: 6, y: 74, w: 52, h: 14, label: "Cancellation stamp or punch, if any" },
    ],
    pitfall:
      "Expired passports still count. If one was lost, say so in a message rather than leaving this empty.",
  },
};

/** The specimen for a requirement, or null where none has been drawn. */
export function specimenFor(docKey: string): Specimen | null {
  return SPECIMENS[docKey] ?? null;
}
