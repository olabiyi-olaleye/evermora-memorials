# Evermora — Architecture Specification (v2)

**Status:** Architecture locked. Supersedes all earlier versions of this spec.
**Last updated:** 2026-09-01

This document is the single source of truth for how Evermora is built. The decisions
below are **approved and locked**. Do not replace a locked technology or pattern without
a strong technical reason, documented trade-offs, and explicit human approval.

Where this document and any earlier version of this spec disagree, **this document wins**.

Key changes from v1:

- `apps/api` is **removed** from the initial architecture.
- `packages/domain` is **added** as the framework-independent business/domain layer.
- `docs/api/` is **renamed to `docs/domain/`** — Evermora has no standalone API service;
  domain contracts are transport-independent, not HTTP contracts.
- Deployable applications are **locked at three**: `web`, `family-portal`, `platform-admin`.
- Database access strategy locked: **supabase-js + Drizzle**, with **Supabase SQL
  migrations as the single migration authority**.
- Testing, CI, env validation, session isolation, draft preview, Node/Next discipline,
  design system, PWA scope, and provider abstractions are all locked (see §26).

---

## 1. APPLICATION AND REPOSITORY NAME

| Thing | Value |
|---|---|
| Application name | **Evermora** |
| Local root folder | `evermora` |
| GitHub repository | `evermora` |

---

## 2. APPROVED CORE TECHNOLOGY STACK (LOCKED)

| Layer | Choice |
|---|---|
| Frontend | React, Next.js, TypeScript, Tailwind CSS |
| Package manager | npm |
| Workspaces | npm Workspaces |
| Monorepo orchestration | Turborepo |
| Application / transport layer | Next.js server capabilities (Server Actions + Route Handlers) |
| Domain / business layer | `packages/domain` — framework-independent TypeScript |
| Database | PostgreSQL via Supabase |
| DB access (session-aware / RLS-bound / auth / storage / realtime) | supabase-js |
| DB access (typed server writes, complex reads, transactions, joins) | Drizzle |
| Migration authority | Supabase CLI + version-controlled SQL migrations (**single source of truth**) |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Database security | Supabase Row Level Security |
| Env validation | Zod (foundations in `packages/config`) |
| Testing | Vitest, React Testing Library, Playwright, dedicated RLS/DB security tests |
| Source control | GitHub |
| CI (quality gates) | GitHub Actions |
| Hosting / deployment | Vercel |
| PWA | Mobile-first PWA (maintained standards-based service worker, e.g. Serwist) |

**Do not use** pnpm, yarn, or bun. **Do not use** Prisma. **Do not** create
`pnpm-workspace.yaml`.

Email provider and image-transformation provider are **not** locked — they are chosen at
implementation time behind abstractions (see §21, §22).

---

## 3. MONOREPO STRUCTURE

```
evermora/
├── apps/
│   ├── web/               # public: marketing + public memorial experience
│   ├── family-portal/     # authenticated family dashboard
│   └── platform-admin/    # internal Evermora administration
│
├── packages/
│   ├── domain/            # framework-independent business/domain operations
│   ├── ui/                # owned design-system components (shadcn-style)
│   ├── types/             # shared TypeScript types & contracts
│   ├── config/            # shared TS/ESLint/Prettier/Tailwind config + env validation
│   ├── database/          # migrations, seed, generated types, queries, repositories, supabase
│   └── utils/             # genuinely reusable pure utilities only
│
├── docs/
│   ├── product/           # PRD, MVP scope, roles, flows, screen inventory
│   ├── architecture/      # system, ERD, authz, RLS, storage, URL, QR, PWA, deploy, env
│   └── domain/            # domain operation & contract documentation (transport-independent)
│
├── turbo.json
├── package.json
├── package-lock.json
├── .nvmrc
├── .gitignore
├── .env.example
└── README.md
```

**Do not create** `apps/api`. **Do not create** `pnpm-workspace.yaml`.

---

## 4. NPM WORKSPACES

Root `package.json` (conceptual):

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

- `npm install` from the repository root installs dependencies for the entire repo.
- Do not require separate installs inside each app.
- Use npm Workspaces together with Turborepo.

---

## 5. ROOT DEVELOPMENT COMMANDS

Coordinate these from the repo root via Turborepo where applicable:

```
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run format
npm run clean
```

Document every command in `README.md`.

---

## 6. APPLICATION RESPONSIBILITIES

### apps/web  (public — must stay lightweight)

