"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Loader2,
  Mic,
  RotateCcw,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { useChat } from "@ai-sdk/react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/components/locale-provider";
import { ChatMarkdown } from "@/components/app/chat-markdown";
import {
  useVoiceIntake,
  type VoiceStatus,
} from "@/components/app/use-voice-intake";
import { answerQuestion } from "@/app/(app)/actions";
import {
  INTAKE_QUESTIONS,
  HISTORY_NOTE,
  applyIntakeWrites,
  nextIntakeQuestion,
  orderIntakeWrites,
  truncateAnswersAt,
  type IntakeQuestion,
  type IntakeWrite,
  type SpokenIntakeWrite,
} from "@/lib/domain/intake";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type Answers = Record<string, string>;

/**
 * Intake is a conversation, not a 40-field form: one question at a time,
 * in the traveller's own language, with every answer editable in place.
 *
 * This is the one `(app)` route with no laminate above it. The corridor
 * header in the layout only renders once a corridor exists, and finding
 * out what the corridor *is* is precisely this screen's job — a card
 * announcing the corridor is unknown, sitting directly on top of the
 * conversation asking about it, would be the product talking to itself.
 * So the signature moment here is the conversation.
 *
 * Two ways of holding that conversation. With a model behind it the
 * agent asks in its own words and understands whatever the traveller
 * writes back; without one it walks the same ten questions from a
 * script. The script is not a stub — it is the whole product minus the
 * fluency, and it is what runs when there is no API key and what this
 * falls back to mid-conversation if the model becomes unreachable. A
 * traveller must never be left staring at a dead chat box.
 */
export function IntakeAgent({
  applicationId,
  initialAnswers,
  firstName,
  aiEnabled,
}: {
  applicationId: string;
  initialAnswers: Answers;
  firstName: string;
  aiEnabled: boolean;
}) {
  const [degraded, setDegraded] = React.useState(false);
  // Where the scripted flow picks up if the model drops out mid-way, so
  // falling back re-asks the next question rather than the first.
  const [handover, setHandover] = React.useState(initialAnswers);

  if (!aiEnabled || degraded) {
    return (
      <ScriptedIntake
        applicationId={applicationId}
        initialAnswers={handover}
        firstName={firstName}
      />
    );
  }

  return (
    <LiveIntake
      applicationId={applicationId}
      initialAnswers={initialAnswers}
      firstName={firstName}
      onDegrade={(answers) => {
        setHandover(answers);
        setDegraded(true);
      }}
    />
  );
}

/**
 * The model-driven conversation. The model asks and listens; the writes
 * still go through `recordIntakeAnswer` on the server, so the rules that
 * govern an answer — truncation, the checklist rebuild — are the same
 * ones the scripted flow obeys.
 */
