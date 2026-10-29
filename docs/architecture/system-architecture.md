# System architecture

> Status legend used across the architecture docs:
> **LOCKED** — an approved decision, not to be changed casually ·
> **IMPLEMENTED** — present in the repo today ·
> **DEFERRED** — approved direction, not yet built.

## Shape

Evermora is a **Turborepo monorepo** of three Next.js applications over a set of
shared TypeScript packages, backed by a single Supabase project per environment.
There is **no `apps/api`** (LOCKED) — Next.js Server Actions and Route Handlers
are the transport layer for the framework-independent operations in
`@evermora/domain`.

```
                      ┌─────────────────────────────────────────────┐
   visitor  ───────▶  │ apps/web            evermora.com            │  public, anonymous
   (no account)       │  · marketing + public memorial experience   │
                      │  · contribution flows (tribute, remembrance)│
                      │  · sharing / QR entry points, social preview│
                      └───────────────┬─────────────────────────────┘
                                      │
   family   ───────▶  ┌───────────────┴─────────────────────────────┐
   (auth)             │ apps/family-portal  family.evermora.com     │  authenticated family
                      │  · memorial create/edit, draft preview      │
                      │  · story / gallery / funeral / updates      │
                      │  · tribute moderation, privacy & features   │
                      │  · access / invitations, sharing, QR mgmt   │
                      └───────────────┬─────────────────────────────┘
                                      │
   staff    ───────▶  ┌───────────────┴─────────────────────────────┐
   (isolated auth)    │ apps/platform-admin  admin.evermora.com     │  internal operations
                      │  · users, memorials, moderation, reports     │
                      │  · service requests, audit, abuse investig.  │
                      └───────────────┬─────────────────────────────┘
                                      │
        ┌─────────────────────────────┴───────────────────────────────┐
        │  shared packages                                            │
        │  @evermora/domain    business operations (no next/*, no React)│
        │  @evermora/database  supabase-js (RLS) + Drizzle (server) +   │
        │                      generated Database types                 │
        │  @evermora/types     enums, roles, branded ids, event names   │
        │  @evermora/ui        owned Tailwind/Radix primitives          │
        │  @evermora/config    tsconfig / eslint / prettier / Zod env   │
        │  @evermora/utils     pure, dependency-free helpers            │
        └─────────────────────────────┬───────────────────────────────┘
                                      │
        ┌─────────────────────────────┴───────────────────────────────┐
        │  Supabase (one project per environment)                      │
        │  Auth · Postgres + RLS · Storage · (Realtime available)      │
        │  schema authority = supabase/migrations/ (Supabase CLI)      │
        └─────────────────────────────────────────────────────────────┘
```

## Request path (LOCKED pattern)

```
UI (Server/Client Component)
   │  calls
   ▼
Server Action / Route Handler          ← transport adapter only
   │  builds CallerContext, validates input shape
   ▼
@evermora/domain operation             ← business rules + authorization + validation
   │  uses repositories / services
   ▼
@evermora/database
   ├── supabase-js (@supabase/ssr)  → user-scoped, RLS-enforced
   └── Drizzle (postgres-js)        → server-only, full-privilege, typed SQL / tx
   ▼
Supabase Postgres  ← RLS is the final boundary regardless of the path above
```

Three independent authorization layers (see
[authorization-architecture.md](./authorization-architecture.md)): UI hides what
you cannot do, `@evermora/domain` makes the real decision, Supabase RLS is the
last line and must be correct on its own.

## Applications

| App                   | Domain                | Responsibility                                                                                                                                                                           | PWA                 |
| --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `apps/web`            | `evermora.com`        | Marketing + public memorial experience, contribution flows, sharing/QR, SEO & social preview. **Must stay lightweight** — the family portal is never bundled into public memorial pages. | required (DEFERRED) |
| `apps/family-portal`  | `family.evermora.com` | Authenticated family dashboard: create/edit, draft preview, moderation, privacy/features, access, sharing, service requests, notifications, account.                                     | required (DEFERRED) |
| `apps/platform-admin` | `admin.evermora.com`  | Internal operations, moderation, reports, service requests, audit, abuse investigation. Separated for security isolation and blast-radius reduction.                                     | not required        |

Custom domains are **DEFERRED** (not configured). Today each app is a Vercel
project with a `*.vercel.app` URL — see
[deployment-architecture.md](./deployment-architecture.md).

## What exists today (IMPLEMENTED)

- The three apps are **placeholder surfaces** (`PlaceholderScreen`) that render
  shared UI and validate env — they prove build/deploy/CI, no product features.
- `apps/web` has a `/health` Route Handler (liveness only).
- The full data foundation: 20 tables, RLS, storage, seed, pgTAP tests — see
  [data-model.md](./data-model.md).
- `@evermora/domain` ships the patterns + the **first 3 operations**
  (`createMemorial`, `publishMemorial`, `changeMemorialSlug` — Phase 5A) with
  unit + integration tests. The other 15 contracts in [`../domain/`](../domain/)
  are specified only. No transport adapters (Server Actions / Route Handlers)
  wire them up yet.

## Cross-references

[repository-architecture.md](./repository-architecture.md) ·
[authentication-architecture.md](./authentication-architecture.md) ·
[session-isolation.md](./session-isolation.md) ·
[performance-architecture.md](./performance-architecture.md) ·
[security-architecture.md](./security-architecture.md)
