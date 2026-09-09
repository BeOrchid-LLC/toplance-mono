import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { dirOf, LOCALES } from "@/lib/i18n/locales";
import { getLocale } from "@/lib/i18n/server";

import "../globals.css";

/**
 * Fonts are self-hosted rather than pulled from Google.
 *
 * The product is set in IBM Plex Sans, with Plex Mono as the data face;
 * these are the subsets from the Fontsource packages, vendored into the
 * repo. Self-hosting means no third-party request from a user's
 * browser — which matters for a product handling identity documents,
 * and matters again on a slow connection in-market, where a round trip
 * to fonts.gstatic.com is a real cost.
 *
 * Archivo joins them as the display face — it carries a width axis, which
 * is the whole reason it is here: expanded Archivo against Plex Sans is a
 * real pairing, where a second neutral grotesque would just look like the
 * body face in a different mood. All three of its subsets are vendored
 * because Yoruba's ẹ/ọ and Igbo's ị/ụ live in the `vietnamese` subset
 * while Hausa's ƙ/ɓ/ɗ live in `latin-ext`; a headline that falls back
 * mid-word is worse than not using the face at all.
 *
 * Only Plex Sans ships a variable build. Plex Sans Arabic and Plex Mono
 * are static on Fontsource, so each takes 400 and 600 as separate faces
 * rather than a weight range — which is every weight the product asks
 * of either.
 *
 * To refresh them:
 *   npm i -D @fontsource-variable/ibm-plex-sans @fontsource-variable/archivo
 *   npm i -D @fontsource/ibm-plex-sans-arabic @fontsource/ibm-plex-mono
 *   cp node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-{latin,latin-ext,vietnamese}-wght-normal.woff2 src/app/fonts/
 *   cp node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-{400,600}-normal.woff2 src/app/fonts/
 *   cp node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-{400,600}-normal.woff2 src/app/fonts/
 *   cp node_modules/@fontsource-variable/archivo/files/archivo-*-standard-normal.woff2 src/app/fonts/
 */
/**
 * One `localFont` per subset, not one call with four `src` entries.
 *
 * That looks redundant and is not. `localFont` emits every `src` entry
 * as an @font-face under a single generated family, with no
 * `unicode-range` on any of them — and a browser picks ONE face out of
 * a family for a text run. When a glyph is missing from it, the search
 * moves to the next *family* in the stack, not to the next face in the
 * same one. Measured on this product, not reasoned about: with the
 * four subsets under one family, `/ar` painted its Arabic in Arial and
 * `/ha` painted the ƙ of "ƙaura" in Arial mid-word, while everything
 * around them was Plex.
 *
 * Chaining them as separate families in `--sans` puts the fallback
 * where CSS actually performs it, per character. The order is the
 * order they are tried.
 *
 * This bug predates Plex. Inter shipped here as latin + latin-ext
 * under one family, so Hausa's ƙ/ɓ/ɗ were already falling back mid-word
 * and the comment above claiming otherwise was never true. Yoruba's ẹ/ọ
 * and Igbo's ị/ụ live in `vietnamese`, which Inter did not vendor at
 * all.
 *
 * `arabic` closes a gap nobody had recorded. `ar` is a live RTL locale
 * and Inter, Archivo and JetBrains had no Arabic between them, so every
 * Arabic reader was getting OS fallback with metrics matching nothing
 * else in the product.
 */
const plexSans = localFont({
  src: [{ path: "../fonts/plex-sans-latin.woff2", weight: "100 700", style: "normal" }],
  variable: "--font-plex-sans",
  display: "swap",
  adjustFontFallback: false,
});

const plexSansExt = localFont({
  src: [{ path: "../fonts/plex-sans-latin-ext.woff2", weight: "100 700", style: "normal" }],
  variable: "--font-plex-sans-ext",
  display: "swap",
  adjustFontFallback: false,
});