function LiveIntake({
  applicationId,
  initialAnswers,
  firstName,
  onDegrade,
}: {
  applicationId: string;
  initialAnswers: Answers;
  firstName: string;
  onDegrade: (answers: Answers) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [reopened, setReopened] = React.useState<{
    key: string;
    afterWrites: number;
    /** Where in the transcript it happened, so the re-asked question renders there. */
    afterMessages: number;
  } | null>(null);
  // What the voice session has recorded. The chat's writes can be read
  // back off the transcript; a spoken one leaves no message behind, so
  // it is kept here, each one carrying the point in the typed
  // conversation it happened at so the two streams can be re-ordered.
  const [spoken, setSpoken] = React.useState<SpokenIntakeWrite[]>([]);
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const endRef = React.useRef<HTMLDivElement>(null);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/intake/chat",
        body: { applicationId },
      }),
    [applicationId]
  );

  // `onError` fires long after the render that created it, so it cannot
  // close over the rail — the scripted flow would inherit whatever was
  // on it when the chat was first set up.
  const answersRef = React.useRef(initialAnswers);

  // The question this conversation opens on. State, not derived: it is
  // the first line of the transcript, and rewriting a transcript's
  // opening because later answers moved the frontier would be lying
  // about what was asked.
  const [opening] = React.useState(() => nextIntakeQuestion(initialAnswers));

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => {
      console.error("[intake] the conversation failed", error);
      toast.error(
        "The agent stopped responding. Carrying on with the short questions."
      );
      onDegrade(answersRef.current);
    },
  });

  // Every answer the traveller has typed, read back off the transcript
  // rather than kept alongside it. There is then no second copy to fall
  // out of step while a reply streams in.
  const typed = React.useMemo(() => {
    const writes: IntakeWrite[] = [];

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part) || getToolName(part) !== "record_answer") {
          continue;
        }
        if (part.state !== "output-available") continue;

        const input = part.input as { questionKey?: string; value?: string };
        if (!input?.questionKey || !input.value) continue;

        writes.push({ key: input.questionKey, value: input.value });
      }
    }

    return writes;
  }, [messages]);

  // The rail is the two streams put back into the order they happened
  // in, then replayed — which reproduces the truncation the server
  // already performed, so a re-answered topic clears everything after it
  // on both sides. Ordering is the whole point: a spoken answer replayed
  // after a later typed one would truncate the typed one away.
  const { answers: recorded, writes } = React.useMemo(() => {
    const ordered = orderIntakeWrites(typed, spoken);

    return {
      answers: applyIntakeWrites(initialAnswers, ordered),
      writes: ordered.length,
    };
  }, [typed, spoken, initialAnswers]);

  // A reopened answer is the traveller's intent, not a write — it holds
  // only until the model records something, which is the real clear.
  const reopenPending =
    reopened && reopened.afterWrites === writes ? reopened : null;
  const answers = reopenPending
    ? truncateAnswersAt(recorded, reopenPending.key)
    : recorded;

  // The reopened topic's question, in the traveller's own language —
  // built from `reopened` rather than `reopenPending`, so the question
  // stays in the transcript after the correction is recorded, the way
  // any asked question would.
  const reopenedQuestion = reopened
    ? INTAKE_QUESTIONS.find((q) => q.key === reopened.key)
    : undefined;
  const reasked = reopenedQuestion ? (
    <Turn from="agent">{t(reopenedQuestion.prompt)}</Turn>
  ) : null;

  const answeredCount = INTAKE_QUESTIONS.filter((q) => answers[q.key]).length;
  const current = INTAKE_QUESTIONS[answeredCount];
  const done = answeredCount === INTAKE_QUESTIONS.length;
  const busy = status === "submitted" || status === "streaming";

  // The session has to be ended from inside its own `onComplete`, which
  // is built before the session exists.
  const stopVoice = React.useRef<() => void>(undefined);

  // How much typing had happened when a spoken answer landed. Read
  // through a ref because the callback below outlives the render that
  // created it, and a stale count would file a spoken answer at the
  // wrong point in the conversation.
  const typedCount = React.useRef(typed.length);

  const voice = useVoiceIntake({
    applicationId,
    answers,
    firstName,
    locale,
    // No live transcript bubbles, deliberately: the rail filling in is
    // the feedback, and it is the only feedback that is also the record.
    // Speech the traveller can already hear does not need repeating on
    // screen, and a transcript we would have to persist is a thicker cut
    // than a demo needs.
    onAnswerRecorded: React.useCallback((key: string, value: string) => {
      setSpoken((writes) => [
        ...writes,
        { key, value, afterWrites: typedCount.current },
      ]);
    }, []),
    // The tenth answer ends the call rather than leaving the agent
    // talking over a screen that has moved on. The refresh is the
    // `done` effect above, which this write is about to trigger.
    onComplete: React.useCallback(() => stopVoice.current?.(), []),
    onError: React.useCallback((message: string) => toast.error(message), []),
  });

  const speaking = voice.status !== "idle";

  React.useEffect(() => {
    answersRef.current = answers;
    stopVoice.current = voice.stop;
    typedCount.current = typed.length;
  }, [answers, voice.stop, typed]);

  // The last answer is what builds the checklist, and the corridor
  // header lives in the layout above this screen — same refresh the
  // scripted flow does when its tenth answer lands. Arriving on an
  // already-complete intake is not that moment, so it does not count.
  const startedComplete = React.useRef(done);
  React.useEffect(() => {
    if (done && !startedComplete.current) router.refresh();
  }, [done, router]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status, reopened]);

  function send(value: string) {
    const text = value.trim();
    // `speaking` as well as `busy`: the composer being greyed out is
    // what a mouse obeys, and Enter is not a mouse. A typed turn
    // starting mid-call would put a second model on the same ten
    // questions, which is the one thing the greying out exists to stop.
    if (!text || busy || speaking) return;
    setDraft("");
    // The reopen never wrote anything, so the server still holds the old
    // answer — this is what tells the model which topic the correction
    // is for. Without it a bare "Germany" is ambiguous between two
    // country-shaped topics, and the model files it under the wrong one.
    void sendMessage(
      { text },
      reopenPending ? { body: { reopenedKey: reopenPending.key } } : undefined
    );
  }

  /**
   * Reopening an answer truncates the rail from that point. Nothing is
   * sent to the server: the traveller says what they meant instead, the
   * model records it, and that write is what actually clears the rest.
   */
  function editFrom(key: string) {
    setReopened({ key, afterWrites: writes, afterMessages: messages.length });
    toast.info("Answer reopened. Tell the agent what it should say instead.");
  }

  return (
    <AgentLayout
      answers={answers}
      answeredCount={answeredCount}
      done={done}
      // The log is the model's own words, so it carries no per-question
      // edit button the way the scripted transcript does — there is no
      // reliable mapping from a bubble back to a topic. The rail is
      // where an answer is reopened here.
      onEdit={editFrom}
      // Mid-call the rail's edit button would reopen an answer the agent
      // has no way of knowing about, and then wait for the traveller to
      // type — which is exactly what it cannot do right now. Saying it
      // out loud is the affordance while the microphone is on.
      editDisabled={speaking}
      log={
        <>
          <Turn from="agent" plain>{greeting(firstName)}</Turn>

          {/* The model only speaks once the traveller has, so the
            * conversation's first question is asked from the local list
            * — the same wording the scripted flow uses. Captured at
            * mount: it is the opening line of this transcript, and it
            * would be wrong for it to change under a finished one. */}
          {opening && <Turn from="agent">{t(opening.prompt)}</Turn>}

          {messages.map((message, i) => {
            const text = message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");
            if (!text && !(reasked && reopened?.afterMessages === i)) {
              return null;
            }

            return (
              <React.Fragment key={message.id}>
                {/* Re-asked locally at the point the rail edit happened:
                  * the model is only told about the reopen on the next
                  * message, so nothing else asks the question again. */}
                {reopened?.afterMessages === i && reasked}
                {text && (
                  <Turn from={message.role === "assistant" ? "agent" : "user"}>
                    {text}
                  </Turn>
                )}
              </React.Fragment>
            );
          })}

          {reasked && (reopened?.afterMessages ?? 0) >= messages.length && reasked}

          {status === "submitted" && <Thinking />}

          {done && <ProfileComplete />}

          <div ref={endRef} />
        </>
      }
      composer={
        !done && current ? (
          <>
            <Chips
              chips={current.chips}
              locale={locale}
              // Typing and speaking are two separate conversations with
              // two separate models. Letting both run would put two
              // agents on the same ten questions, so the written half
              // closes for as long as the spoken one is open.
              disabled={busy || speaking}
              // The traveller taps a word in their own language and the
              // model reads it as if they had typed it; the canonical
              // label is the model's job, from the prompt's list.
              onPick={(chip) => send(chip.label[locale] ?? chip.label.en)}
            />
            <Composer
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={() => send(draft)}
              disabled={busy || speaking}
              voice={{
                status: voice.status,
                onToggle:
                  voice.status === "idle"
                    ? () => void voice.start()
                    : voice.stop,
              }}
            />
          </>
        ) : null
      }
    />
  );
}

