# Performance architecture

Priority target (LOCKED — architecture spec §19): the **public memorial experience**
on a mid-range Android phone, over a slow network, arriving from a WhatsApp link.

Status: the public memorial UI is built and server-rendered. Two Phase 5P
notes below: the tribute form is now code-split out of the initial bundle;
tag-based caching and Lighthouse CI remain **PLANNED** for the reasons given.

## Principles

- **`apps/web` stays lightweight.** The family portal application is **never**
  bundled into public memorial pages (LOCKED). No dashboard code, no heavy
  client state, minimal initial JavaScript.
- **Server-render the memorial.** Memorial content is mostly static between
  edits — render on the server, cache aggressively, revalidate on publish /
  edit (tag-based revalidation keyed by memorial id).
- **Resolve slugs at the edge.** `resolve_memorial_slug()` runs in a lightweight
  route segment; alias → 301 to the canonical URL; miss → respectful 404
  ([memorial-url-architecture.md](./memorial-url-architecture.md)).
- **Images are the weight.** Responsive `srcset`, modern formats (avif/webp),
  explicit dimensions to avoid layout shift, lazy-load below the fold, a small
  blur/placeholder for the portrait. Delivery provider is **DEFERRED** —
  [media-storage.md](./media-storage.md).
- **Code-split** anything interactive (gallery lightbox, tribute form, map) so
  the first view is HTML + CSS + near-zero JS.
- **Third parties**: none on the public memorial critical path. Analytics is
  privacy-first and non-blocking ([analytics-events.md](./analytics-events.md)).

## Budgets (public memorial page, initial view, mid-range mobile)

| Metric                              | Target                                                |
| ----------------------------------- | ----------------------------------------------------- |
| Largest Contentful Paint (portrait) | ≤ 2.5 s on a slow 4G profile                          |
| Cumulative Layout Shift             | < 0.1                                                 |
| Interaction to Next Paint           | < 200 ms                                              |
| Initial JS (compressed)             | keep small; interactive pieces loaded on demand       |
| Fonts                               | 1–2 families, `font-display: swap`, subset, preloaded |

**Lighthouse CI / bundle-size gate — still PLANNED.** A hard millisecond-budget
gate on a shared CI runner is too noisy to be trustworthy (LCP/TBT swing
run-to-run with the runner's CPU), so it would cry wolf and get disabled. A
useful version needs an LHCI server for trend lines, or a median-of-N-runs
setup — a dedicated follow-up. The **accessibility** gate that would have
ridden along with Lighthouse is instead covered directly by axe-core in the
Playwright e2e suite ([accessibility-architecture.md](./accessibility-architecture.md)).

**Bundle:** Phase 5P code-splits `Tributes` behind `next/dynamic`, so its JS is
not in the initial bundle for a memorial with tributes off and none yet
submitted. Phase 6A.6 adds `Gallery` (the lightbox) behind the same pattern —
a memorial with no photographs ships neither client component; the fixed
sticky-header/share chrome (`MemorialChrome`) is small and always needed, so
it stays a normal client import rather than a dynamic one.

## Caching model (PLANNED)

```
memorial published/edited → revalidateTag(`memorial:{id}`)
public GET /{slug}        → cached server render + CDN, tag `memorial:{id}`
tribute approved          → revalidateTag(`memorial:{id}:tributes`)
funeral event published   → revalidateTag(`memorial:{id}:funeral`)
```

Private / draft content is never cached at a shared layer.

**Why still PLANNED after Phase 5P.** The public read path uses no cookies
(`apps/web/src/lib/supabase.ts`), so the memorial page _is_ cacheable — but
plain time-based ISR was tried and reverted. A family relies on an edit
showing up **immediately** (correcting a cancelled service, fixing a wrong
date); several e2e specs encode that guarantee. Instant invalidation needs
`revalidateTag` / `revalidatePath` to run _inside `apps/web`'s runtime_, so
`apps/family-portal` (a **different Vercel deployment**) must call an
authenticated revalidation webhook on `apps/web` after each content-changing
operation. That's real cross-cutting work touching ~20 mutation call sites and
is left for a dedicated follow-up rather than shipped half-done — a partial
wire-up that misses one path would serve stale grief content, which is worse
than the current always-fresh dynamic render.

## Social preview (LOCKED — architecture spec §20)

Every published memorial serves crawler-visible metadata **in the
server-rendered HTML** (never client-JS-dependent): `<title>`, description,
canonical URL, Open Graph title/description/image (portrait where appropriate),
dates, memorial message. WhatsApp/Facebook/Twitter must get a correct preview
from the raw HTML. OG image generation strategy is DEFERRED
([media-storage.md](./media-storage.md)).

`noindex` unless `privacy_settings.search_indexing_enabled` is true —
independent of visibility ([privacy-architecture.md](./privacy-architecture.md)).

## Family portal & admin

Functional dashboards; standard SPA-ish performance is fine. Still: server
components by default, load tables/editors on route entry, no giant client
bundles.
