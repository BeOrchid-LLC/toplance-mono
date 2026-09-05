import { Client } from "pg";
import { connect } from "node:tls";

import { isPrivateHost } from "../src/lib/db/private-host.ts";
import { securityHeaders } from "../src/lib/security/headers.ts";

/**
 * Answer "how do I know it is actually encrypted?" with observation
 * rather than intention.
 *
 * Every other artefact about this requirement — the connection string,
 * the header config, docs/infrastructure-encryption.md — records what
 * someone *meant* to be true. None of them can tell you that the wire
 * carrying a passport number right now is encrypted. This asks the
 * running systems instead:
 *
 *   - Postgres is asked, over the connection this script itself opened,
 *     whether that connection is using TLS. `pg_stat_ssl` is the
 *     server's own view of the socket, so it cannot be fooled by a
 *     connection string that says one thing and does another.
 *   - The deployed site is asked for a plain-HTTP response and for its
 *     certificate, so the redirect and HSTS are observed at the edge
 *     rather than inferred from next.config.ts.
 *
 * What it deliberately does NOT claim: disk encryption under Postgres,
 * and object encryption inside R2. Neither is observable from a client
 * — they are vendor and host properties, and the honest evidence is an
 * attestation, not a probe. Those stay checkboxes in
 * docs/infrastructure-encryption.md.
 *
 *   npm run encryption:verify
 *   npm run encryption:verify -- https://staging.example.com
 *
 * Exits non-zero if any observed check fails, so CI or a deploy step can
 * gate on it.
 */

const REQUIRED_HSTS_MAX_AGE = 31536000;

let failures = 0;
let checks = 0;

function pass(label: string, detail: string) {
  checks += 1;
  console.log(`  ✓ ${label}\n      ${detail}`);
}

function fail(label: string, detail: string) {
  checks += 1;
  failures += 1;
  console.log(`  ✗ ${label}\n      ${detail}`);
}

function skip(label: string, detail: string) {
  console.log(`  – ${label}\n      ${detail}`);
}

/**
 * The database leg, observed from the server's side of the socket.
 *
 * A private host is reported as a pass with its reason shown, not
 * silently: "we chose not to require TLS here, and here is why" is a
 * different statement from "TLS is on", and an auditor reading this
 * output deserves to see which one they are getting.
 */
async function checkDatabase() {
  console.log("\nDatabase (app → Postgres)");

  const url = process.env.DATABASE_URL;
  if (!url) {
    skip("DATABASE_URL", "not set — nothing to check from here");
    return;
  }

  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    fail("DATABASE_URL", "could not be parsed as a URL");
    return;
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const { rows } = await client.query<{
      ssl: boolean;
      version: string | null;
      cipher: string | null;
    }>("SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()");

    const row = rows[0];
    if (row?.ssl) {
      pass(`TLS to ${host}`, `pg_stat_ssl reports ${row.version}, ${row.cipher}`);
    } else if (isPrivateHost(host)) {
      pass(
        `cleartext to ${host}, accepted`,
        "host is loopback or a private network — the socket does not leave " +
          "infrastructure we control, so TLS is not required here"
      );
    } else {
      fail(
        `cleartext to ${host}`,
        "pg_stat_ssl reports ssl=false on a host reached across a network " +
          "we do not control. Add ?sslmode=verify-full to DATABASE_URL"
      );
    }
  } catch (error) {
    fail(
      "could not reach Postgres",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    await client.end().catch(() => {});
  }
}

/** The storage leg. Only the scheme is observable without an upload. */
function checkStorage() {
  console.log("\nDocument storage (app → S3/R2)");

  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) {
    skip("S3_ENDPOINT", "not set — nothing to check from here");
    return;
  }

  let scheme: string;
  try {
    scheme = new URL(endpoint).protocol;
  } catch {
    fail("S3_ENDPOINT", `could not be parsed as a URL: ${endpoint}`);
    return;
  }

  if (scheme === "https:") {
    pass("HTTPS to object storage", endpoint);
  } else if (isPrivateHost(new URL(endpoint).hostname)) {
    pass(`cleartext to ${endpoint}, accepted`, "local MinIO on a private host");
  } else {
    fail("cleartext to object storage", `${endpoint} is not https`);
  }
}