- Evermora marketing website
- Public memorial experience: biographies, stories, gallery, approved tributes,
  published funeral information, family updates, remembrance actions
- Public contribution flows
- Memorial sharing, QR entry points
- SEO, Open Graph metadata, social sharing previews
- Public PWA visitor experience where appropriate

Public memorial URLs use `evermora.com/{memorial-slug}` (e.g.
`evermora.com/joseph-olaleye`). **Never** `evermora.com/m/joseph-olaleye`.

**Do not** bundle the authenticated family dashboard into the public memorial experience
(see §19).

### apps/family-portal  (authenticated)

Authentication; memorial creation, editing, and **draft preview**; story management;
photo/gallery management; tribute moderation; funeral management; family updates;
privacy controls; feature controls; family access; sharing; QR management; service
requests; notifications; account settings; billing when introduced.

Preferred production domain: `family.evermora.com`.

### apps/platform-admin  (internal — kept separate on purpose)

Internal Evermora administration: users, memorials, moderation, reports, service
requests, payments, subscriptions, support, analytics, platform configuration, audit
logs, security and abuse investigation.

Preferred production domain: `admin.evermora.com`.

Separation from `family-portal` is intentional: security isolation, reduced blast
radius, independent deployment, different authentication expectations, future
internal-only controls.

### No apps/api for MVP

Backend/domain operations live in `packages/domain` and are invoked by the three apps
through Server Actions / Route Handlers / server-side application services. Next.js is
the initial API/transport layer. A separate API deployment may be introduced **later**
— without rewriting the domain layer — only if Evermora genuinely needs a public
partner API, a mobile API, heavy background processing, independent webhooks, separate
service scaling, or third-party integrations that require a standalone API.

---

## 7. SHARED PACKAGES

### packages/domain

Framework-independent TypeScript. Core Evermora business/domain operations, e.g.:

```
createMemorial            publishMemorial           archiveMemorial
changeMemorialSlug        transferMemorialOwnership
approveTribute            rejectTribute             hideTribute
createFuneralEvent        publishFuneralEvent       cancelFuneralEvent
publishFamilyUpdate
inviteMemorialAdmin       changeMemorialRole
requestFuneralService     reportMemorial
generateShareAsset        recordAuditEvent
```

Each operation accepts:

- caller / auth context
- validated input
- repository / database dependencies where appropriate
- supporting services (notifications, share-asset generation, etc.) where appropriate

Each operation is responsible for:

- business rules
- authorization checks
- validation orchestration
- database writes
- domain events
- audit events
- notification events

Keep this package independent from Next.js wherever practical. No React, no
`next/*` imports. Depends on `packages/types`, `packages/database` (repository
interfaces), and `packages/utils`.

### packages/ui

Owned, shadcn-style reusable UI primitives and design-system components: buttons, form
elements, modal primitives, accessibility primitives, typography foundations, layout
primitives, loading states, feedback states, shared design tokens. Uses Tailwind and
accessible headless primitives (e.g. Radix) where justified.

**No memorial-specific business logic here.**

### packages/types

Shared TypeScript types and contracts: domain types, enums, API contracts, request /
response types, roles, permissions, notification events, analytics events.

### packages/config

Shared configuration: TypeScript config, ESLint config, formatting config, shared
Tailwind config where useful, **Zod environment-validation foundations**, project
conventions.

### packages/database

```
packages/database/
├── migrations/     # authoritative SQL migrations (Supabase CLI)
├── seed/           # development seed data
├── types/          # generated database types
├── queries/        # reusable typed queries (Drizzle)
├── repositories/   # repository implementations consumed by packages/domain
└── supabase/       # supabase client factories, config
```

All schema changes are version-controlled here.

### packages/utils

Only genuinely reusable pure utility functions. **Not** a dumping ground. **Do not**
place tribute moderation rules, funeral business logic, memorial publication rules,
authorization rules, or billing logic here — those belong in `packages/domain`.

---

## 8. DATABASE ACCESS STRATEGY (LOCKED)

**supabase-js** — use for:

- authentication and session-aware user operations
- storage
- realtime (only where justified)
- RLS-bound reads where appropriate
- straightforward client/server Supabase operations

**Drizzle** — use for:

- typed server-side database access
- domain-layer writes (trusted server context)
- complex server-side reads, transactions, joins
- any query where a typed SQL/query builder significantly improves maintainability

**Do not use Prisma** unless a future architectural review explicitly changes this.

---

