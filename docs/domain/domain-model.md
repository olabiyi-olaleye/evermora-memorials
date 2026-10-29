# Domain model overview

`@evermora/domain` is framework-independent TypeScript: **no `react`, no
`next/*`, no browser APIs.** It depends only on `@evermora/types`,
`@evermora/utils`, and `zod`, plus repository **interfaces** from
`@evermora/database`.

## What the domain owns

- **Business rules** — what "publish a memorial" actually means, what a
  moderator may do, when a slug change is allowed.
- **Authorization decisions** — the real check, using the same permission
  strings the database enforces (`memorial.edit`, `tributes.moderate`, …).
- **Validation orchestration** — Zod schemas for input + cross-field and
  stateful invariants.
- **Writes** — through repositories, in explicit transactions.
- **Events** — domain events, audit events, notification events, recorded in the
  same transaction as the write.

## What the domain does not own

- HTTP, cookies, redirects, form state — the transport's job.
- Rendering, components — the apps' job.
- Pure string mechanics (`slugify`) — `@evermora/utils`.
- The last-line security boundary — that is Supabase RLS, which stands on its
  own regardless of the domain.

## `CallerContext` (IMPLEMENTED)

Every operation takes a `CallerContext`, resolved by the transport **before**
the operation runs:

```ts
interface CallerContext {
  userId: ProfileId | null; // Supabase auth.users id, null = anonymous visitor
  isPlatformAdmin: boolean; // platform-staff surface
  memorialRoles: ReadonlyMap<MemorialId, MemorialRole>; // caller's role per memorial
  request?: { ip?: string; userAgent?: string }; // best-effort, for audit
}
```

Helpers: `anonymousContext()`, `isAuthenticated(ctx)`,
`roleForMemorial(ctx, id)`. The domain **trusts the identity claims** in this
object (the transport verified the Supabase session) but still performs every
authorization check itself — and RLS re-checks underneath.

## Entities the domain governs

Mapped to the [data model](../architecture/data-model.md):

| Aggregate               | Root table                          | Related                                                                                                                |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Memorial**            | `memorials`                         | `memorial_slugs`, `share_resolvers`, `feature_settings`, `privacy_settings`, `memorial_people`, `memorial_memberships` |
| **Story & media**       | `story_sections`, `albums`, `media` | scoped to a memorial                                                                                                   |
| **Tribute**             | `tributes`                          | visitor-authored, moderated                                                                                            |
| **Funeral event**       | `funeral_events`                    | scoped to a memorial                                                                                                   |
| **Family update**       | `family_updates`                    | may link a `funeral_events` row                                                                                        |
| **Remembrance**         | `remembrance_actions`               | visitor gesture                                                                                                        |
| **Membership / access** | `memorial_memberships`              | invitation lifecycle                                                                                                   |
| **Service request**     | `service_requests`                  | may precede a memorial                                                                                                 |
| **Report**              | `reports`                           | against a memorial or a tribute                                                                                        |
| **Audit**               | `audit_logs`                        | append-only, cross-cutting                                                                                             |
| **Notification**        | `notifications`                     | cross-cutting, provider-agnostic                                                                                       |
| **Profile**             | `profiles`                          | 1:1 with `auth.users`                                                                                                  |

**Identity:** a memorial is its immutable `memorials.id`. The public slug is an
attribute in `memorial_slugs`, never the identity
([memorial-url-architecture.md](../architecture/memorial-url-architecture.md)).

## State machines

| Entity                             | States                                                                                      | Transitions (operations)                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Memorial `status`                  | `draft → published → archived`; `→ suspended` (platform only); `→ deleted` (owner/platform) | `createMemorial`, `publishMemorial`, `archiveMemorial`, platform suspend, delete        |
| Memorial `funeral_planning_status` | `not_started → planning → partially_confirmed → confirmed → completed`                      | independent of publication — a memorial may be `published + planning`                   |
| Tribute `status`                   | `pending → approved \| rejected`; `approved/rejected → hidden`; `→ reported`                | `approveTribute`, `rejectTribute`, `hideTribute`                                        |
| Funeral event `status`             | `draft ⇄ published → completed`; `draft \| published → cancelled → published`               | `saveFuneralEvent`, `publishFuneralEvent`, `cancelFuneralEvent`, `completeFuneralEvent` |
| Family update `status`             | `draft ⇄ published → archived`; `archived → published`                                      | `saveFamilyUpdate`, `publishFamilyUpdate`, `archiveFamilyUpdate`                        |
| Membership `status`                | `invited → active → suspended \| revoked`                                                   | `inviteMemorialAdmin`, accept-invite, `changeMemorialRole`                              |
| Service request `status`           | `new → in_review → contacted → scheduled → completed \| declined \| cancelled`              | `requestFuneralService` + platform ops                                                  |

## Principles (LOCKED)

Family-controlled · respectful · privacy-conscious · mobile-first · **no
social-media mechanics** · **no grief exploitation** · visitors generally need
no account · **funeral information must not block memorial publication**.
