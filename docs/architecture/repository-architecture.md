# Repository architecture

Monorepo managed with **npm workspaces** (LOCKED — not pnpm/yarn) and
**Turborepo** for task orchestration. Node **22** (`.nvmrc`, `package.json`
`engines`, Vercel).

## Layout

```
evermora/
├── apps/
│   ├── web/                 @evermora/web            evermora.com
│   ├── family-portal/       @evermora/family-portal  family.evermora.com
│   └── platform-admin/      @evermora/platform-admin admin.evermora.com
│
├── packages/
│   ├── domain/              @evermora/domain    business operations (no next/*, no React)
│   ├── database/            @evermora/database  supabase-js + Drizzle + generated types
│   ├── types/               @evermora/types     enums, roles, branded ids, event names
│   ├── ui/                  @evermora/ui        owned Tailwind/Radix primitives
│   ├── config/              @evermora/config    tsconfig / eslint / prettier / Zod env
│   └── utils/               @evermora/utils     pure helpers (no business logic)
│
├── supabase/
│   ├── migrations/          authoritative SQL schema history (Supabase CLI)
│   ├── tests/               pgTAP RLS / security tests
│   ├── seed.sql             fictional local development seed
│   └── config.toml          local stack config (ports offset from defaults)
│
├── docs/
│   ├── product/             PRD, scope, roles, IA, screens, flows
│   ├── architecture/        this directory
│   └── domain/              transport-independent domain contracts
│
├── e2e/                     Playwright end-to-end tests
├── turbo.json               task graph + caching
├── package.json             workspaces + root scripts
└── .env.example             every variable, placeholders only
```

`packages/database` differs from the layout sketched in architecture spec §7: the
**migration history and seed live at the repo root under `supabase/`** (Supabase
CLI convention, so `supabase db reset/diff/push` work with zero extra config),
not under `packages/database/migrations`. The old paths carry a pointer README.
This is the intentional divergence recorded in
[supabase-environment.md](./supabase-environment.md).

## Dependency direction (enforced by intent + review)

```
apps/*  ─▶  @evermora/{domain, ui, types, utils, config}
              @evermora/domain  ─▶  @evermora/{types, utils}  + zod   (owns the persistence PORTS)
              @evermora/database ─▶ @evermora/{domain, types}  + @supabase/*, drizzle-orm, postgres   (implements the ports)
              @evermora/ui      ─▶  react, clsx, tailwind-merge   (no business logic)
              @evermora/utils   ─▶  (nothing — pure, dependency-free)
              @evermora/types   ─▶  (nothing)
```

- `@evermora/domain` must never import `react` or `next/*` (an ESLint
  `no-restricted-imports` rule in the package enforces this).
- **Ports live in `@evermora/domain`, adapters in `@evermora/database`.**
  `@evermora/database` depends on `@evermora/domain` (for the port types);
  `@evermora/domain` never depends on `@evermora/database` — no cycle.
- `@evermora/utils` is not a dumping ground — no moderation rules, funeral
  logic, publication rules, authorization, or billing. Those live in
  `@evermora/domain`.
- Apps consume `@evermora/database` **through the domain layer** for writes; a
  Server Component may read directly via `createSupabaseServerClient` (RLS still
  applies).
- Each app lists every workspace it uses in `next.config.ts`
  `transpilePackages`.

## Package summaries

| Package              | Ships today                                                                                                                                                                                                                          | Notes                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `@evermora/types`    | `MEMORIAL_*`, `TRIBUTE_STATUS`, `FUNERAL_*`, `MEMORIAL_ROLES`, `MEMBERSHIP_STATUSES`, `DOMAIN_EVENTS`/`AUDIT_ACTIONS`, branded id types (`MemorialId`, `ProfileId`, …)                                                               | Enum arrays kept in lock-step with the DB enums                                                        |
| `@evermora/utils`    | `slugify` / `isSlugFormat` (pure string mechanics), `isDefined`, `assertNever`, `clamp`                                                                                                                                              | slug **policy** is the DB + domain layer, not here                                                     |
| `@evermora/config`   | `createEnv` (Zod, client/server split, browser-read guard), ESLint flat configs (`base`, `next`, `node-library`, `react-library`), Prettier config, shared tsconfig                                                                  |                                                                                                        |
| `@evermora/ui`       | `Button` primitive, `cn()`                                                                                                                                                                                                           | minimal; the editorial public-memorial system is DEFERRED — see [design-system.md](./design-system.md) |
| `@evermora/database` | supabase-js/ssr factories, service-role factory, `createDrizzleClient`, **`createUnitOfWork`** + Drizzle repository adapters, minimal `schema/tables.ts`, `redactConnectionString`, generated `Database` type                        | depends on `@evermora/domain` for the ports; more repos added per phase                                |
| `@evermora/domain`   | patterns (`CallerContext`, `DomainError`, `DomainEventBuffer`, `Clock`/`IdGenerator` + repository/`UnitOfWork` **ports**, `roleHasPermission`, `checkSlug`) + operations `createMemorial` / `publishMemorial` / `changeMemorialSlug` | other 15 operation contracts specified only — [`../domain/`](../domain/)                               |

## Task graph (`turbo.json`)

`build` depends on `^build`; `dev` is persistent + uncached; `lint`, `typecheck`,
`test` run per-workspace. `globalPassThroughEnv` allows `NEXT_PUBLIC_*`,
`SUPABASE_*`, `DATABASE_URL` into tasks. Turborepo local cache backs CI.

Root scripts: `dev build lint typecheck test test:e2e format format:check clean`
and the database set `db:start db:stop db:reset db:diff db:test db:types db:pull`.

## Version discipline (LOCKED)

- One Node version everywhere: **22**.
- All three apps pin the **same** `next` (16.3.4), `react` / `react-dom`
  (19.2.8). No workspace drifts.
- TypeScript 5.9, Tailwind 4, Vitest 4, Playwright.