/**
 * The intake with no model behind it: the ten questions, in order, in
 * the traveller's language, answered by chip or free text. Every answer
 * goes straight to `answerQuestion`.
 */
function ScriptedIntake({
  applicationId,
  initialAnswers,
  firstName,
}: {
  applicationId: string;
  initialAnswers: Answers;
  firstName: string;
}) {
  const [answers, setAnswers] = React.useState<Answers>(initialAnswers);
  const [typing, setTyping] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const endRef = React.useRef<HTMLDivElement>(null);

  const answeredCount = INTAKE_QUESTIONS.filter((q) => answers[q.key]).length;
  const current = INTAKE_QUESTIONS[answeredCount];
  const done = answeredCount === INTAKE_QUESTIONS.length;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [answeredCount, typing]);

  function submit(value: string) {
    if (!current || !value.trim()) return;
    const key = current.key;

    setAnswers((a) => ({ ...a, [key]: value }));
    setDraft("");
    setTyping(true);

    startTransition(async () => {
      const result = await answerQuestion(applicationId, key, value);
      setTyping(false);
      if ("error" in result) {
        toast.error(result.error);
        setAnswers((a) => {
          const next = { ...a };
          delete next[key];
          return next;
        });
        return;
      }
      if (result.complete) router.refresh();
    });
  }

  /** Reopening an answer truncates the conversation from that point. */
  function editFrom(key: string) {
    setAnswers((a) => truncateAnswersAt(a, key));
    toast.info("Answer reopened. Anything after it will be asked again.");
  }

  return (
    <AgentLayout
      answers={answers}
      answeredCount={answeredCount}
      done={done}
      log={
        <>
          <Turn from="agent" plain>{greeting(firstName)}</Turn>

          {INTAKE_QUESTIONS.map((q, i) => {
            if (i > answeredCount) return null;
            const answer = answers[q.key];
            return (
              <React.Fragment key={q.key}>
                <Turn from="agent">{t(q.prompt)}</Turn>
                {answer && (
                  <Turn
                    from="user"
                    action={
                      <EditButton
                        label={t(q.prompt)}
                        onClick={() => editFrom(q.key)}
                      />
                    }
                  >
                    {answer}
                  </Turn>
                )}
              </React.Fragment>
            );
          })}

          {typing && <Thinking />}

          {current?.key === "history" && (
            <p className="border-l-2 border-border-strong pl-4 text-base leading-[1.7] text-ink-2">
              {HISTORY_NOTE}
            </p>
          )}

          {done && <ProfileComplete />}

          <div ref={endRef} />
        </>
      }
      composer={
        !done && current ? (
          <>
            <Chips
              chips={current.chips}
              locale={locale}
              disabled={pending}
              // The canonical label, not the translated one: with no
              // model in the loop this string is the answer of record,
              // and the corridor table is keyed on it.
              onPick={(chip) => submit(chip.value)}
            />
            <Composer
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={() => submit(draft)}
              disabled={pending}
            />
          </>
        ) : null
      }
    />
  );
}