## 9. MIGRATION AUTHORITY (LOCKED)

**Supabase SQL migrations are the authoritative schema history.** One source of truth.

Use the **Supabase CLI + version-controlled SQL migrations** for: tables, indexes,
constraints, RLS policies, functions, triggers, storage policies, and every other
PostgreSQL/Supabase schema change.

Drizzle schema definitions **reflect** the database but are **not** a competing
migration authority. Never let Drizzle-generated migrations and Supabase migrations run
as independent authorities.

Migrations must be fully reproducible from the repository.

Workflow:

```
schema decision → SQL migration created → reviewed → tested in development
→ committed to GitHub → applied to staging (where applicable) → verified
→ applied to production
```

No undocumented manual production schema changes.

---

## 10. MEMORIAL URL ARCHITECTURE

Convention: `evermora.com/{memorial-slug}` (e.g. `evermora.com/joseph-olaleye`).
**Never** `evermora.com/m/joseph-olaleye`.

Root-namespace collision is a **first-class architectural concern from day one**.

### Reserved route registry (server-side + database/application layer)

Reserved application/marketing routes (non-exhaustive):

```
about  contact  services  pricing  privacy  terms
login  signup  register  support  help
family  admin  dashboard  settings  account
api  auth  status  security  billing  notifications  reports
```

Reserved infrastructure/system routes (non-exhaustive):

```
_next  assets  static  manifest  robots  sitemap
```

### Routing resolution order (in apps/web)

```
Known platform / static route      → resolved normally
Unknown valid single-segment path  → memorial slug resolver
Unknown non-memorial path          → respectful 404
```

Reserved-route enforcement must exist **both** at the routing layer **and** at memorial
creation time (database/application layer) so a reserved word can never become a slug.

---

## 11. SLUG REQUIREMENTS

Canonical slug rules:

- lowercase, ASCII-safe representation
- letters, numbers, hyphens only
- no leading or trailing hyphen
- no repeated unsafe path patterns
- not a reserved route
- reasonable minimum and maximum length
- reject unsafe encoded paths
- prevent impersonation / lookalike abuse where practical

**The slug is not the memorial identity.** Each memorial has an **immutable internal
ID**.

Support:

- canonical slug
- historical slug aliases
- redirect (301) from alias → current canonical slug
- reserved-slug validation
- permanent ownership of historical aliases unless explicitly released via an
  administrative process

Old memorial links must keep working after a family changes the visible address (e.g.
`evermora.com/joseph-olaleye` → `evermora.com/pa-joseph`). Do not recycle historical
memorial URLs casually.

---

## 12. QR ARCHITECTURE

Printed QR codes are permanent artifacts (funeral programmes, memorial cards, banners,
church materials, reception tables, thank-you cards, keepsakes). They must never point
directly at a mutable slug without indirection.

```
Printed QR
   ↓
Permanent share / resolver ID
   ↓
Immutable memorial ID
   ↓
Current canonical slug
   ↓
evermora.com/joseph-olaleye
```

A printed QR must keep working if the slug changes, the memorial name changes, or
internal domain routing changes later.

---

## 13. AUTHENTICATION VS AUTHORIZATION

Do not treat Supabase authentication as authorization.

```
auth.users → profiles → memorial_memberships → memorials
```

- Authentication answers: *who is this person?*
- Authorization answers: *what may this person do?*

Authorization is enforced in three layers:

```
Frontend permissions
   ↓
Application / domain authorization (packages/domain)
   ↓
Supabase RLS
```

Visitors must **not** need accounts to view a memorial, read published tributes, view
funeral information, or submit a tribute where enabled.

---

## 14. SESSION ISOLATION ACROSS SUBDOMAINS (LOCKED — MVP)

Authentication is **isolated by application/subdomain**. **No shared `.evermora.com`
auth cookie by default.**

```
evermora.com          → public / anonymous visitor experience (no family session)
family.evermora.com   → family authentication / session
admin.evermora.com    → isolated platform-admin authentication / session
```

The platform-admin session is especially isolated.

---

## 15. PUBLIC DRAFT PREVIEW (LOCKED — MVP)

Do **not** build authenticated draft preview on `evermora.com/{slug}`.

Draft / public-style preview lives **inside `family.evermora.com`**, rendering the same
(or near-identical) memorial presentation as the public experience while staying within
the authenticated family environment. This avoids cross-subdomain auth complexity.

The canonical public address (`evermora.com/{slug}`) becomes available once the family
publishes.

---

