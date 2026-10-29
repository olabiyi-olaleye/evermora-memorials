# recordAuditEvent

**Purpose** — The shared helper every operation uses to append an entry to
`audit_logs`, in the operation's own transaction.

**Business responsibility** — One consistent, privacy-safe way to record "who
did what to which entity", so the family (`admins.manage`) and platform staff
have a reliable trail.

## Caller context / Input / Output

|        |                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | **internal** — invoked by another domain operation, never exposed to a transport directly                                                                                                             |
| Input  | `{ action` (an `AUDIT_ACTIONS` value), `actorProfileId` (from `ctx.userId`), `actorKind` (`user`\|`platform_admin`\|`system`\|`anonymous`), `entityType?`, `entityId?`, `memorialId?`, `metadata?` }` |
| Output | `void` (or the new `audit_logs.id`)                                                                                                                                                                   |

## Authentication / Authorization

None of its own — it runs **inside** an already-authorized operation's
transaction. It must never be reachable as a standalone endpoint.

## Validation / Invariants / Preconditions

- `action` ∈ `@evermora/types` `AUDIT_ACTIONS` (= `DOMAIN_EVENTS`) — 1–100 chars
  (`audit_logs_action_len`).
- `actorKind` = `anonymous` when `actorProfileId` is null and the actor was a
  visitor; `system` for jobs/migrations; `platform_admin` when
  `ctx.isPlatformAdmin`.
- `metadata` is **minimal**: ids and from/to states only. **Never** a tribute
  body, an email, an IP, a token, or free text that could identify a visitor
  ([audit-architecture.md](../../architecture/audit-architecture.md)).

## Database interactions / Transaction

Single `insert into audit_logs (...)` on the **same** connection/transaction as
the calling operation. If the operation rolls back, the audit row rolls back
with it.

`audit_logs` has `UPDATE` / `DELETE` / `TRUNCATE` revoked and no policy for
them — the row, once committed, is permanent.

## Relationship to triggers

Two events are **also** written by DB triggers regardless of the domain:
`memorial.status_changed` (`memorials_audit_status_change`) and
`memorial.ownership_transferred` (`memberships_audit_owner_change`). The domain
still records its own, richer entry for those actions; a small amount of
duplication is acceptable and expected.

## Side effects / Events

- No domain event (it _is_ the audit mechanism).
- No notification.

## Errors

`internal` only (an audit write failing fails the enclosing operation — audit is
not optional).

## Idempotency

Append-only. Callers pass a stable `action` + `entityId`; exact-duplicate
suppression within one operation is best-effort, not guaranteed.

## Security considerations

The single choke point for audit writing means privacy rules (minimal metadata)
are enforced in one place. Reads are RLS-scoped
([audit-architecture.md](../../architecture/audit-architecture.md)).

## Related

Entities: `audit_logs`. Every other operation contract references this.
