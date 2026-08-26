import "server-only";

/**
 * One outbound email, via Resend's plain HTTP API — no SDK. A vendor
 * change later is a rewrite of this one file behind the same signature,
 * not a dependency swapped across the codebase.
 *
 * Modelled on `track()` in `@/lib/analytics/track`: never throws. No
 * email is worth failing the user action that triggered it — a
 * traveller must not lose a status update because Resend is down.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set — skipped "${subject}"`);
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[email] Resend returned ${response.status} for "${subject}": ${body.slice(0, 300)}`
      );
    }
  } catch (error) {
    console.error(`[email] could not send "${subject}"`, error);
  }
}
