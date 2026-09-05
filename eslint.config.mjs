import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The e2e suite's dev server builds into its own dist dir
    // (`NEXT_DIST_DIR` in playwright.config.ts) — as much generated
    // output as `.next`, and as unlintable.
    ".next-e2e*/**",
    // Playwright's own output: reports, traces, screenshots.
    "playwright-report/**",
    "test-results/**",
    // Agent worktrees are whole checkouts of this same repo on other
    // branches. Linting them reports another branch's problems as this
    // one's — `npm run lint` went from clean to 789 errors the moment
    // one appeared — and they are already excluded from git.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
