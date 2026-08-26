"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, RotateCcw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { useChat } from "@ai-sdk/react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocale, useT } from "@/components/locale-provider";
import { ChatMarkdown } from "@/components/app/chat-markdown";
import { answerQuestion } from "@/app/(app)/actions";
import {
  INTAKE_QUESTIONS,
  HISTORY_NOTE,
  type IntakeQuestion,
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
  } | null>(null);
  const { locale } = useLocale();
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

  // The rail is derived from the tool calls in the transcript rather
  // than kept alongside it. There is then no second copy to fall out of
  // step while a reply streams in, and replaying the writes in order
  // reproduces the truncation the server already performed — a
  // re-answered topic clears everything after it on both sides.
  const { answers: recorded, writes } = React.useMemo(() => {
    let answers: Answers = { ...initialAnswers };
    let writes = 0;

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part) || getToolName(part) !== "record_answer") {
          continue;
        }
        if (part.state !== "output-available") continue;

        const input = part.input as { questionKey?: string; value?: string };
        if (!input?.questionKey || !input.value) continue;

        answers = truncateAt(answers, input.questionKey);
        answers[input.questionKey] = input.value;
        writes += 1;
      }
    }

    return { answers, writes };
  }, [messages, initialAnswers]);

  // A reopened answer is the traveller's intent, not a write — it holds
  // only until the model records something, which is the real clear.
  const answers =
    reopened && reopened.afterWrites === writes
      ? truncateAt(recorded, reopened.key)
      : recorded;

  const answeredCount = INTAKE_QUESTIONS.filter((q) => answers[q.key]).length;
  const current = INTAKE_QUESTIONS[answeredCount];
  const done = answeredCount === INTAKE_QUESTIONS.length;
  const busy = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

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
  }, [messages, status]);

  function send(value: string) {
    const text = value.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  /**
   * Reopening an answer truncates the rail from that point. Nothing is
   * sent to the server: the traveller says what they meant instead, the
   * model records it, and that write is what actually clears the rest.
   */
  function editFrom(key: string) {
    setReopened({ key, afterWrites: writes });
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
      log={
        <>
          <p className="special-caps mx-auto">Conversation started</p>

          <Bubble from="agent">{greeting(firstName)}</Bubble>

          {messages.map((message) => {
            const text = message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");
            if (!text) return null;

            return (
              <Bubble
                key={message.id}
                from={message.role === "assistant" ? "agent" : "user"}
              >
                {text}
              </Bubble>
            );
          })}

          {status === "submitted" && <TypingDots />}

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
              disabled={busy}
              // The traveller taps a word in their own language and the
              // model reads it as if they had typed it; the canonical
              // label is the model's job, from the prompt's list.
              onPick={(chip) => send(chip.label[locale] ?? chip.label.en)}
            />
            <Composer
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={() => send(draft)}
              disabled={busy}
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
    setAnswers((a) => truncateAt(a, key));
    toast.info("Answer reopened. Anything after it will be asked again.");
  }

  return (
    <AgentLayout
      answers={answers}
      answeredCount={answeredCount}
      done={done}
      log={
        <>
          <p className="special-caps mx-auto">Conversation started</p>

          <Bubble from="agent">{greeting(firstName)}</Bubble>

          {INTAKE_QUESTIONS.map((q, i) => {
            if (i > answeredCount) return null;
            const answer = answers[q.key];
            return (
              <React.Fragment key={q.key}>
                <Bubble from="agent">{t(q.prompt)}</Bubble>
                {answer && (
                  <div className="flex items-center justify-end gap-2">
                    <EditButton
                      label={t(q.prompt)}
                      onClick={() => editFrom(q.key)}
                    />
                    <Bubble from="user">{answer}</Bubble>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {typing && <TypingDots />}

          {current?.key === "history" && (
            <p className="t-muted border-l-2 border-border-strong py-1 pl-4">
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
}: {
  answers: Answers;
  answeredCount: number;
  done: boolean;
  log: React.ReactNode;
  composer: React.ReactNode;
  /** Reopen one answer from the rail. Omitted where the log does it. */
  onEdit?: (key: string) => void;
}) {
  // The chat owns the viewport under the chrome. Below `lg` the chrome
  // is two bars — the app bar plus the nav rail that replaced the nav
  // that bar hides — so the subtraction has to account for both, or the
  // composer lands just off the bottom of a phone.
  return (
    <div className="flex h-[calc(100dvh-var(--bar-h)-var(--row-h)-1px)] flex-col lg:h-[calc(100dvh-var(--bar-h))] lg:flex-row">
      {/* ---- conversation ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
          {/* The one drop of the brand gradient on the screen: the agent
              itself. Everything else stays flat so the speaker is the
              most saturated thing in the conversation. */}
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[image:var(--brand-grad)] text-white shadow-[var(--shadow-sm)]">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="t-title">Toplance Agent</p>
            <p className="special-caps">
              {done
                ? "Profile complete"
                : `Listening · question ${answeredCount + 1} of ${INTAKE_QUESTIONS.length}`}
            </p>
          </div>
        </div>

        <div className="h-1 shrink-0 bg-surface-2">
          <div
            className="h-full bg-brand transition-[width] duration-[var(--dur-ring)] ease-[var(--ease-out)]"
            style={{ width: `${(answeredCount / INTAKE_QUESTIONS.length) * 100}%` }}
          />
        </div>

        <div
          className="flex-1 overflow-y-auto bg-bg p-4 sm:p-6"
          role="log"
          aria-live="polite"
          aria-label="Conversation with the Toplance agent"
        >
          <div className="mx-auto flex max-w-[720px] flex-col gap-4">{log}</div>
        </div>

        {composer && (
          <div className="border-t border-border bg-surface p-4 sm:p-6">
            <div className="mx-auto max-w-[720px]">{composer}</div>
          </div>
        )}
      </div>

      {/* ---- live profile ---- */}
      {/* A sheet from the case file rather than a flat attached column:
          the same card the profile page is built from, so the record
          being assembled here already looks like where it ends up. */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-border bg-bg p-4 lg:w-[340px] lg:border-l lg:border-t-0 lg:p-5">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <h2 className="t-title">Your profile</h2>
          <span className="num special">
            {answeredCount} / {INTAKE_QUESTIONS.length}
          </span>
        </div>
        <Progress
          value={(answeredCount / INTAKE_QUESTIONS.length) * 100}
          className="mt-3"
        />
        <dl className="mt-4">
          {INTAKE_QUESTIONS.map((q, i) => (
            <div
              key={q.key}
              className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0 last:pb-0"
            >
              <dt className="t-body text-ink-2">{LABELS[q.key]}</dt>
              <dd
                className={cn(
                  "flex items-baseline gap-1 text-right text-base font-semibold",
                  answers[q.key]
                    ? "text-ink"
                    : i === answeredCount
                      ? "text-brand-text"
                      : "text-ink-3"
                )}
              >
                {answers[q.key] ??
                  (i === answeredCount ? (
                    "asking now"
                  ) : (
                    <span
                      aria-label="Not answered yet"
                      className="inline-block w-[56px] border-b-2 border-dashed border-border-strong align-middle"
                    />
                  ))}
                {onEdit && answers[q.key] && (
                  <EditButton
                    label={LABELS[q.key]}
                    onClick={() => onEdit(q.key)}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>
        </div>
      </aside>
    </div>
  );
}

/**
 * Everything the intake knows up to, but not including, one topic —
 * the client-side shadow of what `recordIntakeAnswer` does in the
 * database when an earlier question is answered again.
 */
function truncateAt(answers: Answers, key: string): Answers {
  const index = INTAKE_QUESTIONS.findIndex((q) => q.key === key);
  const next: Answers = {};
  INTAKE_QUESTIONS.slice(0, index).forEach((q) => {
    if (answers[q.key]) next[q.key] = answers[q.key];
  });
  return next;
}

/** The opening line, before either agent has said anything of its own. */
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
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="min-h-[var(--row-h)] rounded-[var(--radius-pill)] border border-brand px-4 text-base font-semibold text-brand-text transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] disabled:opacity-50"
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
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="mt-3 flex items-center gap-3"
    >
      <input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Type your answer, or tap a suggestion"
        aria-label="Your answer"
        className="h-[var(--control-h)] min-w-0 flex-1 rounded-[var(--radius-pill)] border border-border-strong bg-surface px-5 text-base outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]"
      />
      <Button type="submit" size="sm" disabled={disabled || !draft.trim()}>
        <Send /> Send
      </Button>
      <Button
        type="button"
        variant="neutral"
        size="icon"
        aria-label="Answer by voice"
        onClick={() =>
          toast.info(
            "Voice mode streams speech both ways in the full build. Keep typing here."
          )
        }
      >
        <Mic />
      </Button>
    </form>
  );
}

function EditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit your answer to: ${label}`}
      title="Edit this answer"
      className="grid size-[var(--row-h)] place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <RotateCcw className="size-5" />
    </button>
  );
}

function TypingDots() {
  return (
    <div
      role="status"
      aria-label="Agent is typing"
      className="flex w-fit gap-1 rounded-[18px] rounded-bl-[6px] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)]"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 animate-bounce rounded-full bg-ink-3"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
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

function Bubble({
  from,
  children,
}: {
  from: "agent" | "user";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-[18px] px-4 py-3 text-base",
        from === "agent"
          ? "self-start rounded-bl-[6px] border border-border bg-surface text-ink shadow-[var(--shadow-sm)]"
          : "self-end rounded-br-[6px] bg-brand font-semibold text-on-brand"
      )}
    >
      {from === "agent" && typeof children === "string" ? (
        <ChatMarkdown>{children}</ChatMarkdown>
      ) : (
        children
      )}
    </div>
  );
}
