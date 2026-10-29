# saveFamilyUpdate

**Status — IMPLEMENTED** (Phase 5I). Executable, unit- and integration-tested.
Lifecycle moves are `publishFamilyUpdate` / `archiveFamilyUpdate`;
`removeFamilyUpdate` soft-deletes.

**Purpose** — Create (no `id`) or update (`id`) one official family notice on
the memorial (a change of plans, a thank-you, livestream details, a post-service
message). A new update starts as `draft`.

**Business responsibility** — Family updates are **official notices, not a
social feed** — one authoritative voice, no comments, no reactions. Per-update
visibility, so a members-only logistics note never reaches visitors.

## Caller context / Input / Output

|        |                                                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated; `updates.publish` (owner / admin / content_editor) or platform admin                                                                                                                 |
| Input  | `memorialId`, `id?`, `title` (1–200), `body` (1–20000), `importance` (`normal` \| `high` \| `urgent`, default `normal`), `funeralEventId?`, `visibility?` (`section_visibility`, default `inherit`) |
| Output | `{ update: FamilyUpdateRow, created: boolean }`                                                                                                                                                     |

## Authentication / Authorization

`UnauthenticatedError` if not signed in. `requireMemorialPermission` →
`MemorialNotFoundError` (a non-member can't see a draft memorial),
`ForbiddenError` without `updates.publish`, `MemorialInvalidStateError` when the
memorial is `suspended` / `archived`.

## Validation / Invariants / Preconditions

- `title` is run through `sanitizeLine` (strip markup + control/bidi), then
  1–200. `body` through `sanitizePlainText`, then 1–20000.
- `funeralEventId` (if given) must belong to the same memorial →
  `ValidationError { reason: "bad_funeral_event" }`.
- Create: `status = 'draft'`, `published_at` null; `author_profile_id` = caller.
- `updates_enabled` is **not** enforced here — the public page respects it.

## Database interactions / Transaction

One transaction-scoped-RLS unit of work: `insert`/`update` on `family_updates`
(no `RETURNING` — the row is read back) plus one `audit_logs` row.

## Side effects / Events

- **Domain event** none on save (only `publishFamilyUpdate` emits).
- **Audit** `family_update.created` / `family_update.updated`.
- **Notification** none on save — `publishFamilyUpdate` (below) fires one.

## Errors

`unauthenticated` · `forbidden` · `not_found` · `validation` · `precondition_failed`
(suspended / archived memorial) · `internal`.

## Idempotency

Not idempotent on create. Update is idempotent for identical input.

## Security considerations

`title` / `body` are sanitised to plain text (no markup, no control/bidi
characters). A published update reaches a visitor only when both the memorial
and the `updates` section privacy allow it **and** the update's own `visibility`
is `inherit` or `public` (migration `20260902191807_family_update_visibility`).

## Related operations

### publishFamilyUpdate · archiveFamilyUpdate

`updates.publish`. Input `{ memorialId, updateId }` → `{ updateId, status }`.

- **publish**: `draft | archived → published`; sets `published_at` (kept on a
  later re-publish). Domain event `family_update.published`
  `{ memorialId, familyUpdateId, importance }`; audit `family_update.published`;
  notification `family_update_published` (in-app) to every other active
  memorial member, via `notifyMemorialMembers` (Phase 5N).
- **archive**: `published → archived` (taken down, kept for history). Audit
  `family_update.archived`. No notification.
- A move already satisfied is a no-op; an impossible source status →
  `ConflictError { reason: "invalid_transition", from }`.

### removeFamilyUpdate

`updates.publish`. Soft-deletes one update (`deleted_at`). Audit
`family_update.removed`. Input `{ memorialId, updateId }` → `{ removed: true }`.

## Related

Entities: `family_updates`, `funeral_events`, `feature_settings`, `memorials`.
Flows: [funeral management](../../product/flows/funeral-management.md),
[post-funeral legacy](../../product/flows/post-funeral-legacy.md).
