/**
 * `next/root-params` under Vitest.
 *
 * The real module is a placeholder that throws — Next replaces it at
 * compile time, and Vitest does not compile, so the first import of it
 * takes the whole file down before a single test is collected. It is the
 * same shape of problem as `server-only`, which this config already
 * aliases, and it surfaced the moment a gate that redirects started
 * reading the locale: `staff-gate.test.ts` and `agency/console.test.ts`
 * both went from passing to "Failed Suites", with no test having run.
 *
 * Returning `undefined` is the honest answer rather than a convenient
 * one. There is no route being rendered in a unit test, so there is no
 * `[locale]` segment to read, and `getLocale` already treats an absent
 * or unrecognised value as `DEFAULT_LOCALE` — which is what a test that
 * does not care about language should see.
 *
 * A test that does care should assert on `withLocalePrefix` directly, or
 * go through the browser: `e2e/console-sweep.spec.ts` is what actually
 * proves a redirect keeps its locale, and it is what found that they did
 * not.
 */
export async function locale(): Promise<string | undefined> {
  return undefined;
}
