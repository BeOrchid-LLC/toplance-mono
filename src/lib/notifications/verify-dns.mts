import { promises as dns } from "node:dns";

/**
 * Check that the sending domain can actually authenticate its mail.
 *
 * Every notification this product sends is transactional and
 * consequential — an invitation somebody needs to accept, a document
 * sent back nine days before an interview. Without SPF, DKIM and DMARC
 * those land in spam or are dropped outright, and nothing in the app
 * reports it: `sendEmail` sees a 200 from Resend and moves on, because
 * Resend accepted the message. Delivery failures happen after that,
 * silently.
 *
 * `npm run email:verify` — run it after changing DNS, and before a
 * pilot. The records themselves are in `docs/email-authentication.md`.
 *
 * The domain comes from `EMAIL_FROM`, so this checks the address the
 * product actually sends from rather than one typed here.
 */
const from = process.env.EMAIL_FROM ?? "";
const domain = from.match(/<?([^<>@\s]+)@([^<>@\s]+?)>?$/)?.[2];

if (!domain) {
  console.error(
    `EMAIL_FROM is not set, or has no address in it: ${JSON.stringify(from)}`
  );
  process.exit(1);
}

console.log(`Checking mail authentication for ${domain}\n`);

let failed = false;

const report = (name: string, ok: boolean, detail: string) => {
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(6)} ${detail}`);
};

async function txt(host: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(host)).map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

// SPF — which servers may send as this domain. Exactly one record is
// allowed; two is a permerror and fails every check rather than being
// merged.
const root = await txt(domain);
const spf = root.filter((r) => r.toLowerCase().startsWith("v=spf1"));
if (spf.length === 0) report("SPF", false, "no v=spf1 record on the domain");
else if (spf.length > 1) report("SPF", false, `${spf.length} records — must be exactly one`);
else report("SPF", spf[0].includes("resend") || spf[0].includes("include:"), spf[0]);

// DKIM — the signature receivers verify. Resend publishes under this
// selector; a different provider means a different one.
const dkim = await txt(`resend._domainkey.${domain}`);
report(
  "DKIM",
  dkim.some((r) => r.includes("p=")),
  dkim[0] ? `${dkim[0].slice(0, 48)}…` : "no key at resend._domainkey"
);

// DMARC — what a receiver does when the other two disagree. `p=none`
// counts as present but is only a monitoring posture, so it is called
// out rather than passed silently.
const dmarc = await txt(`_dmarc.${domain}`);
const policy = dmarc.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
if (!policy) report("DMARC", false, "no _dmarc record");
else if (/p=none/i.test(policy)) report("DMARC", false, `${policy}  (p=none monitors, it does not protect)`);
else report("DMARC", true, policy);

console.log(
  failed
    ? "\nMail from this domain is not fully authenticated. See docs/email-authentication.md."
    : "\nAll three records present."
);

process.exit(failed ? 1 : 0);
