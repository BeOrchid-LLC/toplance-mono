"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ARCHIVE_READY_COOKIE, readCookie } from "@/lib/http/cookies";

/**
 * The link that hands somebody a whole checklist as one ZIP.
 *
 * Still an anchor the browser follows. The click handler below does not
 * call `preventDefault`, so the navigation, the `Content-Disposition`
 * the route sets and the filename it chooses are all exactly what they
 * were before this component had any state — and with scripting off the
 * button is the plain link it always was. The React state rides
 * alongside the download rather than performing it: if the watching
 * breaks, the file still arrives, and the worst that happens is a bar
 * that runs its course.
 *
 * `download` is deliberately absent: the attribute is ignored on a
 * cross-origin response and, worse, it overrides the filename the route
 * chose with the last path segment — which here is a UUID. Letting the
 * header name the file is what makes it `TOP-4821-documents.zip` rather
 * than `a3f9e2c1-....zip`.
 *
 * Shared by both screens because both point at the same guarded route.
 * Only the labels differ, and they are passed in rather than decided
 * here: this component has no way of knowing which side of the desk it
 * is on, and guessing would be the kind of thing that quietly says "my
 * documents" to an agency.
 */
export function DownloadDocuments({
  applicationId,
  label,
  preparingLabel,
}: {
  applicationId: string;
  label: string;
  /** What the button says while the archive is being built. */
  preparingLabel: string;
}) {
  const [preparing, setPreparing] = useState(false);

  /**
   * A value the server cannot have, which is the point.
   *
   * The server has no way to produce the same random string the client
   * would, so a ticket rendered into the first HTML is a hydration
   * mismatch. Its absence before hydration is also what keeps this
   * honest as an enhancement: until the script is running there is no
   * ticket, the route is asked for no cookie, and the anchor is the
   * plain download it degrades to.
   *
   * `useSyncExternalStore` rather than an effect that sets state. It is
   * the hook built for a value that differs between server and client —
   * it renders the server snapshot during hydration and swaps in the
   * client's afterwards, in one pass and with no cascading render for
   * the lint rule to object to. Nothing ever changes it, so the
   * subscribe function has nothing to subscribe to.
   *
   * `getSnapshot` must answer the same string every time it is asked or
   * React re-renders forever, hence the ref: the ticket is minted once
   * and remembered.
   *
   * One ticket for the life of the component rather than one per click.
   * The cookie is cleared on the way out (below), so what the watcher is
   * waiting for is this ticket *arriving again* — which makes a second
   * download of the same pack indistinguishable from the first, exactly
   * as it should be.
   */
  const minted = useRef<string | null>(null);
  const ticket = useSyncExternalStore(
    subscribeToNothing,
    () => (minted.current ??= crypto.randomUUID().replace(/-/g, "").slice(0, 16)),
    () => null
  );

  const href = ticket
    ? `/api/documents/${applicationId}?dl=${ticket}`
    : `/api/documents/${applicationId}`;

  const timedOut = useRef(false);

  useEffect(() => {
    if (!preparing || !ticket) return;

    /**
     * Response headers flush with the first byte of the body, so this
     * cookie appears the moment the archive starts arriving rather than
     * when it finishes. That is the wait worth covering: the route
     * fetches every document from the bucket in turn before it can write
     * a byte of ZIP, and the transfer after that is the browser's to
     * report.
     */
    const poll = window.setInterval(() => {
      if (readCookie(document.cookie, ARCHIVE_READY_COOKIE) !== ticket) return;
      clearReadyCookie();
      setPreparing(false);
    }, 250);

    const giveUp = window.setTimeout(() => {
      timedOut.current = true;
      // TODO(you): decide what a download that never announces itself
      // leaves on screen. See the note in chat.
    }, GIVE_UP_AFTER_MS);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(giveUp);
    };
  }, [preparing, ticket]);

  return (
    <>
      <Button asChild variant="neutral" size="sm">
        {/* `relative overflow-hidden` so the track below is clipped to
            the button's own corners; without it the sweep squares off
            the rounded ends. */}
        <a
          href={href}
          aria-busy={preparing}
          className="relative overflow-hidden"
          onClick={() => {
            if (!ticket) return;
            // Cleared on the way out so the watcher waits for this
            // download's cookie rather than reading the last one's.
            clearReadyCookie();
            timedOut.current = false;
            setPreparing(true);
          }}
        >
          {preparing ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {preparing ? preparingLabel : label}
          {preparing && (
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-surface-2"
            >
              <span className="archive-sweep block h-full w-2/5 rounded-[var(--radius-pill)] bg-[image:var(--brand-grad)]" />
            </span>
          )}
        </a>
      </Button>
      {/* Outside the anchor, so announcing the state does not rewrite the
          link's own accessible name mid-press. */}
      <span role="status" className="sr-only">
        {preparing ? preparingLabel : ""}
      </span>
    </>
  );
}

/** Nothing ever changes the ticket, so there is nothing to listen to. */
const subscribeToNothing = () => () => {};

/**
 * How long a download gets to announce itself before the indicator stops
 * believing in it. Generous, because the wait it covers is a bucket
 * round trip per document and a ten-document case on a slow morning is
 * not a failure.
 */
const GIVE_UP_AFTER_MS = 30_000;

/**
 * Same name, same path, no lifetime. Deleting a cookie is setting it to
 * something already expired — there is no other way from a script.
 */
function clearReadyCookie() {
  document.cookie = `${ARCHIVE_READY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
