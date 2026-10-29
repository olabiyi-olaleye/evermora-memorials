# approveTribute

**Purpose** — Publish a visitor-submitted tribute after a moderator reviews it.

**Business responsibility** — Enforce that only `tributes.moderate` holders
publish tributes; keep the submitter's email private; notify the author.

## Caller context / Input / Output

|        |                                                              |
| ------ | ------------------------------------------------------------ |
| Caller | authenticated; `tributes.moderate` on the tribute's memorial |
| Input  | `tributeId`, `moderationNote?`                               |
| Output | `{ tributeId, status: "approved", publishedAt }`             |

## Authentication / Authorization

`Unauthenticated` / `NotFound` (tribute or its memorial invisible) /
`ForbiddenError` unless `has_memorial_permission(memorialId,'tributes.moderate')`
(owner / admin / tribute_moderator) or platform admin.

## Validation / Invariants / Preconditions

- Current `status` must be `pending` (or `reported` → back to review) → else
  `ConflictError`.
- Sets `status='approved'`, `published_at=now()`, `moderated_by=ctx.userId`,
  `moderated_at=now()` — DB `check` `tributes_approved_has_timestamp` requires
  `published_at`.
- The tribute body is not altered by moderation (a light edit is a separate
  future op, itself audited).

## Database interactions / Transaction

One transaction: `update tributes set status='approved', published_at=now(),
moderated_by=?, moderated_at=now(), moderation_note=?` + audit row. The public
`public_tributes` view now includes it (no email column).

## Side effects / Events

- **Domain event** `tribute.approved` `{ tributeId, memorialId }`.
- **Audit** `tribute.approved`, entity `tribute`.
- **Notification** `tribute_approved` to the author **iff** they provided an
  email — a single, plain "your tribute is now visible" message.
- Transport: `revalidateTag('memorial:{id}:tributes')`.

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `Conflict` (already moderated) ·
`internal`.

## Idempotency

Approving an already-`approved` tribute → `ConflictError`; no duplicate
notification.

## Security considerations

`author_email` / `submitted_ip` / `submitted_user_agent` are never returned to
the Data API (row-scoped policy + column-free public view). Moderator tooling
reads them server-side via `service_role` only when needed. RLS
`tributes_update_moderators` backstops the write.

## Related

Entities: `tributes`, `media`, `notifications`. Flows:
[tribute moderation](../../product/flows/tribute-moderation.md),
[visitor](../../product/flows/visitor.md).
