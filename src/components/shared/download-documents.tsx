"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ARCHIVE_READY_COOKIE, readCookie } from "@/lib/http/cookies";

/**
 * The link that hands somebody a whole checklist as one ZIP.
 *
 * Still an anchor the browser follows. The click that starts a download
 * is not intercepted, so the navigation, the `Content-Disposition` the
 * route sets and the filename it chooses are all exactly what they were
 * before this component had any state — and with scripting off the
 * button is the plain link it always was. The React state rides
 * alongside the download rather than performing it: if the watching
 * breaks, the file still arrives, and the worst that happens is a bar
 * that runs its course.
 *
 * The one click it does swallow is a second one on a download already in
 * flight, which the browser would otherwise serve by abandoning the
 * first request — see the handler.
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

    /**
     * What a download that never announces itself leaves on screen:
     * the button it was before the click.
     *
     * The indicator can only ever report the cookie arriving, and the
     * cookie can be lost for reasons the page cannot see — the route
     * refusing, the response failing, the ticket being rejected. Left
     * running, the button says "preparing" about an archive nothing is
     * preparing, and the click guard above then holds the only way to
     * ask again shut behind that lie.
     *
     * Going back to the idle label claims nothing: it is the state the
     * page was in before the click, and if the file is still on its way
     * it still arrives. No new sentence, deliberately — a "this is
     * taking longer than usual" would be a diagnosis of a request this
     * page has no way to inspect, in ten languages.
     */
    const giveUp = window.setTimeout(
      () => setPreparing(false),
      GIVE_UP_AFTER_MS
    );

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
          onClick={(event) => {
            if (!ticket) return;

            /**
             * The second click on a download already in flight is the
             * one that has to be swallowed.
             *
             * Nothing reaches the browser until the archive's first
             * byte — the route reads a whole document out of the bucket
             * before archiver can write one — so for that whole wait
             * the tab is on a navigation with nothing to show for it,
             * and the natural response to that is to click again.
             * Following the link a second time makes the browser
             * abandon the first request and start the wait over, which
             * is the opposite of what the person clicking wants: three
             * clicks measured 21 seconds to a file that one click
             * fetched in six.
             *
             * `preventDefault` rather than a `disabled` attribute,
             * because an anchor has none, and rather than
             * `pointer-events: none`, because that also takes the link
             * off the keyboard. It stays focusable and says
             * `aria-busy`; what it does not do is throw away the
             * download that is already coming.
             */
            if (preparing) {
              event.preventDefault();
              return;
            }

            // Cleared on the way out so the watcher waits for this
            // download's cookie rather than reading the last one's.
            clearReadyCookie();
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
 *
 * It is also how long the click guard holds the link shut, which is the
 * other half of the same number: whatever this is, it is how long
 * somebody whose download really did fail waits before they may ask
 * again.
 */
const GIVE_UP_AFTER_MS = 30_000;

/**
 * Same name, same path, no lifetime. Deleting a cookie is setting it to
 * something already expired — there is no other way from a script.
 */
function clearReadyCookie() {
  document.cookie = `${ARCHIVE_READY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
