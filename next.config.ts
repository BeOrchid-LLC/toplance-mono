import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Coolify runs the app from a Docker image; standalone output keeps the
  // image to the traced server files instead of the full node_modules.
  output: "standalone",
  /**
   * `.next` everywhere except under the e2e suite, which starts a dev
   * server of its own (on its own port, with the OpenAI key and the R2
   * credentials stripped — see `playwright.config.ts`). Next 16 takes an
   * exclusive lock on `<distDir>/lock`, so without a directory of its own
   * that server refuses to start whenever a developer already has
   * `npm run dev` running, which is most of the time.
   */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /**
   * `/travellers` was the traveller landing page until the 01/09 review
   * asked for the US spelling across the interface. It has been linked
   * from the nav and the footer, so the old path answers permanently
   * rather than 404ing — a marketing URL is somebody else's bookmark.
   */
  redirects() {
    return [
      { source: "/travellers", destination: "/travelers", permanent: true },
      /**
       * `/employer` was the agency console until the v1.3 correction
       * made the agency the tenant. A URL is a string a user reads, so
       * it follows the word the interface uses rather than the word the
       * code does — the tables still say `organisation`.
       *
       * Permanent, and covering the children too: `/employer/sign-in`
       * and `/employer/sign-up` are printed in invitation emails that
       * have already been sent, and live invitations last 30 days.
       */
      { source: "/employer", destination: "/agency", permanent: true },
      { source: "/employer/:path*", destination: "/agency/:path*", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      // uploadDocument accepts files up to 10MB; the limit is on the raw
      // multipart body, so leave room for boundary/header overhead.
      bodySizeLimit: "11mb",
    },
    /**
     * The second limit on the same upload, and the one that silently
     * truncated it.
     *
     * This app has a `proxy.ts`, so Next clones and buffers every
     * request body in memory to let the proxy and the route both read
     * it. That buffer has its own cap, and it defaults to 10MB —
     * independent of `bodySizeLimit` above, and lower than it.
     *
     * Over the cap, the request is not refused. The body is buffered
     * "up to the limit" and handed on truncated, so a multipart upload
     * arrives with its final boundary missing and fails somewhere that
     * has nothing to do with size. Staging logged
     * `Request body exceeded 10MB for /app/documents` on every failed
     * attempt while the traveller saw a 403 from the edge.
     *
     * A 10MB file — exactly what `MAX_UPLOAD_BYTES` advertises — is
     * already over the default once boundaries and part headers are
     * counted, so the advertised maximum could never have worked. That
     * is why photographs uploaded and PDF scans did not.
     *
     * Kept equal to `bodySizeLimit`, and both above `MAX_UPLOAD_BYTES`.
     * `next.config.test.ts` pins that ordering, because three limits in
     * two files drifted apart once already.
     */
    proxyClientMaxBodySize: "11mb",
  },
  /**
   * Every route, including the API handlers and the signed-URL
   * redirects. See `src/lib/security/headers.ts` for what each one is
   * for and why HSTS is production-only.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
