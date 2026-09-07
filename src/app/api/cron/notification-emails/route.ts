import {
  dueNotificationEmails,
  sendDueNotificationEmail,
} from "@/lib/notifications/notify";

/**
 * How many buffered emails one invocation sends.
 *
 * Each is a serial round trip to the mail provider inside a single HTTP
 * handler with a function timeout, the same shape as `cron/companion`'s
 * cap and for the same reason. What a run leaves behind the next one
 * takes, oldest-due first, so a backlog drains rather than starves.
 */
const CRON_BATCH_LIMIT = 100;

/**
 * The buffered-email sweep: sends the notifications nobody looked at.
 *
 * `document_flagged` and `message_received` do not email when they are
 * created (see `emailDueFor`). They are written owing an email fifteen
 * minutes out, and reading the notification cancels it — so what reaches
 * this route is precisely the set of things the traveller has not seen.
 * A flagged document they were watching land on their own screen sends
 * no email at all; one they uploaded before closing the tab does.
 *
 * *Scheduling this route is deploy-time config, not this file's job* —
 * the same division `cron/companion` records. Point a Coolify scheduled
 * task at it with the `Authorization` header below.
 *
 * **The interval is a poll, not the cadence.** The fifteen minutes lives
 * in `EMAIL_BUFFER_MS`, and this route only sends what is already due,
 * so the schedule cannot shorten the buffer however often it fires — it
 * can only add latency on top. Every five minutes puts real delivery
 * between fifteen and twenty minutes, which is the intent. Firing it
 * every minute is harmless and wasteful; firing it hourly is also
 * correct, just slower. Nothing here breaks at any interval, which is
 * the property worth having in the one part of this system that lives
 * outside the repository.
 *
 * Idempotent by construction: sending nulls `emailDueAt`, so a settled
 * row is invisible to the next run. Two overlapping runs can at worst
 * send one email twice; nothing can send it forever.
 *
 * `CRON_SECRET` is the only guard — no Clerk session is involved, so
 * this path is public in `src/proxy.ts` rather than redirected to
 * sign-in, and a request arriving with no secret configured at all is
 * refused (503) rather than treated as open.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  // Plain comparison, matching every other bearer check in this
  // codebase — see the note in `cron/companion/route.ts`.
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const due = await dueNotificationEmails(new Date(), CRON_BATCH_LIMIT);

  let sent = 0;
  for (const notification of due) {
    // `sendDueNotificationEmail` never throws and settles the row
    // whatever happens, so one bad address cannot stall the batch
    // behind it.
    if (await sendDueNotificationEmail(notification)) sent += 1;
  }

  // `due` is what this run took, `sent` what actually left. They differ
  // on a deleted profile or a kind with no template — both settled, not
  // retried — and the gap is what makes that visible without opening the
  // database.
  return Response.json({ due: due.length, sent });
}