## 16. ROW LEVEL SECURITY

RLS is a primary security layer, **not** a later add-on. Design and test policies
alongside schema development.

Required test scenarios (see §17 for the test stack):

- owner can edit their memorial
- unrelated authenticated user cannot edit a memorial
- Content Editor cannot transfer ownership
- Tribute Moderator can moderate only authorized memorials' tributes
- visitors cannot access private family data
- private memorials cannot be retrieved via unauthorized direct database requests
- private storage assets cannot be accessed without authorization
- platform admin access behaves per explicit platform authorization

Never assume RLS is correct just because policies exist.

---

## 17. TESTING STACK (LOCKED)

| Tool | Scope |
|---|---|
| **Vitest** | domain unit tests, utility tests, server/application logic |
| **React Testing Library** | important UI/component behavior |
| **Playwright** | e2e: family workflows, public visitor flows, tribute submission/moderation, memorial publishing, funeral publishing, authentication, privacy boundaries |
| **Dedicated RLS/DB security tests** | the scenarios in §16, run against real policies as different DB roles |

Do not suppress meaningful errors to get a green run.

---

## 18. CI (LOCKED)

Lightweight **GitHub Actions** workflow. At minimum, where configured:

```
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

- Vercel remains responsible for **deployments**.
- GitHub Actions is responsible for **repository quality gates**.
- Do not rely on Vercel build success as the entire CI strategy.
- Turborepo caching (and optionally remote cache) should back the workflow.

---

## 19. PUBLIC MEMORIAL PERFORMANCE

Optimize the public memorial experience for mobile devices, WhatsApp traffic, slow
networks, fast first render, SEO, social crawlers, accessibility, and image-heavy
content.

Use appropriate server rendering, caching, CDN delivery, responsive images, lazy
loading, code splitting, and minimal initial JavaScript.

**Do not load the family portal application into public memorial pages.**

---

## 20. SOCIAL PREVIEW ARCHITECTURE

Every published memorial exposes crawler-accessible metadata: title, description,
canonical URL, Open Graph title/description/image, memorial portrait where appropriate,
dates, memorial message.

Do not rely on client-side JavaScript for WhatsApp/social link previews — metadata must
be present in the server-rendered HTML.

---

## 21. EMAIL PROVIDER (abstraction locked; provider deferred)

Design notifications behind a provider abstraction:

```
Notification domain event → Notification service → Email adapter → Provider
```

This must allow Resend, Postmark, or similar without coupling domain logic to one
provider. The concrete provider is chosen when notification infrastructure is built.

---

## 22. IMAGE PIPELINE (storage locked; optimizer deferred)

**Supabase Storage** is the primary object storage. Do not couple domain logic to one
image optimizer.

At implementation time, decide whether delivery optimization uses Supabase image
transformations, Next.js/Vercel image optimization, or a deliberate combination —
prioritizing public memorial performance, mobile bandwidth, cost, caching, responsive
delivery, and operational simplicity.

Document the chosen pipeline in `docs/architecture/media-storage.md`.

### Storage buckets (potential)

```
memorial-public   memorial-private   tribute-uploads   documents   service-assets
```

Configure storage policies intentionally — not everything is public. Use **IDs**, not
human names, as the authoritative storage namespace:

```
memorial-public/{memorial-id}/portraits/
memorial-public/{memorial-id}/gallery/
```

### Media upload flow

```
Browser → authorized (signed) upload request → Supabase Storage
→ validation / processing → database media record → optimized delivery
```

Validate authorization, file size, MIME type, upload purpose, ownership, allowed
formats. Do not trust filename extensions alone.

---

## 23. NODE VERSION DISCIPLINE (LOCKED)

Pin one Node.js version. **Prefer Node 22 LTS** if compatibility with the selected
Next.js / Supabase / Vercel stack is confirmed at implementation time; otherwise the
latest supported LTS agreed by the dependency matrix.

Record it in `.nvmrc`, in `package.json` `engines`, and configure Vercel to match. No
app may silently run a different Node version.

---

## 24. NEXT.JS / REACT VERSION DISCIPLINE (LOCKED)

All three apps use the **same approved versions** of `next`, `react`, and `react-dom`.
Maintain version consistency at the monorepo root/workspace level. No workspace drifts
onto an incompatible version.

---

## 25. DESIGN SYSTEM APPROACH (LOCKED)

Owned component architecture inspired by shadcn/ui — not a heavy black-box library.
Components live in `packages/ui`, built with Tailwind and accessible headless
primitives (e.g. Radix) where justified. Objectives: code ownership, accessibility,
customization, consistency, minimal vendor lock-in.

The **public memorial** visual system must be premium, editorial, quiet, respectful,
and timeless — **not** a default shadcn dashboard. Family/admin surfaces may use the
shared foundations with more functional dashboard patterns.

---

## 26. PWA SCOPE (LOCKED)

PWA functionality is required for `apps/web` and `apps/family-portal`.
`apps/platform-admin` does **not** need PWA treatment for MVP.

Use a maintained, standards-based service-worker solution — **prefer Serwist** (or
equivalent) after verifying current compatibility with the selected Next.js version. Do
not adopt an abandoned package because it was historically popular.

Implement: web app manifest, appropriate icons, installability, service worker, static
asset caching, network resilience, offline fallback where appropriate, responsive
layouts, Android browser support, iPhone browser + home-screen behavior where
supported. Do not aggressively interrupt visitors with install prompts.

---

## 27. ENVIRONMENT VARIABLES (LOCKED — Zod validation)

Create `.env.example` documenting every required variable. Potential variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server only — never in the browser
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_FAMILY_URL
NEXT_PUBLIC_ADMIN_URL
APP_ENV
DATABASE_URL                       # server only (Drizzle)
EMAIL_PROVIDER_API_KEY             # server only
MAP_PROVIDER_KEY
PAYMENT_PROVIDER_SECRET            # server only
```

