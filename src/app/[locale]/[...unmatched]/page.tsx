import { notFound } from "next/navigation";

/**
 * Catches every URL under a locale that matches no real route, so that
 * `not-found.tsx` next door is what answers it.
 *
 * Without this, a mistyped path falls past the whole `[locale]` subtree
 * and Next answers with its own built-in 404 — black Helvetica on white,
 * no nav, no way back, and from a visitor's point of view a page
 * belonging to some other product. That is exactly the page
 * `not-found.tsx` was written to replace.
 *
 * It needs a catch-all rather than the root `not-found.tsx` it used to
 * be, because the root layout now lives under `[locale]`: a URL that
 * matches no route has no locale segment to render in, so Next cannot
 * enter the tree at all. Matching it here gives the miss a locale — the
 * one the proxy already resolved — and the styled page renders in the
 * visitor's own language. Real routes still win: Next matches a
 * catch-all only after every more specific segment has failed.
 */
export default function UnmatchedPage(): never {
  notFound();
}
