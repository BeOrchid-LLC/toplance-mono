/**
 * The one shell every outbound email renders through, and the only place
 * that writes email HTML.
 *
 * Constraints this file exists to satisfy, none of them negotiable:
 *
 * - **Inline styles only.** Gmail's app strips `<style>` blocks in some
 *   contexts and Outlook.com rewrites them, so a `style=` attribute on
 *   the element is the only thing that renders everywhere.
 * - **Tables, not divs.** Outlook on Windows renders with Word's HTML
 *   engine, which ignores `max-width` and drops `padding` on an `<a>`.
 *   The nesting below is a rendering-engine constraint, not decoration.
 * - **No images and no web fonts.** A lot of these land on
 *   low-bandwidth connections, and image blocking is on by default in
 *   most clients — an email whose branding is an image is an email with
 *   no branding. The wordmark is text and the whole shell is ~3KB.
 * - **Escaping happens here, at the boundary.** Callers pass raw values.
 *   Templates used to escape their own, which worked while each was one
 *   heading and one paragraph, but "remember to escape before calling"
 *   is a rule that gets forgotten on the template someone adds next year.
 *
 * `html` and `text` are generated from the same input, in one pass, so a
 * message can never be edited in one and not the other.
 *
 * **The palette below is hand-copied from `globals.css` and has to be
 * updated with it.** Email has no custom properties — a `var(--ink)` in a
 * `style=` attribute resolves to nothing in every client that matters —
 * so these are literal hex, and a literal is a copy that goes stale in
 * silence. It did: this file went on rendering the pre-redesign palette
 * straight through the 2026-09-09 wayfinding repaint, footer and links
 * and all, on a docblock that claimed the colours *were* the tokens.
 * One of them, the old #7b8296 the muted text was set in, measured
 * 3.835:1 on white and had never cleared AA for body type in the first
 * place. Nothing here fails a build when a token moves, so the
 * discipline is the whole guard: whoever changes a token changes these
 * in the same commit.
 *
 * The copy, as of the wayfinding palette: --bg #f1f4fa, --surface
 * #ffffff, --border #e1e5ed, --ink #10131c, --ink-2 #4a5163, --ink-3
 * #64697a, --brand #2450d8, --on-brand #ffffff. Measured on what each
 * one actually lands on here: body 7.658:1, muted 5.769:1 inside the
 * plate and 4.799:1 on the ground outside it, the button's white label
 * 7.98:1 on the brand fill.
 *
 * The radii are copied from the same place and go stale the same way:
 * 6px on the plate is `--radius-lg`, which is what `Panel` uses, and 4px
 * on the button is `--radius-md`, which is what `Button` uses. They were
 * 14px and 10px — the soft card geometry the redesign retired, and the
 * reason a Toplance email still looked like the product from before it.
 */

export type EmailCta = { href: string; label: string };

export type EmailBody = {
  heading: string;
  /** Rendered in order, one `<p>` each. The first is also the inbox snippet. */
  paragraphs?: string[];
  /** Rendered as a `<ul>` after the paragraphs. Omitted entirely when empty. */
  list?: string[];
  cta: EmailCta;
};

/** Applied to every caller-supplied value before it reaches an HTML string. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const FOOTER_TEXT = "Sent by Toplance, a BeOrchid product.";

export function renderEmail({ heading, paragraphs = [], list = [], cta }: EmailBody): {
  html: string;
  text: string;
} {
  const h = escapeHtml(heading);
  const href = escapeHtml(cta.href);
  const label = escapeHtml(cta.label);

  // The snippet the inbox shows beside the subject. Left to itself Gmail
  // scrapes the first text it finds, which is the heading — a duplicate of
  // the subject line, and a wasted line of the two the inbox gives us.
  const preheader = escapeHtml(paragraphs[0] ?? cta.label);

  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:#4a5163;">${escapeHtml(p)}</p>`
    )
    .join("");

  const bullets = list.length
    ? `<ul style="margin:0 0 16px;padding-left:20px;font-family:${FONT};font-size:16px;line-height:1.6;color:#4a5163;">${list
        .map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`)
        .join("")}</ul>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${h}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f4fa;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f1f4fa;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f4fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:15px;font-weight:600;letter-spacing:0.01em;color:#2450d8;">Toplance</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e1e5ed;border-radius:6px;padding:32px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:#10131c;">${h}</h1>
${body}${bullets}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td bgcolor="#2450d8" style="border-radius:4px;"><a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:4px;">${label}</a></td></tr></table>
<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#64697a;">Or paste this link into your browser:<br><a href="${href}" style="color:#2450d8;word-break:break-all;">${href}</a></p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#64697a;">${FOOTER_TEXT}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    ...paragraphs,
    ...list.map((item) => `- ${item}`),
    `${cta.label}: ${cta.href}`,
    FOOTER_TEXT,
  ].join("\n\n");

  return { html, text };
}
