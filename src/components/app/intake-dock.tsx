"use client";

import * as React from "react";
import { ArrowUp, Loader2, Mic, MessagesSquare, Square, X } from "lucide-react";

import type { VoiceStatus } from "@/components/app/use-voice-intake";
import type { IntakeQuestion } from "@/lib/domain/intake";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Where the agent speaks, docked under the record it is filling in.
 *
 * The dock carries one line — whatever the agent is asking right now —
 * and the means of answering it. Not a transcript: the record above is
 * the durable artefact of this conversation, and the back-and-forth that
 * produced it is working material, one tap away behind `Transcript`.
 *
 * That is the whole trade this layout makes. It is right for an intake,
 * where every turn is a question with a filable answer and the traveller
 * is watching their own record assemble; it would be wrong for an
 * open-ended assistant, where the thread *is* the artefact.
 *
 * The line is the page's live region. It used to be the transcript, but
 * a transcript that is usually collapsed announces nothing — so the
 * announcement moved to the one line that is always on screen.
 */
export function AgentDock({
  say,
  composer,
  transcriptOpen,
  onToggleTranscript,
}: {
  say: React.ReactNode;
  /** Chips and the composer, or the completion block once done. */
  composer: React.ReactNode;
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
}) {
  return (
    // Lifted off the bottom edge and cut to the same card as the record
    // above it: same 720px measure, same radius, same elevation, same
    // optically-variable edge. The two are one instrument — the page a
    // question is asked on and the page the answer is printed to — and a
    // full-bleed bar welded to the window read as system chrome that had
    // wandered in from another screen.
    //
    // Nothing scrolls under the dock (the record's scroller ends above
    // it), so the shadow no longer has to throw upward to hold a seam.
    // It is `--shadow-lg`, unmodified, exactly as the record casts it.
    //
    // The 12px above the card is not spacing, it is the cut line. A tall
    // record overflows its scroller and is clipped at the scroller's
    // bottom edge — on a phone, always. Without a band of page ground
    // there, a white record ends flush against a white dock and reads as
    // a card with its bottom torn off rather than as a page that scrolls.
    <div className="shrink-0 px-4 pb-5 pt-3 sm:px-6 sm:pb-7">
      <div className="ovi-edge mx-auto flex w-full max-w-[720px] flex-col gap-3 rounded-[var(--radius-lg)] bg-surface px-5 py-4 shadow-[var(--shadow-lg)] sm:px-7 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {/* The agent's mark. The transcript gave its turns no anchor
                at all, which was survivable in a thread where position
                said who was speaking; in a dock there is no position to
                read, so the speaker has to be stated. */}
            <span
              aria-hidden
              className="mt-0.5 size-6 shrink-0 rounded-[10px] bg-[image:var(--brand-grad)] shadow-[var(--shadow-sm)]"
            />
            <div
              role="status"
              aria-live="polite"
              aria-label="The agent"
              // A column with a gap, not a block: the opening turn is a
              // greeting *and* a question, and run together as two
              // paragraphs of the same flow they read as one long
              // sentence that happens to bold at the end.
              className="flex min-w-0 flex-1 flex-col gap-1.5 text-base leading-[1.6] text-ink"
            >
              {say}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleTranscript}
            aria-expanded={transcriptOpen}
            aria-controls="intake-transcript"
            className="special -me-2 flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 transition-colors duration-[var(--dur-tap)] hover:bg-surface-2 hover:text-ink"
          >
            {transcriptOpen ? (
              <X aria-hidden className="size-4" />
            ) : (
              <MessagesSquare aria-hidden className="size-4" />
            )}
            <span className="max-sm:sr-only">
              {transcriptOpen ? "Close" : "Transcript"}
            </span>
          </button>
        </div>
        {composer}
      </div>
    </div>
  );
}

type Chip = IntakeQuestion["chips"][number];

export function Chips({
  chips,
  locale,
  disabled,
  onPick,
}: {
  chips: Chip[];
  locale: Locale;
  disabled: boolean;
  onPick: (chip: Chip) => void;
}) {
  // Quiet by default and brand only on hover. These are shortcuts past
  // the keyboard, not the recommended answer — outlining four of them in
  // the loudest colour in the system made every question look like it
  // had four right answers and a text field for wrong ones.
  return (
    // One scrolling row on a phone, wrapped rows once there is width for
    // them. Five suggestions at 390px wrap to five lines, which in a
    // dock pushes the question they answer off the top of it — the
    // shortcut costing more room than the thing it is a shortcut past.
    //
    // Bled to the dock's edge so a half-cut chip is visible at the fold,
    // which is what says there is more to scroll to.
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="min-h-[var(--row-h)] shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] border border-border bg-surface px-4 text-base font-medium text-ink-2 transition-colors duration-[var(--dur-tap)] hover:border-brand hover:text-brand-text disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-2"
        >
          {chip.label[locale] ?? chip.label.en}
        </button>
      ))}
    </div>
  );
}

