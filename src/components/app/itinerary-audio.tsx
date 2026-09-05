"use client";

import * as React from "react";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * "Read my arrival plan to me."
 *
 * The plan is on the page above this button, in full. This adds a way to
 * hear it — for someone reading on a phone at an airport, someone whose
 * English reads harder than it listens, and anyone who would rather not
 * hold a screen while they pack.
 *
 * The audio is fetched on press and never on load: synthesising a plan
 * nobody asked to hear would be a bill for silence. It is then kept for
 * the life of the page, so pressing play a second time replays what was
 * already paid for rather than buying it again.
 *
 * Once it arrives the browser's own player takes over — pause, scrub and
 * speed are all things a native control does better than anything this
 * would hand-roll, and they are exactly what someone listening to a
 * fifteen-minute plan reaches for.
 */
export function ItineraryAudio({ applicationId }: { applicationId: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // The object URL holds a blob in memory until it is revoked. Leaving
  // it to the page unload would be fine here, but a traveller who edits
  // their profile for a while should not accumulate them.
  React.useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const load = async () => {
    if (src) {
      void audioRef.current?.play();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/itinerary/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        // Every failure path on the route answers with JSON, so the
        // message a traveller sees is the one the server chose rather
        // than a status code translated in the browser.
        const body = await response.json().catch(() => null);
        toast.error(
          body?.error ?? "The plan could not be read aloud just now."
        );
        return;
      }

      setSrc(URL.createObjectURL(await response.blob()));
    } catch {
      toast.error("The plan could not be read aloud just now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      {src ? (
        // No caption track, deliberately: the spoken text is the page
        // this sits on, rendered in full immediately above.
        <audio ref={audioRef} src={src} controls autoPlay className="w-full" />
      ) : (
        <Button
          variant="neutral"
          size="sm"
          onClick={load}
          disabled={loading}
          aria-label="Listen to your arrival plan"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Volume2 className="size-4" aria-hidden />
          )}
          {loading ? "Preparing…" : "Listen to your plan"}
        </Button>
      )}
    </div>
  );
}