/**
 * The chrome both conversations sit in: the speaker, the progress of the
 * ten questions, the scrolling log, and the rail showing the record as
 * it is assembled. Identical either way — the traveller should not be
 * able to tell from the furniture which agent they are talking to.
 */
function AgentLayout({
  answers,
  answeredCount,
  done,
  log,
  composer,
  onEdit,
  editDisabled,
}: {
  answers: Answers;
  answeredCount: number;
  done: boolean;
  log: React.ReactNode;
  composer: React.ReactNode;
  /** Reopen one answer from the rail. Omitted where the log does it. */
  onEdit?: (key: string) => void;
  /** Shown but inert — reopening is something to say, not tap, mid-call. */
  editDisabled?: boolean;
}) {
  // Only consulted below `lg`, where the rail is a drawer. On a desktop
  // the column is always open, by CSS, so this never runs.
  const [railOpen, setRailOpen] = React.useState(false);

  // The chat owns the viewport under the chrome. Below `lg` the chrome
  // is two bars — the app bar plus the nav rail that replaced the nav
  // that bar hides — so the subtraction has to account for both, or the
  // composer lands just off the bottom of a phone.
  return (
    <div className="flex h-[calc(100dvh-var(--bar-h)-var(--row-h)-1px)] flex-col lg:h-[calc(100dvh-var(--bar-h))] lg:flex-row">
      {/* ---- conversation ----
          `min-h-0` is what lets the log scroll instead of the page. A
          flex child defaults to `min-height: auto`, which refuses to
          shrink below its content — so the transcript pushed the column
          past the container, the container past the viewport, and the
          composer 600px down a phone. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
        {/* No speaker card, no avatar, no percentage bar. A conversation
            does not need to be introduced by a header announcing who is
            in it — the first line does that, and does it in words. What
            is left is the one fact the transcript cannot show you: how
            far through the ten questions you are. */}
        <div className="flex h-[var(--row-h)] shrink-0 items-center border-b border-border px-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-4">
            <p className="special-caps truncate">Toplance agent</p>
            <div className="flex shrink-0 items-center gap-3">
              <TickMeter answered={answeredCount} />
              {/* Two readings of one fact. Sighted, the count sits beside
                  ten ticks that say what it counts; read aloud, the ticks
                  are not there and "8 / 10" on its own could be anything,
                  so the spoken version says which question you are on. */}
              <span className="num special text-ink-2">
                <span className="sr-only">
                  {done
                    ? "Profile complete"
                    : `Question ${answeredCount + 1} of ${INTAKE_QUESTIONS.length}`}
                </span>
                <span aria-hidden>
                  {done
                    ? "Complete"
                    : `${answeredCount} / ${INTAKE_QUESTIONS.length}`}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 pb-2 pt-8 sm:px-6"
          role="log"
          aria-live="polite"
          aria-label="Conversation with the Toplance agent"
        >
          {/* Bottom-aligned, the way every message thread is. The
              question being asked belongs next to the box you answer it
              in — top-aligning it left the opening question stranded at
              the top of an empty screen with 500px between it and the
              composer. Once the transcript is taller than the viewport
              `min-h-full` stops binding and it scrolls normally. */}
          <div className="mx-auto flex min-h-full max-w-[720px] flex-col justify-end gap-7">
            {log}
          </div>
        </div>

        {composer && (
          <div className="relative shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
            {/* The transcript runs out under the composer rather than
                stopping dead against a border. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-bg"
            />
            <div className="mx-auto max-w-[720px]">{composer}</div>
          </div>
        )}
      </div>

      {/* ---- live profile ----
          The record being assembled, on the surface colour so it reads as
          the document the conversation is filling in rather than a card
          floating on the same ground the chat sits on.

          A permanent column on a desktop, a drawer on a phone. Ten rows
          is most of a phone screen, and a screen split evenly between the
          conversation and a read-only summary of it gives neither one
          enough room — so below `lg` it collapses to its own heading and
          opens on a tap, above the conversation where a summary belongs
          rather than stranded under the composer. */}
      <aside className="order-first flex w-full shrink-0 flex-col overflow-hidden border-b border-border bg-surface lg:order-none lg:w-[320px] lg:overflow-y-auto lg:border-b-0 lg:border-l">
        {/* Same height and same rule as the conversation's strip, so the
            two headings sit on one line across the whole screen. */}
        <button
          type="button"
          onClick={() => setRailOpen((open) => !open)}
          aria-expanded={railOpen}
          aria-controls="intake-profile"
          className="special-caps sticky top-0 z-10 flex h-[var(--row-h)] shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 text-left hover:text-ink-2 lg:pointer-events-none lg:px-6 lg:hover:text-ink-3"
        >
          <span>Your profile</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform duration-[var(--dur-toggle)] lg:hidden",
              railOpen && "rotate-180"
            )}
          />
        </button>
        <dl
          id="intake-profile"
          className={cn(
            "overflow-y-auto px-4 py-3 lg:block lg:px-6",
            railOpen ? "block max-h-[46dvh] lg:max-h-none" : "hidden"
          )}
        >
          {INTAKE_QUESTIONS.map((q, i) => (
            <ProfileRow
              key={q.key}
              label={LABELS[q.key]}
              value={answers[q.key]}
              asking={!answers[q.key] && i === answeredCount}
              edit={
                onEdit && answers[q.key] ? (
                  <EditButton
                    label={LABELS[q.key]}
                    disabled={editDisabled}
                    onClick={() => onEdit(q.key)}
                  />
                ) : null
              }
            />
          ))}
        </dl>
      </aside>
    </div>
  );
}

