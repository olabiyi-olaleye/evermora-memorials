# Testing architecture

Stack is **LOCKED** (architecture spec §17). Do not suppress meaningful errors to get
a green run.

| Layer          | Tool                                        | Scope                                                                                                                                        | Status                                                                         |
| -------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Unit / logic   | **Vitest**                                  | domain rules, utilities, server/application logic, env schemas                                                                               | IMPLEMENTED (foundation)                                                       |
| Component      | **React Testing Library** (+ Vitest, jsdom) | important UI/component behaviour, accessibility roles                                                                                        | IMPLEMENTED (foundation)                                                       |
| End-to-end     | **Playwright**                              | family workflows, visitor flows, tribute submit/moderate, publishing, funeral publishing, auth, privacy boundaries, accessibility (axe-core) | IMPLEMENTED (33 specs, 3 apps) — a CI gate since Phase 5P                      |
| Database / RLS | **pgTAP** via `supabase test db`            | the §16 security scenarios as real DB roles                                                                                                  | IMPLEMENTED (41 assertions) — see [database-testing.md](./database-testing.md) |

## Vitest

- Per-workspace `vitest.config.ts`; `environment: "jsdom"` for app/UI packages,
  node for logic packages; `globals: false` (explicit imports).
- Setup: `@testing-library/jest-dom/vitest` + `cleanup()` after each test.
- Colocated `*.test.ts(x)`. Run everywhere: `npm test` (Turborepo fan-out);
  per workspace: `npm test --workspace=@evermora/ui`.
- Present today: env-schema tests (`apps/*/src/env.test.ts`,
  `@evermora/config`), `@evermora/types` role guards, `@evermora/utils` slug,
  `@evermora/database` connection-string redaction, `@evermora/ui` /
  `PlaceholderScreen` component tests. **39 tests, all green.**

## React Testing Library

Query by role/label/text, never by test-id where a real accessible query works.
Assert visible behaviour and ARIA semantics, not implementation. Component tests
live beside the component.

## Playwright (`e2e/`, `playwright.config.ts`)

- Three Chromium projects — `web` (:3000), `family` (:3001), `admin` (:3002);
  `webServer` builds + serves all three apps (production `build && start`);
  `forbidOnly` + 2 retries under CI; `trace: on-first-retry`.
- **33 specs** across the three projects: visitor → memorial → tribute
  submit/moderate, family create → edit → privacy → publish, funeral / family
  update / share / QR / family-access / notifications flows, platform-admin
  moderation, and per-app **axe-core accessibility scans**
  (`e2e/*/a11y.spec.ts`, WCAG 2.1 A/AA — [accessibility-architecture.md](./accessibility-architecture.md)).
- **Runs in CI** (Phase 5P) as the dedicated `e2e` job — starts the Supabase
  stack, installs Chromium, generates each app's `.env.local`, runs
  `playwright test`. See [ci-cd-architecture.md](./ci-cd-architecture.md).

## Database / RLS

See [database-testing.md](./database-testing.md). Runs in CI as the dedicated
`database` job.

## Domain persistence integration tests

`@evermora/database` also has `*.integration.test.ts` files (Vitest) that run the
**real** Drizzle repository adapter + `UnitOfWork` against a local Supabase /
Postgres — verifying persistence, the DB trigger effects (owner membership,
settings), **transaction-scoped RLS** row visibility, unique-conflict mapping,
and rollback. They complement — never replace — the pgTAP suite.

- Gated on `DATABASE_URL`; run with `npm run test:integration` after
  `supabase db reset`.
- In CI: the `database` job, after the pgTAP step (it already has the stack +
  Node). The DB-less `quality-gates` job skips them (`describe.skip`).
- Current: **8 assertions, 1 file** (core-memorial operations).

## What must be tested before a feature ships

- every domain operation: happy path + each authorization failure + each
  validation failure + each invariant (see the operation contracts in
  [`../domain/operations/`](../domain/operations/));
- every RLS-sensitive table change: a pgTAP assertion per role;
- every privacy boundary: a Playwright assertion from an anonymous browser;
- accessibility: axe/RTL role checks on new screens
  ([accessibility-architecture.md](./accessibility-architecture.md)).

## Known gap

Per-component axe assertions (Vitest/RTL) and a manual screen-reader pass are
still to do — automated axe in the e2e suite covers the structural WCAG
checks, not logical tab order / focus management / reading order.
