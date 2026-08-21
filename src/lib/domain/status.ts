import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock,
  FileWarning,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";

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
 * Status is never carried by colour alone — every pill pairs an icon,
 * a label and a colour, so it survives colour blindness and greyscale
 * printing. This mapping is locked with the client.
 */
export const STATUS: Record<
  ApplicationStatus,
  { label: string; short: string; variant: BadgeVariant; icon: LucideIcon; blurb: string }
> = {
  draft: {
    label: "Draft",
    short: "Draft",
    variant: "outline",
    icon: CircleDashed,
    blurb: "Not started yet. Nothing has been sent anywhere.",
  },
  collecting_documents: {
    label: "Collecting documents",
    short: "Collecting",
    variant: "brand",
    icon: RefreshCw,
    blurb: "Your checklist is ready. Upload each file and we check it as it arrives.",
  },
  submitted: {
    label: "Submitted",
    short: "Submitted",
    variant: "info",
    icon: Upload,
    blurb: "Everything is in and the file has gone to our review team.",
  },
  under_review: {
    label: "Under review",
    short: "Reviewing",
    variant: "warning",
    icon: Clock,
    blurb: "A named case handler has your file open.",
  },
  additional_documents: {
    label: "Additional documents needed",
    short: "More docs needed",
    variant: "neutral",
    icon: FileWarning,
    blurb: "Something needs replacing before this can go further. We have told you which.",
  },
  approved: {
    label: "Approved",
    short: "Approved",
    variant: "success",
    icon: CheckCircle2,
    blurb: "Congratulations. Your arrival plan is now in the app.",
  },
  rejected: {
    label: "Rejected",
    short: "Rejected",
    variant: "danger",
    icon: XCircle,
    blurb: "The mission declined this application. Your handler will talk you through why.",
  },
};

export const DOC_STATE: Record<
  DocumentState,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  not_started: { label: "Not started", variant: "outline", icon: Circle },
  uploaded: { label: "Uploaded", variant: "info", icon: Upload },
  checking: { label: "Checking", variant: "brand", icon: RefreshCw },
  verified: { label: "Verified", variant: "success", icon: CheckCircle2 },
  flagged: { label: "Needs re-upload", variant: "warning", icon: RefreshCw },
  failed: { label: "Upload failed", variant: "danger", icon: XCircle },
};

/**
 * Deliberate wording, agreed with the client: verified means a document
 * has been accepted for review. It is never a promise of approval, and
 * no copy anywhere in the product should imply otherwise.
 */
export const VERIFIED_MEANS =
  "Verified means accepted for review — not that your visa has been approved.";
