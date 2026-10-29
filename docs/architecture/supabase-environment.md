# Supabase environment & database workflow

## Environments

| Environment                              | Status after Phase 2                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| **Development** (`evermora-development`) | Created in the Supabase org `fssxuqjogrytzpmurmua`. The only cloud project. |
| Staging                                  | **Not created** (free-tier project limits). Planned.                        |
| Production                               | **Not created.** Planned.                                                   |

Local Vercel Preview / local dev must never point at a future production
database. Development credentials are for development only.

## Local stack

`supabase/config.toml` is offset from the Supabase defaults so the Evermora
stack never collides with another project's local Supabase on the same machine:

| Service         | URL                                                       |
| --------------- | --------------------------------------------------------- |
| API             | `http://127.0.0.1:54421`                                  |
| Database        | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio          | `http://127.0.0.1:54423`                                  |
| Inbucket (mail) | `http://127.0.0.1:54424`                                  |

`edge_runtime` and `analytics` are disabled locally (not used by the MVP data
foundation; analytics also needs a TCP Docker socket on Windows).

Auth `site_url` → the family portal (`http://127.0.0.1:3001`); redirect
allow-list also includes `:3002` (admin). No shared cross-subdomain cookie.

## Migration authority (locked)

**`supabase/migrations/*.sql`, applied with the Supabase CLI, is the single
source of truth.** Drizzle never authors migrations — no `drizzle-kit generate`,
no `drizzle-kit migrate`.

```
schema decision
  → supabase migration new <name>          # timestamped .sql in supabase/migrations
  → write forward SQL (+ RLS, triggers, storage)
  → supabase db reset                       # replay all migrations + seed locally
  → supabase test db                        # pgTAP RLS tests
  → supabase db diff                        # must say "No schema changes found"
  → npm run db:types                        # regenerate database.types.ts
  → commit
  → (later) supabase db push --linked       # apply to the cloud dev project
```

Root scripts: `db:start`, `db:stop`, `db:reset`, `db:diff`, `db:test`,
`db:types`, `db:pull`.

## Access layers

| Tool                         | Package export                                        | Runs as                                                                                                                     |           RLS            | Use                                                                              |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | :----------------------: | -------------------------------------------------------------------------------- |
| supabase-js browser          | `@evermora/database` → `createSupabaseBrowserClient`  | signed-in user / anon                                                                                                       |            done            | client components                                                                |
| supabase-js server (SSR)     | `createSupabaseServerClient` (cookie adapter)         | signed-in user / anon                                                                                                       |            done            | every user-facing server read/write                                              |
| supabase-js service role     | `createSupabaseServiceRoleClient`                     | `service_role`                                                                                                              |      no (by design)      | trusted server code that already authorized the action                           |
| Drizzle (raw)                | `@evermora/database/drizzle` → `createDrizzleClient`  | direct `DATABASE_URL` connection                                                                                            |        no (bare)         | low-level typed SQL / complex reads not tied to one caller                       |
| **Drizzle via `UnitOfWork`** | `@evermora/database/persistence` → `createUnitOfWork` | direct `DATABASE_URL`, but each `transaction(caller, …)` runs `SET LOCAL role = authenticated\|anon` + `request.jwt.claims` | **done (per-transaction)** | **all user-originated domain operations** — atomic multi-write with RLS enforced |

`SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` are **server-only**, validated by
the Zod env layer (`@evermora/config`), never `NEXT_PUBLIC_`.

### RLS / Drizzle decision (Phase 5A)

The direct connection is a **transport**, not an authorization bypass. Domain
operations run through `UnitOfWork.transaction(caller, work)`, which reproduces
PostgREST's request context on the connection — so **RLS remains the final
boundary on the write path**. `service_role` is never a general shortcut; the
only escalation is a per-statement `SET LOCAL role = service_role` for the
`audit_logs` insert (which deny `authenticated` an INSERT path by design), inside
the same atomic transaction. Details + the `RETURNING` caveat:
[../domain/repositories.md](../domain/repositories.md).

## Generated types

`packages/database/src/supabase/database.types.ts` — `supabase gen types
typescript --local`, committed, regenerated on every schema change
(`npm run db:types`). It is the row-shape authority. It is **not** the domain
model: database row ≠ domain model ≠ public UI model (architecture spec §25).

## Drizzle introspection (optional, local only)

Table defs in use are **hand-written** in `packages/database/src/schema/tables.ts`
(minimal, columns only). `npm --workspace @evermora/database run db:pull` full
introspection (`src/drizzle/{schema,relations}.ts`) stays **local / git-ignored** —
drizzle-kit 0.31 mis-generates our cyclic media↔memorial FKs and expression
defaults. See `packages/database/src/drizzle/README.md`.
