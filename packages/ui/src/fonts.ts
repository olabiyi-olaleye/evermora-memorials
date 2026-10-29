import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";

/**
 * The Evermora type system (Phase 6A.0), wired through `next/font/google`:
 * fetched at build time, self-hosted in the app output, no runtime request to
 * Google, no committed binaries, automatic subsetting and fallback metrics.
 *
 * Each face exposes a CSS variable that `@evermora/ui/styles.css` reads
 * (`--font-public-sans`, `--font-newsreader`, `--font-plex-mono`). Spread
 * `fontVars` onto `<html>` in every app's root layout.
 */

/** Public Sans — every label, form, table, button and nav item. */
export const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Newsreader — memorial names, marketing headlines, editorial moments. */
export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/** IBM Plex Mono — IDs, timestamps, slugs, tabular figures. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

/** All three font variables — put on `<html className={fontVars}>`. */
export const fontVars = `${publicSans.variable} ${newsreader.variable} ${plexMono.variable}`;
