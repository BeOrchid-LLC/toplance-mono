import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Coolify runs the app from a Docker image; standalone output keeps the
  // image to the traced server files instead of the full node_modules.
  output: "standalone",
  experimental: {
    serverActions: {
      // uploadDocument accepts files up to 10MB; the limit is on the raw
      // multipart body, so leave room for boundary/header overhead.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
