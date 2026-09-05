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
  experimental: {
    serverActions: {
      // uploadDocument accepts files up to 10MB; the limit is on the raw
      // multipart body, so leave room for boundary/header overhead.
      bodySizeLimit: "11mb",
    },
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