/**
 * Ten questions, ten ticks. Not a percentage bar: the thing being
 * measured is a countable list of ten discrete answers, and a continuous
 * bar would round it into something the traveller cannot check against
 * the rail beside it. The tick that pulses is the question being asked,
 * which is the same beat the rail's "asking now" row keeps.
 */
function TickMeter({ answered }: { answered: number }) {
  return (
    <span
      aria-hidden
      className="hidden items-center gap-[3px] sm:flex"
    >
      {INTAKE_QUESTIONS.map((q, i) => (
        <span
          key={q.key}
          className={cn(
            "h-[3px] w-3.5 rounded-[var(--radius-pill)] transition-colors duration-[var(--dur-ring)] ease-[var(--ease-out)]",
            i < answered
              ? "bg-brand"
              : i === answered
                ? "intake-pulse bg-brand"
                : "bg-border-strong"
          )}
        />
      ))}
    </span>
  );
}

/**
 * One line of the record. The label sits above the value rather than
 * opposite it: half these answers are phrases — "Partner and children",
 * "A medical condition" — and a label-left/value-right row forces those
 * to wrap into a ragged right-aligned column two words wide.
 */
function ProfileRow({
  label,
  value,
  asking,
  edit,
}: {
  label: string;
  value?: string;
  asking: boolean;
  edit: React.ReactNode;
}) {
  // The wash fires on the render the answer first appears in, and only
  // then — a row that was already filled when the page loaded has not
  // just been answered, and animating it would be inventing an event.
  //
  // Adjusting state during render rather than in an effect, which is the
  // supported way to derive from a changed prop: the row paints filled
  // and washing in one pass. An effect would paint it filled and unwashed
  // first, and the wash would arrive a frame late as a flicker. A ref
  // cannot do this job at all — it is read during render, and React is
  // free to render without committing, which would spend the animation on
  // a paint that never happened.
  const [prev, setPrev] = React.useState(value);
  const [landed, setLanded] = React.useState(false);
  if (value !== prev) {
    setPrev(value);
    // Only filling counts. Clearing one on an edit takes the class off
    // again, which is what lets the wash replay when it is re-answered —
    // a CSS animation only restarts if its class actually leaves.
    setLanded(Boolean(value) && !prev);
  }

  return (
    <div
      className={cn(
        "group/row -mx-2 rounded-sm px-2 py-2.5",
        landed && "intake-settle"
      )}
    >
      <dt className="special">{label}</dt>
      <dd className="mt-0.5 flex min-h-[22px] items-center justify-between gap-2">
        {value ? (
          <span className="t-title text-ink">{value}</span>
        ) : asking ? (
          <span className="t-title flex items-center gap-2 text-brand-text">
            <span className="intake-pulse size-1.5 rounded-full bg-brand" />
            Asking now
          </span>
        ) : (
          /* A ruled line across the whole field, not a 56px stub. This
             column is a record being filled in, and a blank line is what
             an unfilled record looks like — nine short dashes floating
             under nine labels just looked like the page had failed to
             load. It also holds the row to the same height as a filled
             one, so the list stops looking ragged. */
          <span
            aria-label="Not answered yet"
            className="block h-0 w-full border-b border-dashed border-border-strong"
          />
        )}
        {edit}
      </dd>
    </div>
  );
}