Rules:

- Zod-based validation; foundations in `packages/config`.
- Each app defines/consumes only the variables it actually needs.
- Fail fast in development/build/startup on missing or invalid variables.
- Clearly separate client-safe variables from server-only secrets.
- Never expose server-only secrets via `NEXT_PUBLIC_`.
- `SUPABASE_SERVICE_ROLE_KEY` must never reach the browser.
- No real secrets in `.env.example`.

---

## 28. DOMAIN STRATEGY

Production domains (do not hardcode — use environment variables):

| Surface | Domain |
|---|---|
| Public website + memorial experience | `evermora.com` |
| Family portal | `family.evermora.com` |
| Platform admin | `admin.evermora.com` |
| Individual memorial | `evermora.com/{memorial-slug}` |

Families can choose/customize the memorial slug. Do not claim a domain is connected
until ownership and DNS are confirmed.

---

## 29. DATABASE — CORE ENTITIES

Expected core entities (introduce others only where justified):

```
profiles              memorials             memorial_people
memorial_memberships  memorial_slugs        story_sections
albums                media                 tributes
funeral_events        family_updates        remembrance_actions
feature_settings      privacy_settings      service_requests
notifications         reports               audit_logs
```

Use proper relational modeling — **not** one giant JSON blob per memorial. Use primary
keys, foreign keys, indexes, unique constraints, check constraints where appropriate,
created/updated timestamps, soft deletion where appropriate, and audit fields where
appropriate.

The final ERD is produced and documented in Phase 2 (`docs/architecture`).

---

## 30. DEVELOPMENT SEED DATA

Realistic **fictional** development data: family user, published memorial, draft
memorial, story sections, gallery items, pending tribute, approved tribute, funeral
event, family update, remembrance action, service request where appropriate.

**Never** use real grieving families' information as fixtures.

---

## 31. GIT

- Initialize Git in `evermora/` if not already initialized.
- `main` is the production branch.
- Development branches: `feature/*`, `fix/*`, `chore/*`.
- For a brand-new private repo, the initial bootstrap may commit directly to `main`.
  After the foundation is established, meaningful production changes normally go through
  pull requests.

Desired workflow:

```
Local development → feature branch → GitHub → pull request
→ Vercel preview → review / QA → merge → production deployment
```

### .gitignore (exclude at minimum)

```
node_modules   .next   .turbo   coverage   build output   temporary files
.env   .env.local   .env.*.local
OS-specific files   IDE-specific private settings
Supabase temporary local state
```

Never commit secrets.

---

## 32. GITHUB REPOSITORY SETUP

- Repository name: `evermora`. **Private** initially unless explicitly instructed
  otherwise.
- Before creating: inspect existing remotes, check whether the repo already exists,
  avoid duplicates.
- Use GitHub CLI / an authorized GitHub integration directly when available — do not
  merely print instructions if the operation can be performed safely.
- Configure `origin` to the correct Evermora repository; create a verified initial
  commit; push; verify the remote.
