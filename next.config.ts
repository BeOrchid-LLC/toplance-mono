import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Coolify runs the app from a Docker image; standalone output keeps the
  // image to the traced server files instead of the full node_modules.
  output: "standalone",
};

export default nextConfig;
