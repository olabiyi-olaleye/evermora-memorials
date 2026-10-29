# approveTribute · rejectTribute · hideTribute

**Status** — done IMPLEMENTED (Phase 5G): `packages/domain/src/operations/moderate-tribute.ts`, unit + integration tested.

**Purpose** — A family moderator sets the moderation state of a tribute. There
are no likes, threads, ranking or follower mechanics — moderation is the only
lever the family has over tributes.

## Caller context / Input / Output

|        |                                                                          |
| ------ | ------------------------------------------------------------------------ |
| Caller | authenticated family member with `tributes.moderate` or a platform admin |
| Input  | `memorialId`, `tributeId`, `note?` (≤1000, stored as `moderation_note`)  |
| Output | `{ tributeId, status }`                                                  |

## Transitions

| Op        | target     | allowed from                    | `published_at`     |
| --------- | ---------- | ------------------------------- | ------------------ |
| `approve` | `approved` | `pending`, `reported`, `hidden` | set (now, or kept) |
| `reject`  | `rejected` | `pending`, `reported`           | cleared            |
| `hide`    | `hidden`   | `approved`, `reported`          | cleared            |

- Target == current status → no-op (returns the current state).
- Any other source status → `ConflictError` `reason: "invalid_transition"`.
- Every decision stamps `moderated_by` / `moderated_at`.

## Authorization

`ForbiddenError` unless the caller has `tributes.moderate` or is a platform
admin. RLS `tributes_update_moderators` re-checks. A `content_editor` (who has
`gallery.manage` but not `tributes.moderate`) **cannot** moderate.

## Side effects

- **Audit** `tribute.approved` / `tribute.rejected` / `tribute.hidden`.
- **Domain event** the same name — feeds a future "your tribute is live"
  notification and analytics.

## Errors

`UnauthenticatedError` · `ForbiddenError` · `NotFoundError` (memorial or
tribute, or the tribute belongs to another memorial) · `ConflictError` ·
`ValidationError`.

## Related

Entities: `tributes`. Submission: [submit-tribute.md](./submit-tribute.md).