- Stop only at a genuine authorization dependency; explain exactly what is needed;
  continue after authorization.

---

## 33. GITHUB SECURITY

Never commit: Supabase service role keys, database passwords, Vercel secrets, OAuth
secrets, email provider secrets, payment provider secrets, private keys, production
credentials.

If a secret is committed: treat it as compromised, rotate it, and do not assume
deleting it from the latest commit is sufficient.

---

## 34. VERCEL SETUP (LOCKED — three projects)

Connect the GitHub monorepo to Vercel. Create/configure:

| Vercel project | Root directory |
|---|---|
| `evermora-web` | `apps/web` |
| `evermora-family` | `apps/family-portal` |
| `evermora-admin` | `apps/platform-admin` |

**Do not create `evermora-api`.**

- Configure preview deployments.
- Verify each deployment actually serves the app — a successful build is not proof it
  is operational.
- Do not claim Vercel is connected unless the connection actually succeeds.
- Do not invent deployment URLs.

### Deployment flow

```
Developer machine → GitHub → Vercel → preview deployment → review
→ merge to main → production deployment
```

Preview deployments must not use unrestricted production resources, and must not modify
production data.

### Vercel environment variables

Configure per project, with separate values for Development / Preview / Production where
appropriate. Never expose `SUPABASE_SERVICE_ROLE_KEY`, database credentials, email
provider secrets, payment secrets, or other server credentials to browser code.

---

## 35. SUPABASE SETUP

Use Supabase for PostgreSQL, Auth, Storage, RLS, migrations, and database functions
where justified. Realtime and Edge Functions only where useful.

- Before creating: check whether an appropriate Evermora project already exists; do not
  create duplicate production resources.
- Use the Supabase CLI / an authorized integration directly when available.
- Do not invent Supabase project IDs or credentials.

### Environments

Support environment separation — at minimum **Development** and **Production**; prefer
**Development / Staging / Production** as the project matures. Never allow preview or
development deployments to modify production data.

### Auth

Supabase Auth. Initial family authentication supports: email + password, email
verification, forgot password, reset password, secure sessions. Visitors need no
account to view a memorial, read published tributes, view funeral info, or submit a
tribute where enabled.

---

## 36. AI EXECUTION BEHAVIOR

When implementation is authorized and terminal/filesystem/integration access is
available:

- Perform safe setup operations directly — do not merely print commands.
- Inspect command results; read, diagnose, and fix errors; re-run validation; continue
  until the stage is complete or a genuine authorization dependency blocks progress.
- Do not repeatedly ask questions answerable by inspecting the filesystem,
  `package.json`, Git state, remotes, existing env files, Supabase config, Vercel
  config, or existing docs.

Ask the user only for: authentication, account selection, billing, domain ownership,
credential authorization, destructive actions, or unresolved product decisions.

### Do not fake external setup

Clearly distinguish: actions actually completed · local preparation completed ·
external configuration still requiring authorization · actions that failed.

Never claim as done — unless it actually succeeded — that a GitHub repo was created or
linked, Vercel connected, Supabase created or configured, a domain connected, or
production deployed. Never invent repository URLs, deployment URLs, Supabase project
IDs, credentials, or domain configuration.

---

## 37. IMPLEMENTATION PHASES

### PHASE 0 — LOCAL FOUNDATION

Before creating anything: inspect the working directory; check whether `evermora`
exists; if it exists, inspect it and determine whether it holds an existing project or
Git repo; never overwrite blindly; safely continue existing work where appropriate.

Also verify local tooling (do not assume it exists): Node.js, npm, Git, and — if
available — GitHub CLI, Vercel CLI, Supabase CLI. If a required tool is missing and safe
to install, install it; otherwise state clearly what is required.

Then create and verify:

- `evermora` folder
- npm workspaces
- Turborepo
- three Next.js applications (`web`, `family-portal`, `platform-admin`)
- `packages/domain`, `packages/ui`, `packages/types`, `packages/config`,
  `packages/database`, `packages/utils`
- TypeScript configuration
- ESLint
- formatting (Prettier)
- Tailwind
- Zod environment validation
- Vitest
- React Testing Library
- Playwright foundation
- `.nvmrc`
- `.env.example`
- one trivial passing test per relevant workspace
- `npm install` succeeds
- `npm run dev` works
- `npm run typecheck` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- Git initialized
- first verified commit

Do not suppress meaningful errors to force a green build.

### PHASE 1 — GITHUB + VERCEL

