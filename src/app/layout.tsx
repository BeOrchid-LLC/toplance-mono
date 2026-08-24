import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

/**
 * Fonts are self-hosted rather than pulled from Google.
 *
 * The design system specifies Inter and JetBrains Mono; these are the
 * variable-weight subsets from the Fontsource packages, vendored into
 * the repo. Self-hosting means no third-party request from a user's
 * browser — which matters for a product handling identity documents,
 * and matters again on a slow connection in-market, where a round trip
 * to fonts.gstatic.com is a real cost.
 *
 * Archivo joins them as the display face — it carries a width axis, which
 * is the whole reason it is here: expanded Archivo against Inter is a real
 * pairing, where a second neutral grotesque would just look like Inter in
 * a different mood. All three of its subsets are vendored because Yoruba's
 * ẹ/ọ and Igbo's ị/ụ live in the `vietnamese` subset while Hausa's ƙ/ɓ/ɗ
 * live in `latin-ext`; a headline that falls back to Inter mid-word is
 * worse than not using the face at all.
 *
 * To refresh them:
 *   npm i -D @fontsource-variable/inter @fontsource-variable/jetbrains-mono
 *   npm i -D @fontsource-variable/archivo
 *   cp node_modules/@fontsource-variable/*\/files/*-latin-wght-normal.woff2 src/app/fonts/
 *   cp node_modules/@fontsource-variable/archivo/files/archivo-*-standard-normal.woff2 src/app/fonts/
 */
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

/**
 * `declarations` is not decoration: without `font-stretch` on the
 * @font-face, a browser clamps a variable font to 100% width and the
 * `wdth` axis silently does nothing. The range here is Archivo's own.
 */
const archivo = localFont({
  src: [
    { path: "./fonts/archivo-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/archivo-latin-ext.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/archivo-vietnamese.woff2", weight: "100 900", style: "normal" },
  ],
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  variable: "--font-archivo",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

const jetbrains = localFont({
  src: [{ path: "./fonts/jetbrains-latin.woff2", weight: "100 800", style: "normal" }],
  variable: "--font-jetbrains",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Toplance — know exactly what your visa needs",
    template: "%s · Toplance",
  },
  description:
    "Answer a few short questions in your own language. Toplance turns them into the exact document checklist for your destination, checks every file as you upload it, and stays with you through the decision.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        data-brand="toplance"
        className={`${inter.variable} ${archivo.variable} ${jetbrains.variable} antialiased`}
      >
        {/*
          * ClerkProvider sits inside <body>, not around <html>. Core 3
          * requires that for compatibility with cache components, and it
          * keeps the theme and locale providers where they were.
          */}
        <ClerkProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
