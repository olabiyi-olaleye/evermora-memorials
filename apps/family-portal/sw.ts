// @ts-nocheck — a service-worker file runs in a WebWorker global scope, not
// DOM; the app's tsconfig (lib: DOM) can't type-check it, and Serwist's own
// webpack plugin compiles it separately as part of the build. Excluded from
// `tsc --noEmit` via tsconfig.json's `exclude`.
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare const self: ServiceWorkerGlobalScope;

/**
 * Deliberately more conservative than `apps/web`'s default Next.js caching
 * preset: this app is authenticated and per-family (session-isolation.md).
 * Pages, RSC payloads, and API/data responses are always `NetworkOnly` —
 * never cached — so a signed-out device can never be served another
 * family's page HTML from the service-worker cache. Only static, non-user
 * assets (JS/CSS/fonts/icons) are cached, which is enough to install and
 * open the app shell offline; a data fetch while offline still fails with a
 * clear message, per the architecture doc, rather than serving something
 * stale for private data. `CLEAR_AUTH_CACHES` (posted by sign-out, see
 * `src/components/sign-out-form.tsx`) empties even those asset caches as a
 * belt-and-braces measure.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: /\/_next\/static\/.+\.js$/i,
      handler: new CacheFirst({
        cacheName: "next-static-js",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-style",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2)$/i,
      handler: new CacheFirst({
        cacheName: "static-fonts",
        plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-images",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    { matcher: () => true, handler: new NetworkOnly() },
  ],
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

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_AUTH_CACHES") return;
  event.waitUntil(
    self.caches.keys().then((names) => Promise.all(names.map((name) => self.caches.delete(name)))),
  );
});
