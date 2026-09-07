import { revalidatePath } from "next/cache";

/**
 * The two consoles that render one case.
 *
 * A case is read from both sides — the traveller's `/app` and the
 * agency's `/agency` — so any write to it has to invalidate both. The
 * paths are route-tree paths, not the browser paths: every route lives
 * under `src/app/[locale]/` and `/agency` only reaches it through the
 * proxy's rewrite, which `revalidatePath` is documented to require the
 * destination of.
 *
 * A named list rather than two literals per action, because two literals
 * per action is what #58 got wrong in two different directions at once:
 * five calls dropped the `/[locale]` prefix and revalidated nothing, and
 * `sendMessage` named `/ops` — a console whose case screen had just been
 * removed — while never naming `/agency`, which had just gained one.
 */
export const CASE_CONSOLE_PATHS = ["/[locale]/app", "/[locale]/agency"] as const;

/**
 * Invalidate every screen that renders this case, on both sides.
 *
 * `"layout"` rather than `"page"`: the status pill and the unread count
 * are drawn by the layouts above these pages, so revalidating the page
 * alone leaves a stale badge over fresh content.
 */
export function revalidateCase(): void {
  for (const path of CASE_CONSOLE_PATHS) revalidatePath(path, "layout");
}
