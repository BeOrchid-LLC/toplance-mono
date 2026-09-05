"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MessagesSquare, X } from "lucide-react";
import { toast } from "sonner";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { useChat } from "@ai-sdk/react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/components/locale-provider";
import { ChatMarkdown } from "@/components/app/chat-markdown";
import { AgentDock, Chips, Composer } from "@/components/app/intake-dock";
import { EditButton, RecordDocument } from "@/components/app/intake-record";
import { useVoiceIntake } from "@/components/app/use-voice-intake";
import { answerQuestion } from "@/app/(app)/actions";
import {
  INTAKE_QUESTIONS,
  resolveChips,
  HISTORY_NOTE,
  applyIntakeWrites,
  intakeFrontier,
  nextIntakeQuestion,
  orderIntakeWrites,
  truncateAnswersAt,
  type IntakeWrite,
  type SpokenIntakeWrite,
} from "@/lib/domain/intake";

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
 * writes back; without one it walks the same questions from a
 * script. The script is not a stub — it is the whole product minus the
 * fluency, and it is what runs when there is no API key and what this
 * falls back to mid-conversation if the model becomes unreachable. A
 * traveller must never be left staring at a dead chat box.
 */
export function IntakeAgent({
  applicationId,
  initialAnswers,
  fullName,
  aiEnabled,
}: {
  applicationId: string;
  initialAnswers: Answers;
  fullName: string;
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
        fullName={fullName}
      />
    );
  }

  return (
    <LiveIntake
      applicationId={applicationId}
      initialAnswers={initialAnswers}
      fullName={fullName}
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
  fullName,
  onDegrade,
}: {
  applicationId: string;
  initialAnswers: Answers;
  fullName: string;
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
    [applicationId],
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

  // A single failed turn is usually the provider blipping — a rate limit,
  // a timeout — not the model being unreachable, and retrying it costs a
  // traveller nothing. Dropping to the scripted flow on the first error
  // used to make that guess permanently on their behalf: one blip, and
  // the rest of the conversation silently lost the model for good. Only
  // consecutive failures earn the fallback.
  const errorStreak = React.useRef(0);

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => {
      console.error("[intake] the conversation failed", error);
      errorStreak.current += 1;
      if (errorStreak.current < 2) {
        toast.error("That didn't go through. Try again.");
        return;
      }
      toast.error(
        "The agent stopped responding. Carrying on with the short questions.",
      );
      onDegrade(answersRef.current);
    },
    onFinish: ({ isError }) => {
      if (!isError) errorStreak.current = 0;
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

  // The newest thing the model actually said, which is the dock's line.
  // Read off the transcript for the same reason the answers are: there
  // is then no second copy to fall out of step while a reply streams in.
  const latest = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== "assistant") continue;
      const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
      if (text) return text;
    }
    return "";
  }, [messages]);

  // The gap the agent is asking at, which is what the server built its
  // prompt from this turn. Not a count of what is filled: `record_answer`
  // takes any of the intake's keys, so an answer can land out of order and
  // leave a hole behind it, and a count would then offer the chips for
  // the question *after* the one being asked.
  const frontier = intakeFrontier(answers);
  const current = INTAKE_QUESTIONS[frontier];
  const done = frontier === INTAKE_QUESTIONS.length;
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
    fullName,
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
      reopenPending ? { body: { reopenedKey: reopenPending.key } } : undefined,
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

  // Whether the locally re-asked question is still the live one. After
  // the traveller replies the model answers for itself, and the dock has
  // to follow it there — `reopenPending` alone stays true until a write
  // lands, which would pin a stale question under a newer reply.
  const reaskingNow =
    Boolean(reopenPending && reasked) &&
    (reopened?.afterMessages ?? 0) >= messages.length;

  return (
    <AgentLayout
      answers={answers}
      frontier={frontier}
      done={done}
      // The document is the only place an answer is reopened here: the
      // log is the model's own words, and there is no reliable mapping
      // from a bubble back to a topic.
      onEdit={editFrom}
      reopenedKey={reopenPending?.key}
      // What the field said before, struck through while the
      // replacement is asked for. Off `recorded` rather than `answers`,
      // which the reopen has already truncated.
      reopenedPrevious={reopenPending ? recorded[reopenPending.key] : undefined}
      say={
        status === "submitted" ? (
          <Thinking />
        ) : (
          <>
            {messages.length === 0 && <p>{greeting(fullName)}</p>}
            {reaskingNow && reopenedQuestion ? (
              <p className="font-semibold">{t(reopenedQuestion.prompt)}</p>
            ) : latest ? (
              /* Model output, so it goes through the shared renderer —
                 the platform rule, and the reason the dock's line is a
                 node rather than a string. */
              <ChatMarkdown>{latest}</ChatMarkdown>
            ) : opening ? (
              <p className="font-semibold">{t(opening.prompt)}</p>
            ) : null}
          </>
        )
      }
      // Mid-call the rail's edit button would reopen an answer the agent
      // has no way of knowing about, and then wait for the traveller to
      // type — which is exactly what it cannot do right now. Saying it
      // out loud is the affordance while the microphone is on.
      editDisabled={speaking}
      log={
        <>
          <Turn from="agent" plain>
            {greeting(fullName)}
          </Turn>

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

          {reasked &&
            (reopened?.afterMessages ?? 0) >= messages.length &&
            reasked}

          {status === "submitted" && <Thinking />}

          <div ref={endRef} />
        </>
      }
      composer={
        !done && current ? (
          <>
            <Chips
              chips={resolveChips(current, { fullName })}
              locale={locale}
              // Typing and speaking are two separate conversations with
              // two separate models. Letting both run would put two
              // agents on the same questions, so the written half
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
 * The intake with no model behind it: every question, in order, in
 * the traveller's language, answered by chip or free text. Every answer
 * goes straight to `answerQuestion`.
 */
function ScriptedIntake({
  applicationId,
  initialAnswers,
  fullName,
}: {
  applicationId: string;
  initialAnswers: Answers;
  fullName: string;
}) {
  const [answers, setAnswers] = React.useState<Answers>(initialAnswers);
  const [typing, setTyping] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  // Held only so the record can say a topic is being asked *again*
  // rather than for the first time. The live agent gets this for free
  // from its pending reopen; here the truncation is immediate, so
  // without this the field would be indistinguishable from one nobody
  // had reached yet — and the two agents are supposed to be telling the
  // traveller the same story.
  const [reopened, setReopened] = React.useState<{
    key: string;
    previous: string;
  } | null>(null);
  const [pending, startTransition] = React.useTransition();
  // The server's own verdict on the last write. An intake that was
  // already finished when this screen opened starts out confirmed;
  // every submission clears it until `answerQuestion` answers, so a
  // write in flight can never read as a finished intake.
  const [confirmed, setConfirmed] = React.useState(
    () => intakeFrontier(initialAnswers) === INTAKE_QUESTIONS.length
  );
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const endRef = React.useRef<HTMLDivElement>(null);

  // Same gap the live conversation asks at, and for a sharper reason: the
  // handover answers come from a model-driven session that may have left
  // a hole, and `submit` files the reply under `current.key`. Counting
  // here would not merely mislabel the screen — it would save the
  // traveller's answer under the wrong question.
  const frontier = intakeFrontier(answers);
  const current = INTAKE_QUESTIONS[frontier];
  // Two conditions, because the optimistic copy and the server's copy
  // answer different questions. `asked` — has the conversation run out
  // of questions — is the local one's to answer, and it is what takes
  // the composer away the instant a chip is tapped.
  //
  // Whether the *intake* is finished is only the server's to answer,
  // and the final answer is the one write where the two come apart:
  // `recordIntakeAnswer` builds the checklist on it, which resolves a
  // corridor over the network, so it lands a second or so after the tap
  // rather than immediately. Reading completion off the optimistic copy
  // put "Profile complete" and a "See my requirements" CTA on screen
  // while `intake_complete` was still false — and every page that CTA
  // leads to redirects back here on that column, so the traveller was
  // handed a button that returned them to the screen they had just
  // finished.
  //
  // The server's answer is taken from `answerQuestion`'s own return
  // value rather than from a refreshed prop: `initialAnswers` arrives
  // here as the wrapper's `handover` state, which is a snapshot taken
  // at mount and deliberately not resynced, so a `router.refresh()`
  // would never reach this component.
  const asked = frontier === INTAKE_QUESTIONS.length;
  const done = asked && confirmed;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [frontier, typing]);

  function submit(value: string) {
    if (!current || !value.trim()) return;
    const key = current.key;

    setAnswers((a) => ({ ...a, [key]: value }));
    setDraft("");
    setTyping(true);
    setConfirmed(false);
    setReopened(null);

    startTransition(async () => {
      const result = await answerQuestion(applicationId, key, value);
      if ("error" in result) {
        setTyping(false);
        toast.error(result.error);
        setAnswers((a) => {
          const next = { ...a };
          delete next[key];
          return next;
        });
        return;
      }
      setConfirmed(result.complete);
      // The corridor header lives in the layout above this screen and
      // is built by the same write, so the final answer refreshes it.
      // `typing` deliberately stays on until then: the dock has no
      // question left to show, and emptying it would read as the agent
      // having nothing to say rather than as work still in progress.
      if (result.complete) router.refresh();
      else setTyping(false);
    });
  }

  /** Reopening an answer truncates the conversation from that point. */
  function editFrom(key: string) {
    const previous = answers[key];
    setAnswers((a) => truncateAnswersAt(a, key));
    // The tenth answer leaves `typing` on so the dock stays busy until
    // the completion bar replaces it. Reopening is the one way back out
    // of that state, and without this the re-asked question would
    // arrive behind a thinking indicator that has nothing left to do.
    setTyping(false);
    setReopened(previous ? { key, previous } : null);
    toast.info("Answer reopened. Anything after it will be asked again.");
  }

  const fresh = INTAKE_QUESTIONS.every((q) => !answers[q.key]);

  return (
    <AgentLayout
      answers={answers}
      frontier={frontier}
      done={done}
      onEdit={editFrom}
      reopenedKey={reopened?.key}
      reopenedPrevious={reopened?.previous}
      say={
        typing ? (
          <Thinking />
        ) : (
          <>
            {fresh && <p>{greeting(fullName)}</p>}
            {current && <p className="font-semibold">{t(current.prompt)}</p>}
            {/* Attached to the question it qualifies rather than left in
                the transcript. It is guidance for the answer being given
                now, not a turn that was taken. */}
            {current?.key === "history" && (
              <p className="text-ink-2">{HISTORY_NOTE}</p>
            )}
          </>
        )
      }
      log={
        <>
          <Turn from="agent" plain>
            {greeting(fullName)}
          </Turn>

          {INTAKE_QUESTIONS.map((q, i) => {
            if (i > frontier) return null;
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

          <div ref={endRef} />
        </>
      }
      composer={
        !done && current ? (
          <>
            <Chips
              chips={resolveChips(current, { fullName })}
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
 * The chrome both conversations sit in: the record being assembled, and
 * the agent docked under it asking the next question.
 *
 * The record is the subject of this screen, not a summary beside it.
 * Ten labelled fields are the same amount of structure on an empty
 * intake as on a finished one, so the opening screen has something to be
 * — where a bottom-aligned transcript in a bordered sheet had a single
 * greeting pinned to the foot of several hundred pixels of nothing.
 *
 * What that trades away is the thread. The back-and-forth is still the
 * whole mechanism — every answer is recorded by the agent, corrections
 * included — but it is working material now, behind `Transcript`, and
 * the durable thing is the document it produced. That trade is right
 * here and would be wrong in an open-ended assistant, where the thread
 * is the artefact.
 *
 * Identical for both agents. The traveller should not be able to tell
 * from the furniture which one they are talking to.
 */
function AgentLayout({
  answers,
  frontier,
  done,
  say,
  log,
  composer,
  onEdit,
  editDisabled,
  reopenedKey,
  reopenedPrevious,
}: {
  answers: Answers;
  /** Index of the question being asked — see `intakeFrontier`. */
  frontier: number;
  done: boolean;
  /** What the agent is saying right now. The dock's line, not the log. */
  say: React.ReactNode;
  /** The full transcript, shown when the traveller opens it. */
  log: React.ReactNode;
  composer: React.ReactNode;
  /** Reopen one answer from the record. Omitted where the log does it. */
  onEdit?: (key: string) => void;
  /** Shown but inert — reopening is something to say, not tap, mid-call. */
  editDisabled?: boolean;
  reopenedKey?: string;
  reopenedPrevious?: string;
}) {
  const [transcript, setTranscript] = React.useState(false);

  // The record owns the viewport height under the chrome, which is now a
  // single bar at every width — the phone nav lives in the bar's
  // hamburger, not in a second rail below it.
  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--bar-h))] w-full max-w-[1240px] flex-col">
      <div className="relative isolate flex min-h-0 flex-1 flex-col">
        {/* Ruled security stock. Official documents are printed on a
            ground, never on blank white, and the document above it is
            now literally a data page — so the stock is doing the job it
            was written for rather than showing in a 20px gutter beside a
            white sheet that covered it. */}
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-0 -z-10"
        />

        {/* Centred in whatever room is left, which is safe precisely
            because the document does not grow: all ten fields render
            from the first paint, so its height only moves when a value
            wraps. Top-aligning it instead left several hundred pixels of
            ruled nothing between the record and the dock — the same void
            this layout replaced, one surface further along.

            `min-h-full` on the inner box rather than centring the
            scroller itself: a flex child centred inside a fixed-height
            scroll container has its overflow clipped at the top, so a
            long record would lose its first fields with no way to reach
            them. This grows past the viewport instead and scrolls. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full items-center px-4 py-5 sm:px-6 sm:py-7">
            <RecordDocument
              answers={answers}
              frontier={frontier}
              done={done}
              onEdit={onEdit}
              editDisabled={editDisabled}
              reopenedKey={reopenedKey}
              reopenedPrevious={reopenedPrevious}
            />
          </div>
        </div>

        {transcript && (
          <TranscriptPanel onClose={() => setTranscript(false)}>
            {log}
          </TranscriptPanel>
        )}
      </div>

      {/* A dock is a place to answer. Once the final answer lands there
          is nothing to answer, so the furniture changes rather than
          emptying out — the composer and the suggestions go, and what is
          left says what happened and what to do next. */}
      {done ? (
        <CompletionBar
          transcriptOpen={transcript}
          onToggleTranscript={() => setTranscript((open) => !open)}
        />
      ) : (
        <AgentDock
          say={say}
          composer={composer}
          transcriptOpen={transcript}
          onToggleTranscript={() => setTranscript((open) => !open)}
        />
      )}
    </div>
  );
}

/**
 * The conversation that produced the record, over the record.
 *
 * Mounted only while open, which is what lets it come up scrolled to the
 * newest turn: the intakes’ own `endRef` effects fire on new messages,
 * not on this panel appearing, so opening it a hundred turns in would
 * otherwise land at the greeting.
 *
 * It is deliberately not a live region any more. That role moved to the
 * dock’s line, which is the one thing always on screen — a live region
 * that is usually unmounted announces nothing.
 */
function TranscriptPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div
      id="intake-transcript"
      className="absolute inset-0 z-20 flex animate-in flex-col bg-surface fade-in-0 slide-in-from-bottom-4 duration-[var(--dur-sheet)]"
    >
      <div className="flex h-[var(--row-h)] shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
        <p className="special-caps">Conversation</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the conversation and go back to your record"
          className="-me-2 grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-[var(--dur-tap)] hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div
        ref={box}
        role="log"
        aria-label="Conversation with the Toplance agent"
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-7">
          {children}
        </div>
      </div>
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
function greeting(fullName: string) {
  const firstName = fullName.trim().split(" ")[0] ?? "";
  return `Nice to meet you, ${firstName || "there"}. I will ask a few short questions so I know exactly what you need. You can type, or tap one of the suggestions.`;
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

/**
 * The end of the intake. A real boundary — before it the corridor is
 * unknown, after it there is a checklist — and the screen should look
 * like it crossed one.
 *
 * What stood here was the transcript's completion block wedged into the
 * dock's composer slot, under an agent line saying "that is everything I
 * need". Two announcements of the same fact, stacked: the line, then a
 * rule, then a heading repeating it. The rule was §8's boundary marker,
 * which is right in a scrolling log where a boundary needs drawing and
 * wrong in a bar that *is* one. And the block sat flush left while the
 * line above it was indented past the agent's mark, so the two things
 * saying the same thing did not even line up.
 *
 * One statement now, on the same 720px measure the dock and the record
 * both use, so nothing shifts sideways as the screen changes state.
 * The success disc is the ring treatment `/app/profile` already uses for
 * a finished step, rather than a fourth way of drawing "done".
 *
 * The transcript keeps a button here because this is the last screen
 * that has one: after the traveller follows the CTA there is no other
 * way back to what was said.
 */
function CompletionBar({
  transcriptOpen,
  onToggleTranscript,
}: {
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
}) {
  return (
    // The same card the dock was, so the final answer changes what the
    // panel says without changing what it is. See `AgentDock`.
    <div className="shrink-0 px-4 pb-5 pt-3 sm:px-6 sm:pb-7">
      {/* A grid rather than a row, so the sentence can run the full
          measure underneath the buttons instead of being squeezed into
          whatever they leave. Laid out flat it wrapped into a ~210px
          column with half the bar empty beside it, which reads as text
          that did not fit rather than as a line anybody chose. */}
      <div className="ovi-edge mx-auto grid w-full max-w-[720px] grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-[var(--radius-lg)] bg-surface px-5 py-4 shadow-[var(--shadow-lg)] sm:grid-cols-[auto_1fr_auto] sm:gap-y-1.5 sm:px-7 sm:py-5">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-success text-white ring-4 ring-[color-mix(in_srgb,var(--success)_16%,transparent)]"
        >
          <Check className="size-4" />
        </span>

        <p className="t-title">Profile complete</p>

        <p className="t-muted col-span-2 text-[15px] sm:col-start-2 sm:row-start-2">
          Your checklist is ready. You can change any answer later and it
          rebuilds.
        </p>

        {/* Stacked and full-width on a phone, where two buttons side by
            side would each be too narrow to read; a row from `sm`, with
            the quiet one first so the primary keeps the outside edge. */}
        <div className="col-span-2 flex flex-col-reverse gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onToggleTranscript}
            aria-expanded={transcriptOpen}
            aria-controls="intake-transcript"
            className="special flex h-[var(--row-h)] items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 transition-colors duration-[var(--dur-tap)] hover:bg-surface-2 hover:text-ink"
          >
            {transcriptOpen ? (
              <X aria-hidden className="size-4" />
            ) : (
              <MessagesSquare aria-hidden className="size-4" />
            )}
            {transcriptOpen ? "Close" : "Transcript"}
          </button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/app/requirements">
              See my requirements <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      {/* `surface-inset`, not `surface-2`. It was chosen when the
          transcript ground was `--bg`, where `surface-2` was a step too
          small to see; the sheet has since made that ground `--surface`,
          which only widens the gap — `#e7eaf1` on white in light, and in
          dark an inset that goes darker than the surface it sits on. The
          bubble reads better here than it did before, so the token
          stands. */}
      <div className="max-w-[80%] rounded-[20px] bg-surface-inset px-4 py-2.5 text-base leading-[1.6] text-ink">
        {children}
      </div>
    </div>
  );
}
