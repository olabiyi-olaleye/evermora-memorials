# CI / CD architecture

**GitHub Actions = repository quality gates. Vercel = deployments.** (LOCKED —
architecture spec §18.) Do not rely on a Vercel build succeeding as the whole CI
strategy.

## GitHub Actions — `.github/workflows/ci.yml`

Triggers: `push` to `main`, `pull_request` to `main`. Concurrency group cancels
superseded runs. `permissions: contents: read`.

### Job `quality-gates` (Node 22, `ubuntu-latest`)

`actions/setup-node` (`node-version-file: .nvmrc`, npm cache) → cache `.turbo`
→ `npm ci` → in order:

| Step             | Command                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| Dependency audit | `npm audit --omit=dev --audit-level=high` — production deps only (Phase 5O)  |
| Format check     | `npm run format:check`                                                       |
| Typecheck        | `npm run typecheck` (`tsc --noEmit`, all workspaces)                         |
| Lint             | `npm run lint` (ESLint flat config, all workspaces)                          |
| Test             | `npm test` (Vitest, all workspaces)                                          |
| Build            | `npm run build` (Next.js production build ×3 — web + family use `--webpack`) |

### Job `database` (`ubuntu-latest`)

`supabase/setup-cli@v1` pinned to **2.105.0** (the version that generated the
committed `config.toml` and `database.types.ts` — keeps `gen types` output
byte-stable) → then:

| Step                  | What it proves                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase start`      | the local stack boots                                                                                                                                                    |
| `supabase db reset`   | the schema **rebuilds from migrations** + the seed loads cleanly                                                                                                         |
| schema-drift check    | `supabase db diff` shows no `create/alter/drop` of our own objects (platform extension noise like `pg_net` is filtered) — the committed migrations fully describe the DB |
| `supabase test db`    | all pgTAP RLS assertions pass                                                                                                                                            |
| generated-types check | `supabase gen types --local` output equals the committed `database.types.ts`                                                                                             |

### Job `e2e` (`ubuntu-latest`, Phase 5P)

`supabase/setup-cli` → `supabase start` → `supabase db reset` → `npm ci` →
`npx playwright install --with-deps chromium` → write each `apps/*/.env.local`
from `supabase status -o env` (local keys / offset ports are well-known dev
defaults) → `npx playwright test`. Playwright's own `webServer` config builds
and serves all three apps (`build && start`, `--webpack` for web + family);
the per-server timeout is 7 min under CI. The HTML report is uploaded as an
artifact. Covers the 33 specs across `web` / `family` / `admin`, including the
axe-core accessibility scans (`e2e/*/a11y.spec.ts`).

All three jobs must be green for a PR to merge (branch is `MERGEABLE` /
`mergeStateStatus: CLEAN`).

## GitHub Actions — deployment automation

Separate from the quality gates. These run only on `main` and need repository
secrets (Settings → Secrets and variables → Actions).

### `db-migrate.yml`

Trigger: a push to `main` that touches `supabase/migrations/**` (or manual
dispatch). `supabase link` → `supabase migration list --linked` → `supabase db
push --linked`. Concurrency group `db-migrate`, **`cancel-in-progress: false`**
so a migration is never interrupted. The PR-time `database` job has already
proven the migrations rebuild cleanly and `db diff` is empty, so applying them
here is safe. Without this, the cloud schema drifts behind `main` (which is how
it fell 7 migrations behind before this workflow existed).

Secrets: `SUPABASE_ACCESS_TOKEN` (personal token —
supabase.com/dashboard/account/tokens), `SUPABASE_DB_PASSWORD`,
`SUPABASE_PROJECT_ID`.

### `keep-warm.yml`

Trigger: cron, every 3rd day. One `curl` against the REST API so the **free-tier**
Supabase project doesn't auto-pause after ~7 quiet days while it's only a
test/demo environment. **Delete once the project is on Pro** (paid projects
don't pause). Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Not yet in CI

- **Lighthouse CI / bundle-size gate** — a hard perf-budget gate is too noisy
  on a shared runner to be trustworthy; see
  [performance-architecture.md](./performance-architecture.md).
- **`security-review`** on the diff — candidate to add on PRs.
- **Turborepo remote cache** — optional; local `.turbo` cache is used today.

## Vercel — deployments

Three projects, one per app (root directories `apps/web`, `apps/family-portal`,
`apps/platform-admin`). See [deployment-architecture.md](./deployment-architecture.md).

```
local dev → feature branch → GitHub → PR
   → Vercel preview deployment per app  (auto)
   → GitHub Actions quality-gates + database + e2e jobs  (required)
   → review / QA
   → merge to main
   → Vercel production deployment per app  (auto)
```

The PR must not be merged while any required check is failing. Post-merge, the
three production deployments run automatically and are verified `● Ready`.

## Merge strategy

Squash-merge, one commit per phase PR titled `Phase 5X — <name> (#N)` (the
practice since Phase 5H; Phase 5G was a merge commit). All three methods are
enabled on the repo. The per-phase commits are still made and pushed on the
feature branch for review; they collapse on merge.
