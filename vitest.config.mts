import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * `server-only` throws unless it is resolved under React's "react-server"
 * condition, which Vitest does not set. The package ships an empty module
 * for exactly that condition, but its `exports` map hides it from a
 * subpath import — so point at the file directly rather than adding
 * "react-server" to the global conditions, which would change how React
 * itself resolves.
 */
const serverOnlyStub = fileURLToPath(
  new URL("./node_modules/server-only/empty.js", import.meta.url)
);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.mts"],
  },
});
