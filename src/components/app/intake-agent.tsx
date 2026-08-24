"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, RotateCcw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocale, useT } from "@/components/locale-provider";
import { ChatMarkdown } from "@/components/app/chat-markdown";
import { answerQuestion } from "@/app/(app)/actions";
import { INTAKE_QUESTIONS, HISTORY_NOTE } from "@/lib/domain/intake";
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
 */
export function IntakeAgent({
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
      if (result?.error) {
        toast.error(result.error);
        setAnswers((a) => {
          const next = { ...a };
          delete next[key];
          return next;
        });
        return;
      }
      if (result?.complete) router.refresh();
    });
  }

  /** Reopening an answer truncates the conversation from that point. */
  function editFrom(key: string) {
    const index = INTAKE_QUESTIONS.findIndex((q) => q.key === key);
    setAnswers((a) => {
      const next: Answers = {};
      INTAKE_QUESTIONS.slice(0, index).forEach((q) => {
        if (a[q.key]) next[q.key] = a[q.key];
      });
      return next;
    });
    toast.info("Answer reopened. Anything after it will be asked again.");
  }

  // The chat owns the viewport under the chrome. Below `lg` the chrome
  // is two bars — the app bar plus the nav rail that replaced the nav
  // that bar hides — so the subtraction has to account for both, or the
  // composer lands just off the bottom of a phone.
  return (
    <div className="flex h-[calc(100dvh-var(--bar-h)-var(--row-h)-1px)] flex-col lg:h-[calc(100dvh-var(--bar-h))] lg:flex-row">
      {/* ---- conversation ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
          {/* A flat brand tint, not the brand gradient. The gradient is
              the slab device the auth surface removed, and one circle of
              it here is the beginning of putting it back. */}
          <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_14%,var(--mix))] text-brand-text">
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
          <div className="mx-auto flex max-w-[720px] flex-col gap-4">
            <p className="special-caps mx-auto">Conversation started</p>

            <Bubble from="agent">
              {`Nice to meet you, ${firstName || "there"}. I will ask a few short questions so I know exactly what you need. You can type, or tap one of the suggestions.`}
            </Bubble>

            {INTAKE_QUESTIONS.map((q, i) => {
              if (i > answeredCount) return null;
              const answer = answers[q.key];
              return (
                <React.Fragment key={q.key}>
                  <Bubble from="agent">{t(q.prompt)}</Bubble>
                  {answer && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => editFrom(q.key)}
                        aria-label={`Edit your answer to: ${t(q.prompt)}`}
                        title="Edit this answer"
                        className="grid size-[var(--row-h)] place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <RotateCcw className="size-5" />
                      </button>
                      <Bubble from="user">{answer}</Bubble>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {typing && (
              <div
                role="status"
                aria-label="Agent is typing"
                className="flex w-fit gap-1 rounded-md rounded-bl-sm border border-border bg-surface px-4 py-3"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-2 animate-bounce rounded-full bg-ink-3"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}

            {current?.key === "history" && (
              <p className="t-muted border-l-2 border-border-strong py-1 pl-4">
                {HISTORY_NOTE}
              </p>
            )}

            {done && (
              /* A real boundary — before it the corridor is unknown,
                 after it there is a checklist — so it gets §8's 3px
                 rule rather than a tinted box. */
              <div className="mt-2">
                <span
                  aria-hidden
                  className="block h-[3px] w-16 rounded-[var(--radius-pill)] bg-success"
                />
                <p className="t-title mt-4">Profile complete</p>
                <p className="t-muted mt-2">
                  Your checklist is built from these answers. You can change any
                  of them later and it rebuilds.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/app/requirements">
                    See my requirements <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {!done && current && (
          <div className="border-t border-border bg-surface p-4 sm:p-6">
            <div className="mx-auto max-w-[720px]">
              <div className="flex flex-wrap gap-2">
                {current.chips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    disabled={pending}
                    onClick={() => submit(chip.value)}
                    className="min-h-[var(--row-h)] rounded-[var(--radius-pill)] border border-brand px-4 text-base font-semibold text-brand-text transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] disabled:opacity-50"
                  >
                    {chip.label[locale] ?? chip.label.en}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(draft);
                }}
                className="mt-3 flex items-center gap-3"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your answer, or tap a suggestion"
                  aria-label="Your answer"
                  className="h-[var(--control-h)] min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-4 text-base outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]"
                />
                <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
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
            </div>
          </div>
        )}
      </div>

      {/* ---- live profile ---- */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-border bg-surface p-4 lg:w-[320px] lg:border-l lg:border-t-0 lg:p-5">
        <div className="flex items-center justify-between">
          <h2 className="t-title">Your profile</h2>
          <span className="special">
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
              className="flex items-baseline justify-between gap-4 border-b border-border py-3"
            >
              <dt className="t-body text-ink-2">{LABELS[q.key]}</dt>
              <dd
                className={cn(
                  "text-right text-base font-semibold",
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
              </dd>
            </div>
          ))}
        </dl>
      </aside>
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
        "max-w-[85%] rounded-md px-4 py-3 text-base",
        from === "agent"
          ? "self-start rounded-bl-sm border border-border bg-surface text-ink"
          : "self-end rounded-br-sm bg-brand font-semibold text-on-brand"
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