const plexSansVietnamese = localFont({
  src: [{ path: "../fonts/plex-sans-vietnamese.woff2", weight: "100 700", style: "normal" }],
  variable: "--font-plex-sans-vietnamese",
  display: "swap",
  adjustFontFallback: false,
});

/**
 * The last family in the chain carries `fallback`, and only it. `fallback` is baked INTO
 * the variable next/font emits, so putting it on the first family
 * would place system-ui ahead of the other three subsets and every
 * Arabic glyph would land on Arial before Plex Sans Arabic was ever
 * reached. That is exactly the bug this split was made to fix, and it
 * is easy to re-introduce by adding `fallback` to any of the three
 * above.
 */
const plexSansArabic = localFont({
  src: [
    { path: "../fonts/plex-sans-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plex-sans-arabic-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans-arabic",
  display: "swap",
  adjustFontFallback: false,
});

/**
 * Ten letters of Inter, kept alive on purpose.
 *
 * IBM Plex Sans has no ƙ ɓ ɗ ƴ ɲ, in any subset — checked against the
 * cmap, not assumed — and neither does Archivo. Inter did. Swapping the
 * body face therefore took the hook letters out of Hausa, where ƙaura
 * is an ordinary word, and would have painted them in whatever the OS
 * offered, mid-word, in the middle of a line of Plex.
 *
 * So Inter stays for exactly those ten codepoints and nothing else:
 * latin-ext subset down to Ɓ Ɗ Ƙ ƙ Ɲ Ƴ ƴ ɓ ɗ ɲ, 3.7KB, weight axis
 * intact so it tracks the weight around it. Fula, Wolof and Dagbani
 * borrow the same letters, which is why the neighbours are in here too
 * rather than the three Hausa strictly needs.
 *
 * If the body face ever changes again, re-run the coverage check before
 * assuming this file can go: it exists because a face was swapped
 * without one.
 */
const latinAfrican = localFont({
  src: [{ path: "../fonts/inter-latin-african.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-latin-african",
  display: "swap",
  adjustFontFallback: false,
});

/**
 * `declarations` is not decoration: without `font-stretch` on the
 * @font-face, a browser clamps a variable font to 100% width and the
 * `wdth` axis silently does nothing. The range here is Archivo's own.
 */
const archivo = localFont({
  src: [
    { path: "../fonts/archivo-latin.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/archivo-latin-ext.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/archivo-vietnamese.woff2", weight: "100 900", style: "normal" },
  ],
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  variable: "--font-archivo",
  display: "swap",
  adjustFontFallback: false,
});

const plexMono = localFont({
  src: [
    { path: "../fonts/plex-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plex-mono-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: "Toplance — know exactly what your visa needs",
    template: "%s · Toplance",
  },
  description:
    "Answer a few short questions in your own language. Toplance turns them into the exact document checklist for your destination, checks every file as you upload it, and stays with you through the decision.",
};

/**
 * Ten prerendered copies of every statically renderable page, one per
 * language, instead of one shared copy.
 *
 * This is the whole point of `[locale]` being a route segment rather
 * than a request header. A header cannot be read while a page is being
 * prerendered — `headers()` returns nothing there — so the marketing
 * pages, which are `force-static` on purpose, used to render in English
 * whatever URL a visitor arrived at. A route parameter is available at
 * prerender time, so those pages can stay cached documents *and* be in
 * the right language.
 */
export function generateStaticParams() {
  return LOCALES.map((l) => ({ locale: l.code }));
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={dirOf(locale)} suppressHydrationWarning>
      <body
        data-brand="toplance"
        className={`${plexSans.variable} ${plexSansExt.variable} ${plexSansVietnamese.variable} ${plexSansArabic.variable} ${latinAfrican.variable} ${archivo.variable} ${plexMono.variable} antialiased`}
      >
        {/*
          * ClerkProvider sits inside <body>, not around <html>. Core 3
          * requires that for compatibility with cache components, and it
          * keeps the theme and locale providers where they were.
          */}
        <ClerkProvider>
          <Providers initialLocale={locale}>
            {children}
            <Toaster />
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
