# rejectTribute

**Purpose** — Decline a pending tribute (spam, abuse, off-topic) so it never
becomes public.

**Business responsibility** — Keep the moderation decision, without publishing
the content and without a public trace.

## Caller context / Input / Output

|        |                                                                                |
| ------ | ------------------------------------------------------------------------------ |
| Caller | authenticated; `tributes.moderate`                                             |
| Input  | `tributeId`, `rejectionReason` (enum/short text — internal), `moderationNote?` |
| Output | `{ tributeId, status: "rejected" }`                                            |

## Authentication / Authorization

`Unauthenticated` / `NotFound` / `ForbiddenError` unless `tributes.moderate` or
platform admin.

## Validation / Invariants / Preconditions

- Current `status` `pending` or `reported` → `rejected`. Else `ConflictError`.
- Sets `moderated_by`, `moderated_at`; `published_at` stays null.
- A rejected tribute is retained (for abuse pattern analysis) but is **never**
  visible via `public_tributes` (status ≠ `approved`).

## Database interactions / Transaction

`update tributes set status='rejected', moderated_by=?, moderated_at=now(),
moderation_note=?` + audit row, one transaction.

## Side effects / Events

- **Domain event** `tribute.rejected` `{ tributeId, memorialId }`.
- **Audit** `tribute.rejected`.
- **Notification** none (we do not tell a spammer their content was rejected;
  a genuine author sees nothing rather than a discouraging bounce). Product may
  later choose a gentle "not published" note for non-spam — DEFERRED.

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `Conflict` · `internal`.

## Idempotency

Second call on a moderated tribute → `ConflictError`.

## Security considerations

Reason text is internal — never surfaced to visitors. Same private-column
protections as [approveTribute](./approve-tribute.md).

## Related

Entities: `tributes`. Flow:
[tribute moderation](../../product/flows/tribute-moderation.md).
