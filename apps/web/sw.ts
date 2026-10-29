// @ts-nocheck — a service-worker file runs in a WebWorker global scope, not
// DOM; the app's tsconfig (lib: DOM) can't type-check it, and Serwist's own
// webpack plugin compiles it separately as part of the build. Excluded from
// `tsc --noEmit` via tsconfig.json's `exclude`.
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

/**
 * Deliberately conservative: `defaultCache`'s Next.js-recommended strategies
 * are network-first for pages/RSC data (so a visitor never sees stale grief
 * content while online) and cache-first only for immutable static assets
 * (`_next/static`, fonts, images). Nothing here caches a Server Action or any
 * write path — those always hit the network. No `skipWaiting`/`clientsClaim`
 * override beyond Serwist's defaults; a fresh deploy activates on next visit,
 * not mid-session.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
