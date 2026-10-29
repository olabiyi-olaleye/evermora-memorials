# Repository & unit-of-work seam

`@evermora/domain` never imports a database driver. It defines the **ports**
(`@evermora/domain/ports`); `@evermora/database` provides the **adapters**
(`@evermora/database/persistence`).

## Ports (in `@evermora/domain`) — IMPLEMENTED

| Port                       | Purpose                                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemorialRepository`       | `create`, `findById`, `markPublished`, `updateProfile`, `setPortrait`, `setFuneralPlanningStatus`, `setStatus` (5M platform moderation)                                                               |
| `MembershipRepository`     | `activeRole`, `activeFor`; 5K: `listForMemorial`, `detailById`, `pendingInviteFor`, `activeForProfile`, `createInvite`, `applyPatch`, `transferOwnership` (via the `transfer_memorial_ownership` RPC) |
| `MemorialSlugRepository`   | `findBySlug`, `canonicalFor`, `listForMemorial`, `isReserved`, `addCanonical`, `retireCanonical`, `promoteExistingToCanonical`                                                                        |
| `SettingsRepository`       | `privacy(memorial)`, `feature(memorial)`, `updatePrivacy`, `updateFeature` (rows are trigger-created; the domain reads / patches them)                                                                |
| `StoryRepository`          | `listForMemorial`, `findById`, `create`, `update`, `softDelete`, `setOrder`, `publishedCount` (`story_sections`)                                                                                      |
| `MilestoneRepository`      | `listForMemorial`, `findById`, `create`, `update`, `softDelete`, `setOrder` (`milestones`)                                                                                                            |
| `AlbumRepository`          | `listForMemorial`, `findById`, `create`, `update`, `softDelete`, `setOrder` (`albums`)                                                                                                                |
| `MediaRepository`          | `listForMemorial`, `findById`, `create`, `update`, `softDelete`, `setOrder`, `clearAlbum`, `readyCount` (`media`)                                                                                     |
| `TributeRepository`        | `findById`, `create`, `moderate`, `pendingCount`, `recentFromIp` (`tributes`; `create` synthesises its row — `anon` cannot SELECT the base table)                                                     |
| `FuneralEventRepository`   | `listForMemorial`, `findById`, `create`, `update`, `applyLifecycle`, `softDelete`, `setOrder`, `publishedCount` (`funeral_events`)                                                                    |
| `FamilyUpdateRepository`   | `listForMemorial`, `findById`, `create`, `update`, `applyLifecycle`, `softDelete`, `publishedCount` (`family_updates`)                                                                                |
| `ShareResolverRepository`  | `listForMemorial`, `findById`, `create` (token generated in the adapter), `retire` (`share_resolvers`)                                                                                                |
| `ServiceRequestRepository` | `create` (`status='new'`); 5M: `findById`, `update` (staff triage)                                                                                                                                    |
| `ReportRepository`         | `create` (`reports`); 5M: `findById`, `resolve` (platform staff)                                                                                                                                      |
| `AuditRepository`          | `record(entry)` — appends one `audit_logs` row in the operation's transaction                                                                                                                         |
| `NotificationRepository`   | (5N) `recordMany(entries)`, `memorialRecipientIds(memorialId)`, `listForRecipient`, `unreadCount`, `markRead`, `markAllRead` (`notifications`)                                                        |
| `ProfileRepository`        | (5N) `platformAdminIds()` — the staff fan-out list for `notifyPlatformStaff`                                                                                                                          |
| `UnitOfWork`               | `transaction(caller, work)`                                                                                                                                                                           |
| `Clock` / `IdGenerator`    | injectable time + id (deterministic in tests)                                                                                                                                                         |

Repositories return **plain domain rows** (camelCase, in `ports/rows.ts`), never
a raw DB row, a Drizzle result, or a Supabase type. Database row ≠ domain model
≠ UI model.

## `UnitOfWork` (adapter in `@evermora/database`) — IMPLEMENTED

```ts
uow.transaction(caller, async (repos) => { … })   // one DB transaction; RLS = caller
```

`createUnitOfWork(db)` (where `db = createDrizzleClient(DATABASE_URL)`) opens one
`postgres-js` transaction and, as its first statements:

```
SET LOCAL role = 'authenticated'   -- or 'anon' for a visitor
SET LOCAL request.jwt.claims = '{"sub":"<caller.userId>","role":"authenticated"}'
```

so **every statement in the transaction is subject to Row Level Security**, just
as a PostgREST request would be. A thrown error rolls the whole transaction back.

### Why this is the secure design (the RLS/Drizzle decision)

The direct `DATABASE_URL` connection is a **transport**, not an authorization
escape hatch. User-originated operations do **not** bypass RLS — RLS remains the
final boundary on the write path too. `SUPABASE_SERVICE_ROLE_KEY` / a
service-role client is **not** used as a general shortcut.

The narrow escalations, each restoring the caller's role right after: `audit_logs`
deliberately denies `authenticated` an `INSERT` path, so `AuditRepository.record`
briefly does `SET LOCAL role = 'service_role'` for that single insert.
`notifications` has the same no-`INSERT`-for-`authenticated` shape, so
`NotificationRepository.recordMany` elevates the same way (5N). And because the
_actor_ triggering a notification may have no RLS visibility into who else to
notify — an anonymous tribute submitter can't `SELECT` `memorial_memberships`,
a non-staff caller can't `SELECT` other `profiles` — `memorialRecipientIds` and
`ProfileRepository.platformAdminIds` elevate for that recipient-resolution read
too, still inside the same transaction.

### RLS + `RETURNING` caveat

`INSERT`/`UPDATE … RETURNING` under RLS also requires the affected row to satisfy
the table's **SELECT** policy, and that check runs **before** the memorial's
`AFTER INSERT` owner-membership trigger — so a freshly-inserted draft memorial is
not yet SELECT-visible and `RETURNING` fails. The adapter therefore **mutates
without `RETURNING`** and reads the row back with a separate `SELECT` (by which
point the trigger has run and the caller is a member).

## Unique-violation translation

`addCanonical` / slug promotion surface a Postgres `23505` (unique violation) —
the adapter's `translatePgError` maps it to a domain `UniqueViolation`, and the
operation maps that to `SlugUnavailableError`. Availability checks are advisory;
**the unique index + transaction is the authoritative race protection**.

## Testing

- **Unit** — `@evermora/domain` tests run against an **in-memory `UnitOfWork`**
  (`src/testing/in-memory.ts`) that models the DB invariants (owner-membership +
  settings triggers, one-canonical-slug, reserved registry, rollback).
- **Integration** — `@evermora/database` tests
  (`*.integration.test.ts`, gated on `DATABASE_URL`) run the real adapter against
  a local Supabase / Postgres, verifying persistence, the trigger effects, RLS
  row-visibility, unique-conflict mapping, and rollback. In CI's `database` job
  after `supabase db reset`; skipped in the DB-less quality-gates job.
- **pgTAP** (`supabase/tests/`) — unchanged, still the RLS-policy authority.
