import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The link that hands somebody a whole checklist as one ZIP.
 *
 * A plain anchor, not a client component. The browser follows it,
 * reads the `Content-Disposition` the route sets, and saves the file —
 * no fetch, no state, no JavaScript at all, which also means it keeps
 * working while the archive is still being written on the server.
 *
 * `download` is deliberately absent: the attribute is ignored on a
 * cross-origin response and, worse, it overrides the filename the route
 * chose with the last path segment — which here is a UUID. Letting the
 * header name the file is what makes it `TOP-4821-documents.zip` rather
 * than `a3f9e2c1-....zip`.
 *
 * Shared by both screens because both point at the same guarded route.
 * Only the label differs, and it is passed in rather than decided here:
 * this component has no way of knowing which side of the desk it is on,
 * and guessing would be the kind of thing that quietly says "my
 * documents" to an agency.
 */
export function DownloadDocuments({
  applicationId,
  label,
}: {
  applicationId: string;
  label: string;
}) {
  return (
    <Button asChild variant="neutral" size="sm">
      <a href={`/api/documents/${applicationId}`}>
        <Download aria-hidden />
        {label}
      </a>
    </Button>
  );
}
