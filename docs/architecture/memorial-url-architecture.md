# Memorial URL, slug alias & QR resolver architecture

Public convention: `evermora.com/{memorial-slug}` (e.g.
`evermora.com/josephine-okafor`). **Never** `evermora.com/m/{slug}`.

Root-namespace collision is a first-class concern, enforced in the database — not
only the UI.

## Identity vs address

```
memorials.id (UUID, immutable)      ← identity, never changes
   ↑
memorial_slugs (1 canonical + N aliases)
```

Changing the visible address (`josephine-okafor` → `mama-josephine`) creates a
new canonical row and retires the old one as a redirecting alias. Old links keep
working.
Historical aliases are never recycled casually — only a platform admin can hard-
delete a `memorial_slugs` row.

## Slug grammar — `app.slug_is_valid(text)`

- 3–63 characters
- lowercase ASCII letters, digits, single hyphens: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- no leading / trailing / doubled hyphen (grammar guarantees this)
- at least one letter → **pure-numeric slugs rejected**
- the charset alone blocks encoded-path / traversal characters (`/`, `.`, `%`, …)

Input is normalised first (`app.normalize_slug`: lowercase, trim, spaces→hyphens,
collapse repeats). Both checks run in the `app.memorial_slugs_validate()` trigger
on every insert/update of `slug`, so a bad or reserved slug can never be stored
even via direct SQL.

## Reserved routes — table `reserved_slugs`

~70 seeded entries across categories: `marketing` (about, contact, pricing,
services, privacy, terms, support, help, blog, faq, careers, press), `auth`
(login, logout, signup, signin, register, auth, account, password, verify,
invite, onboarding), `app` (create, new, family, dashboard, settings, admin,
billing, notifications, reports, search, explore, me), `infra` (api, status,
security, health, assets, static, public, cdn, manifest, robots, sitemap,
favicon, `_next`, `__nextjs`, vercel, well-known), the QR namespace (qr, q, s, r,
go), and abuse-prone words (root, null, undefined, evermora, official, team).

Add more with an `insert into reserved_slugs …` migration; the app must also keep
its routing-layer list in sync — `apps/web/src/lib/reserved-routes.ts` mirrors
this table, so a single-segment request matching one is treated as not-found
before the DB is even queried (architecture spec §10 routing resolution order).

## Resolution — `public.resolve_memorial_slug(text)`

Returns `(memorial_id, canonical_slug, is_alias, redirect_enabled)`. `apps/web`
routing (`app/[slug]/page.tsx`, IMPLEMENTED Phase 5D):

```
known platform / static route      → handled normally (Next matches these first)
reserved-route list hit            → respectful 404 (no DB call)
single unknown segment             → resolve_memorial_slug()
  ├─ canonical hit                  → load via RLS (anon); render, or 404 if not visible
  ├─ alias hit + redirect_enabled   → permanent redirect (308) to /{canonical_slug}
  └─ miss                           → respectful 404
```

The memorial is loaded through the anonymous Supabase client, so **RLS is the
gate**: a private or unpublished memorial returns nothing and the route 404s —
its existence is never confirmed. `generateMetadata` returns a generic,
`noindex` result for anything not publicly visible, so no name / dates / story
leak through `<title>` or Open Graph. `robots: index` is set **only** when the
memorial is `public` _and_ the family enabled search indexing.

The redirect is a 308 (Next `permanentRedirect`) rather than a literal 301 —
both are permanent and SEO-equivalent, and 308 is the App-Router-idiomatic
form. Old links keep working.

`public.slug_is_available(text)` is a cheap pre-check for the family UI
(valid + not reserved + not taken).

## QR / permanent share identifiers — table `share_resolvers`

Printed artifacts (funeral programmes, cards, banners) must never encode a
mutable slug.

```
printed QR
  → share_resolvers.token           (permanent, unguessable, hex)
  → memorials.id                    (immutable)
  → current canonical slug
  → evermora.com/{slug}
```

`public.resolve_share_token(text)` returns `(memorial_id, canonical_slug,
is_active)`. Multiple resolvers per memorial are allowed (one per print run);
`is_active` / `retired_at` let a family retire a specific artifact.

**Phase 5J** built the rest: `generateShareAsset` / `retireShareAsset`
(`memorial.edit`, token minted as `randomBytes(9)` hex in the persistence
adapter), the `apps/web` `/q/[token]` landing route (active → redirect to the
canonical slug; retired / not-public → gentle notice; unknown → 404), and the
`apps/family-portal` `/memorials/{id}/share` UI with local SVG QR generation
(`@evermora/utils` `qrSvg`).
