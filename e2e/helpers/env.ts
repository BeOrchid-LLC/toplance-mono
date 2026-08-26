import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `.env.local`, read into `process.env` for the test processes.
 *
 * Next loads it for the server; Playwright's config, its global setup
 * and every spec run in their own processes and do not. Same shape as
 * `vitest.setup.mts`: only fills in variables that are not already set,
 * so anything the config (or CI) has deliberately overridden survives.
 *
 * A missing file is not an error here — the specs that need Clerk or
 * Postgres fail with their own message, which says more than a parse
 * error would.
 *
 * `__dirname` rather than `import.meta.url`: Playwright transpiles these
 * files to CommonJS, where the latter is a syntax error.
 */
export function loadEnvLocal(): void {
  let text: string;
  try {
    text = readFileSync(join(__dirname, "../../.env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of text.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}