- create/connect private GitHub repository (`evermora`); inspect remotes; avoid
  duplicates
- push code
- configure GitHub Actions CI
- connect repository to Vercel
- create 3 Vercel projects with correct root directories
- configure preview deployments
- verify preview URLs actually serve each app
- configure non-secret environment scaffolding

### PHASE 2 — SUPABASE + DATA FOUNDATION

- create/connect development Supabase project
- finalize the initial ERD
- create Supabase SQL migrations (authoritative)
- configure core entities
- create the memorial slug architecture (immutable ID, canonical slug, aliases,
  reserved routes, redirects, QR resolver)
- configure Supabase Auth
- configure RLS
- configure Storage + storage policies
- configure supabase-js client factories
- configure Drizzle (schema reflects the DB; not a migration authority)
- generate/synchronize database types
- add development seed data
- add database/RLS security tests (§16 scenarios)
- verify local application connectivity

Never let local/preview environments modify production data.

### PHASE 3 — DOCUMENTATION

Create/update `docs/product/`, `docs/architecture/`, `docs/domain/`. At minimum:

**docs/product/**

- PRD
- MVP scope
- roles
- permissions
- user flows
- screen inventory
- memorial creation flow
- tribute moderation flow
- funeral management flow
- service request flow
- platform admin flow

**docs/architecture/**

- system architecture
- repository architecture
- ERD
- authorization architecture
- RLS
- storage architecture
- memorial URL architecture
- slug alias architecture
- QR resolver architecture
- notification architecture
- PWA architecture
- testing architecture
- CI/CD
- deployment architecture
- environment strategy
- media/image pipeline (`media-storage.md`)

**docs/domain/** — documentation for the operations implemented in `packages/domain`;
the executable code stays in `packages/domain`, this explains how it behaves

- domain model overview
- domain operation catalogue
- operation input/output contracts
- authorization rules
- validation rules
- domain errors
- transaction requirements
- side effects
- domain events
- notification events
- audit events

For each significant domain operation, document where applicable: purpose, business
responsibility, input, output, caller context, authentication requirements,
authorization requirements, validation, domain rules, database interactions, errors,
side effects, emitted domain events, notification events, audit events, idempotency
requirements, transaction boundaries, security considerations, related entities,
related user flows.

Operations to document include: `createMemorial`, `publishMemorial`, `archiveMemorial`,
`changeMemorialSlug`, `transferMemorialOwnership`, `approveTribute`, `rejectTribute`,
`hideTribute`, `createFuneralEvent`, `publishFuneralEvent`, `cancelFuneralEvent`,
`publishFamilyUpdate`, `inviteMemorialAdmin`, `changeMemorialRole`,
`requestFuneralService`, `reportMemorial`, `generateShareAsset`, `recordAuditEvent`.

**Domain contracts are not HTTP contracts.** A domain operation such as
`publishMemorial()` may be invoked through a Server Action, a Route Handler, an internal
server-side service, a future standalone API, a future mobile backend, or a future
background worker. The domain contract must not depend on which transport invokes it.
Document `publishMemorial` — not `POST /api/memorials/:id/publish` — as the
authoritative business contract. An HTTP endpoint, if one exists, is only a transport
adapter around the domain operation, and its HTTP-specific behavior is documented
separately alongside the relevant app.

**Do not create `docs/api/` for the MVP.** If Evermora later introduces a genuine
public or partner API, a separate area (e.g. `docs/api/` or `docs/integrations/`) may
be added then for HTTP endpoints, auth schemes, request/response payloads, rate limits,
webhook contracts, API versioning, SDK behavior, and partner integrations. That future
API documentation wraps the existing domain layer rather than replacing it.

Do not leave important architecture decisions only inside an AI conversation.

### PHASE 4 — BOOTSTRAP REPORT

Report exactly, verified (no assumptions):

- what was created locally
- Git repository state
- GitHub repository state
- Vercel state
- Supabase state
- build status
- test status
- migration status
- RLS status
- preview deployment status
- documentation status
- actions still requiring human authorization

Only after this report — and after the updated architecture is documented and Phase 0
is verified — proceed to major Evermora feature development.

---

## 38. BOOTSTRAP COMPLETION CHECKLIST

Mark complete only after verification:

- [ ] Local `evermora` folder created
- [ ] npm workspaces configured
- [ ] Turborepo configured
- [ ] Three Next.js apps initialized (`web`, `family-portal`, `platform-admin`)
- [ ] `packages/domain` + 5 other packages created
- [ ] TypeScript configured
- [ ] Tailwind configured
- [ ] ESLint + formatting configured
- [ ] Zod env validation configured
- [ ] Vitest + React Testing Library + Playwright foundation configured
- [ ] `.nvmrc` + `engines` + Vercel Node version aligned
- [ ] One trivial passing test per relevant workspace
- [ ] `npm run typecheck` / `lint` / `test` / `build` passing
- [ ] Git initialized + first verified commit
- [ ] GitHub repository created (private) and pushed
- [ ] GitHub Actions CI running
- [ ] Vercel connected — 3 projects, correct root dirs
- [ ] Preview deployments verified
- [ ] Supabase development project connected
- [ ] Initial SQL migrations applied
- [ ] Supabase Auth configured
- [ ] RLS configured + RLS tests passing
- [ ] Storage buckets + policies configured
- [ ] Drizzle configured; DB types generated
- [ ] Seed data loaded
- [ ] Environment variables documented (`.env.example`)
- [ ] README created
- [ ] `docs/architecture/` + `docs/product/` + `docs/domain/` documentation created

---

## 39. APPROVED HIGH-LEVEL ARCHITECTURE

```
PUBLIC
  evermora.com
      ↓
  apps/web
      ↓
  Next.js server rendering / public Route Handlers
      ↓
  published memorial data
      ↓
  Supabase / PostgreSQL

FAMILY
  family.evermora.com
      ↓
  apps/family-portal
      ↓
  Supabase Auth
      ↓
  Next.js Server Actions / Route Handlers
      ↓
  packages/domain
      ↓
  packages/database
      ↓
  Supabase PostgreSQL + RLS

ADMIN
  admin.evermora.com
      ↓
  apps/platform-admin
      ↓
  isolated admin authentication
      ↓
  Next.js Server Actions / Route Handlers
      ↓
  packages/domain
      ↓
  packages/database
      ↓
  Supabase PostgreSQL + RLS

SHARED DATA / DOMAIN
  packages/domain  (business rules, authorization, validation orchestration,
                    audit events, notification events)
      ↓
  packages/database
      ↓
  Drizzle + supabase-js
      ↓
  PostgreSQL / Supabase
```

Keep the architecture: secure, modular, maintainable, typed, testable,
performance-conscious, privacy-conscious, production-oriented. Do not sacrifice approved
Evermora product principles for implementation convenience.

---

## 40. FINAL LOCKED DECISIONS

| # | Decision |
|---|---|
| REMOVE | `apps/api` as an initial deployable application |
| REMOVE | `docs/api/` for the MVP |
| ADD | `packages/domain` (framework-independent business/domain layer) |
| RENAME | `docs/api/` → `docs/domain/` (transport-independent domain contracts, not HTTP) |
| LOCK | 3 deployable Next.js applications: `web`, `family-portal`, `platform-admin` |
| LOCK | React + Next.js + TypeScript + Tailwind CSS |
| LOCK | npm + npm Workspaces + Turborepo |
| LOCK | GitHub + GitHub Actions |
| LOCK | Vercel (3 projects: `evermora-web`, `evermora-family`, `evermora-admin`) |
| LOCK | Supabase PostgreSQL + Auth + Storage + RLS |
| LOCK | supabase-js + Drizzle |
| LOCK | Supabase SQL migrations as the single migration authority |
| LOCK | Vitest + React Testing Library + Playwright + dedicated RLS/DB tests |
| LOCK | Zod environment validation (foundations in `packages/config`) |
| LOCK | Isolated family/admin sessions for MVP (no shared `.evermora.com` cookie) |
| LOCK | Family-portal-based draft preview (no authed preview on `evermora.com/{slug}`) |
| LOCK | `evermora.com/{memorial-slug}` (never `/m/`); reserved route registry from day one |
| LOCK | Permanent QR resolver architecture |
| LOCK | Node 22 LTS preferred; single pinned version across all apps |
| LOCK | Shared Next/React/React-DOM versions across all apps |
| LOCK | Owned shadcn-style design system in `packages/ui`; editorial public memorial |
| LOCK | PWA for `web` + `family-portal` only (prefer Serwist) |
| DEFER (behind abstraction) | Email provider (Resend / Postmark / …) |
| DEFER (behind abstraction) | Image transformation provider (Supabase / Vercel / combination) |

**Do not begin major feature implementation until the updated architecture is
documented and the Phase 0 foundation is verified.**
