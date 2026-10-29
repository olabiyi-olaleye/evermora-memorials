# PWA architecture

**LOCKED scope** (architecture spec §26):

| App                   | PWA                      |
| --------------------- | ------------------------ |
| `apps/web`            | **required**             |
| `apps/family-portal`  | **required**             |
| `apps/platform-admin` | **not required** for MVP |

Status (Phase 5P): **IMPLEMENTED** for `apps/web` and `apps/family-portal` —
web app manifest, code-generated icons, and a Serwist service worker with an
offline fallback. `apps/platform-admin` has none, by design.

| Piece                                                                                                                              | Status                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Manifest (`app/manifest.ts`) — web + family                                                                                        | IMPLEMENTED                                                        |
| Icons (`icon.tsx` / `apple-icon.tsx` / `icon-192` / `icon-512` / `icon-512-maskable`, `next/og` `ImageResponse` — no static files) | IMPLEMENTED — placeholder "E" monogram, swap for a real mark       |
| Service worker (Serwist) — web + family                                                                                            | IMPLEMENTED                                                        |
| Offline fallback page (`/offline`) — web + family                                                                                  | IMPLEMENTED                                                        |
| Install prompts / iOS splash tuning                                                                                                | not added — the quiet default install affordance is enough for MVP |
| Offline _reads_ of a family's own memorial (family)                                                                                | **deferred** — see the family-portal section                       |

## Service worker

- **Serwist verified against Next.js 16.3.4** (Phase 5P). Next 16 defaults to
  Turbopack; `@serwist/next`'s stable release integrates via **webpack**, and
  its Turbopack path is explicitly experimental upstream. A broken or stale
  service worker on a grief-adjacent site is a real harm, not a cosmetic one,
  so both apps' `dev`/`build` scripts pass `next … --webpack` and use the
  mature integration rather than the experimental one. Revisit if
  `@serwist/turbopack` stabilises.
- `apps/web` uses Serwist's recommended Next.js `defaultCache`: **network-first**
  for pages / RSC payloads (a visitor online always gets fresh content),
  **cache-first** only for immutable static assets (`_next/static`, fonts,
  images), and an `/offline` precached fallback for a document request that
  fails while offline.
- `apps/family-portal` is deliberately stricter (see below).
- The service worker is **disabled in development** (`next.config.ts`
  `disable: NODE_ENV === "development"`) — a worker mid-development is a
  common source of confusing stale-content bugs.
- No write path (Server Action, mutation) is ever cached.

## `apps/web` (visitor)

- Web app manifest (`app/manifest.ts`): name, short name, `theme_color`
  `#1c1a17` / `background_color` `#fbfaf8` (brand tokens), 192/512/512-maskable
  icons, `display: standalone`, `start_url: /`. `viewport.themeColor` is also
  set light/dark-aware in the root layout.
- Installable; **no install prompt** is shown (the browser's own quiet
  affordance is enough).
- Offline: `/offline` fallback page for a fresh navigation while offline; a
  previously-viewed memorial renders from the network-first page cache.
  Contribution forms are Server Actions — they fail with the normal error
  message when offline (no queue).
- iOS: `apple-icon` (180×180) is emitted; Safari's PWA limitations are
  accepted, no custom splash config.

## `apps/family-portal` (family)

- Installable (manifest + icons, `theme_color` `#171717`).
- **Deliberately does not cache pages, RSC payloads, or API/data responses**
  (`sw.ts` — every such request is `NetworkOnly`). This app is authenticated
  and per-family; [session-isolation.md](./session-isolation.md) requires that
  a signed-out device can never serve another family's content from a
  service-worker cache. Only static, non-user assets (JS/CSS/fonts/icons) are
  cached — enough to open the app shell offline.
- Therefore **offline reads of a family's own memorial are not supported yet**
  — a data fetch while offline fails with a clear message, as the section
  above requires. True offline reads need a per-user, sign-out-scoped cache
  design; a dedicated follow-up.
- On sign-out, `SignOutForm` posts `CLEAR_AUTH_CACHES` to the service worker,
  which empties every cache — belt-and-braces on top of the never-cache-pages
  rule.
- Writes require connectivity and fail loudly (no silent DB / RLS divergence).
