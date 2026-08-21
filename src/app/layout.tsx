import type { Metadata } from "next";
import localFont from "next/font/local";

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
 * To refresh them:
 *   npm i -D @fontsource-variable/inter @fontsource-variable/jetbrains-mono
 *   cp node_modules/@fontsource-variable/*\/files/*-latin-wght-normal.woff2 src/app/fonts/
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
        className={`${inter.variable} ${jetbrains.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
