import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "./uploads";

/**
 * The three limits a document upload has to clear, and the order they
 * have to be in.
 *
 * A traveller's file passes three separate caps on its way in, set in
 * two files by people who could not see each other's work:
 *
 *  1. `MAX_UPLOAD_BYTES` — what the product advertises and refuses on.
 *  2. `serverActions.bodySizeLimit` — the raw multipart body Next will
 *     read into the action.
 *  3. `experimental.proxyClientMaxBodySize` — the body Next buffers so
 *     that `proxy.ts` and the route can both read it.
 *
 * The third one is the reason this file exists. It defaults to 10MB,
 * which is *below* the 11MB the second was deliberately raised to, and
 * equal to the first — so a file at exactly the advertised maximum was
 * already over it once multipart boundaries were counted. Over the cap
 * nothing is refused: the body is buffered "up to the limit" and passed
 * on truncated, and the upload fails later for reasons that look
 * nothing like size. On staging that surfaced as a 403 at the edge
 * while the server logged `Request body exceeded 10MB for
 * /app/documents`. Photographs were under 10MB and worked; PDF scans
 * were not and did not.
 *
 * Asserting the ordering rather than the numbers: the sizes are a
 * product decision and may move, but a transport limit below the limit
 * it carries is always a bug, and it is invisible until somebody
 * uploads a large file to a deployed host.
 */

/**
 * Next's own default for `proxyClientMaxBodySize`, per its documentation.
 *
 * Modelled rather than thrown on, so that deleting the setting fails the
 * ordering assertion below — which names the problem — instead of
 * exploding at import with "size is not set", which names nothing and
 * takes the unrelated cases down with it.
 */
const PROXY_BUFFER_DEFAULT = 10 * 1024 ** 2;

/** `bytes`-style sizes, as the Next config accepts them. */
function parseSize(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) throw new Error("size is not set");

  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i.exec(value.trim());
  if (!match) throw new Error(`unparseable size: ${value}`);

  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
  };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

const experimental = nextConfig.experimental ?? {};
const bodySizeLimit = parseSize(experimental.serverActions?.bodySizeLimit);
const configuredProxyBuffer = (
  experimental as { proxyClientMaxBodySize?: string | number }
).proxyClientMaxBodySize;
const proxyBufferLimit =
  configuredProxyBuffer === undefined
    ? PROXY_BUFFER_DEFAULT
    : parseSize(configuredProxyBuffer);

describe("the three upload limits", () => {
  // The one that was missing. Next buffers the body for `proxy.ts` to
  // read; if that buffer is smaller than the action's limit, the action
  // can never receive a body of the size it says it accepts.
  it("buffers at least as much as the action will read", () => {
    expect(proxyBufferLimit).toBeGreaterThanOrEqual(bodySizeLimit);
  });

  // Multipart is not free: boundaries, part headers and field names all
  // ride along with the bytes of the file itself.
  it("leaves room above the advertised maximum for multipart overhead", () => {
    expect(bodySizeLimit).toBeGreaterThan(MAX_UPLOAD_BYTES);
  });

  // Both transport limits must clear the product's own maximum, or the
  // product refuses a file it told the traveller it would take — and
  // refuses it somewhere with no error message attached.
  it("carries a file of exactly the advertised maximum", () => {
    // Generous rather than exact. A real multipart envelope for one file
    // is a few hundred bytes; 64KB is well beyond it and still far
    // inside the 1MB of headroom the config leaves.
    const envelope = 64 * 1024;

    expect(bodySizeLimit).toBeGreaterThanOrEqual(MAX_UPLOAD_BYTES + envelope);
    expect(proxyBufferLimit).toBeGreaterThanOrEqual(
      MAX_UPLOAD_BYTES + envelope
    );
  });

  // The number in the sentence a traveller reads has to be the number
  // the server enforces, or the guidance is a lie with a receipt.
  it("advertises the size it actually enforces", () => {
    expect(MAX_UPLOAD_LABEL).toBe(`${MAX_UPLOAD_BYTES / 1024 ** 2}MB`);
  });
});
