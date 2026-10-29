# Information architecture

Three applications, three route maps. Routes are **planned** — today each app
renders a placeholder. Public URL convention is LOCKED:
`evermora.com/{memorial-slug}`, never `/m/{slug}`.

## `apps/web` — `evermora.com` (public, anonymous)

```
/                         marketing home
/about  /contact  /services  /pricing  /privacy  /terms   marketing (reserved slugs)
/help   /support                                          support
/create                   → redirects to family.evermora.com sign-up/create
/q/{token}   /s/{token}                                   QR / share-token resolver → 302 to /{canonical}
/{memorial-slug}          PUBLIC MEMORIAL  (the product)
/{memorial-slug}/...      (no sub-routes in MVP; the memorial is one page)
/health                   liveness (implemented)
/robots.txt  /sitemap.xml /manifest.webmanifest          infra (reserved)
404                       respectful "not found"
```

Routing resolution order (LOCKED — architecture spec §10):

```
known platform / static route      → handled normally
unknown single-segment path        → resolve_memorial_slug()
  ├─ canonical hit                 → render memorial
  ├─ alias hit                     → 301 → /{canonical_slug}
  └─ miss                          → respectful 404
```

Reserved single-segment words can never be a memorial slug — enforced in the DB
(`reserved_slugs` + trigger) **and** the routing layer. List:
[../architecture/memorial-url-architecture.md](../architecture/memorial-url-architecture.md).

The public memorial page is **one long page** (portrait → name/dates → message →
story → gallery → tributes → funeral → updates → remembrance), not a set of
tabs — see [privacy-visibility-ux.md](./privacy-visibility-ux.md) and
[../architecture/responsive-rules.md](../architecture/responsive-rules.md).

## `apps/family-portal` — `family.evermora.com` (authenticated)

```
/sign-in  /sign-up  /forgot-password  /reset-password
/invite/{token}           accept a memorial invitation
/                         dashboard: memorials you belong to
/memorials/new            creation wizard  (multi-step)
/memorials/{id}           overview for one memorial
  ├── /overview           status, quick actions, checklist
  ├── /story              memorial message + story sections
  ├── /gallery            albums + media
  ├── /people             related people (family section)
  ├── /tributes           moderation queue
  ├── /funeral            funeral events
  ├── /updates            family updates
  ├── /preview            draft preview (renders the public memorial in-portal)
  ├── /access             members, invitations, ownership transfer
  ├── /privacy            visibility, per-section privacy, search indexing
  ├── /features           feature toggles
  ├── /sharing            copy link, QR / share assets
  └── /settings           slug, archive, delete
/services                 my service requests (submit + track)
/notifications            in-app notifications
/account                  profile, email, password
```

Navigation: mobile top bar + slide-in drawer; desktop persistent left sidebar
scoped to the current memorial. No public draft URL — `/preview` is inside the
authenticated app ([../architecture/session-isolation.md](../architecture/session-isolation.md)).

## `apps/platform-admin` — `admin.evermora.com` (isolated staff)

```
/sign-in                  isolated staff auth (MFA planned)
/                         operations dashboard: open reports, new service requests
/users                    → /users/{id}
/memorials                → /memorials/{id}   (view; suspend/unsuspend; membership view)
/tributes                 cross-memorial moderation view (reported / flagged)
/reports                  → /reports/{id}     (triage, resolve)
/service-requests         → /service-requests/{id}  (assign, status, internal notes)
/audit                    platform-wide audit log (filter by memorial / actor / action)
/settings                 platform configuration (minimal in MVP)
```

Kept separate for security isolation and blast-radius reduction (architecture spec
§6). Not a PWA.

## Cross-app links

- `apps/web` "Create a memorial" / "Manage this memorial" → `family.evermora.com`.
- Family portal "View public memorial" → `evermora.com/{slug}` (only when
  published).
- Share/QR always targets the **public** URL, never a portal URL.
- Domains are environment variables, never hardcoded (architecture spec §28); today
  they are `*.vercel.app` (custom domains deferred).
