# Deployment architecture

Hosting is **Vercel** (LOCKED). Three Vercel projects, one per app.

| App                   | Vercel project    | Root directory        | Preferred domain (DEFERRED) | Now                                  |
| --------------------- | ----------------- | --------------------- | --------------------------- | ------------------------------------ |
| `apps/web`            | `evermora-web`    | `apps/web`            | `evermora.com`              | `*.vercel.app`, production `● Ready` |
| `apps/family-portal`  | `evermora-family` | `apps/family-portal`  | `family.evermora.com`       | `*.vercel.app`, production `● Ready` |
| `apps/platform-admin` | `evermora-admin`  | `apps/platform-admin` | `admin.evermora.com`        | `*.vercel.app`, production `● Ready` |

Configuration is **dashboard-managed** (root directory per project); there is no
committed `vercel.json`. `.vercel/` is git-ignored.

## Deploy flow

```
push to a branch      → Vercel preview deployment per app (comment on the PR)
merge to main         → Vercel production deployment per app
```

GitHub Actions is the gate; Vercel is the deploy target. A failing quality
gate blocks the merge, so a broken build never reaches production.

Verified after the Phase 2 merge (commit `6a268a3`): all three production
deployments built (~15–17 s) and are `● Ready`; post-merge CI — the
`quality-gates` and `database` jobs — was green.

## Environments

|               | Development                                                                                | Preview                 | Production               |
| ------------- | ------------------------------------------------------------------------------------------ | ----------------------- | ------------------------ |
| Vercel        | local `npm run dev`                                                                        | per-branch preview URLs | `main` → production URLs |
| Supabase      | `evermora-development` (`xdbkhgwisjxosltimvpu`, region `eu-west-1`) **or** the local stack | —                       | **not created**          |
| Custom domain | —                                                                                          | —                       | **not configured**       |

Preview and local must **never** point at a future production database. Today
the apps do not read Supabase at all (placeholder surfaces), so no Supabase env
vars are configured in Vercel yet — see
[environment-strategy.md](./environment-strategy.md).

## Node / build

- Node **22** everywhere (`.nvmrc`, `engines`, Vercel project setting must
  match).
- Each Vercel project builds only its app; `transpilePackages` in
  `next.config.ts` compiles the workspace packages it uses.
- `reactStrictMode: true` in all three.

## Deployment protection

See [vercel-deployment-protection.md](./vercel-deployment-protection.md).
Summary: `evermora-web` may stay public; `evermora-family` and (especially)
`evermora-admin` must have protection re-enabled before any real
authenticated / admin data. Vercel protection is **not** application
authentication.

## Rollback

Vercel keeps immutable deployments; promote a previous production deployment
from the dashboard to roll back. A schema rollback is a **new forward
migration** (never editing a shipped migration file) plus, if needed, a Vercel
promote.

## Deferred

- Custom domains + DNS (do not claim a domain is connected until ownership and
  DNS are verified).
- Staging Vercel + Supabase environments.
- Turborepo remote cache on Vercel.
- Cron / background jobs (Vercel Cron or Supabase scheduled functions) for
  `anniversary_upcoming` notifications and media processing.