/**
 * The opening line, before either agent has said anything of its own.
 *
 * Rendered plain (`<Turn plain>`), not through `ChatMarkdown`: the
 * traveller's own name is in it, and the shared renderer is for model
 * output only.
 */
function greeting(firstName: string) {
  return `Nice to meet you, ${firstName || "there"}. I will ask a few short questions so I know exactly what you need. You can type, or tap one of the suggestions.`;
}

type Chip = IntakeQuestion["chips"][number];

function Chips({
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
    // them. Five suggestions at 390px wrap to five lines and push the
    // question that they answer off the top of the screen — the shortcut
    // costs more room than the thing it is a shortcut past.
    //
    // Bled to the screen edge so a half-cut chip is visible at the fold,
    // which is what says there is more to scroll to.
    <div className="-mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
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

function Composer({
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
      className="flex items-end gap-1 rounded-[26px] border border-border-strong bg-surface p-1.5 shadow-[var(--shadow)] transition-[border-color,box-shadow] duration-[var(--dur-tap)] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--brand)_20%,transparent)]"
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
        // The suggestions are sitting directly above the box; a
        // placeholder that also points at them is one element doing two
        // jobs, and at 390px it cost a second line of composer to do it.
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
 * the speaker's avatar, because a live microphone is worth exactly that
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

function EditButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Edit your answer to: ${label}`}
      title={
        disabled
          ? "Say what it should be instead — the agent is listening"
          : "Edit this answer"
      }
      className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 opacity-0 transition-[color,background,opacity] duration-[var(--dur-tap)] hover:bg-surface-2 hover:text-ink focus-visible:opacity-100 group-hover/row:opacity-100 disabled:pointer-events-none disabled:opacity-40 max-lg:opacity-100"
    >
      <RotateCcw className="size-4" />
    </button>
  );
}

/**
 * The agent is composing. One dot, on the page where its words are about
 * to appear — not three bouncing inside an empty bubble, which drew a
 * container the reply itself will not have.
 */
function Thinking() {
  return (
    <div role="status" aria-label="The agent is answering">
      <span className="intake-thinking block size-2.5 rounded-full bg-ink-3" />
    </div>
  );
}

function ProfileComplete() {
  /* A real boundary — before it the corridor is unknown, after it there
     is a checklist — so it gets §8's 3px rule rather than a tinted box. */
  return (
    <div className="mt-2">
      <span
        aria-hidden
        className="block h-[3px] w-16 rounded-[var(--radius-pill)] bg-success"
      />
      <p className="t-title mt-4">Profile complete</p>
      <p className="t-muted mt-2">
        Your checklist is built from these answers. You can change any of them
        later and it rebuilds.
      </p>
      <Button asChild className="mt-4">
        <Link href="/app/requirements">
          See my requirements <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

const LABELS: Record<string, string> = {
  nationality: "Nationality",
  residence: "Living in",
  destination: "Destination",
  purpose: "Purpose",
  dates: "Travel dates",
  budget: "Budget",
  accommodation: "Accommodation",
  companions: "Travel party",
  needs: "Food & support",
  history: "Visa history",
};

/**
 * One turn of the conversation. The two sides are deliberately not
 * mirror images.
 *
 * The agent speaks straight onto the page — no bubble, no border, no
 * card. Its turns are the ones that carry length: a question plus the
 * reason behind it, a list, a correction. Boxing them caps them at a
 * bubble's width and makes every paragraph look like a chat notification
 * rather than something written to be read. The traveller's turns are
 * short by construction — a country, a date, a tapped suggestion — so
 * those keep a bubble, which is what tells the two voices apart now that
 * the sides no longer differ in shape alone.
 *
 * The bubble is neutral rather than brand. An answer read back to you is
 * a receipt, not a call to action, and there is only one thing on this
 * screen worth the loudest colour in the system: the button that sends
 * the next one.
 */
function Turn({
  from,
  plain = false,
  action,
  children,
}: {
  from: "agent" | "user";
  /**
   * Renders the turn's text as text, Markdown and all. For the one agent
   * line that is not model output: the greeting, which embeds the
   * traveller's own name. The platform convention is that only
   * model-authored messages go through `ChatMarkdown`.
   */
  plain?: boolean;
  /** Sits outside the bubble, in the gutter. Reopening an answer. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (from === "agent") {
    return (
      <div className="max-w-full text-base leading-[1.7] text-ink">
        {plain || typeof children !== "string" ? (
          children
        ) : (
          <ChatMarkdown>{children}</ChatMarkdown>
        )}
      </div>
    );
  }

  return (
    <div className="group/row flex items-start justify-end gap-1">
      {action}
      {/* `surface-inset`, not `surface-2`: the transcript ground is
          already `bg`, and a `surface-2` bubble on it is a two-step
          difference that disappears at a glance. White is spoken for —
          it is what the composer and the record are made of. */}
      <div className="max-w-[80%] rounded-[20px] bg-surface-inset px-4 py-2.5 text-base leading-[1.6] text-ink">
        {children}
      </div>
    </div>
  );
}
