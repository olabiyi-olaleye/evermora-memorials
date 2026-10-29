# archiveMemorial

**Purpose** — Move a memorial to `archived` — it stops being publicly listed and
editable, but is not deleted.

**Business responsibility** — Give a family a reversible "close this for now"
without losing content, distinct from deletion (owner-only, guarded) and
suspension (platform-only).

## Caller context / Input / Output

|        |                                                           |
| ------ | --------------------------------------------------------- |
| Caller | authenticated; `memorial.edit`                            |
| Input  | `memorialId`, `reason?` (family note, not shown publicly) |
| Output | `{ memorialId, status: "archived", archivedAt }`          |

## Authentication / Authorization

`UnauthenticatedError` / `ForbiddenError` (needs `memorial.edit`) /
`NotFoundError` (invisible private memorial). Platform admin also permitted.

## Validation / Invariants / Preconditions

- Current status `draft` or `published` → `archived`. From `archived` →
  `ConflictError`. From `suspended`/`deleted` → `precondition_failed`.
- `archived_at` set.
- Public reads stop immediately: `can_read_memorial` returns false for
  non-members once status ≠ `published`.
- Un-archiving is `publishMemorial` (back to `published`) or a dedicated
  `restoreMemorial` (future) — an archived memorial is not silently
  re-published.

## Database interactions / Transaction

`update memorials set status='archived', archived_at=now()` in one transaction;
trigger writes `memorial.status_changed`; operation writes `memorial.archived`.

## Side effects / Events

- **Domain event** `memorial.archived` `{ memorialId }`.
- **Audit** `memorial.archived` (+ trigger).
- Transport revalidates the memorial cache; the public route now serves the
  respectful "this memorial is not currently available" state / 404.

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `Conflict` · `precondition_failed`
· `internal`.

## Idempotency

Second call on an already-archived memorial → `ConflictError`.

## Security considerations

Does **not** require `memorial.delete` — archiving is reversible and
non-destructive. Suspension remains platform-only (guard enforced).

## Related

Entities: `memorials`. Flows:
[family access / invitation](../../product/flows/family-access-invitation.md),
[post-funeral legacy](../../product/flows/post-funeral-legacy.md).
