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
    // Any dist dir but the default one. `next.config.ts` takes
    // `NEXT_DIST_DIR`, so a build that must not disturb a running dev
    // server goes somewhere else — the e2e suite uses `.next-e2e`, and a
    // production build run alongside `next dev` needs a name of its own
    // too. Each is as much generated output as `.next`, and as
    // unlintable: one of them put 41,228 warnings and 1,334 errors in
    // front of the single real warning in `src`, which is the same as
    // having no lint at all.
    ".next-*/**",
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