/** Days until the certificate served on :443 expires. */
function certificateExpiry(hostname: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: hostname, port: 443, servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) return reject(new Error("no certificate presented"));
      const days = (Date.parse(cert.valid_to) - Date.now()) / 86_400_000;
      resolve(Math.floor(days));
    });
    socket.setTimeout(10_000, () => {
      socket.destroy();
      reject(new Error("timed out"));
    });
    socket.on("error", reject);
  });
}

/**
 * The browser leg, observed at the edge. Everything here is a property
 * of the deployment — the proxy's redirect, the certificate it serves,
 * and whether the headers this repo configures actually survive it.
 */
async function checkSite(origin: string) {
  const { hostname } = new URL(origin);
  console.log(`\nDeployed site (browser → app) — ${hostname}`);

  // The redirect is what protects the very first request of a session,
  // before HSTS has ever been seen by this browser.
  try {
    const response = await fetch(`http://${hostname}/`, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    if (
      (response.status === 301 || response.status === 308) &&
      location.startsWith("https://")
    ) {
      pass("HTTP redirects to HTTPS", `${response.status} → ${location}`);
    } else {
      fail(
        "HTTP does not redirect to HTTPS",
        `got ${response.status}${location ? ` → ${location}` : ""}`
      );
    }
  } catch (error) {
    fail("plain HTTP probe failed", error instanceof Error ? error.message : String(error));
  }

  try {
    const days = await certificateExpiry(hostname);
    if (days > 14) pass("certificate is current", `${days} days until expiry`);
    else fail("certificate expires imminently", `${days} days left — renewal is not working`);
  } catch (error) {
    fail("could not read certificate", error instanceof Error ? error.message : String(error));
  }

  let headers: Headers;
  try {
    headers = (await fetch(`https://${hostname}/`, { redirect: "manual" })).headers;
  } catch (error) {
    fail("HTTPS probe failed", error instanceof Error ? error.message : String(error));
    return;
  }

  const hsts = headers.get("strict-transport-security");
  if (!hsts) {
    fail("no Strict-Transport-Security", "the first request of every session is strippable");
  } else {
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
    if (maxAge >= REQUIRED_HSTS_MAX_AGE) pass("HSTS", hsts);
    else fail("HSTS max-age is too short", `${maxAge}s, want ${REQUIRED_HSTS_MAX_AGE}s`);
  }

  // Compared against the same source the app builds from, so this check
  // cannot drift from what next.config.ts is actually serving.
  for (const expected of securityHeaders(true)) {
    if (expected.key === "Strict-Transport-Security") continue;
    const actual = headers.get(expected.key.toLowerCase());
    // Case-insensitive: `X-Frame-Options: deny` is the same directive as
    // `DENY`, and a proxy in front of the app is entitled to normalise
    // it. Comparing raw strings made the check fail on a correct
    // deployment, which is the same false-positive trap as the old
    // loopback set.
    if (actual?.toLowerCase() === expected.value.toLowerCase()) {
      pass(expected.key, actual);
    } else {
      fail(expected.key, `expected "${expected.value}", got ${actual ?? "nothing"}`);
    }
  }
}

console.log("Observed encryption state — not what the config intends.");

await checkDatabase();
checkStorage();

const target = process.argv[2];
if (target) {
  await checkSite(target.includes("://") ? target : `https://${target}`);
} else {
  console.log(
    "\nDeployed site (browser → app)\n" +
      "  – skipped. Pass an origin to probe it:\n" +
      "      npm run encryption:verify -- https://staging.example.com"
  );
}

console.log(
  `\n${checks - failures}/${checks} observed checks passed.` +
    (failures ? ` ${failures} FAILED.` : "")
);
console.log(
  "\nNot observable from here, and still open in " +
    "docs/infrastructure-encryption.md:\n" +
    "  · Postgres volume encryption at rest (host property)\n" +
    "  · Backup encryption and destination (Coolify + R2)\n" +
    "  · R2 object encryption at rest (Cloudflare attestation)"
);

process.exit(failures > 0 ? 1 : 0);
