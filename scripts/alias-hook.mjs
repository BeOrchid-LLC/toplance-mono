import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Teach plain `node` the `@/` alias that `tsconfig.json` gives the app.
 *
 * Scripts in this directory run under `--experimental-strip-types`, which
 * strips the types and nothing else: it does no bundling, so it does not
 * read `compilerOptions.paths`. Any module under `src/` that imports a
 * sibling as `@/lib/...` — which is most of them — is therefore
 * unreachable from a script, and the only workaround until now was to
 * copy the logic into the script and let the two drift.
 *
 * Two small differences from the bundler's resolution, both because
 * `--experimental-strip-types` needs a real file on disk: the extension
 * is added here (`.ts`, then `.tsx`, then `/index.ts`), and a directory
 * without an index will simply fail to resolve rather than falling back.
 *
 * Pair it with `--conditions=react-server`, which resolves `server-only`
 * to its empty build instead of the module that throws. Together they
 * are what let a script call a function the app itself calls, rather
 * than a second implementation of it.
 */
const SRC = new URL("../src/", import.meta.url);

function resolveAlias(specifier) {
  const base = new URL(specifier.slice(2), SRC);
  for (const candidate of [`${base.href}.ts`, `${base.href}.tsx`, `${base.href}/index.ts`]) {
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = resolveAlias(specifier);
      if (url) return { url, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
