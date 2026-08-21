import type { Database } from "@/lib/supabase/database.types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type DocumentState = Database["public"]["Enums"]["document_state"];
export type BadgeVariant =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "outline";

/**
 * Every pill carries a written label. Colour reinforces the state, it never
 * carries it alone, so the pills survive colour blindness and greyscale
 * printing without needing an icon to disambiguate.
 *
 * Mapping locked with the client 2026-08-21:
 *   Not started → grey outline · In progress → grey fill · Submitted → blue
 *   Under review → amber · Approved → green · Rejected → red
 */
export const STATUS: Record<
  ApplicationStatus,
  { label: string; short: string; variant: BadgeVariant; blurb: string }
> = {
  draft: {
    label: "Not started",
    short: "Not started",
    variant: "outline",
    blurb: "Not started yet. Nothing has been sent anywhere.",
  },
  collecting_documents: {
    label: "In progress",
    short: "In progress",
    variant: "neutral",
    blurb: "Your checklist is ready. Upload each file and we check it as it arrives.",
  },
  submitted: {
    label: "Submitted",
    short: "Submitted",
    variant: "info",
    blurb: "Everything is in and the file has gone to our review team.",
  },
  under_review: {
    label: "Under review",
    short: "Reviewing",
    variant: "warning",
    blurb: "A named case handler has your file open.",
  },
  additional_documents: {
    label: "Additional documents needed",
    short: "More docs needed",
    variant: "neutral",
    blurb: "Something needs replacing before this can go further. We have told you which.",
  },
  approved: {
    label: "Approved",
    short: "Approved",
    variant: "success",
    blurb: "Congratulations. Your arrival plan is now in the app.",
  },
  rejected: {
    label: "Rejected",
    short: "Rejected",
    variant: "danger",
    blurb: "The mission declined this application. Your handler will talk you through why.",
  },
};

export const DOC_STATE: Record<DocumentState, { label: string; variant: BadgeVariant }> = {
  not_started: { label: "Not started", variant: "outline" },
  uploaded: { label: "Uploaded", variant: "info" },
  checking: { label: "Checking", variant: "brand" },
  verified: { label: "Verified", variant: "success" },
  flagged: { label: "Needs re-upload", variant: "warning" },
  failed: { label: "Upload failed", variant: "danger" },
};

/**
 * Deliberate wording, agreed with the client: verified means a document
 * has been accepted for review. It is never a promise of approval, and
 * no copy anywhere in the product should imply otherwise. AI resolves the
 * checklist and triages uploads — the accept/reject call is always a
 * human handler's.
 */
export const VERIFIED_MEANS =
  "Verified means accepted for review — not that your visa has been approved.";