export function Composer({
  draft,
  onDraftChange,
  onSubmit,
  disabled,
  voice,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** Omitted where there is no model to speak to. */
  voice?: { status: VoiceStatus; onToggle: () => void };
}) {
  const field = React.useRef<HTMLTextAreaElement>(null);

  // Grown from the content on every change rather than sized once. The
  // height has to be cleared first: `scrollHeight` on an element already
  // holding a taller explicit height reports that height back, so
  // without the reset the box can only ever grow.
  React.useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const empty = !draft.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      // One row, not two. A stacked composer with the controls on their
      // own line below the field is what a long-form assistant needs;
      // the answers here are a country, a date, a tapped suggestion, and
      // stacking put 40px of empty box under every one of them. The
      // field still grows to six lines when someone writes a paragraph,
      // and the buttons stay pinned to the last line.
      className="flex items-end gap-1 rounded-[26px] border border-border-strong bg-surface p-1.5 transition-[border-color,box-shadow] duration-[var(--dur-tap)] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--brand)_20%,transparent)]"
    >
      <VoiceButton voice={voice} />
      <textarea
        ref={field}
        value={draft}
        rows={1}
        onChange={(e) => onDraftChange(e.target.value)}
        // Enter sends and Shift+Enter breaks the line, which is what a
        // chat composer means by those keys everywhere else. The guard
        // matters as much as the shortcut: the Send button was disabled
        // and the field was not, so Enter used to submit a turn the rest
        // of the composer was refusing.
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return;
          e.preventDefault();
          if (!disabled && !empty) onSubmit();
        }}
        disabled={disabled}
        placeholder={
          voice?.status === "live" ? "Listening — stop to type" : "Type your answer"
        }
        aria-label="Your answer"
        // Padded to sit on the same optical line as the two 44px buttons
        // beside it while a single line of text is in the box.
        className="block max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent px-2 py-2 text-base leading-[1.6] outline-none placeholder:text-ink-3 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || empty}
        aria-label="Send your answer"
        title="Send your answer"
        className="grid size-[var(--row-h)] shrink-0 place-items-center rounded-full bg-brand text-on-brand transition-[background,opacity] duration-[var(--dur-tap)] hover:bg-[color-mix(in_srgb,var(--brand)_88%,#fff)] active:bg-brand-press disabled:bg-surface-2 disabled:text-ink-3"
      >
        <ArrowUp className="size-5" />
      </button>
    </form>
  );
}

/**
 * The mic. Idle it starts a call; while one is connecting it spins and
 * can be pressed again to give up; while one is live it is the only way
 * to end it, and it says so — a control that opens a microphone must be
 * unmistakably the control that closes it.
 *
 * The ring is the one place the brand gradient's colour appears outside
 * the agent's mark, because a live microphone is worth exactly that
 * much attention.
 */
function VoiceButton({
  voice,
}: {
  voice?: { status: VoiceStatus; onToggle: () => void };
}) {
  const base =
    "grid size-[var(--row-h)] shrink-0 place-items-center rounded-full transition-colors duration-[var(--dur-tap)]";

  if (!voice) {
    return (
      <button
        type="button"
        disabled
        aria-label="Answer by voice"
        title="Speaking needs the agent, which is not running here. Type your answers instead."
        className={cn(base, "text-ink-3 disabled:opacity-40")}
      >
        <Mic className="size-5" />
      </button>
    );
  }

  const live = voice.status === "live";
  const label = live
    ? "Stop speaking to the agent"
    : voice.status === "connecting"
      ? "Cancel connecting the microphone"
      : "Answer by voice";

  return (
    <span className="relative inline-flex shrink-0">
      {live && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60"
        />
      )}
      <button
        type="button"
        onClick={voice.onToggle}
        aria-label={label}
        title={label}
        className={cn(
          base,
          "relative",
          live
            ? "bg-brand text-on-brand"
            : "text-ink-2 hover:bg-surface-2 hover:text-ink"
        )}
      >
        {voice.status === "connecting" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : live ? (
          <Square className="size-5" />
        ) : (
          <Mic className="size-5" />
        )}
      </button>
      {/* The ring says the microphone is open to everyone who can see
          it; this says the same thing to everyone who cannot. */}
      <span role="status" className="sr-only">
        {live
          ? "The microphone is on. The agent is listening."
          : voice.status === "connecting"
            ? "Connecting the microphone."
            : ""}
      </span>
    </span>
  );
}
