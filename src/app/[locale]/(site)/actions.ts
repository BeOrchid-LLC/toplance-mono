"use server";

import { and, eq, gt } from "drizzle-orm";

import { track } from "@/lib/analytics/track";
import { db } from "@/lib/db/client";
import { demoRequests } from "@/lib/db/schema";
import { parseDemoRequest } from "@/lib/domain/demo-request";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/locales";
import { sendEmail } from "@/lib/notifications/email";
import { demoRequestEmail } from "@/lib/notifications/templates";

/**
 * The marketing site's only write, and the only action in this codebase
 * that opens without `requireActor()`.
 *
 * That is deliberate and it is the security-relevant fact about this
 * file: the landing page is the one route with no session, so the
 * visitor filling this form is by definition not signed in and there is
 * no actor to require. Do not read the missing guard as an oversight and
 * do not copy this file's shape into an action that touches anything
 * belonging to somebody — every other action in the repo starts with
 * `requireActor()` and `requireOrgAccess()` because every other action
 * has an owner to check.
 *
 * What stands in for a guard here: the write reaches exactly one table,
 * which references nothing and which nothing in the product reads; the
 * only user-supplied values stored are the six the form asks for; and
 * the two crude filters below keep the obvious noise out.
 */

/** How long one address has to wait before it can ask again. */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function requestDemo(
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const field = (name: string) => String(formData.get(name) ?? "");

  /**
   * A field positioned off-screen and left empty by anyone using the
   * form as rendered. Filled means a script walked the DOM and typed
   * into every input it found.
   *
   * The answer is the same `{ ok: true }` a real submission gets. An
   * error, or a different shape, or a visibly faster reply, is all
   * feedback a bot can tune against — so the only thing that differs is
   * that nothing is written.
   */
  if (field("website").trim()) return { ok: true };

  const parsed = parseDemoRequest({
    fullName: field("full_name"),
    email: field("email"),
    companyName: field("company_name"),
    jobTitle: field("job_title"),
    preferredLocal: field("preferred_local"),
    preferredTz: field("preferred_tz"),
  });
  if ("error" in parsed) return parsed;

  const request = parsed.value;

  /**
   * A locale that is not one of ours is not worth refusing a lead over
   * — it is a hidden field the visitor never saw. `DEFAULT_LOCALE` is
   * the honest fallback: English is what the page serves when it does
   * not know better.
   */
  const submittedLocale = field("locale").trim();
  const locale = isLocale(submittedLocale) ? submittedLocale : DEFAULT_LOCALE;

  try {
    /**
     * One address, one request a day. This stops the double-click that
     * would otherwise make two identical rows, and it caps how much
     * noise a single script can produce without any rate-limiting
     * infrastructure — which this codebase does not have.
     *
     * Matched on the parsed address rather than the typed one, so
     * BOLA@… and bola@… are the same person.
     */
    const [recent] = await db
      .select({ id: demoRequests.id })
      .from(demoRequests)
      .where(
        and(
          eq(demoRequests.email, request.email),
          gt(demoRequests.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS))
        )
      )
      .limit(1);

    if (recent) {
      return {
        error:
          "We already have a demo request from this address. We will be in touch shortly.",
      };
    }

    await db.insert(demoRequests).values({ ...request, locale });
  } catch (error) {
    console.error("[demo] could not record the request", error);
    return { error: "Something went wrong. Please try again." };
  }

  // Both of these swallow their own failures, which is why the row is
  // already written by the time either runs. No lead is lost because
  // the analytics table or Resend was having a bad afternoon.
  await track("toplance.demo_requested", { locale });
  await notifySales({ ...request, locale });

  return { ok: true };
}

/**
 * Tells whoever handles demos that there is one waiting.
 *
 * Unset `DEMO_INBOX_EMAIL` logs and skips, matching how `sendEmail`
 * behaves with no `RESEND_API_KEY` — so local development needs no
 * configuration, and a missing variable in staging costs the
 * notification rather than the request.
 */
async function notifySales(
  request: Parameters<typeof demoRequestEmail>[0]
): Promise<void> {
  const inbox = process.env.DEMO_INBOX_EMAIL;
  if (!inbox) {
    console.log(
      `[demo] DEMO_INBOX_EMAIL not set — request from ${request.email} recorded, not emailed`
    );
    return;
  }

  await sendEmail({ to: inbox, ...demoRequestEmail(request) });
}
