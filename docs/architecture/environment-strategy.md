# Environment strategy

## Target environments (LOCKED)

Development → Staging → Production.

## Actual state today

|                    | Development / shared test env                                                                                                       | Staging         | Production         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------ |
| **Supabase**       | `evermora-development` (`xdbkhgwisjxosltimvpu`, `eu-west-1`, **free tier**) — serves the deployed apps; plus the local Docker stack | **NOT CREATED** | **NOT CREATED**    |
| **Vercel**         | `main` → `evermora-{web,family,admin}.vercel.app`, wired to the one Supabase project above; per-branch previews also active         | —               | —                  |
| **Custom domains** | —                                                                                                                                   | —               | **NOT CONFIGURED** |

> The deployed `*.vercel.app` apps run against the **one free-tier Supabase
> project**. This is a shared test/demo environment, not production: no backups,
> no point-in-time recovery, auto-pauses after ~7 quiet days (a scheduled
> `keep-warm` workflow mitigates that), 500 MB cap. Staging and production
> Supabase projects **do not exist**.

## Why only one Supabase project (for now)

The Supabase organisation (`fssxuqjogrytzpmurmua`) is on the free tier, which
limits active projects. Phase 2 established the data foundation; the deployed
apps were later pointed at it as a live test environment. A real production
project (with backups) is created when the org goes to Pro; staging follows.
Recorded in [supabase-environment.md](./supabase-environment.md).

Migrations reach this project automatically via the `db-migrate` GitHub Action
on merge to `main` ([ci-cd-architecture.md](./ci-cd-architecture.md)).

## Environment variables

Declared in `.env.example` (placeholders only — **never** real values) and
validated at import time by `@evermora/config`'s Zod `createEnv`
(`apps/*/src/env.ts`).

| Variable                                                                   | Client-safe?                          | Consumed by                     |
| -------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| `APP_ENV` (`development`\|`staging`\|`production`)                         | server                                | all apps                        |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_FAMILY_URL` / `NEXT_PUBLIC_ADMIN_URL` | done client                             | respective app                  |
| `NEXT_PUBLIC_SUPABASE_URL`                                                 | done client                             | all apps                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                            | done client (still RLS-bound)           | all apps                        |
| `SUPABASE_SERVICE_ROLE_KEY`                                                | **server only** — bypasses RLS        | family-portal, platform-admin   |
| `DATABASE_URL`                                                             | **server only** — Drizzle + `db:pull` | server code / tooling           |
| `EMAIL_PROVIDER_API_KEY`                                                   | server only                           | notification service (DEFERRED) |
| `MAP_PROVIDER_KEY`                                                         | client/server (TBD)                   | funeral event maps (DEFERRED)   |
| `PAYMENT_PROVIDER_SECRET`                                                  | server only                           | billing (DEFERRED)              |

Rules (LOCKED): each app declares only what it needs; fail fast on
missing/invalid; a server-only key must never be `NEXT_PUBLIC_`;
`SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` must never reach the browser
(the `createEnv` proxy throws on a browser read of a server key). No real
secret in `.env.example`, Git, README, docs, logs, or screenshots.

### Local values

`supabase start` then `supabase status` prints the local URL/keys (shared
well-known dev defaults; the local stack uses **offset ports** — API 54421,
DB 54422 — so it never collides with another project's local Supabase).

### Cloud values

From the Supabase dashboard → Project Settings → API (`anon` = client-safe;
`service_role` = server-only) and → Database → Connection string → **Transaction
pooler** for `DATABASE_URL` (serverless-safe; the Drizzle client sets
`prepare: false`). The DB password is held by the project owner and, for CI, as
the `SUPABASE_DB_PASSWORD` repository secret.

### Vercel env vars — CONFIGURED (test env)

All three Vercel projects (Production scope) carry `APP_ENV`,
`NEXT_PUBLIC_APP_URL` / `_FAMILY_URL` / `_ADMIN_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL`; family + admin also carry
`SUPABASE_SERVICE_ROLE_KEY`. They point at the one free-tier Supabase project —
**intentional and temporary** until a real production project exists. When that
happens, the production Vercel scope repoints and a preview/staging scope takes
the test values.

## Promotion process (target)

```
migration authored + reviewed locally  (supabase db reset / test db / db diff)
   → PR: the `database` CI job re-proves it from scratch
   → merged to main
   → `db-migrate` GitHub Action runs `supabase db push --linked`  (test project today)
   → (later) staging project, verify
   → (later) production project, verify
```

Never let local or preview environments modify a real production database. The
fictional dev seed (`supabase/seed.sql`) is loaded into the **test** project so
the deployed apps have something to show; it must **never** be run against a
real production project.
