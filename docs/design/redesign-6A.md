# Phase 6A — product experience redesign

The Evermora MVP is functionally complete. Phase 6A rebuilds the **user-facing
experience** — composition, hierarchy, navigation, density, responsive
behaviour, state design — across all four product surfaces, on the locked 6A.0
design system. No business logic, schema, RLS, auth, or privacy-model changes.

- **6A.0 — design-system foundation** — done merged (`07f36ec`, PR #23).
- **6A.1 — marketing website** — done merged (PR #24).
- **6A.2 — family portal shell** — done merged (PR #25).
- **6A.3 — family portal screens** — done merged (PRs #26, #27).
- **6A.4 — platform admin shell** — done merged (PR #28).
- **6A.5 — platform admin screens** — done merged (PR #29).
- **6A.6 — public memorial refinement** — done merged (PR #30).
- **6A.7 — cross-product polish** — PR `feature/ui-product-polish`.

Each phase: full quality gates + Playwright + Vercel preview + one reviewable
PR. Continuous authorization (brief §65) — no stop between phases while CI is
green, security is intact, and no new domain op / paid infra is required.

---

## 1. Research reference

Patterns adapted (not copied) from products solving the same problems:

| Problem                       | Studied                                          | Adapted as                                                                       |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| App shell + nav groups        | Linear, Vercel, Shopify Polaris                  | Grouped sidebar with an entity-context block; not a flat list                    |
| Operational dashboard density | Linear inbox, Stripe home, GOV.UK "Manage"       | KPI strip → priority work → recent activity, 12-col                              |
| Editorial marketing rhythm    | Stripe, Framer, Notion marketing                 | Five-movement page, alternating spreads, background shifts                       |
| Data tables                   | Polaris `IndexTable`, Linear lists               | `DataTable` = `Table` + toolbar (search / filter / sort / paginate) + row menu   |
| Form architecture             | GOV.UK, Stripe dashboard, Notion settings        | Sectioned forms, one concern per fieldset, sticky save bar                       |
| Settings IA                   | Stripe, Linear, GitHub                           | Grouped, titled sections; switches read as settings not a form                   |
| Memorial / obituary register  | editorial obituary design, museum memorial pages | Portrait-led asymmetric hero, serif, hairline rules, no cards                    |
| Empty / loading / error       | Linear, Height, Polaris                          | Every list: skeleton, considered empty state, retryable error                    |
| Auth surfaces                 | Linear, Stripe, Notion                           | Two-pane (editorial panel + form) for family; restrained staff console for admin |

Accessibility inputs: WCAG 2.2 AA, Apple HIG touch targets, GOV.UK error
summary / one-thing-per-page, ARIA Authoring Practices for menu/dialog/tabs.

---

## 2. Current UX problems (verified in code)

### Shared, systemic

1. **The design system is built but unused.** `@evermora/ui` ships the full
   primitive + shell set. `apps/web` uses `cn`/`SkipLink`/`fontVars`/`Button`;
   family + admin add nothing else. Every real screen hand-rolls raw
   `neutral-*` / `red-*` / `amber-*` Tailwind. Four distinct field
   implementations exist in the family portal alone.
2. **Content is trapped in a narrow centred column.** Admin clamps every screen
   to `max-w-4xl` (896 px). Family clamps to `max-w-3xl` (768 px) **and** then
   splits off a second `md:w-52` sidebar inside it — real editable width ≈ 520 px
   inside a 1200 px+ shell. Photo grids cap at 2–3 columns; forms re-clamp again
   to `max-w-md`/`max-w-lg`. Symmetric dead margins on every desktop viewport.
3. **No loading / error boundaries anywhere** in family or admin — no
   `loading.tsx`, `error.tsx`, `not-found.tsx`, no `<Suspense>`. Every route is a
   blocking fetch; failed reads silently return `[]`, so "error" looks like
   "empty".
4. **`window.confirm()` / `window.prompt()`** drive every destructive action and
   the memorial-suspension reason.
5. **Raw enum tokens shown to users** — `anyone_with_link`, `in_review`,
   `impersonation`, `rejected` — instead of `StatusBadge`.
6. **No tables.** Admin's three queues and the memorial list are `<ul><li>` card
   stacks: no headers, sort, pagination (hard `limit` 50/100), or bulk actions.
7. **Weak page headers** — every page hand-writes `<h1 class="text-xl
font-semibold">`; no serif, no breadcrumb, no context, no action region.
8. **Dead `dark:` variants** litter `apps/web` (no dark strategy since 6A.0).

### Marketing (`apps/web /`)

`PlaceholderScreen` — eyebrow, one `<h1>`, one line, two non-functional buttons
("Primary action" / "Secondary"). No header, footer, nav, imagery, or product
explanation. Only `/services` exists; `/about` … `/terms` are reserved words
with no page. No `robots.ts`, `sitemap.ts`, `metadataBase`, or OG image.

### Family portal

- App shell shows only "Home / Account" — **no memorial context** when you're
  three levels deep editing photos; no switcher; no "New memorial" affordance;
  sign-out is a bare link, hidden entirely on mobile.
- Memorial nav is **13 undifferentiated text links**, no grouping, no icons, no
  counts (the pending-tribute count is computed and not shown on the nav item).
- Overview is three different bordered-card patterns squeezed into 520 px; the
  "at a glance" numbers are the only place counts live and they aren't linked.
- `/account` is a read-only dead end (can't change name/email/password).
- `/settings` is a permanent "soon" placeholder; `changeMemorialSlug` is built
  but wired to no UI; `reorderPhotos` likewise.
- Auth: a 384 px centred card, text wordmark, nothing else.

### Platform admin

- Overview = 4 tiny count links + one grey paragraph, in an 896 px band on a
  1920 px screen. No work queue, no recent activity, no aging/assignment.
- `getAdminCounts` is the entire dashboard dataset (4 `count` queries). **No
  audit-read capability exists** anywhere (`AuditRepository` is append-only).
- Memorials list: `?status=suspended` deep link is broken (post-fetch `.filter`
  of the 50 newest name matches); suspension reason via `window.prompt`.
- No topbar; notification bell rendered twice inside the sidebar; account block
  is tiny grey text, hidden on mobile.

### Public memorial

- Portrait is a **160 px circular social avatar**; name/dates float in a large
  empty centred column (`max-w-2xl`, inner `max-w-prose`).
- Milestones are a plain date/label list — no timeline rule or markers.
- Gallery has **no lightbox** (images aren't even links).
- Nothing sticky; no share/contribute affordance; no header or footer.
- Raw `neutral-*` throughout; not on the token palette; dead `dark:` variants.

---

## 3. New information architecture

### `apps/web` — marketing + public memorial (public, anonymous)

```
/                     marketing home            ┐
/how-it-works                                   │
/features                                       │ (marketing) route group:
/about                                          │  Header + Footer, canvas ground
/services             (moved here, restyled)    │
/support                                        │
/privacy                                        │
/terms                                          ┘
/create               307 → {FAMILY_URL}/sign-up?next=/memorials/new
/signin               307 → {FAMILY_URL}/sign-in
/robots.txt  /sitemap.xml                        marketing URLs only
/{memorial-slug}      PUBLIC MEMORIAL   (outside the group — no marketing chrome)
/q/{token}            QR resolver       (outside the group)
/health  /offline  404
```

- `how-it-works` and `features` are **not yet reserved** → migration adds them
  to `reserved_slugs` + `RESERVED_ROUTES` + a pgTAP assertion (brief §28).
- The marketing layout paints its **own** `bg-canvas` ground; the global `body`
  background is untouched, so the memorial page's contrast is unaffected (the
  6A.0 lesson).

### `apps/family-portal` — authenticated

Shell becomes **memorial-scoped** once a memorial is open.

```
Sidebar (lg+, Drawer below):
  Evermora ▸ (wordmark, links to /)
  ┌ Memorial context ────────────┐
  │ ◐ Joseph Olayiwola Olaleye   │  ← MemorialSwitcher: portrait/monogram,
  │   Published · Public      ▾  │     name, status; ▾ opens switch / + New
  └──────────────────────────────┘
  OVERVIEW      Overview
  THE MEMORIAL  Basic information · Their story · Photos & memories
  COMMUNITY     Tributes ⁵ · Family updates          (⁵ = live count badge)
  FUNERAL       Funeral
  SHARING       Share & QR
  MANAGE        Privacy & sections · Family access · Services · Settings
  ┌ Account ─────────────────────┐
  │ ◍ Ada Okafor   Owner      ▾  │  ← DropdownMenu: Account, Sign out
  └──────────────────────────────┘   (visible on mobile too)

Topbar: breadcrumb + page context · [contextual action] ·  · account ▾
```

- No memorial open (`/`, `/account`): sidebar shows **Home**, **Account**, then
  the memorial list; a prominent **New memorial** button.
- Route relabels only (no path changes, no workflow changes):
  `/edit` → "Basic information", `/customize` → "Privacy & sections".
- `/settings` becomes real: **Memorial address** (wires the existing
  `changeMemorialSlug` op, with the alias-history explanation). Archive / delete
  need domain ops that don't exist → shown as clearly-labelled _not yet
  available_, not faked.
- `/account` gains name / email / password editing (Supabase Auth +
  `profiles` — already permitted; no new op).
- Dashboard `/`: memorial cards (portrait, name, status, role, attention dot) +
  pending invitations + an attention strip; a single-memorial family sees the
  same list (one card) — no forced redundancy, the card is the entry point.

### `apps/platform-admin` — isolated staff console

```
Sidebar (@evermora/ui Sidebar):
  Evermora Admin   [dev]                (environment badge)
  Overview
  Memorials
  Reports ³                             (open-count badge)
  Service requests ²                    (waiting-count badge)
  ┌ Account ─────────────┐
  │ ◍ Staff · Platform ▾ │              DropdownMenu: Design system, Sign out
  └──────────────────────┘

Topbar: page title / breadcrumb ·  · account ▾
Content fills the DashboardContainer (max ~1400px), not max-w-4xl.
```

- Sidebar lists **only implemented routes** (brief §29). `/users`, `/audit`,
  `/support`, admin memorial-_detail_ need domain ops that don't exist — **not
  added** to the nav this phase; noted as deferred.
- `/memorials/[id]` (admin detail) — a **read-only** detail assembled from data
  admin RLS already permits (memorial row, slugs, privacy/feature settings,
  memberships, that memorial's reports). No new domain op. Suspend / restore
  move here and to a row action.
- Overview data: `getAdminCounts` extended in the **read layer** (no domain op)
  — Memorials, Published, Suspended, Open reports, Service requests waiting.
  "Recent activity" is built from what's readable (recent memorials by
  `created_at`, recent report/service-request state) — never fabricated
  (brief §30). A true audit feed is deferred with the audit-read op.

### Public memorial

No IA change. Functional architecture, routing, RLS, privacy model, section
order gates — untouched. Visual refinement only (§6.6).

---

## 4. Layout & grid standards

Three container roles, as `@evermora/ui` exports (`Container` with a `size`
prop) — used consistently so "how wide is this screen" is a decision, not an
accident:

| Role        | Max width                                        | Used for                                           |
| ----------- | ------------------------------------------------ | -------------------------------------------------- |
| `editorial` | `min(92vw, 46rem)` prose / `72rem` section shell | marketing prose, memorial story, legal pages       |
| `app`       | `64rem` (1024)                                   | family forms, settings, content editors, auth      |
| `dashboard` | `88rem` (1408)                                   | family + admin overview, tables, queues, galleries |

- **App shells**: `lg+` sidebar `w-64` (256) fixed; content region is
  `flex-1 min-w-0` with `px-6 lg:px-8` gutters and its container max — it
  **fills** to that max, never a centred sub-column. Below `lg`: sidebar → Drawer
  from the Topbar menu button.
- **12-column grid** available in `dashboard` content (`grid-cols-12 gap-6`);
  standard splits 8/4, 7/5, 6/6, 3·4. Overview pages compose real modules into
  it, not "title + four cards + void".
- **Marketing**: full-bleed `<section>`s, inner content `max-w-6xl mx-auto
px-6`; prose blocks `max-w-[46rem]`; alternating left/right spreads;
  background alternates `canvas` / `surface` / `surface-subtle` to segment
  movements without borders.
- **Spacing rhythm**: section padding `py-16 md:py-24` (marketing),
  `py-8 lg:py-10` (app); vertical stack gap scale `4 / 6 / 10` only.
- **Tables**: desktop real `<table>`; below `md` the row collapses to a stacked
  key/value card (`DataTable` handles the switch). Never a 10-column table at
  375 px. Wide content scrolls in its own `overflow-x-auto` container — the page
  body never scrolls sideways at any breakpoint.
- **Cards are spent by role** (brief §55): a card = a genuinely self-contained
  object. Sections use headings + hairline rules + background shifts. Lead with
  big-number tiles only where the figure is the point (Overview KPI strip).

---

## 5. Design language per register

Same tokens (6A.0 Palette A), four compositions.

|              | Marketing                                               | Public memorial                  | Family portal                 | Platform admin                   |
| ------------ | ------------------------------------------------------- | -------------------------------- | ----------------------------- | -------------------------------- |
| Register     | editorial, warm, story-led                              | ceremonial, quiet, content-first | calm, guided, supportive      | neutral, dense, operational      |
| Ground       | `canvas` / `surface` shifts                             | `canvas`, generous               | `canvas`, `surface` panels    | `surface` / `canvas`, tight      |
| Display face | Newsreader — large                                      | Newsreader — the name dominates  | Newsreader — page titles only | Newsreader — page titles only    |
| Body         | Public Sans ~66ch                                       | Public Sans ~66ch                | Public Sans                   | Public Sans, 13–14px dense       |
| Mono         | Memorial Address, dates                                 | dates, Memorial Address          | IDs, addresses, timestamps    | IDs, slugs, timestamps, counts   |
| Evergreen    | every CTA                                               | "leave a tribute", links         | every primary action          | every primary action, active nav |
| Bronze       | hairline rules, eyebrows, pull-quotes                   | section rules, small-caps        | sparingly — section eyebrows  | almost never                     |
| Motion       | 4px fade-reveal from a visible rest state, 150ms hovers | gentle or none                   | subtle; save/toast feedback   | minimal; instant feels fast      |
| Density      | spacious                                                | spacious                         | comfortable                   | compact                          |

`prefers-reduced-motion` honoured everywhere; no animation library (hand-rolled
IntersectionObserver, ~15 lines).

---

## 6. Per-phase plan

### 6A.1 — Marketing (`feature/ui-marketing-site`)

- `(marketing)` route group: `layout.tsx` (Header + Footer, `bg-canvas`),
  `page.tsx` (15 sections / 5 movements), `opengraph-image.tsx`, and
  `how-it-works` · `features` · `about` · `support` · `privacy` · `terms`;
  `services/` moved in and restyled (server action untouched).
- `create/route.ts` + `signin/route.ts` — 307 redirects to `{FAMILY_URL}` via a
  new `NEXT_PUBLIC_FAMILY_URL` (client env; added to schema, `.env.example`,
  `.env.local`, Vercel).
- `robots.ts`, `sitemap.ts` (marketing routes only), `metadataBase` + default
  OG/Twitter in the root layout, shared `marketing-metadata` helper.
- Migration `*_reserve_marketing_slugs.sql` + `RESERVED_ROUTES` + pgTAP.
- Marketing components in `apps/web/src/components/marketing/` (header, footer,
  hero, section, steps, phases, feature-spread, memorial-link, privacy-panel,
  principles, cta, memorial-preview, motifs). Editorial, typographic, abstract —
  no photos, no external assets.
- e2e: `smoke.spec.ts` (update), `marketing.spec.ts`, `cta.spec.ts`,
  `memorial.spec.ts` (`/about` now a page, memorial + alias still resolve).

### 6A.2 — Family shell (`feature/ui-family-shell`)

- Extend `@evermora/ui`: `Container(size)`, richer `Sidebar` (nav groups,
  `SidebarAccount`, context slot), `AppShell`, `EntityHeader` (portrait +
  serif name + meta + actions), `DataTable` (Table + toolbar + responsive
  collapse), `TableToolbar`. Non-breaking additions.
- `(app)/layout.tsx`: sidebar + topbar + `dashboard`/`app` content region;
  Drawer below `lg`; account menu (mobile-reachable sign-out).
- `MemorialSwitcher`, `MemorialSectionNav` (grouped, icons, `Tributes` count),
  `(app)/memorials/[id]/layout.tsx` → `EntityHeader` + no second sidebar.
- `loading.tsx` / `error.tsx` / `not-found.tsx`; `ToastProvider` at the shell.
- Auth surfaces: two-pane (editorial panel + `@evermora/ui` form card) for
  sign-in / sign-up / forgot / reset; `/invite/[id]` gets its own clean layout.
- No page-body redesigns beyond what the shell forces; screens keep working.

### 6A.3 — Family screens (`feature/ui-family-pages`)

Route-by-route (see the inventory in §7): Dashboard, Overview (real dashboard —
`EntityHeader`, KPI grid, attention area, checklist, recent activity), Basic
information (sectioned form + sticky save bar), Their story, Photos (wider grid,
progress, lightbox reuse), Tributes (work queue + tabs + `StatusBadge` + batch
approve), Funeral (event/timeline composition), Family updates (communication
manager), Share & QR (sharing workspace + considered QR empty state), Privacy &
sections (grouped, `Switch`), Family access (people management, `Avatar`,
plain-language roles), Services, Settings (Memorial address — wires
`changeMemorialSlug`), Account (editable). `confirm()` → `AlertDialog`; ad-hoc
green boxes → toasts; shared label maps → `@evermora/types` / a `lib/labels`.
May split 3a (primary) / 3b (secondary) if the diff is too large to review.

### 6A.4 — Admin shell (`feature/ui-admin-shell`)

`@evermora/ui` `Sidebar` + `Topbar` + `SidebarAccount`; environment badge;
`Container` size `dashboard`; `loading`/`error`/`not-found`; single
`NotificationBell` in the topbar; read-layer `getAdminOverview` (counts +
readable recent data). No screen redesigns yet.

### 6A.5 — Admin screens (`feature/ui-admin-pages`)

Overview command centre (KPI strip → priority work → recent activity, 12-col);
Memorials `DataTable` (search / status filter / sort / paginate / row menu; fix
the `?status=` deep link server-side); Memorial detail (read-only, existing
data); Reports work queue (filter tabs, `StatusBadge`, target links);
Service requests workflow (status with confirm-on-terminal, filters).
`window.prompt`/`confirm` → `AlertDialog` + reason form.

### 6A.6 — Public memorial (`feature/ui-public-memorial`)

Editorial refinement, functional architecture preserved:

- **Hero**: asymmetric, portrait as a large soft-rounded rectangle at meaningful
  size; Newsreader name dominant; dates; family statement. No portrait → a
  dignified typographic/monogram treatment on parchment, never blank.
- Token palette migration (every `neutral-*` → a token meeting AA on `canvas`);
  remove dead `dark:` variants.
- Sections as editorial movements — serif headings, bronze hairline rules,
  background shifts; not cards. Funeral logistics stay scannable in a light
  structured block.
- Milestones → a real vertical timeline (rule + markers).
- Gallery lightbox — code-split, lazy, keyboard-operable, `prefers-reduced-motion`.
- Slim sticky name header after scroll; mobile sticky share/contribute bar
  (share sheet / copy / leave a tribute). Subtle "Made with Evermora" footer →
  marketing.
- `not-found.tsx`, `/offline`, `/q/[token]` restyled to match.
- Performance budgets held (LCP ≤ 2.5s slow-4G, CLS < 0.1); `apps/web` stays
  free of portal code.

### 6A.7 — Cross-product polish (`feature/ui-product-polish`)

Responsive sweep at 320 / 375 / 390 / 430 / 640 / 768 / 1024 / 1280 / 1440 /
1920; a11y pass (keyboard, focus order, SR landmarks, contrast, targets, zoom
200%, reduced motion); perf pass (bundle, client components, images, waterfalls);
microcopy sweep (§58); visual QA screenshots (§69–70); e2e expansion to the full
matrix (§68); PWA audit (offline shell, no private-data caching).

---

## 7. Route inventory

Legend — **Reg**: M(arketing) / P(ublic memorial) / F(amily) / A(dmin).
**Δ**: R(edesign) / N(ew) / L(ight touch — shell/token only) / —(unchanged).

### apps/web

| Route           | Reg | Purpose                      | Δ        | Notes                                                |
| --------------- | --- | ---------------------------- | -------- | ---------------------------------------------------- |
| `/`             | M   | marketing home               | R        | full 15-section build; replaces `PlaceholderScreen`  |
| `/how-it-works` | M   | the 4-step journey, in depth | N        | new reserved slug                                    |
| `/features`     | M   | core features, editorial     | N        | new reserved slug                                    |
| `/about`        | M   | who Evermora is              | N        | reserved already                                     |
| `/services`     | M   | service-request intro + form | R        | moved into `(marketing)`, restyled; action unchanged |
| `/support`      | M   | help / contact               | N        | reserved (`support`)                                 |
| `/privacy`      | M   | privacy policy               | N        | reserved                                             |
| `/terms`        | M   | terms                        | N        | reserved                                             |
| `/create`       | M   | → family sign-up             | N        | 307 route, env-aware                                 |
| `/signin`       | M   | → family sign-in             | N        | 307 route, env-aware                                 |
| `/robots.txt`   | M   | crawl policy                 | N        | permissive; `Disallow: /q/`                          |
| `/sitemap.xml`  | M   | marketing URLs only          | N        | never enumerates memorials (§30)                     |
| `/{slug}`       | P   | public memorial              | R (6A.6) | visual only; resolution/RLS/privacy untouched        |
| `/q/{token}`    | P   | QR resolver                  | L (6A.6) | restyle notice page                                  |
| `/health`       | —   | liveness                     | —        |                                                      |
| `/offline`      | P   | PWA fallback                 | L (6A.6) | restyle                                              |
| `404`           | P   | not found                    | L (6A.6) | restyle                                              |

### apps/family-portal (all Reg F)

| Route                                                      | Purpose            | Δ        | Notes                                                                |
| ---------------------------------------------------------- | ------------------ | -------- | -------------------------------------------------------------------- |
| `(app)/layout`                                             | app shell          | R (6A.2) | sidebar groups, memorial switcher, topbar, account menu              |
| `(app)/memorials/[id]/layout`                              | memorial shell     | R (6A.2) | `EntityHeader`; drop the second sidebar                              |
| `/`                                                        | dashboard          | R (6A.3) | memorial cards + invitations + attention strip                       |
| `/account`                                                 | account            | R (6A.3) | + editable name / email / password                                   |
| `/memorials/new`                                           | create wizard      | R (6A.3) | sectioned; live slug check; one field impl                           |
| `/invite/[id]`                                             | accept invitation  | R (6A.2) | own clean layout                                                     |
| `/memorials/[id]`                                          | Overview           | R (6A.3) | real dashboard: header, KPI grid, attention, checklist, activity     |
| `…/edit` → "Basic information"                             | profile            | R (6A.3) | sectioned form, sticky save bar                                      |
| `…/preview`                                                | draft preview      | R (6A.3) | device-frame toggle; reuse the refined public renderer               |
| `…/story`                                                  | story + milestones | R (6A.3) | wider editor; drag reorder; per-section publish                      |
| `…/photos`                                                 | gallery mgmt       | R (6A.3) | wider grid, upload progress, wired reorder, lightbox                 |
| `…/tributes`                                               | moderation         | R (6A.3) | work queue, tabs, `StatusBadge`, batch approve                       |
| `…/funeral`                                                | funeral events     | R (6A.3) | event/timeline composition, confirmed vs draft vs public             |
| `…/updates`                                                | family updates     | R (6A.3) | communication manager, clear status vocab                            |
| `…/share` → "Share & QR"                                   | sharing            | R (6A.3) | sharing workspace; considered QR list + empty state                  |
| `…/customize` → "Privacy & sections"                       | privacy + features | R (6A.3) | grouped; `Switch`; live summary sentence                             |
| `…/family` → "Family access"                               | team mgmt          | R (6A.3) | people management, `Avatar`, plain-language roles, confirmed changes |
| `…/services`                                               | concierge requests | R (6A.3) | request + tracked list with a status timeline                        |
| `…/settings`                                               | memorial address   | R (6A.3) | wires `changeMemorialSlug`; archive/delete = not-yet-available       |
| `/sign-in` `/sign-up` `/forgot-password` `/reset-password` | auth               | R (6A.2) | two-pane editorial + form                                            |
| `/offline` `404`                                           | infra              | L (6A.2) | restyle                                                              |

### apps/platform-admin (all Reg A)

| Route                             | Purpose          | Δ        | Notes                                                                           |
| --------------------------------- | ---------------- | -------- | ------------------------------------------------------------------------------- |
| `(app)/layout`                    | console shell    | R (6A.4) | `@evermora/ui` Sidebar + Topbar, account block, env badge                       |
| `/`                               | Overview         | R (6A.5) | command centre: KPI strip → priority work → recent activity                     |
| `/memorials`                      | memorial list    | R (6A.5) | `DataTable`: search / status filter / sort / paginate / row menu; fix deep link |
| `/memorials/[id]`                 | memorial detail  | N (6A.5) | read-only, existing data; suspend/restore here                                  |
| `/reports`                        | report triage    | R (6A.5) | work queue, filter tabs, `StatusBadge`, target links                            |
| `/service-requests`               | service workflow | R (6A.5) | status w/ confirm-on-terminal, filters                                          |
| `/design`                         | 6A.0 catalogue   | —        | unchanged (extend as primitives land)                                           |
| `/sign-in`                        | staff auth       | R (6A.4) | restrained console identity                                                     |
| `loading` / `error` / `not-found` | —                | N (6A.4) | none exist today                                                                |

---

## 8. Component strategy

**Extend `@evermora/ui`** (cross-product, non-breaking):

- `Container({ size: "editorial" | "app" | "dashboard" })`
- `Sidebar` upgrade: `NavGroup` / `NavItem` (icon + `count`), `SidebarAccount`,
  a context slot (entity switcher)
- `AppShell` (sidebar + topbar + content region + drawer wiring)
- `EntityHeader` (portrait/monogram + serif title + meta row + actions;
  `PageHeader` stays for plain pages)
- `DataTable` = `Table` + `TableToolbar` (search / filter / sort) + `Pagination`
  - responsive row collapse; state stays in the app
- `Lightbox` (dialog-based, lazy, keyboard, reduced-motion)

**App-local compositions** (brief §54 — live in their app):

- web: `MarketingHeader/Footer/Hero/Section/…`, `MemorialHero`, `MemorialTimeline`
- family: `MemorialSwitcher`, `MemorialSectionNav`, `MemorialOverviewDashboard`,
  `TributeQueue`, `FuneralEventList`, `AccessPeopleList`
- admin: `AdminMetricStrip`, `AdminWorkQueue`, `AdminRecentActivity`,
  `MemorialsTable`, `ReportQueue`, `ServiceRequestWorkflow`

**Shared, non-component**: `lib/labels` (or `@evermora/types` label maps) to
kill the duplicated `STATUS_LABEL` / `ROLE_LABEL` / `VISIBILITY_LABEL` consts.

---

## 9. Guardrails (every phase)

- No new domain operations, schema changes, RLS changes, or auth changes.
  The **only** DB change in 6A is `reserved_slugs += {how-it-works, features}`.
- No changes to memorial resolution, aliases, QR, privacy model, or the
  published-≠-indexed distinction.
- `apps/web` never bundles portal code; public-memorial performance budgets hold.
- Security headers / CSP unchanged; no external image or script hosts.
- Destructive actions confirm (`AlertDialog`); the most sensitive re-authenticate.
- Tests: preserve the green baseline; expand per §68; query by role / label,
  not CSS.
- Migrations reach the cloud DB only once `SUPABASE_ACCESS_TOKEN` is set
  (`db-migrate.yml`) — until then each report flags the manual
  `supabase db push --linked` step.

---

## 10. Open items carried from earlier

- `SUPABASE_ACCESS_TOKEN` repo secret — user side; blocks automatic cloud
  migration only.
- Supabase Auth dashboard toggles (Site URL / redirect allowlist / email
  confirmation) — user side; affects live sign-up testing only.
- Archive / delete memorial, admin user management, admin audit feed — need
  domain operations that don't exist; **deferred**, not built in 6A.
