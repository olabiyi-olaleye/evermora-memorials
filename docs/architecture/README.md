# Architecture documentation

**`architecture-spec.md`** in this directory is the canonical approved
architecture. Where anything here disagrees with it, the architecture spec wins —
except where this documentation records a **verified divergence** from an older
planning statement (each such case is flagged in the relevant file).

Status legend used throughout: **LOCKED** (approved decision) ·
**IMPLEMENTED** (in the repo now) · **DEFERRED** (approved direction, not built).

## Index

### Foundations

| Document                                                             | Covers                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [system-architecture.md](./system-architecture.md)                   | the whole picture: 3 apps, shared packages, request path, no `apps/api`                         |
| [repository-architecture.md](./repository-architecture.md)           | monorepo layout, npm workspaces, Turborepo, dependency direction, version discipline            |
| [environment-strategy.md](./environment-strategy.md)                 | dev/staging/prod state, env variables, client/server split, promotion                           |
| [supabase-environment.md](./supabase-environment.md)                 | Supabase environments, local stack, migration workflow, supabase-js vs Drizzle, generated types |
| [ci-cd-architecture.md](./ci-cd-architecture.md)                     | GitHub Actions gates, the database job, Vercel deploy flow, merge strategy                      |
| [deployment-architecture.md](./deployment-architecture.md)           | 3 Vercel projects, environments, rollback                                                       |
| [vercel-deployment-protection.md](./vercel-deployment-protection.md) | Deployment Protection decision per app                                                          |

### Data & security

| Document                                                           | Covers                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [data-model.md](./data-model.md)                                   | ERD, 20 tables, enums, constraints, rebuild-from-migrations              |
| [authentication-architecture.md](./authentication-architecture.md) | Supabase Auth, `profiles`, no-account visitors, client factories         |
| [authorization-architecture.md](./authorization-architecture.md)   | 3-layer model, roles, permission matrix, `app.*` helpers, platform admin |
| [session-isolation.md](./session-isolation.md)                     | no shared `.evermora.com` cookie; why                                    |
| [rls-architecture.md](./rls-architecture.md)                       | grants, read/write policy model, integrity guards, RLS test strategy     |
| [security-architecture.md](./security-architecture.md)             | threat model, implemented vs planned controls                            |
| [audit-architecture.md](./audit-architecture.md)                   | append-only `audit_logs`, trigger vs domain events                       |

### Product surfaces

| Document                                                               | Covers                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [privacy-architecture.md](./privacy-architecture.md)                   | memorial visibility, per-section privacy, search indexing                                          |
| [feature-settings-architecture.md](./feature-settings-architecture.md) | per-memorial capability toggles (not a flag engine)                                                |
| [memorial-url-architecture.md](./memorial-url-architecture.md)         | URL convention, slug grammar, **slug alias history**, **reserved routes**, **QR / share resolver** |
| [storage-architecture.md](./storage-architecture.md)                   | 5 buckets, `storage.objects` policies, path convention                                             |
| [media-storage.md](./media-storage.md)                                 | media table, upload flow, image-transformation provider (DEFERRED)                                 |
| [notification-architecture.md](./notification-architecture.md)         | provider abstraction, `notifications` table, event vocabulary                                      |
| [analytics-events.md](./analytics-events.md)                           | product analytics event model, privacy-first (DEFERRED)                                            |

### Experience

| Document                                                         | Covers                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [design-system.md](./design-system.md)                           | owned `@evermora/ui`; the two visual systems (public memorial vs family/admin) |
| [responsive-rules.md](./responsive-rules.md)                     | mobile-first, breakpoints, WhatsApp entry, dashboard layouts                   |
| [performance-architecture.md](./performance-architecture.md)     | public memorial budgets, caching, social preview                               |
| [accessibility-architecture.md](./accessibility-architecture.md) | WCAG 2.2 AA target, rules, testing                                             |
| [pwa-architecture.md](./pwa-architecture.md)                     | scope (web + family), Serwist (pending), DEFERRED                              |
| [testing-architecture.md](./testing-architecture.md)             | Vitest / RTL / Playwright / pgTAP                                              |
| [database-testing.md](./database-testing.md)                     | pgTAP RLS suites, roles, scenario mapping                                      |

## Related

- Product docs: [`../product/`](../product/) — PRD, scope, roles, IA, screens, flows.
- Domain contracts: [`../domain/`](../domain/) — transport-independent operation specs.
- **No `docs/api/`** — HTTP endpoints, if any, are transport adapters documented
  beside the app, never as the authoritative business contract.
