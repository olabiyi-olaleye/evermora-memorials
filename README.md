# Evermora

[![CI](https://github.com/DataByOlabiyi/evermora-memorials/actions/workflows/ci.yml/badge.svg)](https://github.com/DataByOlabiyi/evermora-memorials/actions/workflows/ci.yml)

Evermora gives a family one permanent link for remembering someone. On it they can put a short biography, life stories and milestones, a photo gallery, tributes from visitors, and the practical details people need for the funeral: the wake, the service and the burial, each with its own time, venue, directions and streaming link. If a detail changes or an event is cancelled, the page says so plainly.

**Live demo:** https://evermora-web.vercel.app

I built it as a mobile-first PWA because most people will open a memorial link on their phone, usually straight from a message someone sent them. Visitors never need an account. The family manages everything from a private dashboard, and there is a separate admin app for running the platform.

## What it does

- **Public memorial page** at a single short link, with a QR code for printed programmes
- **Story and milestones**, so the page reads like a life and not just a death notice
- **Photo gallery** with uploads handled through Supabase Storage
- **Tributes** from visitors, with moderation so the family stays in control of what appears
- **Funeral information** as separate events (wake, service, burial), including directions, streaming links and clear notices when something changes. A memorial can go live before these details are ready
- **Family updates** for official announcements, plus RSVP and contact details for each event
- **Family access and roles**: owners can invite relatives as editors or tribute moderators
- **Platform admin** for moderation and operations

## How it's put together

It is a Turborepo monorepo with three Next.js apps sharing the same packages:

```
apps/web  ·  apps/family-portal  ·  apps/platform-admin      (Next.js 16, React 19)
        │  Server Actions and Route Handlers are the only transport layer (no separate API app)
        ▼
@evermora/domain      business rules, authorization, validation, events (no Next.js or React)
        ▼
@evermora/database    supabase-js (RLS-bound) + Drizzle (server-only, typed SQL)
        ▼
Supabase              Auth · Postgres with Row Level Security · Storage
```

A few decisions I'd point to if you're reading the code:

- **Authorization is checked three times**: in the UI, in the domain layer, and again by Postgres Row Level Security. If one layer has a bug, the database still refuses the request.
- **The domain layer has no framework code in it.** Business operations such as submitting a tribute or publishing funeral details are plain TypeScript and are unit-tested without a browser or a database.
- **Migrations are the single source of truth for the schema.** CI rebuilds the database from `supabase/migrations/` and fails if the result drifts from what the code expects.
- **RLS is tested directly.** There are 17 pgTAP test files that log in as an anonymous visitor, an unrelated user, the owner, an editor, a moderator and a platform admin, and check what each one can and can't see.
- **Each app keeps its own session.** The public site, family portal and admin app don't share cookies.

The longer write-ups live in [`docs/`](docs/README.md): product requirements, the data model, security, RLS, PWA and deployment.

## Technology

| Layer                               | Choice                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Frontend                            | React 19.2, Next.js 16.3, TypeScript 5.9, Tailwind CSS 4                                                           |
| Package manager                     | **npm** workspaces (not pnpm/yarn)                                                                                 |
| Monorepo                            | Turborepo                                                                                                          |
| Domain layer                        | `@evermora/domain` — framework-independent TypeScript                                                              |
| Database                            | PostgreSQL via Supabase                                                                                            |
| DB access                           | `@supabase/ssr` + `@supabase/supabase-js` (RLS-bound); Drizzle + `postgres` (server-only typed SQL / transactions) |
| Migration authority                 | Supabase CLI + version-controlled SQL under `supabase/migrations/`                                                 |
| Auth · Storage · Row Level Security | Supabase                                                                                                           |
| Env validation                      | Zod (`@evermora/config`)                                                                                           |
| Testing                             | Vitest, React Testing Library, Playwright, pgTAP                                                                   |
| CI                                  | GitHub Actions (quality gates + a database/RLS job)                                                                |
| Hosting                             | Vercel (3 projects)                                                                                                |

## Repository structure

```
evermora/
├── apps/
│   ├── web/               public marketing + memorial experience
│   ├── family-portal/     authenticated family dashboard
│   └── platform-admin/    internal administration
├── packages/
│   ├── domain/            business operations (no next/*, no React)
│   ├── database/          supabase-js + Drizzle client factories, generated types, repo interfaces
│   ├── types/             enums, roles, branded ids, event names
│   ├── ui/                owned Tailwind/Radix primitives (no business logic)
│   ├── config/            tsconfig / eslint / prettier + Zod env foundation
│   └── utils/             pure, dependency-free helpers
├── supabase/
│   ├── migrations/        authoritative SQL schema history (25 files)
│   ├── tests/             pgTAP RLS / security tests
│   ├── seed.sql           fictional local development seed
│   └── config.toml        local stack (ports offset from Supabase defaults)
├── docs/
│   ├── product/           PRD, MVP scope, roles, permission matrix, IA, screens, flows
│   ├── architecture/      system / data / security / experience / ops
│   └── domain/            transport-independent operation contracts
├── e2e/                   Playwright
├── turbo.json  ·  package.json  ·  .env.example
```

The SQL migration history lives at the repo root under `supabase/`, which is the
Supabase CLI convention, rather than inside `packages/database/`.

## Prerequisites

- **Node.js 22** (`.nvmrc`) — `nvm use`
- **npm 10+** (ships with Node 22; set up with 11.6.2)
- **Git**
- **Docker Desktop** — for the local Supabase stack
- **Supabase CLI** (`supabase`)

## Install

```bash
git clone https://github.com/DataByOlabiyi/evermora-memorials.git
cd evermora-memorials
nvm use
npm install           # installs every workspace from the root
```

## Local development

```bash
npm run dev            # all three apps: web :3000, family-portal :3001, platform-admin :3002
```

### The database (local)

```bash
supabase start         # local stack — API 54421, DB 54422, Studio 54423, mail 54424
npm run db:reset       # replay every migration in supabase/migrations + load the dev seed
npm run db:test        # pgTAP RLS / security tests
npm run db:diff        # must report: No schema changes found
npm run db:types       # regenerate packages/database/src/supabase/database.types.ts
npm run db:pull        # (optional) introspect a typed Drizzle schema — git-ignored output
```

Ports are **offset** from the Supabase defaults so the Evermora stack never
collides with another project's local Supabase. `supabase status` prints the
local URL + keys — these are shared well-known dev defaults, never for a real
project.

## Environment variables

Copy [`.env.example`](.env.example) — **placeholders only, never commit real
values**. Each app validates only what it needs, at import time, via
`@evermora/config`'s Zod `createEnv` (`apps/*/src/env.ts`). Client-safe vars are
`NEXT_PUBLIC_*`; everything else is server-only. `SUPABASE_SERVICE_ROLE_KEY` and
`DATABASE_URL` **must never** reach the browser (the `createEnv` proxy throws on
a browser read of a server key). Full table:
[`docs/architecture/environment-strategy.md`](docs/architecture/environment-strategy.md).

## Root commands

Run from the root; Turborepo fans out to every workspace.

| Command                                                             | Does                                 |
| ------------------------------------------------------------------- | ------------------------------------ |
| `npm run dev`                                                       | start all three apps                 |
| `npm run build`                                                     | production build of every app        |
| `npm run lint`                                                      | ESLint (flat config), all workspaces |
| `npm run typecheck`                                                 | `tsc --noEmit`, all workspaces       |
| `npm test`                                                          | Vitest, all workspaces               |
| `npm run test:e2e`                                                  | Playwright (`e2e/`)                  |
| `npm run format` / `format:check`                                   | Prettier write / check               |
| `npm run clean`                                                     | remove build artifacts               |
| `npm run db:start` / `db:stop`                                      | local Supabase stack                 |
| `npm run db:reset` / `db:diff` / `db:test` / `db:types` / `db:pull` | database workflow (above)            |

Target one workspace: `npm run <script> --workspace=@evermora/web`.

## Testing

- **Vitest** + **RTL** — colocated `*.test.ts(x)`; `npm test`. Domain
  operations are unit-tested against an in-memory `UnitOfWork`.
- **Domain persistence integration** — `packages/database/**/*.integration.test.ts`
  against a real local Postgres. Run: `supabase db reset`, then
  `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54422/postgres npm run test:integration`.
  Gated on `DATABASE_URL`; **in CI** (`database` job).
- **Playwright** — `e2e/web/` (public smoke), `e2e/family/` (family portal
  auth + first memorial, needs `supabase start`); `npm run test:e2e`. Not yet
  a CI gate.
- **pgTAP RLS tests** — `supabase/tests/`; `npm run db:test`; **in CI**. Run as
  anon / unrelated user / owner / admin / content_editor / tribute_moderator /
  platform admin. See
  [`docs/architecture/database-testing.md`](docs/architecture/database-testing.md).

## Git workflow

`main` is the production branch. Branch `feature/*`, `fix/*`, `chore/*`,
`docs/*`.

```
local → branch → GitHub → PR
      → Vercel preview per app (auto)
      → GitHub Actions: quality-gates + database  (required, must be green)
      → review / QA → merge (merge commit; phase PRs keep their commits)
      → Vercel production per app (auto)
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) —
[`docs/architecture/ci-cd-architecture.md`](docs/architecture/ci-cd-architecture.md).

## Deployment & environments

Three Vercel projects (root dirs `apps/web`, `apps/family-portal`,
`apps/platform-admin`), dashboard-managed, no committed `vercel.json`. Custom
domains are **not configured**. Supabase: **development only**
(a single `evermora-development` project);
staging and production are **not created** (free-tier limits). Details:
[`docs/architecture/deployment-architecture.md`](docs/architecture/deployment-architecture.md),
[`environment-strategy.md`](docs/architecture/environment-strategy.md),
[`vercel-deployment-protection.md`](docs/architecture/vercel-deployment-protection.md).

## Documentation

| Area                                            | Start here                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Product** — what Evermora is & how it behaves | [`docs/product/README.md`](docs/product/README.md)                                           |
| **Architecture** — how it's built               | [`docs/architecture/README.md`](docs/architecture/README.md)                                 |
| **Domain** — the business operations (specs)    | [`docs/domain/README.md`](docs/domain/README.md)                                             |
| Canonical decisions                             | [`docs/architecture/architecture-spec.md`](docs/architecture/architecture-spec.md) |

There is intentionally **no `docs/api/`** — HTTP endpoints, if any, are
transport adapters documented beside the app, never the authoritative business
contract.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` are server-only. Never prefix a
  secret with `NEXT_PUBLIC_`.
- Authorization is layered: UI → `@evermora/domain` → Supabase RLS. RLS is
  designed and tested alongside the schema, not bolted on.
- Sessions are isolated per subdomain — no shared `.evermora.com` cookie.
- A committed secret is compromised — rotate it; removing it from the latest
  commit is not enough.
- Implemented vs planned controls (rate limiting, CAPTCHA, upload validation,
  MFA are **planned, not built**):
  [`docs/architecture/security-architecture.md`](docs/architecture/security-architecture.md).
