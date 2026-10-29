# hideTribute

**Purpose** — Take an already-**approved** tribute out of public view (a
complaint, a later-noticed problem, a family request) without deleting it.

**Business responsibility** — A reversible "unpublish" for content that was
live, distinct from `reject` (which is for content that was never published).

## Caller context / Input / Output

|        |                                    |
| ------ | ---------------------------------- |
| Caller | authenticated; `tributes.moderate` |
| Input  | `tributeId`, `moderationNote?`     |
| Output | `{ tributeId, status: "hidden" }`  |

## Authentication / Authorization

`Unauthenticated` / `NotFound` / `ForbiddenError` unless `tributes.moderate` or
platform admin.

## Validation / Invariants / Preconditions

- Current `status` `approved` or `reported` → `hidden`. From `pending` use
  `reject`; from `hidden` → `ConflictError`.
- `published_at` is retained (so re-approving restores the original timestamp);
  `moderated_by` / `moderated_at` updated.
- Immediately removed from `public_tributes` (status ≠ `approved`).
- Un-hiding is `approveTribute` again (allowed from a non-`pending` state per
  that contract's note) — a `restoreTribute` alias may be added.

## Database interactions / Transaction

`update tributes set status='hidden', moderated_by=?, moderated_at=now(),
moderation_note=?` + audit row, one transaction. Transport:
`revalidateTag('memorial:{id}:tributes')`.

## Side effects / Events

- **Domain event** `tribute.hidden` `{ tributeId, memorialId }`.
- **Audit** `tribute.hidden`.
- **Notification** none.

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `Conflict` · `internal`.

## Idempotency

Hiding an already-hidden tribute → `ConflictError`.

## Security considerations

Same private-column protections as [approveTribute](./approve-tribute.md). A
tribute reported by a visitor (`reports` row, tribute set to `reported`) routes
here for a moderator decision.

## Related

Entities: `tributes`, `reports`. Flows:
[tribute moderation](../../product/flows/tribute-moderation.md),
[platform admin](../../product/flows/platform-admin.md).
